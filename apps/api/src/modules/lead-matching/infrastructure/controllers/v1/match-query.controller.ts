import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ListMatchAssessmentsUseCase } from '../../../application/use-cases/list-match-assessments.use-case';
import { MultiLevelAuthGuard } from '../../../../../common/guards/multi-level-auth.guard';
import { MembershipGuard } from '../../../../../common/guards/membership.guard';
import { RolesGuard } from '../../../../../common/guards/roles.guard';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ListMatchesQueryDto } from './dtos/list-matches-query.dto';

@ApiTags('Lead Matching')
@Controller('v1/organizations/:organizationId/matches')
@UseGuards(MultiLevelAuthGuard, MembershipGuard, RolesGuard)
export class MatchQueryController {
  constructor(
    private readonly listMatchAssessmentsUseCase: ListMatchAssessmentsUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List lead matching assessments with cursor pagination and score filtering' })
  @ApiQuery({ name: 'cursor', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'minScore', required: false, type: Number })
  async list(
    @Param('organizationId') organizationId: string,
    @Query() query: ListMatchesQueryDto,
  ) {
    return this.listMatchAssessmentsUseCase.execute({
      organizationId,
      cursor: query.cursor,
      limit: query.limit,
      minScore: query.minScore,
    });
  }
}
