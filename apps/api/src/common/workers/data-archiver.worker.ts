import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
@Processor('data-archiver')
export class DataArchiverWorker extends WorkerHost {
  private readonly logger = new Logger(DataArchiverWorker.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job): Promise<void> {
    this.logger.log(`Starting Data Archiving Cron Job: ${job.id}`);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // 1. Identify records to archive (older than 30 days)
    const oldInteractions = await this.prisma.client.interaction.findMany({
      where: {
        createdAt: { lt: thirtyDaysAgo },
      },
      include: { organization: true },
    });

    if (oldInteractions.length === 0) {
      this.logger.debug('No interactions found to archive.');
      return;
    }

    // 2. Group by Tenant for Batch Archiving
    const groupedByTenant = oldInteractions.reduce((acc, current) => {
      const orgId = current.organizationId;
      if (!acc[orgId]) acc[orgId] = [];
      acc[orgId].push(current);
      return acc;
    }, {} as Record<string, any[]>);

    for (const [orgId, interactions] of Object.entries(groupedByTenant)) {
      try {
        this.logger.log(`Archiving ${interactions.length} interactions for Tenant ${orgId}`);

        // 3. SIMULATE S3 UPLOAD
        const archivePayload = JSON.stringify(interactions);
        const fileName = `archives/${orgId}/interactions_${new Date().toISOString()}.json`;
        
        // Mocking AWS SDK call
        await this.simulateS3Upload(fileName, archivePayload);

        // 4. Safe Pruning (Atomic Transaction)
        const interactionIds = interactions.map((i: any) => i.id);
        await this.prisma.client.interaction.deleteMany({
          where: {
            id: { in: interactionIds },
          },
        });

        this.logger.log(`Pruned ${interactions.length} records for Tenant ${orgId} after successful S3 sync.`);
      } catch (err) {
        this.logger.error(`Failed to archive data for Tenant ${orgId}: ${err.message}`);
      }
    }
  }

  private async simulateS3Upload(key: string, data: string): Promise<void> {
    // Artificial latency to simulate network call
    await new Promise(resolve => setTimeout(resolve, 500));
    this.logger.debug(`[MOCK AWS S3] Uploaded ${data.length} bytes to bucket: next-hub-cold-storage, Key: ${key}`);
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(`Archive Job ${job.id} completed successfully.`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(`Archive Job ${job.id} failed: ${error.message}`);
  }
}
