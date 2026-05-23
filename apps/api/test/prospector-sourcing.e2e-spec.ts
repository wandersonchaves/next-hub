import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, CanActivate, ExecutionContext } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { ClerkGuard } from '../src/common/guards/clerk.guard';
import * as jwt from 'jsonwebtoken';

describe('Prospector Proactive Sourcing (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let orgId: string;
  let branchId: string;
  let userId: string;
  const jwtSecret = 'test-secret';

  // Mock Adapters
  const mockLeadSourceProvider = {
    searchCompanies: jest.fn().mockResolvedValue([
      { name: 'Test Dentist 1', address: 'Street 1', phone: '+55 11 91111-1111', placeId: 'p1' },
      { name: 'Test Dentist 2', address: 'Street 2', website: 'http://dentist2.com', placeId: 'p2' }
    ])
  };

  const mockContactFinder = {
    findMissingPhone: jest.fn().mockResolvedValue('+55 11 92222-2222')
  };

  const mockAI = {
    generateResponse: jest.fn().mockResolvedValue({
      content: 'Olá! Sou um robô de testes.',
      intent: 'GREETING'
    })
  };

  const mockWhatsApp = {
    sendMessage: jest.fn().mockResolvedValue(undefined)
  };

  // Improved Mock Guard
  const mockClerkGuard: CanActivate = {
    canActivate: async (context: ExecutionContext) => {
      const req = context.switchToHttp().getRequest();
      const user = await prisma.client.user.findUnique({
        where: { clerkId: 'user_1' },
        include: { memberships: { include: { organization: true } } }
      });
      if (!user) return false;
      req['user'] = user;
      if (user.memberships.length > 0) {
        req['organization'] = user.memberships[0].organization;
        req['membership'] = user.memberships[0];
      }
      return true;
    }
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider('ILeadSourceProvider').useValue(mockLeadSourceProvider)
      .overrideProvider('IContactFinder').useValue(mockContactFinder)
      .overrideProvider('IAIService').useValue(mockAI)
      .overrideProvider('IWhatsAppClient').useValue(mockWhatsApp)
      .overrideGuard(ClerkGuard).useValue(mockClerkGuard)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);

    // Setup infrastructure in DB
    const suffix = Date.now();
    const org = await prisma.client.organization.create({
      data: { name: 'Prospecting Org', slug: `prospect-org-${suffix}`, clerkId: `org_${suffix}` }
    });
    orgId = org.id;

    const branch = await prisma.client.branch.create({
      data: { name: 'Main', organizationId: orgId }
    });
    branchId = branch.id;

    const user = await prisma.client.user.create({
      data: { email: `prospector-${suffix}@test.com`, clerkId: 'user_1' }
    });
    userId = user.id;

    await prisma.client.member.create({
      data: { userId, organizationId: orgId, role: 'ADMIN' }
    });

    accessToken = jwt.sign({ sub: 'user_1', org_id: `org_${suffix}` }, jwtSecret);
  });

  afterAll(async () => {
    await prisma.client.appointment.deleteMany({ where: { organizationId: orgId } }).catch(() => {});
    await prisma.client.lead.deleteMany({ where: { organizationId: orgId } }).catch(() => {});
    await prisma.client.member.deleteMany({ where: { organizationId: orgId } }).catch(() => {});
    await prisma.client.branch.deleteMany({ where: { organizationId: orgId } }).catch(() => {});
    await prisma.client.organization.deleteMany({ where: { id: orgId } }).catch(() => {});
    await prisma.client.user.deleteMany({ where: { id: userId } }).catch(() => {});
    await app.close();
  });

  it('should source leads and trigger first contact (POST /source)', async () => {
    const response = await request(app.getHttpServer())
      .post('/modules/prospector/source')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', orgId)
      .set('x-branch-id', branchId)
      .send({
        sector: 'Dentistas',
        region: 'São Paulo'
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('processed', 2);
    expect(response.body).toHaveProperty('errors', 0);

    const leads = await prisma.client.lead.findMany({ where: { organizationId: orgId } });
    expect(leads.length).toBe(2);
  });
});
