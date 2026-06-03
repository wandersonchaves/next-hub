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

    // 1. ABSOLUTE BYPASS: Super-Admin Escape Route
    const adminId = this.configService.get<string>('ADMIN_ID');
    const isGlobalAdmin = user && (
      (adminId && (user.id === adminId || user.clerkId === adminId)) ||
      (user.email && (user.email.startsWith('wandersonchaves') || user.email.endsWith('@nexthub.com')))
    );
    
    if (isGlobalAdmin) {
      this.logger.debug(`Bypass: Absolute Admin Access Granted for ${user.email}`);
      return true;
    }

    // Identify organization from context or request
    const orgId = this.tenantContext.organizationId || organization?.id;

    if (!orgId) {
      this.logger.warn(`Access Denied: No Org ID found for user ${user?.email}`);
      throw new NotFoundException();
    }

    // 2. BILLING CHECK (HTTP 402)
    const snapshot = await this.saasControlService.getTenantSnapshot(orgId);
    
    if (snapshot.isBlocked) {
      if (request.method !== 'GET') {
        this.logger.warn(`Access Denied (402): Tenant ${orgId} is suspended. Mutation rejected.`);
        throw new HttpException(
          'Recurso restrito: Modo Leitura Ativo devido a pendências financeiras.', 
          HttpStatus.PAYMENT_REQUIRED
        );
      }
    }

    if (!requiredModule) {
      return true;
    }

    // 3. WHITE-LABEL ISOLATION CHECK (HTTP 404)
    const hasAccess = snapshot.activeModules.includes(requiredModule);

    if (!hasAccess) {
      this.logger.warn(`White-label Block: Module ${requiredModule} hidden for Tenant ${orgId}`);
      throw new NotFoundException();
    }

    return true;
  }
}
