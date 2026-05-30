import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class UsageMeteringService {
  private readonly logger = new Logger(UsageMeteringService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Increments the usage count for an organization.
   * Useful for tracking outbound message volume.
   */
  async incrementUsage(organizationId: string): Promise<void> {
    try {
      await this.prisma.client.organization.update({
        where: { id: organizationId },
        data: {
          usageCount: {
            increment: 1,
          },
        },
      });
      this.logger.debug(`Usage incremented for organization ${organizationId}`);
    } catch (err) {
      this.logger.error(`Failed to increment usage for organization ${organizationId}: ${err.message}`);
    }
  }

  /**
   * Resets the usage count (e.g., at the start of a billing cycle).
   */
  async resetUsage(organizationId: string): Promise<void> {
    await this.prisma.client.organization.update({
      where: { id: organizationId },
      data: { usageCount: 0 },
    });
  }
}
