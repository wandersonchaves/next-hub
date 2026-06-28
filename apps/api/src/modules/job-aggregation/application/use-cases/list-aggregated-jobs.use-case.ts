import { Injectable, Logger, Inject } from '@nestjs/common';
import { IJobManifestationRepositoryToken } from '../../domain/repository-interfaces/job-manifestation.repository.interface';
import type { IJobManifestationRepository } from '../../domain/repository-interfaces/job-manifestation.repository.interface';
import { JobManifestation } from '../../domain/entities/job-manifestation.entity';

@Injectable()
export class ListAggregatedJobsUseCase {
  private readonly logger = new Logger(ListAggregatedJobsUseCase.name);

  constructor(
    @Inject(IJobManifestationRepositoryToken)
    private readonly jobRepository: IJobManifestationRepository,
  ) {}

  async execute(params: {
    organizationId: string;
    cursor?: string;
    limit?: number;
    search?: string;
    status?: string;
  }): Promise<{ items: JobManifestation[]; nextCursor: string | null; limit: number }> {
    const organizationId = params.organizationId;
    const cursor = params.cursor;
    const limit = params.limit !== undefined ? Number(params.limit) : 10;
    const search = params.search;
    const status = params.status;

    this.logger.log(`Listing jobs for organization ${organizationId} (cursor=${cursor || ''}, limit=${limit}, search="${search || ''}", status="${status || ''}")`);

    const result = await this.jobRepository.findPagedCursor({
      organizationId,
      cursor,
      limit,
      search,
      status,
    });

    return {
      items: result.items,
      nextCursor: result.nextCursor,
      limit,
    };
  }
}
