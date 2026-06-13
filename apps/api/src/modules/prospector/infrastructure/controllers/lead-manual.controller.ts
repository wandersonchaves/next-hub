import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { CreateLeadWithContextUseCase } from '../../application/use-cases/create-lead-with-context.use-case';
import { CreateManualLeadDto } from '../dtos/create-manual-lead.dto';
import { LeadOutputDto } from '../dtos/lead-output.dto';
import { MultiLevelAuthGuard } from '../../../../common/guards/multi-level-auth.guard';
import { MembershipGuard } from '../../../../common/guards/membership.guard';
import { TenantContextGuard } from '../../../../common/guards/tenant-context.guard';
import { ProspectorAdminGuard } from '../../../../common/guards/prospector-admin.guard';
import { ModuleAccessGuard } from '../../../../common/guards/module-access.guard';
import { RequireModule } from '../../../../common/decorators/module.decorator';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Nexus Prospector Manual')
@Controller('modules/prospector/leads')
@RequireModule('PROSPECTOR')
@UseGuards(MultiLevelAuthGuard, MembershipGuard, TenantContextGuard, ProspectorAdminGuard, ModuleAccessGuard)
export class LeadManualController {
  constructor(
    private readonly createLeadWithContextUseCase: CreateLeadWithContextUseCase,
  ) {}

  @Post('manual')
  @ApiOperation({ summary: 'Register lead manually with historical message context' })
  async createManualLead(@Body() dto: CreateManualLeadDto) {
    const lead = await this.createLeadWithContextUseCase.execute(dto);
    return LeadOutputDto.fromPrisma(lead);
  }
}
