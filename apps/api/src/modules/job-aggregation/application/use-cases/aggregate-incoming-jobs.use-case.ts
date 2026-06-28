import { Injectable, Logger, Inject } from '@nestjs/common';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import type { Counter } from 'prom-client';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { IJobManifestationRepositoryToken } from '../../domain/repository-interfaces/job-manifestation.repository.interface';
import type { IJobManifestationRepository } from '../../domain/repository-interfaces/job-manifestation.repository.interface';
import { IExternalJobProviderToken } from '../ports/external-job-provider.port';
import type { IExternalJobProvider } from '../ports/external-job-provider.port';
import { JobManifestation } from '../../domain/entities/job-manifestation.entity';

@Injectable()
export class AggregateIncomingJobsUseCase {
  private readonly logger = new Logger(AggregateIncomingJobsUseCase.name);

  constructor(
    @Inject(IJobManifestationRepositoryToken)
    private readonly jobRepository: IJobManifestationRepository,
    @Inject(IExternalJobProviderToken)
    private readonly jobProvider: IExternalJobProvider,
    @InjectMetric('job_aggregation_sync_total')
    private readonly syncCounter: Counter<string>,
    @InjectMetric('job_aggregation_jobs_aggregated_total')
    private readonly jobsCounter: Counter<string>,
    @InjectQueue('event-mesh')
    private readonly eventMeshQueue: Queue,
  ) {}

  async execute(params: {
    organizationId: string;
    query: string;
    limit?: number;
  }): Promise<{ aggregatedCount: number; duplicatesCount: number }> {
    const { organizationId, query, limit = 10 } = params;
    this.logger.log(`Starting job aggregation for organization ${organizationId} with query "${query}"`);

    try {
      const externalJobs = await this.jobProvider.fetchJobs(organizationId, query, limit);
      this.logger.log(`Fetched ${externalJobs.length} external jobs for query "${query}"`);

      let aggregatedCount = 0;
      let duplicatesCount = 0;

      for (const job of externalJobs) {
        // Double check multi-tenancy: each query must include organizationId
        const existingJob = await this.jobRepository.findByFingerprint(organizationId, job.fingerprint.value);
        if (existingJob) {
          this.logger.debug(`Job already exists: fingerprint ${job.fingerprint.value} (Organization: ${organizationId})`);
          duplicatesCount++;
          continue;
        }

        // Save new aggregated job manifestation
        // Ensure tenant isolation
        const jobToSave = new JobManifestation(
          null,
          job.title,
          job.company,
          job.location,
          job.description,
          job.url,
          job.fingerprint,
          job.compensation,
          job.provider,
          organizationId,
        );

        const savedJob = await this.jobRepository.save(jobToSave);
        aggregatedCount++;

        try {
          await this.eventMeshQueue.add('job-aggregation.job-manifestation.created', {
            id: Math.random().toString(36).substring(7),
            organizationId,
            timestamp: new Date(),
            type: 'job-aggregation.job-manifestation.created',
            payload: {
              id: savedJob.id,
              title: savedJob.title,
              company: savedJob.company,
            },
          });
        } catch (eventError) {
          this.logger.error(`Failed to publish job-manifestation.created event for ${savedJob.id}: ${eventError.message}`);
        }

        // Track telemetry metric
        this.jobsCounter.labels(job.provider, organizationId).inc();
      }

      this.syncCounter.labels('success').inc();
      this.logger.log(`Aggregation finished. Saved ${aggregatedCount} new jobs, skipped ${duplicatesCount} duplicates.`);
      return { aggregatedCount, duplicatesCount };
    } catch (error) {
      this.syncCounter.labels('failure').inc();
      this.logger.error(`Error during job aggregation for query "${query}": ${error.message}`, error.stack);
      throw error;
    }
  }
}
