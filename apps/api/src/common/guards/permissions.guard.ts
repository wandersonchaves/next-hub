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
    const branchId = request.headers['x-branch-id'] || request.headers['branch-id'];

    if (!user || !organization || !branchId) {
      return false;
    }

    // Check specific branch permissions
    const permission = await this.prisma.client.userBranchPermission.findUnique({
      where: {
        userId_branchId: {
          userId: user.id,
          branchId: branchId as string,
        },
      },
    });

    if (!permission) {
      // If no specific branch permission, we might fallback to admin role if applicable
      const membership = request.membership;
      if (membership && (membership.role === 'ADMIN' || membership.role === 'OWNER')) {
        return true;
      }
      return false;
    }

    // Validate if user has all required permissions for this branch
    const hasAllPermissions = requiredPermissions.every((perm) =>
      permission.permissions.includes(perm),
    );

    if (!hasAllPermissions) {
      throw new ForbiddenException('Insufficient branch permissions');
    }

    return true;
  }
}
