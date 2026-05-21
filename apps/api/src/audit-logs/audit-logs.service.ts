import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditLogsService {
  constructor(
    @InjectQueue('audit-logs') private readonly auditQueue: Queue,
    private readonly prisma: PrismaService,
  ) {}

  async getLogs(organizationId: string) {
    return this.prisma.client.auditLog.findMany({
      where: { organizationId },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100, // Limite para performance
    });
  }

  async log(data: {
    action: string;
    entity: string;
    entityId?: string;
    userId: string;
    organizationId: string;
    metadata?: any;
    ipAddress?: string;
    userAgent?: string;
  }) {
    // Non-blocking call: just push to the queue and return immediately
    await this.auditQueue.add('save-log', data, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
    });
  }
}
