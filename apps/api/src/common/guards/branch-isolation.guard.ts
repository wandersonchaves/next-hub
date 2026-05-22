import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class BranchIsolationGuard implements CanActivate {
  constructor(private prisma: PrismaService) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const branchId = request.headers['x-branch-id'] || request.headers['branch-id'];
    const organization = request.organization;

    if (!branchId) {
      return true; // No branch requested, isolation continues at org level
    }

    if (!organization) {
      return true; // No org context yet, isolation handled by other guards
    }

    // Verify if the requested branch belongs to the current active organization
    const branch = await this.prisma.client.branch.findUnique({
      where: { id: branchId as string },
      select: { organizationId: true }
    });

    if (!branch || branch.organizationId !== organization.id) {
      throw new ForbiddenException('Branch access denied: Isolation violation');
    }

    return true;
  }
}
