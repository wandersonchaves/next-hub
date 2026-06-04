import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, CanActivate, ExecutionContext } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { MultiLevelAuthGuard } from '../src/common/guards/multi-level-auth.guard';
import { AIOrchestratorEngine } from '../src/common/engines/ai-orchestrator.engine';
import * as jwt from 'jsonwebtoken';

describe('Prospector Sourcing (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let orgId: string;
  let unitId: string;
  let userId: string;
  const jwtSecret = 'test-secret';

  const mockLeadSourceProvider = {
    findLeads: jest.fn().mockResolvedValue([
      { name: 'Test Co 1', address: 'Street 1', phone: '5511911111111' },
      { name: 'Test Co 2', address: 'Street 2', phone: '5511922222222' }
    ])
  };

  const mockAI = {
    generate: jest.fn().mockResolvedValue({
      content: 'Olá! Sou um robô de testes.',
    })
  };

  const mockMultiLevelAuthGuard: CanActivate = {
    canActivate: async (context: ExecutionContext) => {
      const req = context.switchToHttp().getRequest();
      const user = await prisma.client.user.findUnique({
        where: { clerkId: 'prospector_user' },
        include: { memberships: { include: { organization: true } } }
      });
      req['user'] = user;
      req['organization'] = user.memberships[0].organization;
      req['membership'] = user.memberships[0];
      return true;
    }
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider('ILeadSourceProvider').useValue(mockLeadSourceProvider)
      .overrideProvider(AIOrchestratorEngine).useValue(mockAI)
      .overrideGuard(MultiLevelAuthGuard).useValue(mockMultiLevelAuthGuard)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);

    const suffix = Date.now();
    const org = await prisma.client.organization.create({
      data: { 
        name: 'Prospecting Org', 
        slug: `prospect-org-${suffix}`, 
        clerkId: `org_${suffix}`,
        enabledModules: ['PROSPECTOR']
      }
    });
    orgId = org.id;

    const unit = await prisma.client.unit.create({
      data: { name: 'Main', organizationId: orgId, type: 'CORE' }
    });
    unitId = unit.id;

    const user = await prisma.client.user.create({
      data: { email: `prospector-${suffix}@nexthub.com`, clerkId: 'prospector_user' }
    });
    userId = user.id;

    await prisma.client.member.create({
      data: { userId, organizationId: orgId, role: 'ADMIN' }
    });

    accessToken = jwt.sign({ sub: 'prospector_user', org_id: `org_${suffix}` }, jwtSecret);
  });

  afterAll(async () => {
    if (orgId) {
       await prisma.client.leadPipeline.deleteMany({ where: { organizationId: orgId } }).catch(() => {});
       await prisma.client.interaction.deleteMany({ where: { organizationId: orgId } }).catch(() => {});
       await prisma.client.lead.deleteMany({ where: { organizationId: orgId } }).catch(() => {});
       await prisma.client.member.deleteMany({ where: { organizationId: orgId } }).catch(() => {});
       await prisma.client.unit.deleteMany({ where: { organizationId: orgId } }).catch(() => {});
       await prisma.client.organization.deleteMany({ where: { id: orgId } }).catch(() => {});
    }
    if (userId) {
       await prisma.client.user.deleteMany({ where: { id: userId } }).catch(() => {});
    }
    await app.close();
  });

  it('should source leads and start prospecting (POST /source)', async () => {
    const response = await request(app.getHttpServer())
      .post('/modules/prospector/source')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', orgId)
      .set('x-unit-id', unitId)
      .send({
        sector: 'Estética',
        region: 'São Paulo'
      });

    expect(response.status).toBe(201);
    expect(response.body.status).toBe('prospecting_started');
  });
});
