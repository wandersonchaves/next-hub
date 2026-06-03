import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AIOrchestratorEngine } from '../../../../common/engines/ai-orchestrator.engine';
import { OmniChannelEngine } from '../../../../common/engines/omni-channel.engine';
import { BusinessClockEngine } from '../../../../common/engines/business-clock.engine';
import { GoogleCalendarService } from '../../infrastructure/google-calendar.service';
import { LeadScoringService } from '../lead-scoring.service';
import { UsageMeteringService } from '../../../nexthub/application/usage-metering.service';
import { AIChatService } from '../../services/ai-chat.service';

export interface IncomingMessageDto {
  leadId: string;
  externalId: string;
  phone: string;
  text: string;
  timestamp: number; // Unix timestamp
  organizationId: string;
  unitId: string;
}

interface ExtractionResult {
  intent: 'GREETING' | 'BOOKING' | 'QUESTION' | 'NEGATIVE' | 'OTHER';
  email?: string;
  appointmentDate?: string; // ISO String
  leadName?: string;
  irritationDetected: boolean;
  isGatekeeper?: boolean;
  isPricingQuery?: boolean;
}

@Injectable()
export class HandleIncomingMessageUseCase {
  private readonly logger = new Logger(HandleIncomingMessageUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiOrchestrator: AIOrchestratorEngine,
    private readonly omniChannel: OmniChannelEngine,
    private readonly businessClock: BusinessClockEngine,
    private readonly leadScoring: LeadScoringService,
    private readonly usageMetering: UsageMeteringService,
    private readonly aiChat: AIChatService,
    @InjectQueue('calendar-orchestrator') private readonly calendarQueue: Queue,
  ) {}

  async execute(dto: IncomingMessageDto): Promise<void> {
    const { leadId, phone, organizationId, unitId } = dto;

    try {
      // 1. Fetch Context
      const lead = await this.prisma.client.lead.findUnique({
        where: { id: leadId },
        include: { organization: true }
      });

      if (!lead) {
        this.logger.error(`Worker Error: Lead ${leadId} not found.`);
        return;
      }

      const organization = lead.organization;

      // 2. Debounce Harvesting
      const lastOutbound = await this.prisma.client.interaction.findFirst({
        where: { leadId, type: 'OUTBOUND' },
        orderBy: { createdAt: 'desc' }
      });

      const inboundInteractions = await this.prisma.client.interaction.findMany({
        where: { 
          leadId, 
          type: 'INBOUND',
          createdAt: { gt: lastOutbound?.createdAt || new Date(0) }
        },
        orderBy: { createdAt: 'asc' }
      });

      if (inboundInteractions.length === 0) return;

      const accumulatedText = inboundInteractions.map(i => i.content).join('\n');

      // 3. Extraction Phase (NLP DATE FIX & TIMEZONE GUARD)
      const now = new Date();
      // Brazil Timezone Offset (UTC-3)
      const brTime = new Date(now.getTime() - (3 * 3600 * 1000));
      const currentYear = brTime.getUTCFullYear();
      const currentDay = brTime.toLocaleDateString('pt-BR', { weekday: 'long', timeZone: 'UTC' });
      const currentFullDate = brTime.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
      const currentTime = brTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });

      const extractionContext = `
        VOCÊ É UM ANALISTA DE TRIAGEM SDR. Extraia dados do bloco de mensagens.
        
        ÂNCORA TEMPORAL (UTC-3 - Brasília):
        - Hoje é ${currentDay}, dia ${currentFullDate} (Ano: ${currentYear}).
        - Hora atual: ${currentTime}.
        - Se o lead disser "amanhã" e hoje for Domingo, considere a segunda-feira seguinte.
        - SEJA PRECISO COM O ANO: O ano atual é ${currentYear}.
      `;

      const extraction = await this.aiOrchestrator.generate<ExtractionResult>({
        context: extractionContext,
        message: accumulatedText,
        expectedFormat: `{ "intent": "BOOKING...", "email": "string", "appointmentDate": "ISO8601", "isPricingQuery": boolean }`
      });

      const data = extraction.extractedData || { intent: 'OTHER', irritationDetected: false, isGatekeeper: false, isPricingQuery: false };
      
      // 4. ATOMIC SANITIZATION
      const extractedEmail = data.email ? data.email.trim().toLowerCase() : this.regexExtractEmail(accumulatedText);
      const extractedDate = data.appointmentDate ? new Date(data.appointmentDate) : null;

      // 5. Pipeline State Machine
      let systemStatus = 'INTERACTION_RECEIVED';
      let newStatus = lead.status;
      let isFinalClosingTriggered = false;

