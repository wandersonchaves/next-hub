import { Test, TestingModule } from '@nestjs/testing';
import { SourceLeadsUseCase } from '../source-leads.use-case';
import { PrismaService } from '../../../../../prisma/prisma.service';

describe('SourceLeadsUseCase', () => {
  let useCase: SourceLeadsUseCase;
  let prisma: PrismaService;
  let sourceProvider: any;
  let contactFinder: any;
  let aiService: any;
  let whatsappClient: any;

  const mockPrisma = {
    branch: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    lead: {
      upsert: jest.fn(),
    },
  };

  beforeEach(async () => {
    sourceProvider = { searchCompanies: jest.fn() };
    contactFinder = { findMissingPhone: jest.fn() };
    aiService = { generateResponse: jest.fn() };
    whatsappClient = { sendMessage: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SourceLeadsUseCase,
        { provide: PrismaService, useValue: { client: mockPrisma } },
        { provide: 'ILeadSourceProvider', useValue: sourceProvider },
        { provide: 'IContactFinder', useValue: contactFinder },
        { provide: 'IAIService', useValue: aiService },
        { provide: 'IWhatsAppClient', useValue: whatsappClient },
      ],
    }).compile();

    useCase = module.get<SourceLeadsUseCase>(SourceLeadsUseCase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should auto-create a branch if organization has none', async () => {
    mockPrisma.branch.findFirst.mockResolvedValue(null);
    mockPrisma.branch.create.mockResolvedValue({ id: 'new-branch-id' });
    sourceProvider.searchCompanies.mockResolvedValue([]);

    await useCase.execute({ sector: 'S', region: 'R', organizationId: 'org-1' });

    expect(mockPrisma.branch.create).toHaveBeenCalledWith({
      data: { name: 'Filial Principal', organizationId: 'org-1' }
    });
  });

  it('should process discovered companies and enrich missing phones', async () => {
    mockPrisma.branch.findFirst.mockResolvedValue({ id: 'branch-1' });
    sourceProvider.searchCompanies.mockResolvedValue([
      { name: 'Co 1', phone: null, website: 'web.com' }
    ]);
    contactFinder.findMissingPhone.mockResolvedValue('11999999999');
    aiService.generateResponse.mockResolvedValue({ content: 'Icebreaker' });

    await useCase.execute({ sector: 'S', region: 'R', organizationId: 'org-1' });

    expect(contactFinder.findMissingPhone).toHaveBeenCalled();
    expect(mockPrisma.lead.upsert).toHaveBeenCalled();
    expect(whatsappClient.sendMessage).toHaveBeenCalledWith(expect.objectContaining({
      text: 'Icebreaker'
    }));
  });
});
