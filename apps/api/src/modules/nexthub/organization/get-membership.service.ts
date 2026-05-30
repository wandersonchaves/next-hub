import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Role } from '@enterprise/database';

@Injectable()
export class GetMembershipService {
  constructor(private prisma: PrismaService) {}

  async execute(userId: string, orgSlug: string, requiredRoles?: Role[]) {
    const membership = await this.prisma.client.member.findFirst({
      where: {
        userId,
        organization: {
          slug: orgSlug,
        },
      },
      include: {
        organization: true,
      },
    });

    if (!membership) {
      throw new ForbiddenException('You are not a member of this organization');
    }

    if (requiredRoles && requiredRoles.length > 0) {
      if (!requiredRoles.includes(membership.role)) {
        throw new ForbiddenException('Insufficient permissions');
      }
    }

    return membership;
  }
}
