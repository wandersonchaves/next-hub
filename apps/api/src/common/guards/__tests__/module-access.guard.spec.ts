import { Test, TestingModule } from '@nestjs/testing';
import { ModuleAccessGuard } from '../module-access.guard';
import { SaaSControlService } from '../../../modules/nexthub/saas-control/saas-control.service';
import { MODULE_KEY } from '../../decorators/module.decorator';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TenantContextService } from '../../utils/tenant-context/tenant-context.service';

describe('ModuleAccessGuard', () => {
  let guard: ModuleAccessGuard;
  let saasControlService: SaaSControlService;
  let reflector: Reflector;

  const mockSaaSControlService = {
    getTenantSnapshot: jest.fn(),
  };

  const mockReflector = {
    getAllAndOverride: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockTenantContext = {
    organizationId: 'org-1',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ModuleAccessGuard,
        { provide: SaaSControlService, useValue: mockSaaSControlService },
        { provide: Reflector, useValue: mockReflector },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: TenantContextService, useValue: mockTenantContext },
      ],
    }).compile();

    guard = module.get<ModuleAccessGuard>(ModuleAccessGuard);
    saasControlService = module.get<SaaSControlService>(SaaSControlService);
    reflector = module.get<Reflector>(Reflector);
  });

  it('should allow access if no module is required', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(null);
    mockSaaSControlService.getTenantSnapshot.mockResolvedValue({
      isBlocked: false,
      activeModules: ['CORE']
    });

    const context = {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({ user: { email: 'user@test.com' }, organization: { id: 'org-1' } })
      })
    } as unknown as ExecutionContext;

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('should allow access for global admin', async () => {
    mockConfigService.get.mockReturnValue('admin-id');
    const context = {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({ user: { id: 'admin-id' } })
      })
    } as unknown as ExecutionContext;

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('should throw NotFoundException if validateModuleAccess fails', async () => {
    mockReflector.getAllAndOverride.mockReturnValue('HEALTH');
    mockSaaSControlService.getTenantSnapshot.mockResolvedValue({
      isBlocked: false,
      activeModules: ['PROSPECTOR']
    });
    
    const context = {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({ organization: { id: 'org-1' } })
      })
    } as unknown as ExecutionContext;

    await expect(guard.canActivate(context)).rejects.toThrow(NotFoundException);
  });
});
