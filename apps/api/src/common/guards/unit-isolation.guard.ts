import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class UnitIsolationGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const organization = request.organization;
    const unitId = request.headers['x-unit-id'] || request.headers['unit-id'];

    if (!unitId) {
      return true; // No unit requested, isolation continues at org level
    }

    if (!organization) {
      return false;
    }

    // Verify if the requested unit belongs to the current active organization
    const unit = await this.prisma.client.unit.findUnique({
      where: { id: unitId as string },
      select: { organizationId: true }
    });

    if (!unit || unit.organizationId !== organization.id) {
      throw new ForbiddenException('Unit access denied: Isolation violation');
    }

    return true;
  }
}
