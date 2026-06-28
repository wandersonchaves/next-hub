import { Injectable, Logger, Inject } from '@nestjs/common';
import { IMatchAssessmentRepositoryToken } from '../../domain/repository-interfaces/match-assessment.repository.interface';
import type { IMatchAssessmentRepository } from '../../domain/repository-interfaces/match-assessment.repository.interface';

@Injectable()
export class ListMatchAssessmentsUseCase {
  private readonly logger = new Logger(ListMatchAssessmentsUseCase.name);

  constructor(
    @Inject(IMatchAssessmentRepositoryToken)
    private readonly matchRepository: IMatchAssessmentRepository,
  ) {}

  async execute(params: {
    organizationId: string;
    limit?: number;
    cursor?: string;
    minScore?: number;
  }): Promise<{ items: any[]; nextCursor: string | null; limit: number }> {
    const { organizationId, cursor, minScore } = params;
    const limit = params.limit !== undefined ? Number(params.limit) : 10;

    this.logger.log(`Listing matches for organization ${organizationId} (limit=${limit}, cursor=${cursor || ''}, minScore=${minScore || ''})`);

    const result = await this.matchRepository.findPagedCursor({
      organizationId,
      limit,
      cursor,
      minScore,
    });

    return {
      items: result.items,
      nextCursor: result.nextCursor,
      limit,
    };
  }
}
