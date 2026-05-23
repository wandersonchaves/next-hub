import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, CanActivate, ExecutionContext } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { ClerkGuard } from '../src/common/guards/clerk.guard';
import { AIOrchestratorEngine } from '../src/common/engines/ai-orchestrator.engine';
import { OmniChannelEngine } from '../src/common/engines/omni-channel.engine';
import * as jwt from 'jsonwebtoken';

describe('Nexus Pet AI Reactivation (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let orgId: string;
  let branchId: string;
  let userId: string;
  let petId: string;
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
        where: { clerkId: 'pet_user' },
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

    // Setup Data
    const org = await prisma.client.organization.create({
      data: { name: 'Pet Shop', slug: 'pet-shop', clerkId: 'pet_org' }
    });
    orgId = org.id;

    const branch = await prisma.client.branch.create({
      data: { name: 'Main', organizationId: orgId }
    });
    branchId = branch.id;

    const user = await prisma.client.user.create({
      data: { email: 'groomer@pet.com', clerkId: 'pet_user' }
    });
    userId = user.id;

    await prisma.client.member.create({
      data: { userId, organizationId: orgId, role: 'ADMIN' }
    });

    const tutor = await prisma.client.lead.create({
      data: { name: 'Dono do Rex', phone: '11988888888', organizationId: orgId, branchId }
    });

    // Create a pet with an old bath date (20 days ago)
    const twentyDaysAgo = new Date();
    twentyDaysAgo.setDate(twentyDaysAgo.getDate() - 20);

    const pet = await prisma.client.pet.create({
      data: { 
        name: 'Rex', 
        breed: 'Poodle', 
        tutorId: tutor.id, 
        organizationId: orgId, 
        branchId, 
        lastBathAt: twentyDaysAgo 
      }
    });
    petId = pet.id;
  });

  afterAll(async () => {
    await prisma.client.pet.deleteMany({ where: { organizationId: orgId } }).catch(() => {});
    await prisma.client.lead.deleteMany({ where: { organizationId: orgId } }).catch(() => {});
    await prisma.client.member.deleteMany({ where: { organizationId: orgId } }).catch(() => {});
    await prisma.client.branch.deleteMany({ where: { organizationId: orgId } }).catch(() => {});
    await prisma.client.organization.deleteMany({ where: { id: orgId } }).catch(() => {});
    await prisma.client.user.deleteMany({ where: { id: userId } }).catch(() => {});
    await app.close();
  });

  it('should trigger AI reactivation for overdue pets (GET /check-recurrence)', async () => {
    const token = jwt.sign({ sub: 'pet_user', org_id: 'pet_org' }, jwtSecret);

    const response = await request(app.getHttpServer())
      .get(`/pet-management/check-recurrence`)
      .set('Authorization', `Bearer ${token}`)
      .set('x-branch-id', branchId)
      .set('x-organization-id', orgId);

    expect(response.status).toBe(200);
    expect(mockAI.generate).toHaveBeenCalled();
    expect(mockOmni.sendMessage).toHaveBeenCalledWith(expect.objectContaining({
      to: '11988888888',
      text: expect.any(String)
    }));
  });
});
