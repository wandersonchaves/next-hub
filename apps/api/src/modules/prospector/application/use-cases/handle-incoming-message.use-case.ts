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
import { ProspectorSseService } from '../../services/prospector-sse.service';

export interface IncomingMessageDto {
  leadId: string;
  externalId: string;
  phone: string;
  text: string;
  historyContext?: string; // Sincronizado do Webhook
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
    private readonly googleCalendar: GoogleCalendarService,
    private readonly leadScoring: LeadScoringService,
    private readonly usageMetering: UsageMeteringService,
    private readonly aiChat: AIChatService,
    private readonly sseService: ProspectorSseService,
    @InjectQueue('calendar-orchestrator') private readonly calendarQueue: Queue,
    @InjectQueue('whatsapp-outbound') private readonly outboundQueue: Queue,
  ) {}

  async execute(dto: IncomingMessageDto): Promise<void> {
    const { leadId, phone, organizationId, unitId, historyContext } = dto;

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

      // 2. Debounce Harvesting (Latest interactions since last outbound)
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

      // 3. Extraction Phase
      const now = new Date();
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
        - SEJA PRECISO COM O ANO: O ano atual é ${currentYear}.
      `;

      const extraction = await this.aiOrchestrator.generate<ExtractionResult>({
        context: extractionContext,
        message: accumulatedText,
        expectedFormat: `{ "intent": "BOOKING...", "email": "string", "appointmentDate": "ISO8601", "isPricingQuery": boolean }`
      });

      const data = extraction.extractedData || { intent: 'OTHER', irritationDetected: false, isGatekeeper: false, isPricingQuery: false };
      const extractedEmail = data.email ? data.email.trim().toLowerCase() : this.regexExtractEmail(accumulatedText);
      const extractedDate = data.appointmentDate ? new Date(data.appointmentDate) : null;

      // 4. Pipeline State Machine
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

      // 5. Database Sync
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

      // Broadcast lead status update immediately
      this.sseService.broadcast({
        leadId: lead.id,
        status: newStatus,
        scoreIA: lead.score
      });

      // 6. SYNCHRONOUS CALENDAR ORCHESTRATION (Forced videoconference link injection)
      let meetUrl: string | undefined = undefined;
      if (isFinalClosingTriggered && (extractedEmail || lead.email) && extractedDate) {
         const finalEmail = (extractedEmail || lead.email) as string;
         try {
           this.logger.log(`Google Calendar (Synchronous): Force creating event with videoconference for ${finalEmail}`);
           const calendarResult = await this.googleCalendar.createEvent({
             title: `Agendamento Nexus: ${lead.name}`,
             startTime: extractedDate,
             endTime: new Date(extractedDate.getTime() + 30 * 60000), // 30 minutes duration
             attendeeEmail: finalEmail
           });
           
           meetUrl = calendarResult.meetUrl;
           this.logger.log(`Google Calendar: Created meeting successfully: ${meetUrl}`);

           // Atomic database update (Appointment & LeadPipeline)
           await this.prisma.client.$transaction(async (tx) => {
             await tx.appointment.create({
               data: {
                 title: `Agendamento Nexus: ${lead.name}`,
                 startTime: extractedDate,
                 endTime: new Date(extractedDate.getTime() + 30 * 60000),
                 leadId: lead.id,
                 unitId,
                 organizationId,
                 status: 'SCHEDULED',
                 googleEventId: calendarResult.eventId,
                 metadata: {
                   meetUrl,
                   origin: 'AUTOPILOT_CLOSING'
                 }
               }
             });

             // Telemetria: Update lead pipeline stage
             await (tx as any).leadPipeline.upsert({
               where: { leadId: lead.id },
               update: {
                 stage: 'REUNIAO_MARCADA',
                 estimatedValue: 599
               },
               create: {
                 leadId: lead.id,
                 organizationId,
                 stage: 'REUNIAO_MARCADA',
                 estimatedValue: 599
               }
             });

             // Update lead metadata with Google Calendar event context
             const currentLead = await tx.lead.findUnique({ where: { id: lead.id } });
             const leadMeta = (currentLead?.metadata && typeof currentLead.metadata === 'object') ? (currentLead.metadata as any) : {};
             await tx.lead.update({
               where: { id: lead.id },
               data: {
                 metadata: {
                   ...leadMeta,
                   calendarEventId: calendarResult.eventId,
                   meetUrl
                 }
               }
             });
           });
         } catch (calendarError) {
           this.logger.error(`Failed to create calendar event synchronously: ${calendarError.message}`);
           // Fallback to queue if synchronous fails to ensure resilience
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
         }
      }

      // Fetch latest appointment for this lead if we don't have a new meetUrl from the current use-case execution
      let resolvedMeetUrl = meetUrl;
      let calendarEventId: string | undefined = undefined;

      const latestAppointment = await this.prisma.client.appointment.findFirst({
        where: { leadId: lead.id, status: 'SCHEDULED' },
        orderBy: { createdAt: 'desc' }
      });

      if (latestAppointment) {
        if (!resolvedMeetUrl) {
          resolvedMeetUrl = (latestAppointment.metadata as any)?.meetUrl || undefined;
        }
        calendarEventId = latestAppointment.googleEventId || undefined;
      }

      // 7. AI Response Generation
      const isBusinessHours = this.businessClock.isBusinessHours();
      
      const fullHistory = await this.prisma.client.interaction.findMany({
        where: { leadId },
        orderBy: { createdAt: 'desc' },
        take: 40
      });

      // Inject the real meeting link and event ID in systemStatus context if available
      let statusContext = systemStatus;
      if (resolvedMeetUrl || calendarEventId) {
        statusContext += `. O agendamento foi realizado com sucesso.`;
        if (resolvedMeetUrl) {
          statusContext += ` Link do evento: ${resolvedMeetUrl}.`;
        }
        if (calendarEventId) {
          statusContext += ` ID do evento no Google Calendar (calendarEventId): ${calendarEventId}.`;
        }
      }
 
      const aiResponse = await this.aiChat.generateResponse({
        lead: {
          id: lead.id,
          name: lead.name,
          status: newStatus,
          industry: lead.industry || undefined,
          region: (lead.metadata as any)?.address?.split('-')[1]?.trim() || 'Brasil',
          email: lead.email || extractedEmail || undefined,
          metadata: lead.metadata
        },
        isBusinessHours,
        systemStatus: statusContext,
        historyOverride: historyContext // PASSING SYNCHRONIZED HISTORY
      }, accumulatedText);

      // 8. Autopilot Engine
      const isAutopilotActive = organization.enableAutopilot === true || organization.automationMode === 'FULL_AUTOPILOT';
      const isConfirmedSuccess = newStatus === 'CONFIRMADO' && isFinalClosingTriggered;
      const shouldAutoDispatch = isAutopilotActive || isConfirmedSuccess;

      const needsApproval = !shouldAutoDispatch && (!isBusinessHours || ['NEW', 'QUALIFYING', 'STALE', 'GATEKEEPER_STAGE'].includes(newStatus));

      let responseText = aiResponse.content;
      // Inject meeting link in the final response if available and not already present in text
      if (resolvedMeetUrl && !responseText.includes(resolvedMeetUrl)) {
        responseText = `${responseText}\n\n*Link do Google Meet:* ${resolvedMeetUrl}`;
      }

      if (needsApproval) {
        await this.prisma.client.lead.update({
          where: { id: lead.id },
          data: { pendingMessage: responseText, lastInteractionAt: new Date() }
        });
      } else {
        await this.outboundQueue.add('send-message', {
          to: phone,
          text: responseText,
          organizationId
        }, {
          removeOnComplete: true,
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 }
        });

        await this.prisma.client.$transaction([
          this.prisma.client.interaction.create({
            data: {
              content: responseText,
              type: 'OUTBOUND',
              leadId: lead.id,
              unitId,
              organizationId,
            }
          }),
          this.prisma.client.lead.update({
            where: { id: lead.id },
            data: { 
              lastInteractionAt: new Date(),
              isPending: false
            }
          })
        ]);

        await this.usageMetering.incrementUsage(organizationId);
      }

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
