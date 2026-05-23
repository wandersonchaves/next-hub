import {
  Injectable,
  CanActivate,
  ExecutionContext,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SaaSControlService, VerticalModule } from '../../core/saas-control/saas-control.service';
import { MODULE_KEY } from '../decorators/module.decorator';

@Injectable()
export class ModuleAccessGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private saasControlService: SaaSControlService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredModule = this.reflector.getAllAndOverride<VerticalModule>(MODULE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredModule) {
      return true; // If no module is required, let it pass
    }

    const request = context.switchToHttp().getRequest();
    const organization = request.organization;

    if (!organization) {
      // If the user hasn't authenticated to an organization yet, we can't check
      // For absolute isolation, we return 404 to hide the route's existence.
      throw new NotFoundException();
    }

    const hasAccess = await this.saasControlService.validateModuleAccess(organization.id, requiredModule);

    if (!hasAccess) {
      // Return 404 instead of 403 to completely hide the existence of modules the tenant doesn't pay for.
      throw new NotFoundException();
    }

    return true;
  }
}
