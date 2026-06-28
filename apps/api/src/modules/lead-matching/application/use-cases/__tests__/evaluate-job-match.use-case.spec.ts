import { Test, TestingModule } from '@nestjs/testing';
import { EvaluateJobMatchUseCase } from '../evaluate-job-match.use-case';
import { IMatchAssessmentRepositoryToken } from '../../../domain/repository-interfaces/match-assessment.repository.interface';
import { IJobManifestationRepositoryToken } from '../../../../job-aggregation/domain/repository-interfaces/job-manifestation.repository.interface';
import { JobManifestation } from '../../../../job-aggregation/domain/entities/job-manifestation.entity';
import { Fingerprint } from '../../../../job-aggregation/domain/value-objects/fingerprint.vo';
import { CompensationRange } from '../../../../job-aggregation/domain/value-objects/compensation-range.vo';
import { LeadTarget } from '../../../domain/entities/lead-target.entity';

describe('EvaluateJobMatchUseCase', () => {
  let useCase: EvaluateJobMatchUseCase;
  let matchRepository: any;
  let jobRepository: any;

  const mockMatchRepository = {
    findLeadTargetsByOrganizationId: jest.fn(),
    findByLeadAndJob: jest.fn(),
    save: jest.fn(),
  };

  const mockJobRepository = {
    findById: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EvaluateJobMatchUseCase,
        { provide: IMatchAssessmentRepositoryToken, useValue: mockMatchRepository },
        { provide: IJobManifestationRepositoryToken, useValue: mockJobRepository },
      ],
    }).compile();

    useCase = module.get<EvaluateJobMatchUseCase>(EvaluateJobMatchUseCase);
    matchRepository = module.get(IMatchAssessmentRepositoryToken);
    jobRepository = module.get(IJobManifestationRepositoryToken);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should evaluate job matches successfully', async () => {
    const mockJob = new JobManifestation(
      'job-1',
      'Senior Backend Engineer Node.js',
      'Google',
      'Remote',
      'Looking for a Node.js and TypeScript developer',
      'https://google.com/jobs/1',
      Fingerprint.create('job-1-fingerprint'),
      CompensationRange.create(120000, 150000, 'USD'),
      'greenhouse',
      'org-1',
    );

    const mockLeadTarget = LeadTarget.create({
      leadId: 'lead-1',
      desiredRole: 'Backend Engineer',
      desiredSalary: 130000,
      skills: ['Node.js', 'TypeScript', 'React'],
      experienceYears: 5,
      organizationId: 'org-1',
    });

    mockJobRepository.findById.mockResolvedValue(mockJob);
    mockMatchRepository.findLeadTargetsByOrganizationId.mockResolvedValue([mockLeadTarget]);
    mockMatchRepository.findByLeadAndJob.mockResolvedValue(null);

    await useCase.execute({
      jobManifestationId: 'job-1',
      organizationId: 'org-1',
    });

    expect(mockJobRepository.findById).toHaveBeenCalledWith('job-1');
    expect(mockMatchRepository.findLeadTargetsByOrganizationId).toHaveBeenCalledWith('org-1');
    expect(mockMatchRepository.save).toHaveBeenCalled();
    const savedAssessment = mockMatchRepository.save.mock.calls[0][0];
    expect(savedAssessment.leadId).toBe('lead-1');
    expect(savedAssessment.jobManifestationId).toBe('job-1');
    expect(savedAssessment.score).toBeGreaterThan(0);
    expect(savedAssessment.matchedSkills).toContain('node.js');
    expect(savedAssessment.matchedSkills).toContain('typescript');
    expect(savedAssessment.missingSkills).toContain('react');
  });
});
