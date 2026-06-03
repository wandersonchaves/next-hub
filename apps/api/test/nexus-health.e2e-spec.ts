import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, CanActivate, ExecutionContext } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { ClerkGuard } from '../src/common/guards/clerk.guard';
import { AIOrchestratorEngine } from '../src/common/engines/ai-orchestrator.engine';
import * as jwt from 'jsonwebtoken';

describe('Nexus Health (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let orgId: string;
  let unitId: string;
  let userId: string;
  const jwtSecret = 'test-secret';

  const mockAI = {
    generate: jest.fn().mockResolvedValue({
      content: 'Resumo de teste gerado por IA.',
    })
  };

  const mockClerkGuard: CanActivate = {
    canActivate: async (context: ExecutionContext) => {
      const req = context.switchToHttp().getRequest();
      const user = await prisma.client.user.findUnique({
        where: { clerkId: 'health_user_e2e' },
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
      .overrideGuard(ClerkGuard).useValue(mockClerkGuard)
      .overrideProvider(AIOrchestratorEngine).useValue(mockAI)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);

    const suffix = Date.now();
    const org = await prisma.client.organization.create({
      data: { 
        name: 'Health Clinic E2E', 
        slug: `health-clinic-${suffix}`, 
        clerkId: `health_org_${suffix}`,
        enabledModules: ['HEALTH']
      }
    });
    orgId = org.id;

    const unit = await prisma.client.unit.create({
      data: { name: 'Main', organizationId: orgId, type: 'HEALTH' }
    });
    unitId = unit.id;

    const user = await prisma.client.user.create({
      data: { email: `doctor-e2e-${suffix}@nexthub.com`, clerkId: 'health_user_e2e' }
    });
    userId = user.id;

    await prisma.client.member.create({
      data: { userId, organizationId: orgId, role: 'ADMIN' }
    });

    const patient = await prisma.client.lead.create({
      data: { name: 'João Silva', phone: '11999999999', organizationId: orgId, unitId }
    });

    const procedure = await prisma.client.procedure.create({
      data: { name: 'Botox', durationInMinutes: 30, price: 1200, organizationId: orgId, unitId }
    });

    await prisma.client.appointment.create({
      data: {
        title: 'Aplicação de Botox',
        startTime: new Date(),
        endTime: new Date(),
        leadId: patient.id,
        procedureId: procedure.id,
        organizationId: orgId,
        unitId,
        status: 'COMPLETED'
      }
    });
  });

  afterAll(async () => {
    if (orgId) {
      await prisma.client.appointment.deleteMany({ where: { organizationId: orgId } }).catch(() => {});
      await prisma.client.procedure.deleteMany({ where: { organizationId: orgId } }).catch(() => {});
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

  it('/modules/health/agenda (GET)', async () => {
    const token = jwt.sign({ sub: 'health_user_e2e', org_id: 'health_org' }, jwtSecret);

    const response = await request(app.getHttpServer())
      .get(`/modules/health/agenda`)
      .set('Authorization', `Bearer ${token}`)
      .set('x-unit-id', unitId)
      .set('x-organization-id', orgId);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });
});
