import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { TenantContextModule } from '../../common/utils/tenant-context/tenant-context.module';
import { PrismaModule } from '../../prisma/prisma.module';

import { AggregateIncomingJobsUseCase } from './application/use-cases/aggregate-incoming-jobs.use-case';
import { ListAggregatedJobsUseCase } from './application/use-cases/list-aggregated-jobs.use-case';
import { IJobManifestationRepositoryToken } from './domain/repository-interfaces/job-manifestation.repository.interface';
import { PrismaJobManifestationRepository } from './infrastructure/persistence/prisma/repositories/prisma-job-manifestation.repository';
import { IExternalJobProviderToken } from './application/ports/external-job-provider.port';
import { MockExternalJobProvider } from './infrastructure/adapters/mock-external-job-provider.adapter';
import { GreenhouseJobProvider } from './infrastructure/adapters/greenhouse-job-provider.adapter';
import { LeverJobProvider } from './infrastructure/adapters/lever-job-provider.adapter';
import { CompositeJobProvider } from './infrastructure/adapters/composite-job-provider.adapter';
import { JobIngestionConsumer } from './infrastructure/controllers/consumers/job-ingestion.consumer';
import { JobSyncController } from './infrastructure/controllers/http/job-sync.controller';
import { JobQueryController } from './infrastructure/controllers/v1/job-query.controller';

import { JobAggregationScheduler } from './infrastructure/scheduler/job-aggregation.scheduler';
import { jobAggregationSyncCounterProvider, jobAggregationJobsCounterProvider } from './infrastructure/telemetry/job-aggregation.metrics';

@Module({
  imports: [
    PrismaModule,
    TenantContextModule,
    BullModule.registerQueue(
      {
        name: 'job-ingestion',
        defaultJobOptions: {
          removeOnComplete: { age: 86400, count: 100 },
          removeOnFail: { age: 604800, count: 500 },
        },
      },
      {
        name: 'event-mesh',
        defaultJobOptions: {
          removeOnComplete: { age: 86400, count: 100 },
          removeOnFail: { age: 604800, count: 500 },
        },
      },
    ),
    BullBoardModule.forFeature(
      { name: 'job-ingestion', adapter: BullMQAdapter },
      { name: 'event-mesh', adapter: BullMQAdapter },
    ),
  ],
  controllers: [
    JobSyncController,
    JobQueryController,
  ],
  providers: [
    AggregateIncomingJobsUseCase,
    ListAggregatedJobsUseCase,
    JobIngestionConsumer,
    GreenhouseJobProvider,
    LeverJobProvider,
    CompositeJobProvider,
    MockExternalJobProvider,
    JobAggregationScheduler,
    jobAggregationSyncCounterProvider,
    jobAggregationJobsCounterProvider,
    {
      provide: IJobManifestationRepositoryToken,
      useClass: PrismaJobManifestationRepository,
    },
    {
      provide: IExternalJobProviderToken,
      useClass: CompositeJobProvider,
    },
  ],
  exports: [
    AggregateIncomingJobsUseCase,
    ListAggregatedJobsUseCase,
    IJobManifestationRepositoryToken,
  ],
})
export class JobAggregationModule {}
