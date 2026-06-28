import { Injectable } from '@nestjs/common';
import type { IExternalJobProvider } from '../../application/ports/external-job-provider.port';
import { JobManifestation } from '../../domain/entities/job-manifestation.entity';
import { GreenhouseJobProvider } from './greenhouse-job-provider.adapter';
import { LeverJobProvider } from './lever-job-provider.adapter';

@Injectable()
export class CompositeJobProvider implements IExternalJobProvider {
  constructor(
    private readonly greenhouseProvider: GreenhouseJobProvider,
    private readonly leverProvider: LeverJobProvider,
  ) {}

  async fetchJobs(organizationId: string, query: string, limit: number = 10): Promise<JobManifestation[]> {
    const halfLimit = Math.ceil(limit / 2);
    
    const [greenhouseJobs, leverJobs] = await Promise.all([
      this.greenhouseProvider.fetchJobs(organizationId, query, halfLimit).catch(() => []),
      this.leverProvider.fetchJobs(organizationId, query, halfLimit).catch(() => []),
    ]);

    return [...greenhouseJobs, ...leverJobs].slice(0, limit);
  }
}
