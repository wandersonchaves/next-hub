import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GetMembershipService } from '../../modules/nexthub/organization/get-membership.service';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { Role } from '@enterprise/database';

@Injectable()
export class MembershipGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private getMembershipService: GetMembershipService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // 1. TRUST PREVIOUS GUARD: If MultiLevelAuthGuard already populated the organization and membership, we trust it.
    if (request['organization'] && request['membership']) {
      return true;
    }

    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const user = request.user;
    const orgSlug = request.params.orgSlug || request.query.orgSlug;
    const headerOrgId = request.headers['x-organization-id'] || request.headers['organization-id'] || request.headers['x-company-id'];

    if (!user) {
      return false;
    }

    // 2. Resolve Organization via Header
    if (headerOrgId) {
      // Compatibility with native session (where memberships are simple objects)
      const memberships = user.memberships || [];
      const membership = memberships.find(
        (m: any) => 
          m.organizationId === headerOrgId || 
          m.organization?.id === headerOrgId || 
          m.organization?.clerkId === headerOrgId
      );

      if (!membership) {
        throw new ForbiddenException('Acesso negado: Você não é membro desta organização.');
      }
      
      request['membership'] = membership;
      request['organization'] = membership.organization || { id: membership.organizationId };
      return true;
    }

    // 3. Resolve Organization via Slug
    if (orgSlug) {
      const membership = await this.getMembershipService.execute(
        user.id,
        orgSlug,
        requiredRoles,
      );
      request['membership'] = membership;
      request['organization'] = membership.organization;
      return true;
    }

    // 4. Fallback: Use user's first organization if nothing else matches (Dev Experience)
    if (user.memberships && user.memberships.length > 0) {
      const firstMembership = user.memberships[0];
      request['membership'] = firstMembership;
      request['organization'] = firstMembership.organization || { id: firstMembership.organizationId };
      return true;
    }

    return true;
  }
}
