import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { TenantContextModule } from '../../common/utils/tenant-context/tenant-context.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { JobAggregationModule } from '../job-aggregation/job-aggregation.module';

import { EvaluateJobMatchUseCase } from './application/use-cases/evaluate-job-match.use-case';
import { ListMatchAssessmentsUseCase } from './application/use-cases/list-match-assessments.use-case';
import { IMatchAssessmentRepositoryToken } from './domain/repository-interfaces/match-assessment.repository.interface';
import { PrismaMatchAssessmentRepository } from './infrastructure/persistence/prisma/repositories/prisma-match-assessment.repository';
import { MatchEvaluationConsumer } from './infrastructure/controllers/consumers/match-evaluation.consumer';
import { MatchQueryController } from './infrastructure/controllers/v1/match-query.controller';

@Module({
  imports: [
    PrismaModule,
    TenantContextModule,
    JobAggregationModule,
    BullModule.registerQueue({
      name: 'event-mesh',
      defaultJobOptions: {
        removeOnComplete: { age: 86400, count: 100 },
        removeOnFail: { age: 604800, count: 500 },
      },
    }),
    BullBoardModule.forFeature({
      name: 'event-mesh',
      adapter: BullMQAdapter,
    }),
  ],
  controllers: [MatchQueryController],
  providers: [
    EvaluateJobMatchUseCase,
    ListMatchAssessmentsUseCase,
    MatchEvaluationConsumer,
    {
      provide: IMatchAssessmentRepositoryToken,
      useClass: PrismaMatchAssessmentRepository,
    },
  ],
  exports: [EvaluateJobMatchUseCase, ListMatchAssessmentsUseCase],
})
export class LeadMatchingModule {}
