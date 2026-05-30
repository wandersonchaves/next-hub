import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { tenantContext } from '@enterprise/database';

@Injectable()
export class TenantContextGuard implements CanActivate {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const organization = request.organization;

    // Capture IDs from headers
    const companyId = request.headers['x-company-id'] || request.headers['x-organization-id'];
    const unitId = request.headers['x-unit-id'] || request.headers['unit-id'];

    if (!user) {
      return false;
    }

    // 1. RULE: Super-Admin Bypass
    const adminId = this.configService.get<string>('ADMIN_ID');
    const isSuperAdmin = user && (
      (adminId && (user.id === adminId || user.clerkId === adminId)) ||
      (user.email && user.email.endsWith('@nexthub.com'))
    );

    if (isSuperAdmin) {
      // In Super-Admin mode, we might still want to respect the unitId if provided for simulation
      // but otherwise we let them through to everything.
      return true;
    }

    // 2. Client Isolation & Role Validation
    if (!companyId || !unitId) {
      // If no context is provided for a unit-specific action, we can't authorize
      // Some routes might not need unitId, but this guard is for strict isolation.
      // If we are at org level, we'd need organization validation.
      
      if (!companyId && !organization) {
         throw new ForbiddenException('Company context is required');
      }
      
      return true; // Let other guards handle pure organization access
    }

    // Identify organization ID (trust header or resolved org)
    const resolvedOrgId = organization?.id || companyId;

    // Check specific Unit permission for the User
    const permission = await this.prisma.client.userUnitPermission.findFirst({
      where: {
        userId: user.id,
        unitId: unitId as string,
        organizationId: resolvedOrgId as string,
      },
    });

    if (!permission) {
      // Return 404 to hide existence
      throw new NotFoundException('Recurso não localizado ou acesso negado.');
    }

    // The implicit filtering is handled by TenantInterceptor + Prisma Extension.
    // This guard just ensures the user HAS the right to be in this context.

    return true;
  }
}
