import { Test, TestingModule } from '@nestjs/testing';
import { PrismaJobManifestationRepository } from '../prisma-job-manifestation.repository';
import { PrismaService } from '../../../../../../../prisma/prisma.service';
import { JobManifestation } from '../../../../../domain/entities/job-manifestation.entity';

describe('PrismaJobManifestationRepository Integration', () => {
  let repository: PrismaJobManifestationRepository;
  let prismaService: PrismaService;

  const mockPrisma = {
    jobManifestation: {
      upsert: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaJobManifestationRepository,
        {
          provide: PrismaService,
          useValue: { client: mockPrisma },
        },
      ],
    }).compile();

    repository = module.get<PrismaJobManifestationRepository>(PrismaJobManifestationRepository);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should save a job manifestation', async () => {
    const job = JobManifestation.create({
      title: 'Rust Engineer',
      company: 'Tauri',
      location: 'Remote',
      description: 'Desktop Tauri development',
      url: 'https://tauri.app/jobs/1',
      provider: 'lever',
      organizationId: 'org-test-1',
    });

    const mockPrismaRecord = {
      id: 'job-123',
      title: job.title,
      company: job.company,
      location: job.location,
      description: job.description,
      url: job.url,
      fingerprint: job.fingerprint.value,
      minSalary: null,
      maxSalary: null,
      currency: null,
      provider: job.provider,
      organizationId: job.organizationId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockPrisma.jobManifestation.upsert.mockResolvedValue(mockPrismaRecord);

    const saved = await repository.save(job);

    expect(saved.id).toBe('job-123');
    expect(mockPrisma.jobManifestation.upsert).toHaveBeenCalled();
  });

  it('should find a job manifestation by fingerprint', async () => {
    const mockPrismaRecord = {
      id: 'job-123',
      title: 'Rust Engineer',
      company: 'Tauri',
      location: 'Remote',
      description: 'Desktop Tauri development',
      url: 'https://tauri.app/jobs/1',
      fingerprint: 'test-fingerprint',
      minSalary: null,
      maxSalary: null,
      currency: null,
      provider: 'lever',
      organizationId: 'org-test-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockPrisma.jobManifestation.findFirst.mockResolvedValue(mockPrismaRecord);

    const found = await repository.findByFingerprint('org-test-1', 'test-fingerprint');

    expect(found).not.toBeNull();
    expect(found?.id).toBe('job-123');
    expect(mockPrisma.jobManifestation.findFirst).toHaveBeenCalledWith({
      where: {
        organizationId: 'org-test-1',
        fingerprint: 'test-fingerprint',
      },
    });
  });

  it('should delete a job manifestation', async () => {
    mockPrisma.jobManifestation.delete.mockResolvedValue({ id: 'job-123' });

    await repository.delete('job-123');

    expect(mockPrisma.jobManifestation.delete).toHaveBeenCalledWith({
      where: {
        id: 'job-123',
      },
    });
  });
});
