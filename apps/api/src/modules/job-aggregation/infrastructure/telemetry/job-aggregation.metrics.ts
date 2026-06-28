import { makeCounterProvider } from '@willsoto/nestjs-prometheus';

export const jobAggregationSyncCounterProvider = makeCounterProvider({
  name: 'job_aggregation_sync_total',
  help: 'Total number of job sync executions',
  labelNames: ['status'],
});

export const jobAggregationJobsCounterProvider = makeCounterProvider({
  name: 'job_aggregation_jobs_aggregated_total',
  help: 'Total number of jobs successfully aggregated',
  labelNames: ['provider', 'organizationId'],
});
