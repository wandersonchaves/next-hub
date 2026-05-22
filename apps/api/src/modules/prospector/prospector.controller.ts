import { Controller, Post, Body, UseGuards, Get } from '@nestjs/common';
import { HandleIncomingMessageUseCase } from './application/use-cases/handle-incoming-message.use-case';
import { ClerkGuard } from '../../common/guards/clerk.guard';
import { MembershipGuard } from '../../common/guards/membership.guard';
import { BranchIsolationGuard } from '../../common/guards/branch-isolation.guard';
import { CurrentOrg } from '../../common/decorators/org.decorator';
import type { Organization } from '@enterprise/database';

@Controller('modules/prospector')
@UseGuards(ClerkGuard, MembershipGuard, BranchIsolationGuard)
export class ProspectorController {
  constructor(
    private readonly handleIncomingMessageUseCase: HandleIncomingMessageUseCase,
  ) { }

  @Post('chat')
  async chat(
    @CurrentOrg() org: Organization,
    @Body() body: {
      message: string;
      phone: string;
      branchId: string;
      nicheContext: string;
      plansContext: string;
    },
  ) {
    return this.handleIncomingMessageUseCase.execute({
      ...body,
      organizationId: org.id,
    });
  }

  @Get('leads')
  async getLeads() {
    return { leads: [] }; // Placeholder for E2E testing
  }
}
