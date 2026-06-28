import { Test, TestingModule } from '@nestjs/testing';
import { ListAggregatedJobsUseCase } from '../list-aggregated-jobs.use-case';
import { IJobManifestationRepositoryToken } from '../../../domain/repository-interfaces/job-manifestation.repository.interface';
import { JobManifestation } from '../../../domain/entities/job-manifestation.entity';

describe('ListAggregatedJobsUseCase', () => {
  let useCase: ListAggregatedJobsUseCase;
  let jobRepository: any;

  const mockRepository = {
    findPaged: jest.fn(),
    findPagedCursor: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ListAggregatedJobsUseCase,
        { provide: IJobManifestationRepositoryToken, useValue: mockRepository },
      ],
    }).compile();

    useCase = module.get<ListAggregatedJobsUseCase>(ListAggregatedJobsUseCase);
    jobRepository = module.get(IJobManifestationRepositoryToken);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should list paged jobs successfully with cursor', async () => {
    const mockJobs = [
      JobManifestation.create({
        title: 'Backend Developer',
        company: 'Gitlab',
        location: 'Remote',
        description: 'Ruby development',
        url: 'https://gitlab.com/jobs/1',
        provider: 'greenhouse',
        organizationId: 'org-1',
      }),
    ];

    mockRepository.findPagedCursor.mockResolvedValue({
      items: mockJobs,
      nextCursor: 'next-job-id',
    });

    const result = await useCase.execute({
      organizationId: 'org-1',
      cursor: 'some-job-id',
      limit: 10,
      search: 'Backend',
    });

    expect(result.items).toHaveLength(1);
    expect(result.nextCursor).toBe('next-job-id');
    expect(result.limit).toBe(10);
    expect(mockRepository.findPagedCursor).toHaveBeenCalledWith({
      organizationId: 'org-1',
      cursor: 'some-job-id',
      limit: 10,
      search: 'Backend',
      status: undefined,
    });
  });
});
