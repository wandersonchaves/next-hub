import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, CanActivate, ExecutionContext } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { ClerkGuard } from '../src/common/guards/clerk.guard';
import { AIOrchestratorEngine } from '../src/common/engines/ai-orchestrator.engine';
import { OmniChannelEngine } from '../src/common/engines/omni-channel.engine';
import * as jwt from 'jsonwebtoken';

describe('Nexus Pet (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let orgId: string;
  let unitId: string;
  let userId: string;
  const jwtSecret = 'test-secret';

  const mockAI = {
    generate: jest.fn().mockResolvedValue({
      content: 'Oi! O Rex está precisando de um banho.',
    })
  };

  const mockOmni = {
    sendMessage: jest.fn().mockResolvedValue(undefined)
  };

  const mockClerkGuard: CanActivate = {
    canActivate: async (context: ExecutionContext) => {
      const req = context.switchToHttp().getRequest();
      const user = await prisma.client.user.findUnique({
        where: { clerkId: 'pet_user_e2e' },
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
      .overrideProvider(OmniChannelEngine).useValue(mockOmni)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);

    const suffix = Date.now();
    const org = await prisma.client.organization.create({
      data: { 
        name: 'Pet Shop E2E', 
        slug: `pet-shop-${suffix}`, 
        clerkId: `pet_org_${suffix}`,
        enabledModules: ['PET']
      }
    });
    orgId = org.id;

    const unit = await prisma.client.unit.create({
      data: { name: 'Main', organizationId: orgId, type: 'PET' }
    });
    unitId = unit.id;

    const user = await prisma.client.user.create({
      data: { email: `pet-e2e-${suffix}@nexthub.com`, clerkId: 'pet_user_e2e' }
    });
    userId = user.id;

    await prisma.client.member.create({
      data: { userId, organizationId: orgId, role: 'ADMIN' }
    });

    const tutor = await prisma.client.lead.create({
      data: { name: 'Dono do Rex', phone: '11988888888', organizationId: orgId, unitId }
    });

    const twentyDaysAgo = new Date();
    twentyDaysAgo.setDate(twentyDaysAgo.getDate() - 20);

    await prisma.client.pet.create({
      data: { 
        name: 'Rex', 
        breed: 'Poodle', 
        tutorId: tutor.id, 
        organizationId: orgId, 
        unitId, 
        lastBathAt: twentyDaysAgo 
      }
    });
  });

  afterAll(async () => {
    if (orgId) {
      await prisma.client.pet.deleteMany({ where: { organizationId: orgId } }).catch(() => {});
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

  it('/modules/pet/check-recurrence (POST)', async () => {
    const token = jwt.sign({ sub: 'pet_user_e2e', org_id: 'pet_org' }, jwtSecret);

    const response = await request(app.getHttpServer())
      .post(`/modules/pet/check-recurrence`)
      .set('Authorization', `Bearer ${token}`)
      .set('x-unit-id', unitId)
      .set('x-organization-id', orgId);

    expect(response.status).toBe(201);
    expect(response.body.status).toBe('check_initiated');
  });
});
