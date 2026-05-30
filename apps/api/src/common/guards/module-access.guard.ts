import {
  Injectable,
  CanActivate,
  ExecutionContext,
  NotFoundException,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { SaaSControlService, VerticalModule } from '../../modules/nexthub/saas-control/saas-control.service';
import { MODULE_KEY } from '../decorators/module.decorator';
import { TenantContextService } from '../utils/tenant-context/tenant-context.service';

@Injectable()
export class ModuleAccessGuard implements CanActivate {
  private readonly logger = new Logger(ModuleAccessGuard.name);

  constructor(
    private reflector: Reflector,
    private configService: ConfigService,
    private saasControlService: SaaSControlService,
    private tenantContext: TenantContextService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredModule = this.reflector.getAllAndOverride<VerticalModule>(MODULE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const organization = request.organization;

    // RULE: Admin Override (Dono Geral)
    const adminId = this.configService.get<string>('ADMIN_ID');
    const isGlobalAdmin = user && (
      (adminId && (user.id === adminId || user.clerkId === adminId)) ||
      (user.email && user.email.endsWith('@nexthub.com'))
    );
    
    if (isGlobalAdmin) {
      this.logger.debug(`Bypass: Global Admin Access Granted for ${user.email}`);
      return true;
    }

    // Identify organization from context or request
    const orgId = this.tenantContext.organizationId || organization?.id;

    if (!orgId) {
      this.logger.warn(`Access Denied: No Org ID found for user ${user?.email}`);
      throw new NotFoundException();
    }

    // 1. BILLING CHECK (BLOCKING INVOICE)
    const snapshot = await this.saasControlService.getTenantSnapshot(orgId);
    
    if (snapshot.isBlocked) {
      this.logger.warn(`Access Denied: Tenant ${orgId} is blocked/suspended`);
      throw new HttpException('Tenant Suspended', HttpStatus.PAYMENT_REQUIRED);
    }

    if (!requiredModule) {
      return true; // If no module is required (CORE), let it pass
    }

    // 2. MODULE LICENSING CHECK
    const hasAccess = snapshot.activeModules.includes(requiredModule);

    if (!hasAccess) {
      this.logger.warn(`Access Denied: Module ${requiredModule} not enabled for Tenant ${orgId}. Active: ${snapshot.activeModules.join(',')}`);
      throw new NotFoundException();
    }

    return true;
  }
}
