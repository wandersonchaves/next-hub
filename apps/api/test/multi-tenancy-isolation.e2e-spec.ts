import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, CanActivate, ExecutionContext } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import * as jwt from 'jsonwebtoken';
import { GlobalExceptionFilter } from '../src/common/filters/global-exception.filter';
import { TenantInterceptor } from '../src/common/interceptors/tenant.interceptor';
import { BranchType } from '@enterprise/database';
import { ClerkGuard } from '../src/common/guards/clerk.guard';

describe('Multi-tenancy Isolation (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const jwtSecret = 'test-secret';

  // State to store fake data
  let orgA: any;
  let orgB: any;
  let branchA: any;
  let branchB: any;
  let userA: any;
  let userB: any;
  let tokenA: string;
  let tokenB: string;

  // Mock ClerkGuard
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
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalFilters(new GlobalExceptionFilter());
    app.useGlobalInterceptors(new TenantInterceptor());
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);

    // 1. Setup Data: Organizations, Branches, Users, Memberships
    orgA = await prisma.client.organization.create({
      data: {
        name: 'Organization A',
        slug: 'org-a-' + Date.now(),
        clerkId: 'clerk_org_a_' + Date.now(),
      },
    });

    orgB = await prisma.client.organization.create({
      data: {
        name: 'Organization B',
        slug: 'org-b-' + Date.now(),
        clerkId: 'clerk_org_b_' + Date.now(),
      },
    });

    branchA = await prisma.client.branch.create({
      data: {
        name: 'Health Branch',
        type: BranchType.HEALTH,
        organizationId: orgA.id,
      },
    });

    branchB = await prisma.client.branch.create({
      data: {
        name: 'Pet Branch',
        type: BranchType.PET,
        organizationId: orgB.id,
      },
    });

    userA = await prisma.client.user.create({
      data: {
        email: 'userA' + Date.now() + '@test.com',
        clerkId: 'user_a_' + Date.now(),
        name: 'User A',
      },
    });

    userB = await prisma.client.user.create({
      data: {
        email: 'userB' + Date.now() + '@test.com',
        clerkId: 'user_b_' + Date.now(),
        name: 'User B',
      },
    });

    await prisma.client.member.createMany({
      data: [
        { userId: userA.id, organizationId: orgA.id, role: 'ADMIN' },
        { userId: userB.id, organizationId: orgB.id, role: 'ADMIN' },
      ],
    });

    // 2. Generate JWT Tokens
    tokenA = jwt.sign({ sub: userA.clerkId, org_id: orgA.clerkId }, jwtSecret);
    tokenB = jwt.sign({ sub: userB.clerkId, org_id: orgB.clerkId }, jwtSecret);
  });

  afterAll(async () => {
    // Cleanup in reverse order
    if (userA && userB) {
      await prisma.client.member.deleteMany({ where: { userId: { in: [userA.id, userB.id] } } });
      await prisma.client.branch.deleteMany({ where: { id: { in: [branchA.id, branchB.id] } } });
      await prisma.client.user.deleteMany({ where: { id: { in: [userA.id, userB.id] } } });
    }
    if (orgA && orgB) {
      await prisma.client.organization.deleteMany({ where: { id: { in: [orgA.id, orgB.id] } } });
    }
    
    await app.close();
  });

  it('User A should NOT be able to access leads using User B branch ID (Forbidden)', async () => {
    const response = await request(app.getHttpServer())
      .get('/modules/prospector/leads')
      .set('Authorization', `Bearer ${tokenA}`)
      .set('x-organization-id', orgA.id) // Correct org
      .set('x-branch-id', branchB.id); // WRONG BRANCH (belongs to Org B)

    expect(response.status).toBe(403);
    expect(response.body.message).toContain('Branch access denied');
  });

  it('User B should be blocked from analytics dashboard of Org A', async () => {
    const response = await request(app.getHttpServer())
      .get('/analytics/dashboard')
      .set('Authorization', `Bearer ${tokenB}`)
      .set('x-organization-id', orgA.id); // Trying to access Org A

    // Since tokenB has org_id of Org B, isolation should occur.
    expect(response.status).toBe(403); 
  });

  it('User A should access leads with its own branch ID', async () => {
    const response = await request(app.getHttpServer())
      .get('/modules/prospector/leads')
      .set('Authorization', `Bearer ${tokenA}`)
      .set('x-organization-id', orgA.id)
      .set('x-branch-id', branchA.id);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('leads');
  });
});
