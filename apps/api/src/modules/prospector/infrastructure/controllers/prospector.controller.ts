import { Controller, Post, Body, UseGuards, Get, Headers, Param, BadRequestException, Sse, MessageEvent } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Observable } from 'rxjs';
import { PrismaService } from '../../../../prisma/prisma.service';
import { HandleIncomingMessageUseCase } from '../../application/use-cases/handle-incoming-message.use-case';
import { SourceLeadsUseCase } from '../../application/use-cases/source-leads.use-case';
import { GenerateSalesPitchUseCase } from '../../application/use-cases/generate-sales-pitch.use-case';
import { SendOutboundMessageUseCase } from '../../application/use-cases/send-outbound-message.use-case';
import { ProspectorSseService } from '../../services/prospector-sse.service';
import { MultiLevelAuthGuard } from '../../../../common/guards/multi-level-auth.guard';
import { MembershipGuard } from '../../../../common/guards/membership.guard';
import { TenantContextGuard } from '../../../../common/guards/tenant-context.guard';
import { ProspectorAdminGuard } from '../../../../common/guards/prospector-admin.guard';
import { ModuleAccessGuard } from '../../../../common/guards/module-access.guard';
import { RequireModule } from '../../../../common/decorators/module.decorator';
import { CurrentOrg } from '../../../../common/decorators/org.decorator';
import type { Organization } from '@enterprise/database';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { normalizePhone } from '../../../../common/utils/phone-normalization';

@ApiTags('Nexus Prospector')
@Controller('modules/prospector')
@RequireModule('PROSPECTOR')
@UseGuards(MultiLevelAuthGuard, MembershipGuard, TenantContextGuard, ProspectorAdminGuard, ModuleAccessGuard)
export class ProspectorController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly handleIncomingMessageUseCase: HandleIncomingMessageUseCase,
    private readonly sourceLeadsUseCase: SourceLeadsUseCase,
    private readonly generatePitchUseCase: GenerateSalesPitchUseCase,
    private readonly sendMessageUseCase: SendOutboundMessageUseCase,
    private readonly sseService: ProspectorSseService,
    @InjectQueue('proactive-prospecting') private readonly proactiveQueue: Queue,
  ) { }

  @Sse('sse')
  @ApiOperation({ summary: 'Stream lead updates in real-time via SSE' })
  sse(): Observable<MessageEvent> {
    return this.sseService.getUpdates() as Observable<MessageEvent>;
  }

  @Post('chat')
  @ApiOperation({ summary: 'Simulate manual chat interaction' })
  async chat(
    @CurrentOrg() org: Organization,
    @Body() body: {
      message: string;
      phone: string;
      unitId: string;
    },
  ) {
    const cleanPhone = normalizePhone(body.phone);
    const lead = await this.prisma.client.lead.findUnique({
      where: { phone_organizationId: { phone: cleanPhone, organizationId: org.id } }
    });

    if (!lead) {
      throw new BadRequestException('Lead not found. Please source it first.');
    }

    return this.handleIncomingMessageUseCase.execute({
      leadId: lead.id,
      externalId: `manual-${Date.now()}`,
      phone: cleanPhone,
      text: body.message,
      timestamp: Math.floor(Date.now() / 1000),
      unitId: body.unitId,
      organizationId: org.id,
    });
  }

  @Post('source')
  @ApiOperation({ summary: 'Proactive Lead Sourcing (Maps + AI)' })
  async source(
    @CurrentOrg() org: Organization,
    @Headers('x-unit-id') unitId: string | undefined,
    @Body() body: { sector: string; region: string },
  ) {
    // Standardize queue payload
    await this.proactiveQueue.add('start-search', {
      sector: body.sector,
      region: body.region,
      organizationId: org.id,
      unitId,
    }, {
      removeOnComplete: true,
      attempts: 2,
    });

    return { status: 'prospecting_started' };
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

  @Post('leads/:id/send-message')
  @ApiOperation({ summary: 'Send outbound message to lead (manual or assisted)' })
  async sendMessage(
    @CurrentOrg() org: Organization,
    @Param('id') id: string,
    @Body() body: { text: string },
  ) {
    return this.sendMessageUseCase.execute({
      leadId: id,
      text: body.text,
      organizationId: org.id,
    });
  }

  @Get('leads')
  @ApiOperation({ summary: 'List all leads for the organization' })
  async getLeads(@CurrentOrg() org: Organization) {
    // Performance optimization: only fetch latest interactions and relevant fields
    const leads = await this.prisma.client.lead.findMany({
      where: { organizationId: org.id },
      select: {
        id: true,
        name: true,
        phone: true,
        status: true,
        score: true,
        industry: true,
        lastInteractionAt: true,
        createdAt: true,
        appointments: {
          select: { id: true, startTime: true, status: true }
        },
        interactions: {
          orderBy: { createdAt: 'desc' },
          take: 40,
          select: { id: true, content: true, type: true, createdAt: true }
        },
        suggestedMessages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { id: true, content: true, createdAt: true }
        }
      },
      orderBy: { lastInteractionAt: 'desc' }
    });

    const serializedLeads = leads.map(lead => {
      const serializedInteractions = lead.interactions.map(i => ({
        ...i,
        sender: i.type === 'INBOUND' ? 'LEAD' : 'SDR'
      }));
      const lastInteraction = serializedInteractions[0];
      const isPending = lastInteraction ? lastInteraction.sender === 'LEAD' : false;

      return {
        ...lead,
        sector: lead.industry,
        scoreIA: lead.score,
        interactions: serializedInteractions,
        isPending
      };
    });

    return { leads: serializedLeads };
  }
}
