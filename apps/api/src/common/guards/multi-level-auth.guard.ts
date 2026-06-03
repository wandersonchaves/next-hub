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
      return true;
    }

    if (!organization || !unitId) {
      return true; 
    }

    // 2. RULE: Client Isolation & Permission Check
    const permission = await this.prisma.client.userOrganizationUnit.findFirst({
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
