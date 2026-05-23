import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, CanActivate, ExecutionContext } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { ClerkGuard } from '../src/common/guards/clerk.guard';
import { SaaSControlService } from '../src/core/saas-control/saas-control.service';
import * as jwt from 'jsonwebtoken';

describe('Multi-Tenancy and Module Isolation (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let orgId1: string;
  let orgId2: string;
  let userId: string;
  const jwtSecret = 'test-secret';

  const mockSaaSControlService = {
    getTenantSnapshot: jest.fn(),
    validateModuleAccess: jest.fn(),
  };

  const mockClerkGuard: CanActivate = {
    canActivate: async (context: ExecutionContext) => {
      const req = context.switchToHttp().getRequest();
      const authHeader = req.headers.authorization;
      const token = authHeader?.split(' ')[1];
      
      const payload: any = jwt.verify(token, jwtSecret);
      const user = await prisma.client.user.findUnique({
        where: { clerkId: payload.sub },
        include: { memberships: { include: { organization: true } } }
      });
      
      req['user'] = user;
      const org = user.memberships.find(m => m.organization.clerkId === payload.org_id)?.organization;
      req['organization'] = org;
      req['membership'] = user.memberships.find(m => m.organization.id === org?.id);
      
      return true;
    }
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(ClerkGuard).useValue(mockClerkGuard)
      .overrideProvider(SaaSControlService).useValue(mockSaaSControlService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);

    // Create User and 2 Orgs
    const user = await prisma.client.user.create({
      data: { email: 'isolation@test.com', clerkId: 'iso_user' }
    });
    userId = user.id;

    const org1 = await prisma.client.organization.create({
      data: { name: 'Org Health Only', slug: 'health-org', clerkId: 'clerk_health' }
    });
    orgId1 = org1.id;

    const org2 = await prisma.client.organization.create({
      data: { name: 'Org Pet Only', slug: 'pet-org', clerkId: 'clerk_pet' }
    });
    orgId2 = org2.id;

    await prisma.client.member.createMany({
      data: [
        { userId, organizationId: orgId1, role: 'ADMIN' },
        { userId, organizationId: orgId2, role: 'ADMIN' },
      ]
    });
  });

  afterAll(async () => {
    await prisma.client.member.deleteMany({ where: { userId } }).catch(() => {});
    await prisma.client.organization.deleteMany({ where: { id: { in: [orgId1, orgId2] } } }).catch(() => {});
    await prisma.client.user.deleteMany({ where: { id: userId } }).catch(() => {});
    await app.close();
  });

  it('should return 404 when accessing HEALTH module if tenant only has PET licensed', async () => {
    const token = jwt.sign({ sub: 'iso_user', org_id: 'clerk_pet' }, jwtSecret);
    
    // Mock access to return false
    mockSaaSControlService.validateModuleAccess.mockResolvedValue(false);

    const response = await request(app.getHttpServer())
      .get('/health-management/check')
      .set('Authorization', `Bearer ${token}`)
      .set('x-organization-id', orgId2);

    expect(response.status).toBe(404);
  });

  it('should allow access to HEALTH module if tenant has it licensed', async () => {
    const token = jwt.sign({ sub: 'iso_user', org_id: 'clerk_health' }, jwtSecret);
    
    // Mock access to return true
    mockSaaSControlService.validateModuleAccess.mockResolvedValue(true);

    const response = await request(app.getHttpServer())
      .get('/health-management/check')
      .set('Authorization', `Bearer ${token}`)
      .set('x-organization-id', orgId1);

    expect(response.status).toBe(200);
    expect(response.body.status).toContain('active');
  });
});
