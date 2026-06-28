import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { AggregateIncomingJobsUseCase } from '../../../application/use-cases/aggregate-incoming-jobs.use-case';
import { TenantContextService } from '../../../../../common/utils/tenant-context/tenant-context.service';

@Processor('job-ingestion', {
  concurrency: 5,
  limiter: {
    max: 10,
    duration: 1000,
  },
})
export class JobIngestionConsumer extends WorkerHost {
  private readonly logger = new Logger(JobIngestionConsumer.name);

  constructor(
    private readonly aggregateJobsUseCase: AggregateIncomingJobsUseCase,
    private readonly tenantContext: TenantContextService,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    const { organizationId, query, limit } = job.data;

    this.logger.log(
      `Processing job-ingestion job ${job.id} for organization ${organizationId} with query "${query}"`
    );

    if (!organizationId) {
      throw new Error('organizationId is required for job-ingestion background jobs');
    }

    return this.tenantContext.run(
      { organizationId },
      () => this.aggregateJobsUseCase.execute({
        organizationId,
        query,
        limit,
      }),
    );
  }

  @OnWorkerEvent('failed')
  async onFailed(job: Job, error: Error) {
    const maxAttempts = job.opts.attempts ?? 5;
    if (job.attemptsMade >= maxAttempts) {
      this.logger.error(
        `[DLQ-CRITICAL] Job Ingestion ${job.id} failed permanently on attempt ${job.attemptsMade}/${maxAttempts}. ` +
        `Payload: ${JSON.stringify(job.data)}. ` +
        `Error: ${error.message}. Stack: ${error.stack}`
      );
    } else {
      this.logger.warn(
        `Job Ingestion ${job.id} failed on attempt ${job.attemptsMade}/${maxAttempts}. Will retry. ` +
        `Error: ${error.message}`
      );
    }
  }
}
