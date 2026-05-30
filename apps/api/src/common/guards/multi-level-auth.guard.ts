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
export class MultiLevelAuthGuard implements CanActivate {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const organization = request.organization;

    // Headers
    const tenantId = request.headers['x-tenant-id'] || request.headers['x-organization-id'];
    const unitId = request.headers['x-unit-id'] || request.headers['unit-id'];

    if (!user) {
      return false;
    }

    // 1. RULE: Super-Admin Bypass
    const adminId = this.configService.get<string>('ADMIN_ID');
    if (adminId && (user.id === adminId || user.clerkId === adminId)) {
      return true;
    }

    if (!organization || !unitId) {
      // If we are at org level only, it depends on other guards (MembershipGuard)
      // but for unit-specific routes, we need unitId
      return true; 
    }

    // 2. RULE: Client Isolation & Permission Check
    const permission = await this.prisma.client.userUnitPermission.findFirst({
      where: {
        userId: user.id,
        unitId: unitId as string,
        organizationId: organization.id,
      },
    });

    if (!permission) {
      // Return 404 to hide the existence of the resource (Unit) from unauthorized users
      throw new NotFoundException('Recurso não localizado ou acesso negado.');
    }

    // Optionally inject permission into request for role-based logic later
    request['unitPermission'] = permission;

    return true;
  }
}
