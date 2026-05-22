import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, CanActivate, ExecutionContext } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { ClerkGuard } from '../src/common/guards/clerk.guard';
import * as jwt from 'jsonwebtoken';
import { BranchType } from '@enterprise/database';
import { TenantInterceptor } from '../src/common/interceptors/tenant.interceptor';
import { GlobalExceptionFilter } from '../src/common/filters/global-exception.filter';

describe('Nexus Health Module (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let orgId: string;
  let branchId: string;
  let userId: string;
  let procedureId: string;
  let leadId: string;
  const jwtSecret = 'test-secret';

  // Mock ClerkGuard para ambiente de teste
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
    app.useGlobalInterceptors(new TenantInterceptor());
    app.useGlobalFilters(new GlobalExceptionFilter());
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);

    // 1. Criar dados de infraestrutura (Org, Branch, User)
    const suffix = Date.now();
    const org = await prisma.client.organization.create({
      data: {
        name: 'Health Clinic',
        slug: `clinic-${suffix}`,
        clerkId: `clerk_org_${suffix}`,
      },
    });
    orgId = org.id;

    const branch = await prisma.client.branch.create({
      data: {
        name: 'Main Branch',
        type: BranchType.HEALTH,
        organizationId: orgId,
      },
    });
    branchId = branch.id;

    const user = await prisma.client.user.create({
      data: {
        email: `doctor-${suffix}@example.com`,
        clerkId: `user_${suffix}`,
        name: 'Dr. Tester',
      },
    });
    userId = user.id;

    await prisma.client.member.create({
      data: { userId, organizationId: orgId, role: 'ADMIN' },
    });

    // 2. Criar um Lead real para satisfazer a constraint de FK
    const lead = await prisma.client.lead.create({
      data: {
        name: 'John Doe',
        email: `john-${suffix}@example.com`,
        phone: '5511999999999',
        organizationId: orgId,
        branchId: branchId,
      },
    });
    leadId = lead.id;

    // 3. Criar um procedimento (Essencial para o Caso de Uso)
    const procedure = await prisma.client.procedure.create({
      data: {
        name: 'Botox Treatment',
        durationInMinutes: 30,
        price: 500,
        organizationId: orgId,
        branchId: branchId,
      },
    });
    procedureId = procedure.id;

    // 4. Criar permissão de branch (PermissionsGuard)
    await prisma.client.userBranchPermission.create({
      data: {
        userId,
        branchId,
        role: 'ADMIN',
        permissions: ['appointments:write', 'appointments:read'],
      },
    });

    accessToken = jwt.sign({ sub: user.clerkId, org_id: org.clerkId }, jwtSecret);
  });

  afterAll(async () => {
    try {
      await prisma.client.userBranchPermission.deleteMany({ where: { userId } }).catch(() => {});
      await prisma.client.appointment.deleteMany({ where: { organizationId: orgId } }).catch(() => {});
      await prisma.client.procedure.deleteMany({ where: { organizationId: orgId } }).catch(() => {});
      await prisma.client.lead.deleteMany({ where: { organizationId: orgId } }).catch(() => {});
      await prisma.client.member.deleteMany({ where: { userId } }).catch(() => {});
      await prisma.client.organization.deleteMany({ where: { id: orgId } }).catch(() => {});
      await prisma.client.user.deleteMany({ where: { id: userId } }).catch(() => {});
    } catch (e) {}
    await app.close();
  });

  it('should create an operational appointment successfully', async () => {
    const startTime = new Date();
    startTime.setHours(startTime.getHours() + 2); // Agendar para daqui a 2 horas

    const response = await request(app.getHttpServer())
      .post('/health-management/appointments')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', orgId)
      .set('x-branch-id', branchId)
      .send({
        title: 'Patient: John Doe',
        leadId: leadId,
        procedureId: procedureId,
        startTime: startTime.toISOString(),
      });

    if (response.status !== 201) {
      console.log('Error Response:', JSON.stringify(response.body, null, 2));
    }

    expect(response.status).toBe(201);
    expect(response.body.title).toBe('Patient: John Doe');
    expect(response.body.status).toBe('SCHEDULED');
    
    // Validar se o horário de término foi calculado (30 min de duração)
    const returnedEndTime = new Date(response.body.endTime);
    const expectedEndTime = new Date(startTime);
    expectedEndTime.setMinutes(expectedEndTime.getMinutes() + 30);
    expect(returnedEndTime.getTime()).toBe(expectedEndTime.getTime());
  });

  it('should block appointment if there is a schedule conflict', async () => {
    const startTime = new Date();
    startTime.setHours(startTime.getHours() + 5);

    // 1. Criar o primeiro agendamento
    await request(app.getHttpServer())
      .post('/health-management/appointments')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', orgId)
      .set('x-branch-id', branchId)
      .send({
        title: 'Appointment 1',
        leadId: leadId,
        procedureId: procedureId,
        startTime: startTime.toISOString(),
      })
      .expect(201);

    // 2. Tentar criar um segundo agendamento no mesmo horário (conflito)
    const response = await request(app.getHttpServer())
      .post('/health-management/appointments')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', orgId)
      .set('x-branch-id', branchId)
      .send({
        title: 'Appointment 2 (Conflict)',
        leadId: leadId,
        procedureId: procedureId,
        startTime: startTime.toISOString(),
      });

    expect(response.status).toBe(403);
    expect(response.body.message).toContain('Schedule conflict');
  });
});
