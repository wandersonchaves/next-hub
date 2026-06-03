import { Test, TestingModule } from '@nestjs/testing';
import { SourceLeadsUseCase } from '../source-leads.use-case';
import { PrismaService } from '../../../../../prisma/prisma.service';
import { AIOrchestratorEngine } from '../../../../../common/engines/ai-orchestrator.engine';

describe('SourceLeadsUseCase', () => {
  let useCase: SourceLeadsUseCase;
  let prisma: PrismaService;
  let sourceProvider: any;
  let aiOrchestrator: any;

  const mockPrisma = {
    unit: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    lead: {
      upsert: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    sourceProvider = { findLeads: jest.fn() };
    aiOrchestrator = { generate: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SourceLeadsUseCase,
        { provide: PrismaService, useValue: { client: mockPrisma } },
        { provide: 'ILeadSourceProvider', useValue: sourceProvider },
        { provide: AIOrchestratorEngine, useValue: aiOrchestrator },
      ],
    }).compile();

    useCase = module.get<SourceLeadsUseCase>(SourceLeadsUseCase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should auto-create a unit if organization has none', async () => {
    mockPrisma.unit.findFirst.mockResolvedValue(null);
    mockPrisma.unit.create.mockResolvedValue({ id: 'new-unit-id' });
    sourceProvider.findLeads.mockResolvedValue([]);

    await useCase.execute({ sector: 'S', region: 'R', organizationId: 'org-1' });

    expect(mockPrisma.unit.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ organizationId: 'org-1' })
    }));
  });

  it('should process discovered leads and generate pitches', async () => {
    mockPrisma.unit.findFirst.mockResolvedValue({ id: 'unit-1' });
    mockPrisma.lead.upsert.mockResolvedValue({ id: 'lead-1', name: 'Co 1' });
    sourceProvider.findLeads.mockResolvedValue([
      { name: 'Co 1', phone: '5511999999999', address: 'Addr 1' }
    ]);
    aiOrchestrator.generate.mockResolvedValue({ content: 'Icebreaker' });

    await useCase.execute({ sector: 'S', region: 'R', organizationId: 'org-1' });

    expect(sourceProvider.findLeads).toHaveBeenCalled();
    expect(mockPrisma.lead.upsert).toHaveBeenCalled();
    expect(aiOrchestrator.generate).toHaveBeenCalled();
    expect(mockPrisma.lead.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'lead-1' },
      data: { pendingMessage: 'Icebreaker' }
    }));
  });
});
