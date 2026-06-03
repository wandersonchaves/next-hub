import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const organization = request.organization;
    const unitId = request.headers['x-unit-id'] || request.headers['unit-id'];

    if (!user || !organization || !unitId) {
      return false;
    }

    // Check specific unit permissions using the new UserOrganizationUnit model
    const permission = await this.prisma.client.userOrganizationUnit.findUnique({
      where: {
        userId_unitId: {
          userId: user.id,
          unitId: unitId as string,
        },
      },
    });

    if (!permission) {
      const membership = request.membership;
      if (membership && (membership.role === 'ADMIN' || membership.role === 'OWNER')) {
        return true;
      }
      return false;
    }

    if (permission.role === 'ORGANIZATION_ADMIN' || permission.role === 'UNIT_MANAGER') {
      return true;
    }

    return true;
  }
}
