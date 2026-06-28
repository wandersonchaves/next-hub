import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, CanActivate, ExecutionContext } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { MultiLevelAuthGuard } from '../src/common/guards/multi-level-auth.guard';
import { AggregateIncomingJobsUseCase } from '../src/modules/job-aggregation/application/use-cases/aggregate-incoming-jobs.use-case';
import { EvaluateJobMatchUseCase } from '../src/modules/lead-matching/application/use-cases/evaluate-job-match.use-case';
import { IMatchAssessmentRepositoryToken } from '../src/modules/lead-matching/domain/repository-interfaces/match-assessment.repository.interface';
import { LeadTarget } from '../src/modules/lead-matching/domain/entities/lead-target.entity';
import * as jwt from 'jsonwebtoken';

describe('Sync to Match Pipeline (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let aggregateIncomingJobsUseCase: AggregateIncomingJobsUseCase;
  let evaluateJobMatchUseCase: EvaluateJobMatchUseCase;
  let matchRepository: any;
  let accessToken: string;
  let orgId: string;
  let userId: string;
  const jwtSecret = 'test-secret';

  const mockExternalJobProvider = {
    fetchJobs: jest.fn().mockResolvedValue([
      {
        title: 'Senior Node.js Developer',
        company: 'Stripe',
        location: 'Remote',
        description: 'We are looking for a backend engineer with Node.js and Postgres experience.',
        url: 'https://stripe.com/jobs/123',
        fingerprint: { value: 'stripe-node-123' },
        compensation: { min: 140000, max: 180000, currency: 'USD' },
        provider: 'greenhouse',
      }
    ]),
  };

  const mockMultiLevelAuthGuard: CanActivate = {
    canActivate: async (context: ExecutionContext) => {
      const req = context.switchToHttp().getRequest();
      const user = await prisma.client.user.findUnique({
        where: { clerkId: 'pipeline_user' },
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
      .overrideProvider('IExternalJobProviderPort').useValue(mockExternalJobProvider)
      .overrideGuard(MultiLevelAuthGuard).useValue(mockMultiLevelAuthGuard)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);
    aggregateIncomingJobsUseCase = app.get<AggregateIncomingJobsUseCase>(AggregateIncomingJobsUseCase);
    evaluateJobMatchUseCase = app.get<EvaluateJobMatchUseCase>(EvaluateJobMatchUseCase);
    matchRepository = app.get(IMatchAssessmentRepositoryToken);

    const suffix = Date.now();
    const org = await prisma.client.organization.create({
      data: { 
        name: 'Pipeline Org', 
        slug: `pipeline-org-${suffix}`, 
        clerkId: `org_${suffix}`,
        enabledModules: ['PROSPECTOR']
      }
    });
    orgId = org.id;

    const user = await prisma.client.user.create({
      data: { email: `pipeline-${suffix}@nexthub.com`, clerkId: 'pipeline_user' }
    });
    userId = user.id;

    const unit = await prisma.client.unit.create({
      data: { name: 'Main', organizationId: orgId, type: 'CORE' }
    });

    await prisma.client.member.create({
      data: { userId, organizationId: orgId, role: 'ADMIN' }
    });

    const lead = await prisma.client.lead.create({
      data: {
        name: 'John Doe',
        phone: '5511999999999',
        email: 'john@doe.com',
        organizationId: orgId,
        unitId: unit.id,
      }
    });

    await matchRepository.saveLeadTarget(
      LeadTarget.create({
        leadId: lead.id,
        desiredRole: 'Node.js Developer',
        desiredSalary: 150000,
        skills: ['Node.js', 'Postgres'],
        experienceYears: 4,
        organizationId: orgId,
      })
    );

    accessToken = jwt.sign({ sub: 'pipeline_user', org_id: `org_${suffix}` }, jwtSecret);
  });

  afterAll(async () => {
    if (orgId) {
      await prisma.client.matchAssessment.deleteMany({ where: { organizationId: orgId } }).catch(() => {});
      await prisma.client.leadTarget.deleteMany({ where: { organizationId: orgId } }).catch(() => {});
      await prisma.client.jobManifestation.deleteMany({ where: { organizationId: orgId } }).catch(() => {});
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

  it('should sync jobs, evaluate matches, and retrieve them via API', async () => {
    // 1. Trigger the sync API (adds job to queue)
    const syncResponse = await request(app.getHttpServer())
      .post(`/v1/organizations/${orgId}/jobs/sync`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ limit: 5 });

    expect(syncResponse.status).toBe(201);
    expect(syncResponse.body.status).toBe('sync_initiated');

    // 2. Manually execute the job aggregation use case (since queue is mocked in E2E)
    await aggregateIncomingJobsUseCase.execute({
      organizationId: orgId,
      limit: 5,
    });

    const savedJobs = await prisma.client.jobManifestation.findMany({
      where: { organizationId: orgId },
    });
    expect(savedJobs.length).toBeGreaterThanOrEqual(1);
    
    // 3. Manually trigger the match evaluation for all saved jobs
    for (const job of savedJobs) {
      await evaluateJobMatchUseCase.execute({
        jobManifestationId: job.id,
        organizationId: orgId,
      });
    }

    // 4. Retrieve matches via API
    const matchesResponse = await request(app.getHttpServer())
      .get(`/v1/organizations/${orgId}/matches`)
      .set('Authorization', `Bearer ${accessToken}`)
      .query({ limit: 10 });

    expect(matchesResponse.status).toBe(200);
    expect(matchesResponse.body.items.length).toBeGreaterThanOrEqual(1);
    const match = matchesResponse.body.items[0];
    expect(match.lead.name).toBe('John Doe');
    expect(match.score).toBeDefined();
  });
});
