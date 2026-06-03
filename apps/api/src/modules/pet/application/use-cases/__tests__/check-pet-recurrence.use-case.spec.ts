import { Test, TestingModule } from '@nestjs/testing';
import { CheckPetRecurrenceUseCase } from '../check-pet-recurrence.use-case';
import { PrismaService } from '../../../../../prisma/prisma.service';
import { AIOrchestratorEngine } from '../../../../../common/engines/ai-orchestrator.engine';
import { OmniChannelEngine } from '../../../../../common/engines/omni-channel.engine';
import { Pet } from '../../../domain/entities/pet.entity';

describe('CheckPetRecurrenceUseCase', () => {
  let useCase: CheckPetRecurrenceUseCase;
  let petRepository: any;
  let aiOrchestrator: AIOrchestratorEngine;
  let omniChannel: OmniChannelEngine;

  const mockPetRepository = {
    findAllByUnit: jest.fn(),
  };

  const mockPrisma = {
    lead: {
      findUnique: jest.fn(),
    },
  };

  const mockAI = {
    generate: jest.fn(),
  };

  const mockOmni = {
    sendMessage: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CheckPetRecurrenceUseCase,
        { provide: 'IPetRepository', useValue: mockPetRepository },
        { provide: PrismaService, useValue: { client: mockPrisma } },
        { provide: AIOrchestratorEngine, useValue: mockAI },
        { provide: OmniChannelEngine, useValue: mockOmni },
      ],
    }).compile();

    useCase = module.get<CheckPetRecurrenceUseCase>(CheckPetRecurrenceUseCase);
    aiOrchestrator = module.get<AIOrchestratorEngine>(AIOrchestratorEngine);
    omniChannel = module.get<OmniChannelEngine>(OmniChannelEngine);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should trigger reactivation if pet is overdue for a bath', async () => {
    const overdueDate = new Date();
    overdueDate.setDate(overdueDate.getDate() - 20);

    const mockPet = new Pet('pet-1', 'Rex', 'Poodle', 'MEDIUM', 10, overdueDate, 'tutor-1', 'org-1', 'unit-1');
    mockPetRepository.findAllByUnit.mockResolvedValue([mockPet]);
    mockAI.generate.mockResolvedValue({ content: 'Msg IA' });

    await useCase.execute('unit-1', 12);

    expect(aiOrchestrator.generate).toHaveBeenCalled();
    expect(omniChannel.sendMessage).toHaveBeenCalled();
  });

  it('should skip if pet is not overdue', async () => {
    const recentDate = new Date();
    recentDate.setDate(recentDate.getDate() - 5);

    const mockPet = new Pet('pet-1', 'Rex', 'Poodle', 'MEDIUM', 10, recentDate, 'tutor-1', 'org-1', 'unit-1');
    mockPetRepository.findAllByUnit.mockResolvedValue([mockPet]);

    await useCase.execute('unit-1', 12);

    expect(aiOrchestrator.generate).not.toHaveBeenCalled();
    expect(omniChannel.sendMessage).not.toHaveBeenCalled();
  });
});
