import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../../../prisma/prisma.service';

@Injectable()
export class JobAggregationScheduler {
  private readonly logger = new Logger(JobAggregationScheduler.name);

  constructor(
    @InjectQueue('job-ingestion')
    private readonly jobQueue: Queue,
    private readonly prisma: PrismaService,
  ) {}

  @Cron('0 2 * * *')
  async handleDailySync() {
    this.logger.log('Starting scheduled daily job aggregation sync at 02:00 AM');

    try {
      const activeOrgs = await this.prisma.client.organization.findMany({
        where: {
          status: 'ACTIVE',
        },
        select: {
          id: true,
          name: true,
        },
      });

      this.logger.log(`Found ${activeOrgs.length} active organizations to sync`);

      for (const org of activeOrgs) {
        this.logger.log(`Scheduling job sync for organization: ${org.name} (${org.id})`);
        
        await this.jobQueue.add('aggregate-jobs', {
          organizationId: org.id,
          query: 'Engineering',
          limit: 100,
        });
      }
    } catch (error) {
      this.logger.error(`Error scheduling daily job sync: ${error.message}`, error.stack);
    }
  }
}
