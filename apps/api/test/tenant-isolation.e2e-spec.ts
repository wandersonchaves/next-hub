import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, CanActivate, ExecutionContext } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { MultiLevelAuthGuard } from '../src/common/guards/multi-level-auth.guard';
import { MembershipGuard } from '../src/common/guards/membership.guard';
import { TenantContextGuard } from '../src/common/guards/tenant-context.guard';
import { ProspectorAdminGuard } from '../src/common/guards/prospector-admin.guard';
import { ModuleAccessGuard } from '../src/common/guards/module-access.guard';
import { SaaSControlService } from '../src/modules/nexthub/saas-control/saas-control.service';
import { TenantInterceptor } from '../src/common/interceptors/tenant.interceptor';
import * as jwt from 'jsonwebtoken';

describe('Tenant Isolation E2E Tests (Prospector)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  
  let orgIdA: string;
  let orgIdB: string;
  let unitIdA: string;
  let unitIdB: string;
  let userId: string;
  
  let userClerkId: string;
  let orgAClerkId: string;
  let orgBClerkId: string;
  
  const jwtSecret = 'test-secret';

  const mockSaaSControlService = {
    getTenantSnapshot: jest.fn(),
    validateModuleAccess: jest.fn().mockReturnValue(true),
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

  const mockPassGuard: CanActivate = {
    canActivate: () => true
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(MultiLevelAuthGuard).useValue(mockMultiLevelAuthGuard)
      .overrideGuard(MembershipGuard).useValue(mockPassGuard)
      .overrideGuard(TenantContextGuard).useValue(mockPassGuard)
      .overrideGuard(ProspectorAdminGuard).useValue(mockPassGuard)
      .overrideGuard(ModuleAccessGuard).useValue(mockPassGuard)
      .overrideProvider(SaaSControlService).useValue(mockSaaSControlService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    app.useGlobalInterceptors(new TenantInterceptor());
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);

    const suffix = Date.now();
    userClerkId = `test_user_${suffix}`;
    orgAClerkId = `clerk_org_a_${suffix}`;
    orgBClerkId = `clerk_org_b_${suffix}`;

    // Create a user
    const user = await prisma.client.user.create({
      data: { email: `test-${suffix}@nexthub-e2e.com`, clerkId: userClerkId }
    });
    userId = user.id;

    // Create Org A
    const orgA = await prisma.client.organization.create({
      data: { 
        name: 'Organization A', 
        slug: `org-a-${suffix}`, 
        clerkId: orgAClerkId,
        enabledModules: ['PROSPECTOR']
      }
    });
    orgIdA = orgA.id;

    // Create Unit A
    const unitA = await prisma.client.unit.create({
      data: { name: 'Unit A', organizationId: orgIdA, type: 'CORE' }
    });
    unitIdA = unitA.id;

    // Create Org B
    const orgB = await prisma.client.organization.create({
      data: { 
        name: 'Organization B', 
        slug: `org-b-${suffix}`, 
        clerkId: orgBClerkId,
        enabledModules: ['PROSPECTOR']
      }
    });
    orgIdB = orgB.id;

    // Create Unit B
    const unitB = await prisma.client.unit.create({
      data: { name: 'Unit B', organizationId: orgIdB, type: 'CORE' }
    });
    unitIdB = unitB.id;

    // Create memberships
    await prisma.client.member.createMany({
      data: [
        { userId, organizationId: orgIdA, role: 'ADMIN' },
        { userId, organizationId: orgIdB, role: 'ADMIN' },
      ]
    });

    // Create Leads
    // Lead A under Org A / Unit A
    await prisma.client.lead.create({
      data: {
        name: 'Lead Org A',
        phone: `551199999991${suffix.toString().slice(-1)}`,
        status: 'NEW',
        organizationId: orgIdA,
        unitId: unitIdA
      }
    });

    // Lead B under Org B / Unit B
    await prisma.client.lead.create({
      data: {
        name: 'Lead Org B',
        phone: `551199999992${suffix.toString().slice(-1)}`,
        status: 'NEW',
        organizationId: orgIdB,
        unitId: unitIdB
      }
    });
  });

  afterAll(async () => {
    // Cleanup leads
    if (orgIdA) {
      await prisma.client.leadPipeline.deleteMany({ where: { organizationId: orgIdA } }).catch(() => {});
      await prisma.client.interaction.deleteMany({ where: { organizationId: orgIdA } }).catch(() => {});
      await prisma.client.lead.deleteMany({ where: { organizationId: orgIdA } }).catch(() => {});
      await prisma.client.member.deleteMany({ where: { organizationId: orgIdA } }).catch(() => {});
      await prisma.client.unit.deleteMany({ where: { organizationId: orgIdA } }).catch(() => {});
      await prisma.client.organization.deleteMany({ where: { id: orgIdA } }).catch(() => {});
    }
    if (orgIdB) {
      await prisma.client.leadPipeline.deleteMany({ where: { organizationId: orgIdB } }).catch(() => {});
      await prisma.client.interaction.deleteMany({ where: { organizationId: orgIdB } }).catch(() => {});
      await prisma.client.lead.deleteMany({ where: { organizationId: orgIdB } }).catch(() => {});
      await prisma.client.member.deleteMany({ where: { organizationId: orgIdB } }).catch(() => {});
      await prisma.client.unit.deleteMany({ where: { organizationId: orgIdB } }).catch(() => {});
      await prisma.client.organization.deleteMany({ where: { id: orgIdB } }).catch(() => {});
    }
    if (userId) {
      await prisma.client.user.deleteMany({ where: { id: userId } }).catch(() => {});
    }
    await app.close();
  });

  it('should isolate leads for Org A', async () => {
    const token = jwt.sign({ sub: userClerkId, org_id: orgAClerkId }, jwtSecret);

    mockSaaSControlService.getTenantSnapshot.mockResolvedValue({
      isBlocked: false,
      activeModules: ['PROSPECTOR', 'CORE'],
      status: 'ACTIVE',
      organizationId: orgIdA,
      plan: 'FREE',
      units: []
    });

    const response = await request(app.getHttpServer())
      .get('/modules/prospector/leads')
      .set('Authorization', `Bearer ${token}`)
      .set('x-organization-id', orgIdA)
      .set('x-unit-id', unitIdA);

    expect(response.status).toBe(200);
    expect(response.body).toBeDefined();
    expect(response.body.leads).toBeDefined();
    
    // Validate that only Org A lead is visible
    const leadNames = response.body.leads.map((l: any) => l.name);
    expect(leadNames).toContain('Lead Org A');
    expect(leadNames).not.toContain('Lead Org B');
  });

  it('should isolate leads for Org B', async () => {
    const token = jwt.sign({ sub: userClerkId, org_id: orgBClerkId }, jwtSecret);

    mockSaaSControlService.getTenantSnapshot.mockResolvedValue({
      isBlocked: false,
      activeModules: ['PROSPECTOR', 'CORE'],
      status: 'ACTIVE',
      organizationId: orgIdB,
      plan: 'FREE',
      units: []
    });

    const response = await request(app.getHttpServer())
      .get('/modules/prospector/leads')
      .set('Authorization', `Bearer ${token}`)
      .set('x-organization-id', orgIdB)
      .set('x-unit-id', unitIdB);

    expect(response.status).toBe(200);
    expect(response.body).toBeDefined();
    expect(response.body.leads).toBeDefined();
    
    // Validate that only Org B lead is visible
    const leadNames = response.body.leads.map((l: any) => l.name);
    expect(leadNames).toContain('Lead Org B');
    expect(leadNames).not.toContain('Lead Org A');
  });
});
