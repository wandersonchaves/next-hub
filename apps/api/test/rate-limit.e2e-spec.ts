import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, CanActivate, ExecutionContext } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { MultiLevelAuthGuard } from '../src/common/guards/multi-level-auth.guard';
import { ThrottlerStorage, ThrottlerStorageService } from '@nestjs/throttler';
import * as jwt from 'jsonwebtoken';
import { GenerateSalesPitchUseCase } from '../src/modules/prospector/application/use-cases/generate-sales-pitch.use-case';

jest.setTimeout(30000);

describe('AI Rate Limiting Threshold (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let orgId: string;
  let unitId: string;
  let userId: string;
  const jwtSecret = 'test-secret';

  const mockMultiLevelAuthGuard: CanActivate = {
    canActivate: async (context: ExecutionContext) => {
      const req = context.switchToHttp().getRequest();
      const user = await prisma.client.user.findUnique({
        where: { clerkId: 'rate_limit_user' },
        include: { memberships: { include: { organization: true } } }
      });
      if (user) {
        req['user'] = user;
        req['organization'] = user.memberships[0]?.organization;
        req['membership'] = user.memberships[0];
      }
      return true;
    }
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(MultiLevelAuthGuard).useValue(mockMultiLevelAuthGuard)
      .overrideProvider(ThrottlerStorage).useValue(new ThrottlerStorageService())
      .overrideProvider(GenerateSalesPitchUseCase).useValue({ execute: jest.fn().mockResolvedValue({}) })
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);

    const suffix = Date.now();
    const org = await prisma.client.organization.create({
      data: { 
        name: 'Rate Limit Org', 
        slug: `rate-limit-org-${suffix}`, 
        clerkId: `org_rl_${suffix}`,
        enabledModules: ['PROSPECTOR']
      }
    });
    orgId = org.id;

    const unit = await prisma.client.unit.create({
      data: { name: 'Main', organizationId: orgId, type: 'CORE' }
    });
    unitId = unit.id;

    const user = await prisma.client.user.create({
      data: { email: `rate-limit-${suffix}@nexthub.com`, clerkId: 'rate_limit_user' }
    });
    userId = user.id;

    await prisma.client.member.create({
      data: { userId, organizationId: orgId, role: 'ADMIN' }
    });

    accessToken = jwt.sign({ sub: 'rate_limit_user', org_id: `org_rl_${suffix}` }, jwtSecret);
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

  it('should allow 5 LLM requests and block the 6th with 429 (Too Many Requests)', async () => {
    const responses: number[] = [];

    for (let i = 0; i < 6; i++) {
      const response = await request(app.getHttpServer())
        .post('/api/modules/prospector/leads/fake-id/generate-pitch')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', orgId)
        .set('x-unit-id', unitId)
        .send();
      responses.push(response.status);
    }

    // First 5 requests should not be 429 (they fail with validation/not found like 400/404/500)
    for (let i = 0; i < 5; i++) {
      expect(responses[i]).not.toBe(429);
      expect([400, 404, 500, 201]).toContain(responses[i]);
    }

    // The 6th request must be 429
    expect(responses[5]).toBe(429);
  });
});