      if (data.irritationDetected) {
        newStatus = 'STALE';
      } else if (data.isGatekeeper) {
        newStatus = 'GATEKEEPER_STAGE';
      } else {
        const isPricingObjection = data.isPricingQuery || this.checkPricingKeywords(accumulatedText);
        
        if (isPricingObjection && lead.status === 'CONFIRMADO') {
           systemStatus = 'OBJECAO_POS_AGENDAMENTO';
        }

        if (extractedDate && (lead.email || extractedEmail)) {
          newStatus = 'CONFIRMADO';
          systemStatus = isPricingObjection ? 'OBJECAO_POS_AGENDAMENTO' : 'AGENDAMENTO_PRONTO_PARA_FINALIZAR';
          isFinalClosingTriggered = !isPricingObjection;
        } else if (extractedDate) {
          newStatus = 'AGENDANDO';
          systemStatus = 'HORARIO_CAPTURADO_FALTA_EMAIL';
        } else if (extractedEmail || lead.email) {
          newStatus = 'QUALIFYING';
          systemStatus = 'EMAIL_CAPTURADO_FALTA_HORARIO';
        } else if (lead.status === 'NEW' || lead.status === 'NEW_UNTOUCHED') {
          newStatus = 'QUALIFYING';
        }
      }

      // 6. Database Sync
      await this.prisma.client.$transaction(async (tx) => {
        await tx.lead.update({
          where: { id: lead.id },
          data: { 
            status: newStatus, 
            email: extractedEmail || undefined,
            name: (data.leadName && lead.name.includes('Lead')) ? data.leadName : undefined,
            pendingMessage: null 
          }
        });
      });

      // 7. ASYNC CALENDAR ORCHESTRATION (BullMQ with Meet generation)
      if (isFinalClosingTriggered && (extractedEmail || lead.email) && extractedDate) {
         const finalEmail = (extractedEmail || lead.email) as string;
         await this.calendarQueue.add('orchestrate-event', {
            leadId: lead.id,
            startTime: extractedDate.toISOString(),
            attendeeEmail: finalEmail,
            organizationId,
            unitId,
            title: `Agendamento Nexus: ${lead.name}`
         }, {
            removeOnComplete: true,
            attempts: 3,
            backoff: { type: 'exponential', delay: 5000 }
         });
         this.logger.log(`Queue: Calendar orchestration dispatched for lead ${lead.id}`);
      }

      // 8. AI Response Generation
      const fullHistory = await this.prisma.client.interaction.findMany({
        where: { leadId },
        orderBy: { createdAt: 'desc' },
        take: 10
      });

      const isBusinessHours = this.businessClock.isBusinessHours();

      const aiResponse = await this.aiChat.generateResponse({
        lead: {
          id: lead.id,
          name: lead.name,
          status: newStatus,
          industry: lead.industry || undefined,
          email: lead.email || extractedEmail || undefined,
          metadata: lead.metadata
        },
        fullHistory: fullHistory.reverse().map(h => `${h.type}: ${h.content}`).join('\n'),
        isBusinessHours,
        systemStatus
      }, accumulatedText);

      // 9. Autopilot Engine (FULL AUTONOMY)
      // Activating Autopilot if flag is true OR if it's the validated playbook flow
      const isAutopilotActive = organization.enableAutopilot === true || organization.automationMode === 'FULL_AUTOPILOT';
      const isSuspended = organization.status === 'SUSPENDED';

      // Playbook validation: if confirmed, we always want to dispatch the final confirmation automatically
      const isConfirmedSuccess = newStatus === 'CONFIRMADO' && isFinalClosingTriggered;
      
      const shouldAutoDispatch = isAutopilotActive || isConfirmedSuccess;

      const needsApproval = !shouldAutoDispatch && (!isBusinessHours || ['NEW', 'QUALIFYING', 'STALE', 'GATEKEEPER_STAGE'].includes(newStatus));

      if (needsApproval) {
        await this.prisma.client.lead.update({
          where: { id: lead.id },
          data: { pendingMessage: aiResponse.content, lastInteractionAt: new Date() }
        });
      } else {
        if (isSuspended) {
          this.logger.warn(`Autopilot Blocked: Organization ${organizationId} is SUSPENDED.`);
          return;
        }

        await this.omniChannel.sendMessage({ to: phone, text: aiResponse.content });

        await this.prisma.client.$transaction([
          this.prisma.client.interaction.create({
            data: {
              content: aiResponse.content,
              type: 'OUTBOUND',
              leadId: lead.id,
              unitId,
              organizationId,
            }
          }),
          this.prisma.client.lead.update({
            where: { id: lead.id },
            data: { lastInteractionAt: new Date() }
          })
        ]);

        await this.usageMetering.incrementUsage(organizationId);
      }

      // 10. Lead Scoring
      this.leadScoring.updateLeadScore(lead.id).catch(err => {
        this.logger.error(`Scoring Error: ${err.message}`);
      });

    } catch (error) {
      this.logger.error(`Worker Error: ${error.message}`);
      throw error;
    }
  }

  private regexExtractEmail(text: string): string | null {
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
    const match = text.match(emailRegex);
    return match ? match[0].trim().toLowerCase() : null;
  }

  private checkPricingKeywords(text: string): boolean {
    const keywords = ['valor', 'preço', 'preco', 'plano', 'quanto custa', 'investimento', 'mensalidade'];
    const normalized = text.toLowerCase();
    return keywords.some(k => normalized.includes(k));
  }
}
