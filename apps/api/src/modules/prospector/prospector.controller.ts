import { Controller, Post, Body, UseGuards, Get, Headers, Param } from '@nestjs/common';
import { HandleIncomingMessageUseCase } from './application/use-cases/handle-incoming-message.use-case';
import { SourceLeadsUseCase } from './application/use-cases/source-leads.use-case';
import { ApproveLeadMessageUseCase } from './application/use-cases/approve-lead-message.use-case';
import { GenerateSalesPitchUseCase } from './application/use-cases/generate-sales-pitch.use-case';
import { ApproveSuggestedMessageUseCase } from './application/use-cases/approve-suggested-message.use-case';
import { ClerkGuard } from '../../common/guards/clerk.guard';
import { MembershipGuard } from '../../common/guards/membership.guard';
import { BranchIsolationGuard } from '../../common/guards/branch-isolation.guard';
import { ModuleAccessGuard } from '../../common/guards/module-access.guard';
import { RequireModule } from '../../common/decorators/module.decorator';
import { CurrentOrg } from '../../common/decorators/org.decorator';
import type { Organization } from '@enterprise/database';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Nexus Prospector')
@Controller('modules/prospector')
@RequireModule('PROSPECTOR')
@UseGuards(ClerkGuard, MembershipGuard, BranchIsolationGuard, ModuleAccessGuard)
export class ProspectorController {
  constructor(
    private readonly handleIncomingMessageUseCase: HandleIncomingMessageUseCase,
    private readonly sourceLeadsUseCase: SourceLeadsUseCase,
    private readonly approveUseCase: ApproveLeadMessageUseCase,
    private readonly generatePitchUseCase: GenerateSalesPitchUseCase,
    private readonly approveSuggestedUseCase: ApproveSuggestedMessageUseCase,
  ) { }

  @Post('chat')
  @ApiOperation({ summary: 'Simulate manual chat interaction' })
  async chat(
    @CurrentOrg() org: Organization,
    @Body() body: {
      message: string;
      phone: string;
      branchId: string;
    },
  ) {
    return this.handleIncomingMessageUseCase.execute({
      externalId: `manual-${Date.now()}`,
      phone: body.phone,
      text: body.message,
      timestamp: new Date(),
      branchId: body.branchId,
      organizationId: org.id,
    });
  }

  @Post('source')
  @ApiOperation({ summary: 'Proactive Lead Sourcing (Maps + AI)' })
  async source(
    @CurrentOrg() org: Organization,
    @Headers('x-branch-id') branchId: string | undefined,
    @Body() body: { sector: string; region: string },
  ) {
    return this.sourceLeadsUseCase.execute({
      sector: body.sector,
      region: body.region,
      organizationId: org.id,
      branchId,
    });
  }

  @Post('leads/:id/generate-pitch')
  @ApiOperation({ summary: 'Generate AI sales pitch for a lead' })
  async generatePitch(
    @CurrentOrg() org: Organization,
    @Param('id') id: string,
  ) {
    return this.generatePitchUseCase.execute({
      leadId: id,
      organizationId: org.id,
    });
  }

  @Post('leads/:id/approve-message')
  @ApiOperation({ summary: 'Approve and send suggested AI pitch' })
  async approveMessage(
    @CurrentOrg() org: Organization,
    @Param('id') id: string,
    @Body() body: { messageId: string; editedText?: string },
  ) {
    return this.approveSuggestedUseCase.execute({
      leadId: id,
      messageId: body.messageId,
      editedText: body.editedText,
      organizationId: org.id,
    });
  }

  @Post('leads/:id/approve')
  @ApiOperation({ summary: 'Approve and send pending outreach message (Legacy)' })
  async approve(
    @CurrentOrg() org: Organization,
    @Param('id') id: string,
    @Body() body: { text?: string },
  ) {
    return this.approveUseCase.execute({
      leadId: id,
      approvedText: body.text,
      organizationId: org.id,
    });
  }

  @Get('leads')
  @ApiOperation({ summary: 'List leads (placeholder)' })
  async getLeads() {
    return { leads: [] }; // Placeholder for E2E testing
  }
}
