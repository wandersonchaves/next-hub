import { Test, TestingModule } from '@nestjs/testing';
import { GetPatientClinicalSummaryUseCase } from '../get-patient-clinical-summary.use-case';
import { PrismaService } from '../../../../../prisma/prisma.service';
import { AIOrchestratorEngine } from '../../../../../common/engines/ai-orchestrator.engine';
import { NotFoundException } from '@nestjs/common';

describe('GetPatientClinicalSummaryUseCase', () => {
  let useCase: GetPatientClinicalSummaryUseCase;
  let prisma: PrismaService;
  let aiOrchestrator: AIOrchestratorEngine;

  const mockPrisma = {
    lead: {
      findUnique: jest.fn(),
    },
  };

  const mockAI = {
    generate: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetPatientClinicalSummaryUseCase,
        { provide: PrismaService, useValue: { client: mockPrisma } },
        { provide: AIOrchestratorEngine, useValue: mockAI },
      ],
    }).compile();

    useCase = module.get<GetPatientClinicalSummaryUseCase>(GetPatientClinicalSummaryUseCase);
    prisma = module.get<PrismaService>(PrismaService);
    aiOrchestrator = module.get<AIOrchestratorEngine>(AIOrchestratorEngine);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should throw NotFoundException if patient does not exist', async () => {
    mockPrisma.lead.findUnique.mockResolvedValue(null);

    await expect(useCase.execute('invalid-id')).rejects.toThrow(NotFoundException);
  });

  it('should return default message if patient has no appointments', async () => {
    mockPrisma.lead.findUnique.mockResolvedValue({ id: '1', name: 'João', appointments: [] });

    const result = await useCase.execute('1');

    expect(result.summary).toContain('Paciente novo');
    expect(result.riskLevel).toBe('LOW');
  });

  it('should call AI Orchestrator and return clinical summary', async () => {
    const mockPatient = {
      id: '1',
      name: 'João',
      appointments: [
        { startTime: new Date(), procedure: { name: 'Botox' }, status: 'COMPLETED' }
      ]
    };
    mockPrisma.lead.findUnique.mockResolvedValue(mockPatient);
    mockAI.generate.mockResolvedValue({
      extractedData: {
        summary: 'Resumo IA',
        recommendedNextSteps: ['Passo 1'],
        riskLevel: 'MEDIUM'
      }
    });

    const result = await useCase.execute('1');

    expect(result.summary).toBe('Resumo IA');
    expect(result.riskLevel).toBe('MEDIUM');
    expect(aiOrchestrator.generate).toHaveBeenCalled();
  });
});
