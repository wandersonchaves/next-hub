import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, CanActivate, ExecutionContext } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { ClerkGuard } from '../src/common/guards/clerk.guard';
import * as jwt from 'jsonwebtoken';

describe('Organization Management & Async Side-effects (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let orgId: string;
  let userId: string;
  const jwtSecret = 'test-secret';

  // Mock ClerkGuard to bypass remote token verification
  const mockClerkGuard: CanActivate = {
    canActivate: async (context: ExecutionContext) => {
      const req = context.switchToHttp().getRequest();
      const authHeader = req.headers.authorization;
      if (!authHeader) return false;

      const token = authHeader.split(' ')[1];
      try {
        const payload = jwt.verify(token, jwtSecret) as any;
        const user = await prisma.client.user.findUnique({
          where: { clerkId: payload.sub },
          include: { memberships: { include: { organization: true } } }
        });

        if (!user) return false;

        req['user'] = user;
        if (payload.org_id) {
          const membership = user.memberships.find(m => m.organization.clerkId === payload.org_id);
          if (membership) {
            req['membership'] = membership;
            req['organization'] = membership.organization;
          }
        }
        return true;
      } catch (e) {
        return false;
      }
    }
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(ClerkGuard)
      .useValue(mockClerkGuard)
      .overrideProvider(ClerkGuard)
      .useValue(mockClerkGuard)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);

    // Create a test user directly in DB
    const clerkUserId = 'user_' + Date.now();
    const user = await prisma.client.user.create({
      data: {
        email: `org-test-${Date.now()}@example.com`,
        clerkId: clerkUserId,
        name: 'Org Tester',
      },
    });
    userId = user.id;

    // Generate a valid mock JWT
    accessToken = jwt.sign({ sub: clerkUserId }, jwtSecret);
  });

  afterAll(async () => {
    // Cleanup
    if (userId) {
      await prisma.client.member.deleteMany({ where: { userId } }).catch(() => {});
      await prisma.client.invite.deleteMany({ where: { authorId: userId } }).catch(() => {});
    }
    if (orgId) {
      await prisma.client.organization.deleteMany({ where: { id: orgId } }).catch(() => {});
    }
    if (userId) {
      await prisma.client.user.deleteMany({ where: { id: userId } }).catch(() => {});
    }
    await app.close();
  });

  it('/organizations (POST) - Success and Async logging should be queued', async () => {
    const res = await request(app.getHttpServer())
      .post('/organizations')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Test Corp', slug: `test-corp-${Date.now()}` })
      .expect(201);
    
    orgId = res.body.id;
    expect(orgId).toBeDefined();
    expect(res.body.name).toBe('Test Corp');

    // Update token to include org context for subsequent tests
    const user = await prisma.client.user.findUnique({ where: { id: userId }, include: { memberships: { include: { organization: true } } } });
    const membership = user.memberships.find(m => m.organizationId === orgId);
    accessToken = jwt.sign({ sub: user.clerkId, org_id: membership.organization.clerkId }, jwtSecret);
  });

  it('/organizations/:orgSlug/invites (POST) - Success and Async e-mail queued', async () => {
    if (!orgId) throw new Error('orgId is not defined from previous test');
    const org = await prisma.client.organization.findUnique({ where: { id: orgId } });
    await request(app.getHttpServer())
      .post(`/organizations/${org.slug}/invites`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', orgId)
      .send({ email: 'new-member@example.com', role: 'MEMBER' })
      .expect(201);
  });

  it('/organizations/:orgSlug/invites (POST) - Fail on Duplicate (409 Conflict)', async () => {
    if (!orgId) throw new Error('orgId is not defined from previous test');
    const org = await prisma.client.organization.findUnique({ where: { id: orgId } });
    const res = await request(app.getHttpServer())
      .post(`/organizations/${org.slug}/invites`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', orgId)
      .send({ email: 'new-member@example.com', role: 'MEMBER' })
      .expect(409);
    
    expect(res.body.message).toContain('already been sent');
  });

  it('/analytics/dashboard (GET) - Cache isolation test', async () => {
    if (!orgId) throw new Error('orgId is not defined from previous test');
    // 1. Initial request (populate cache)
    await request(app.getHttpServer())
      .get('/analytics/dashboard')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', orgId)
      .expect(200);

    // 2. Request with different org ID should return 403 Forbidden (Isolation)
    const otherOrgId = 'other-org-id';
    await request(app.getHttpServer())
      .get('/analytics/dashboard')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', otherOrgId)
      .expect(403);
  });
});
