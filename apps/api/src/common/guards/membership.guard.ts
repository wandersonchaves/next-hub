import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GetMembershipService } from '../../core/organization/get-membership.service';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { Role } from '@enterprise/database';

@Injectable()
export class MembershipGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private getMembershipService: GetMembershipService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const orgSlug = request.params.orgSlug || request.query.orgSlug;
    const headerOrgId = request.headers['x-organization-id'] || request.headers['organization-id'];

    if (!user) {
      return false;
    }

    // 1. If we have a headerOrgId, ensure user is a member of that specific organization
    if (headerOrgId) {
      const membership = user.memberships?.find(m => m.organization.id === headerOrgId);
      if (!membership) {
        throw new ForbiddenException('Access denied: You are not a member of this organization');
      }
      request['membership'] = membership;
      request['organization'] = membership.organization;
    }

    // 2. If no orgSlug is provided, we're done (the header already established context if present)
    if (!orgSlug) {
      return true;
    }

    // 3. If orgSlug is provided, verify membership by slug (legacy or slug-based routes)
    const membership = await this.getMembershipService.execute(
      user.id,
      orgSlug,
      requiredRoles,
    );

    request['membership'] = membership;
    request['organization'] = membership.organization;

    return true;
  }
}
