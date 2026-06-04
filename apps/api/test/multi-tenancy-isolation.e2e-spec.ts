import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, CanActivate, ExecutionContext } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { MultiLevelAuthGuard } from '../src/common/guards/multi-level-auth.guard';
import { SaaSControlService } from '../src/modules/nexthub/saas-control/saas-control.service';
import * as jwt from 'jsonwebtoken';

describe('Multi-Tenancy and Module Isolation (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let orgId1: string;
  let orgId2: string;
  let userId: string;
  let userClerkId: string;
  let orgPetClerkId: string;
  let orgHealthClerkId: string;
  const jwtSecret = 'test-secret';

  const mockSaaSControlService = {
    getTenantSnapshot: jest.fn(),
    validateModuleAccess: jest.fn(),
  };

  const mockMultiLevelAuthGuard: CanActivate = {
    canActivate: async (context: ExecutionContext) => {
      const req = context.switchToHttp().getRequest();
      const authHeader = req.headers.authorization;
      if (!authHeader) return false;
      const token = authHeader.split(' ')[1];
      
      try {
        const payload: any = jwt.verify(token, jwtSecret);
        const user = await prisma.client.user.findUnique({
          where: { clerkId: payload.sub },
          include: { memberships: { include: { organization: true } } }
        });
        
        if (!user) return false;
        
        req['user'] = user;
        const org = user.memberships.find(m => m.organization.clerkId === payload.org_id)?.organization;
        req['organization'] = org;
        req['membership'] = user.memberships.find(m => m.organization.id === org?.id);
        
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
      .overrideProvider(SaaSControlService).useValue(mockSaaSControlService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);

    const suffix = Date.now();
    userClerkId = `iso_user_${suffix}`;
    orgPetClerkId = `clerk_pet_${suffix}`;
    orgHealthClerkId = `clerk_health_${suffix}`;

    const user = await prisma.client.user.create({
      data: { email: `iso-${suffix}@test.com`, clerkId: userClerkId }
    });
    userId = user.id;

    const org1 = await prisma.client.organization.create({
      data: { name: 'Org Health Only', slug: `health-org-${suffix}`, clerkId: orgHealthClerkId }
    });
    orgId1 = org1.id;

    const org2 = await prisma.client.organization.create({
      data: { name: 'Org Pet Only', slug: `pet-org-${suffix}`, clerkId: orgPetClerkId }
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
    if (userId) {
      await prisma.client.member.deleteMany({ where: { userId } }).catch(() => {});
      await prisma.client.user.deleteMany({ where: { id: userId } }).catch(() => {});
    }
    if (orgId1) await prisma.client.organization.deleteMany({ where: { id: orgId1 } }).catch(() => {});
    if (orgId2) await prisma.client.organization.deleteMany({ where: { id: orgId2 } }).catch(() => {});
    await app.close();
  });

  it('should return 404 when accessing HEALTH module if tenant only has PET licensed', async () => {
    const token = jwt.sign({ sub: userClerkId, org_id: orgPetClerkId }, jwtSecret);
    
    mockSaaSControlService.getTenantSnapshot.mockResolvedValue({
      isBlocked: false,
      activeModules: ['PET', 'CORE'],
      status: 'ACTIVE',
      organizationId: orgId2,
      plan: 'FREE',
      units: []
    });

    const response = await request(app.getHttpServer())
      .get('/modules/health/agenda')
      .set('Authorization', `Bearer ${token}`)
      .set('x-organization-id', orgId2);

    expect(response.status).toBe(404);
  });
});
