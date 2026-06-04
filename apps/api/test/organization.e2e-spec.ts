import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, CanActivate, ExecutionContext } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { MultiLevelAuthGuard } from '../src/common/guards/multi-level-auth.guard';
import * as jwt from 'jsonwebtoken';

describe('Organization Management (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let orgId: string;
  let userId: string;
  let clerkUserId: string;
  const jwtSecret = 'test-secret';

  const mockMultiLevelAuthGuard: CanActivate = {
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
        } else if (user.memberships.length > 0) {
           // Fallback for MembershipGuard when org_id is missing in token but header is present
           const headerOrgId = req.headers['x-organization-id'];
           const membership = user.memberships.find(m => m.organization.id === headerOrgId);
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
      .overrideGuard(MultiLevelAuthGuard).useValue(mockMultiLevelAuthGuard)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);

    clerkUserId = 'user_org_' + Date.now();
    const user = await prisma.client.user.create({
      data: {
        email: `org-test-${Date.now()}@example.com`,
        clerkId: clerkUserId,
        name: 'Org Tester',
      },
    });
    userId = user.id;

    accessToken = jwt.sign({ sub: clerkUserId }, jwtSecret);
  });

  afterAll(async () => {
    if (orgId) {
      await prisma.client.member.deleteMany({ where: { organizationId: orgId } }).catch(() => {});
      await prisma.client.invite.deleteMany({ where: { organizationId: orgId } }).catch(() => {});
      await prisma.client.unit.deleteMany({ where: { organizationId: orgId } }).catch(() => {});
      await prisma.client.organization.deleteMany({ where: { id: orgId } }).catch(() => {});
    }
    if (userId) {
      await prisma.client.user.deleteMany({ where: { id: userId } }).catch(() => {});
    }
    await app.close();
  });

  it('/organizations (POST)', async () => {
    const res = await request(app.getHttpServer())
      .post('/organizations')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Test Corp', slug: `test-corp-${Date.now()}` })
      .expect(201);
    
    orgId = res.body.id;
    expect(orgId).toBeDefined();
    expect(res.body.name).toBe('Test Corp');
  });

  it('/analytics/dashboard (GET)', async () => {
    await request(app.getHttpServer())
      .get('/analytics/dashboard')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', orgId)
      .expect(200);
  });
});
