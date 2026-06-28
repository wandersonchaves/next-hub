import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ListAggregatedJobsUseCase } from '../../../application/use-cases/list-aggregated-jobs.use-case';
import { MultiLevelAuthGuard } from '../../../../../common/guards/multi-level-auth.guard';
import { MembershipGuard } from '../../../../../common/guards/membership.guard';
import { RolesGuard } from '../../../../../common/guards/roles.guard';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ListJobsQueryDto } from './dtos/list-jobs-query.dto';

@ApiTags('Job Aggregation')
@Controller('v1/organizations/:organizationId/jobs')
@UseGuards(MultiLevelAuthGuard, MembershipGuard, RolesGuard)
export class JobQueryController {
  constructor(
    private readonly listAggregatedJobsUseCase: ListAggregatedJobsUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List aggregated jobs with cursor pagination, search, and provider filtering' })
  @ApiQuery({ name: 'cursor', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  async list(
    @Param('organizationId') organizationId: string,
    @Query() query: ListJobsQueryDto,
  ) {
    return this.listAggregatedJobsUseCase.execute({
      organizationId,
      cursor: query.cursor,
      limit: query.limit,
      search: query.search,
      status: query.status,
    });
  }
}
