import { Test, TestingModule } from '@nestjs/testing';
import { ModuleAccessGuard } from '../module-access.guard';
import { SaaSControlService } from '../../../core/saas-control/saas-control.service';
import { MODULE_KEY } from '../../decorators/module.decorator';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, NotFoundException } from '@nestjs/common';

describe('ModuleAccessGuard', () => {
  let guard: ModuleAccessGuard;
  let saasControlService: SaaSControlService;
  let reflector: Reflector;

  const mockSaaSControlService = {
    validateModuleAccess: jest.fn(),
  };

  const mockReflector = {
    getAllAndOverride: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ModuleAccessGuard,
        { provide: SaaSControlService, useValue: mockSaaSControlService },
        { provide: Reflector, useValue: mockReflector },
      ],
    }).compile();

    guard = module.get<ModuleAccessGuard>(ModuleAccessGuard);
    saasControlService = module.get<SaaSControlService>(SaaSControlService);
    reflector = module.get<Reflector>(Reflector);
  });

  it('should allow access if no module is required', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(null);
    const context = {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({ organization: { id: 'org-1' } })
      })
    } as unknown as ExecutionContext;

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('should throw NotFoundException if organization context is missing', async () => {
    mockReflector.getAllAndOverride.mockReturnValue('HEALTH');
    const context = {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({ organization: null })
      })
    } as unknown as ExecutionContext;

    await expect(guard.canActivate(context)).rejects.toThrow(NotFoundException);
  });

  it('should throw NotFoundException if validateModuleAccess returns false', async () => {
    mockReflector.getAllAndOverride.mockReturnValue('HEALTH');
    mockSaaSControlService.validateModuleAccess.mockResolvedValue(false);
    
    const context = {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({ organization: { id: 'org-1' } })
      })
    } as unknown as ExecutionContext;

    await expect(guard.canActivate(context)).rejects.toThrow(NotFoundException);
  });

  it('should allow access if validateModuleAccess returns true', async () => {
    mockReflector.getAllAndOverride.mockReturnValue('HEALTH');
    mockSaaSControlService.validateModuleAccess.mockResolvedValue(true);
    
    const context = {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({ organization: { id: 'org-1' } })
      })
    } as unknown as ExecutionContext;

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });
});
