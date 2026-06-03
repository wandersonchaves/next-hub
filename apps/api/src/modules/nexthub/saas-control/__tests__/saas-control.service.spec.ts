import { Test, TestingModule } from '@nestjs/testing';
import { SaaSControlService, VerticalModule } from '../saas-control.service';
import { PrismaService } from '../../../../prisma/prisma.service';
import { ForbiddenException } from '@nestjs/common';

describe('SaaSControlService', () => {
  let service: SaaSControlService;
  let prisma: PrismaService;

  const mockPrisma = {
    organization: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SaaSControlService,
        { provide: PrismaService, useValue: { client: mockPrisma } },
      ],
    }).compile();

    service = module.get<SaaSControlService>(SaaSControlService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getTenantSnapshot', () => {
    it('should throw ForbiddenException if organization not found', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue(null);

      await expect(service.getTenantSnapshot('invalid-id'))
        .rejects.toThrow(ForbiddenException);
    });

    it('should return snapshot with active modules', async () => {
      const mockOrg = {
        id: 'org-1',
        status: 'ACTIVE',
        enabledModules: ['PROSPECTOR', 'HEALTH'],
        subscription: { plan: 'PRO' },
        units: []
      };
      mockPrisma.organization.findUnique.mockResolvedValue(mockOrg);

      const snapshot = await service.getTenantSnapshot('org-1');

      expect(snapshot.organizationId).toBe('org-1');
      expect(snapshot.activeModules).toContain('PROSPECTOR' as VerticalModule);
      expect(snapshot.activeModules).toContain('HEALTH' as VerticalModule);
    });
  });

  describe('validateModuleAccess', () => {
    it('should return true if module is in active list', async () => {
      jest.spyOn(service, 'getTenantSnapshot').mockResolvedValue({
        organizationId: 'org-1',
        isBlocked: false,
        status: 'ACTIVE',
        activeModules: ['PROSPECTOR', 'CORE'],
        plan: 'PRO',
        units: []
      });

      const result = await service.validateModuleAccess('org-1', 'PROSPECTOR');
      expect(result).toBe(true);
    });

    it('should return false if tenant is blocked', async () => {
      jest.spyOn(service, 'getTenantSnapshot').mockResolvedValue({
        organizationId: 'org-1',
        isBlocked: true,
        status: 'SUSPENDED',
        activeModules: ['PROSPECTOR'],
        plan: 'PRO',
        units: []
      });

      const result = await service.validateModuleAccess('org-1', 'PROSPECTOR');
      expect(result).toBe(false);
    });
  });
});
