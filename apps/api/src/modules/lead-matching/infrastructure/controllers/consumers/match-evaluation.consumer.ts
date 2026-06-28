import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { EvaluateJobMatchUseCase } from '../../../application/use-cases/evaluate-job-match.use-case';
import { TenantContextService } from '../../../../../common/utils/tenant-context/tenant-context.service';

@Processor('event-mesh')
export class MatchEvaluationConsumer extends WorkerHost {
  private readonly logger = new Logger(MatchEvaluationConsumer.name);

  constructor(
    private readonly evaluateJobMatchUseCase: EvaluateJobMatchUseCase,
    private readonly tenantContext: TenantContextService,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    if (job.name === 'job-aggregation.job-manifestation.created') {
      const { organizationId, payload } = job.data;
      const jobManifestationId = payload?.id;

      this.logger.log(`Processing match evaluation for job ${jobManifestationId} (Org: ${organizationId})`);

      if (!organizationId || !jobManifestationId) {
        this.logger.warn(`Missing organizationId or jobManifestationId in event payload. Job data: ${JSON.stringify(job.data)}`);
        return;
      }

      return this.tenantContext.run(
        { organizationId },
        () => this.evaluateJobMatchUseCase.execute({
          jobManifestationId,
          organizationId,
        }),
      );
    }
  }

  @OnWorkerEvent('failed')
  async onFailed(job: Job, error: Error) {
    this.logger.error(`Match Evaluation Job ${job.id} failed: ${error.message}`, error.stack);
  }
}
