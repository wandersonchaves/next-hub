import { Controller, Post, Param, Body, UseGuards } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { MultiLevelAuthGuard } from '../../../../../common/guards/multi-level-auth.guard';
import { MembershipGuard } from '../../../../../common/guards/membership.guard';
import { RolesGuard } from '../../../../../common/guards/roles.guard';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Job Aggregation')
@Controller('v1/organizations/:organizationId/jobs/sync')
@UseGuards(MultiLevelAuthGuard, MembershipGuard, RolesGuard)
export class JobSyncController {
  constructor(
    @InjectQueue('job-ingestion')
    private readonly jobQueue: Queue,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Sync and aggregate jobs from external providers' })
  async sync(
    @Param('organizationId') organizationId: string,
    @Body() payload: { limit?: number; query?: string },
  ) {
    const limit = payload.limit !== undefined ? Number(payload.limit) : 10;
    const query = payload.query || 'Engineering';

    const job = await this.jobQueue.add('aggregate-jobs', {
      organizationId,
      query,
      limit,
    });

    return {
      status: 'sync_initiated',
      jobId: job.id,
      organizationId,
    };
  }
}
