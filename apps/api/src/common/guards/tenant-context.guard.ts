import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

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

    // Capture IDs from headers or query params
    const companyId = request.headers['x-company-id'] || request.headers['x-organization-id'] || request.query?.['x-organization-id'] || request.query?.['organizationId'];
    const unitId = request.headers['x-unit-id'] || request.headers['unit-id'] || request.query?.['x-unit-id'] || request.query?.['unitId'];

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
      return true;
    }

    // 2. Client Isolation & Role Validation
    if (!companyId || !unitId) {
      if (!companyId && !organization) {
         throw new ForbiddenException('Company context is required');
      }
      return true; 
    }

    const resolvedOrgId = organization?.id || companyId;

    // Check specific Unit permission for the User using the new UserOrganizationUnit model
    const permission = await this.prisma.client.userOrganizationUnit.findFirst({
      where: {
        userId: user.id,
        unitId: unitId as string,
        organizationId: resolvedOrgId as string,
      },
    });

    if (!permission) {
      throw new NotFoundException('Recurso não localizado ou acesso negado.');
    }

    return true;
  }
}
