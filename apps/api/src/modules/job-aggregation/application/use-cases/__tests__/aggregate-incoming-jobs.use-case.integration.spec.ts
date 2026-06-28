import { Test, TestingModule } from '@nestjs/testing';
import { AggregateIncomingJobsUseCase } from '../aggregate-incoming-jobs.use-case';
import { IJobManifestationRepositoryToken } from '../../../domain/repository-interfaces/job-manifestation.repository.interface';
import { IExternalJobProviderToken } from '../../ports/external-job-provider.port';
import { JobManifestation } from '../../../domain/entities/job-manifestation.entity';

describe('AggregateIncomingJobsUseCase Integration', () => {
  let useCase: AggregateIncomingJobsUseCase;
  let jobRepository: any;
  let jobProvider: any;

  const mockRepository = {
    save: jest.fn(),
    findByFingerprint: jest.fn(),
    findByOrganizationId: jest.fn(),
    delete: jest.fn(),
  };

  const mockProvider = {
    fetchJobs: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AggregateIncomingJobsUseCase,
        { provide: IJobManifestationRepositoryToken, useValue: mockRepository },
        { provide: IExternalJobProviderToken, useValue: mockProvider },
        {
          provide: 'PROM_METRIC_JOB_AGGREGATION_SYNC_TOTAL',
          useValue: { labels: jest.fn().mockReturnValue({ inc: jest.fn() }) },
        },
        {
          provide: 'PROM_METRIC_JOB_AGGREGATION_JOBS_AGGREGATED_TOTAL',
          useValue: { labels: jest.fn().mockReturnValue({ inc: jest.fn() }) },
        },
        {
          provide: 'BullQueue_event-mesh',
          useValue: { add: jest.fn() },
        },
      ],
    }).compile();

    useCase = module.get<AggregateIncomingJobsUseCase>(AggregateIncomingJobsUseCase);
    jobRepository = module.get(IJobManifestationRepositoryToken);
    jobProvider = module.get(IExternalJobProviderToken);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch and save external jobs successfully', async () => {
    const mockJobs = [
      JobManifestation.create({
        title: 'Backend Engineer',
        company: 'Vercel',
        location: 'Remote',
        description: 'React/Node development',
        url: 'https://vercel.com/jobs/1',
        provider: 'greenhouse',
        organizationId: 'org-test-1',
      }),
    ];

    jobProvider.fetchJobs.mockResolvedValue(mockJobs);
    jobRepository.findByFingerprint.mockResolvedValue(null);
    jobRepository.save.mockImplementation((job) => Promise.resolve(job));

    const result = await useCase.execute({
      organizationId: 'org-test-1',
      query: 'Backend',
      limit: 10,
    });

    expect(result.aggregatedCount).toBe(1);
    expect(result.duplicatesCount).toBe(0);
    expect(jobProvider.fetchJobs).toHaveBeenCalledWith('org-test-1', 'Backend', 10);
    expect(jobRepository.save).toHaveBeenCalled();
  });

  it('should skip duplicate jobs based on fingerprint', async () => {
    const mockJobs = [
      JobManifestation.create({
        title: 'Backend Engineer',
        company: 'Vercel',
        location: 'Remote',
        description: 'React/Node development',
        url: 'https://vercel.com/jobs/1',
        provider: 'greenhouse',
        organizationId: 'org-test-1',
      }),
    ];

    jobProvider.fetchJobs.mockResolvedValue(mockJobs);
    jobRepository.findByFingerprint.mockResolvedValue(mockJobs[0]);

    const result = await useCase.execute({
      organizationId: 'org-test-1',
      query: 'Backend',
      limit: 10,
    });

    expect(result.aggregatedCount).toBe(0);
    expect(result.duplicatesCount).toBe(1);
    expect(jobRepository.save).not.toHaveBeenCalled();
  });
});
