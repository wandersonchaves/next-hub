import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AIOrchestratorEngine } from '../../../../common/engines/ai-orchestrator.engine';
import { OmniChannelEngine } from '../../../../common/engines/omni-channel.engine';
import { BusinessClockEngine } from '../../../../common/engines/business-clock.engine';
import { SDRConfigEngine } from '../../infrastructure/sdr-config.engine';
import { GoogleCalendarService } from '../../infrastructure/google-calendar.service';
import { LeadScoringService } from '../lead-scoring.service';
import { UsageMeteringService } from '../../../nexthub/application/usage-metering.service';

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
}

@Injectable()
export class HandleIncomingMessageUseCase {
  private readonly logger = new Logger(HandleIncomingMessageUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiOrchestrator: AIOrchestratorEngine,
    private readonly omniChannel: OmniChannelEngine,
    private readonly businessClock: BusinessClockEngine,
    private readonly sdrConfig: SDRConfigEngine,
    private readonly googleCalendar: GoogleCalendarService,
    private readonly leadScoring: LeadScoringService,
    private readonly usageMetering: UsageMeteringService,
  ) {}

  async execute(dto: IncomingMessageDto): Promise<void> {
    const { leadId, externalId, phone, organizationId, unitId } = dto;

    try {
      // 1. Fetch Lead and Organization context
      const lead = await this.prisma.client.lead.findUnique({
        where: { id: leadId },
        include: { organization: true }
      });

      if (!lead) {
        this.logger.error(`Worker Error: Lead ${leadId} not found.`);
        return;
      }

      const organization = lead.organization;

      // 2. DEBOUNCE HARVESTING
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
      const isShortAnswer = this.checkIfShortAnswer(accumulatedText);

      // 3. Extraction Phase
      const extractionContext = `
        VOCÊ É UM ANALISTA DE TRIAGEM SDR. Extraia dados do bloco de mensagens.
        REGRAS DE GATEKEEPER: Detecte se a pessoa que respondeu é da recepção.
        REGRAS DE IRRITAÇÃO: Detecte ríspidez ou reclamação de excesso de perguntas.
      `;

      const extraction = await this.aiOrchestrator.generate<ExtractionResult>({
        context: extractionContext,
        message: accumulatedText,
        expectedFormat: `
          {
            "intent": "GREETING | BOOKING | QUESTION | NEGATIVE | OTHER",
            "email": "string ou null",
            "appointmentDate": "ISO8601 string ou null",
            "leadName": "string ou null",
            "irritationDetected": boolean,
            "isGatekeeper": boolean
          }
        `
      });

      const data = extraction.extractedData || { intent: 'OTHER', irritationDetected: false, isGatekeeper: false };
      const extractedEmail = data.email || this.regexExtractEmail(accumulatedText);
      const extractedDate = data.appointmentDate ? new Date(data.appointmentDate) : null;

      // 4. Pipeline State Machine (STRICT SEQUENCING)
      let systemStatus = 'INTERACTION_RECEIVED';
      let newStatus = lead.status;
      let finalClosing = false;

      if (data.irritationDetected) {
        newStatus = 'STALE';
        systemStatus = 'IRRITACAO_DETECTADA';
      } else if (data.isGatekeeper) {
        newStatus = 'GATEKEEPER_STAGE';
      } else {
        if (extractedDate && !lead.email && !extractedEmail) {
          newStatus = 'AGENDANDO';
          systemStatus = 'HORARIO_CAPTURADO_FALTA_EMAIL';
        } else if ((lead.email || extractedEmail) && extractedDate) {
          newStatus = 'CONFIRMADO';
          systemStatus = 'AGENDAMENTO_PRONTO_PARA_FINALIZAR';
          finalClosing = true;
        } else if (extractedEmail || lead.status === 'NEW' || lead.status === 'NEW_UNTOUCHED') {
          newStatus = 'QUALIFYING';
        }
      }

      await this.prisma.client.$transaction(async (tx) => {
        if (finalClosing && (extractedEmail || lead.email) && extractedDate) {
          const email = (extractedEmail || lead.email) as string;
          const googleEventId = await this.googleCalendar.createEvent({
            title: `Confirmado: ${lead.name}`,
            startTime: extractedDate,
            endTime: new Date(extractedDate.getTime() + 30 * 60000),
            attendeeEmail: email
          });
          await tx.appointment.create({
            data: {
              title: `Agendamento Nexus: ${lead.name}`,
              startTime: extractedDate,
              endTime: new Date(extractedDate.getTime() + 30 * 60000),
              leadId: lead.id,
              unitId,
              organizationId,
              status: 'SCHEDULED',
              googleEventId
            }
          });
        }

        await tx.lead.update({
          where: { id: lead.id },
          data: { 
            status: newStatus, 
            email: extractedEmail || lead.email,
            name: (data.leadName && lead.name.includes('Lead')) ? data.leadName : lead.name,
            pendingMessage: null 
          }
        });
      });

      // 5. SDR Refined Prompt
      const isBusinessHours = this.businessClock.isBusinessHours();
      const nicheContext = this.sdrConfig.getNicheContext(lead.industry);
      const plansContext = this.sdrConfig.getPlansContext();
      
      const fullHistory = await this.prisma.client.interaction.findMany({
        where: { leadId },
        orderBy: { createdAt: 'desc' },
        take: 10
      });

      const salesContext = `
        VOCÊ É UM DIRETOR DE VENDAS SÊNIOR.
        SITUAÇÃO: ${systemStatus}
        ESTÁGIO: ${newStatus}

        --- REGRAS DE OURO ---
        1. SHORT-ANSWER GUARD: O lead enviou uma resposta curta: "${accumulatedText}". 
           PROIBIDO repetir pitches, preços (${plansContext}) ou dores. 
           Se falta o e-mail, peça apenas o e-mail.
        2. SEQUENCIAÇÃO: Se o horário foi confirmado mas não temos e-mail, FOQUE APENAS em pedir o e-mail. Não envie link ainda.
        3. FIM DE PAPO: Se o estágio for 'CONFIRMADO', responda em no máximo UMA LINHA celebrativa e de encerramento.
        4. ANTI-ROBÔ: Não repita argumentos do histórico abaixo.
        
        HISTÓRICO RECENTE:
        ${fullHistory.reverse().map(h => `${h.type}: ${h.content}`).join('\n')}
      `;

      const outreach = await this.aiOrchestrator.generate({
        context: salesContext,
        message: accumulatedText,
      });

      // 6. Dispatch and Metering
      const isAutopilot = organization.automationMode === 'FULL_AUTOPILOT';
      const needsApproval = !isAutopilot && (!isBusinessHours || ['NEW', 'QUALIFYING', 'STALE', 'GATEKEEPER_STAGE'].includes(newStatus));

      if (needsApproval) {
        await this.prisma.client.lead.update({
          where: { id: lead.id },
          data: { pendingMessage: outreach.content, lastInteractionAt: new Date() }
        });
      } else {
        // Direct Send (Autopilot or Pre-approved condition)
        await this.omniChannel.sendMessage({ to: phone, text: outreach.content });

        await this.prisma.client.$transaction([
          this.prisma.client.interaction.create({
            data: {
              content: outreach.content,
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

        // Increment Telemetry/Usage
        await this.usageMetering.incrementUsage(organizationId);
      }

      // 7. Dynamic Lead Scoring (Asynchronous)
      this.leadScoring.updateLeadScore(lead.id).catch(err => {
        this.logger.error(`Async Scoring Error for lead ${lead.id}: ${err.message}`);
      });

    } catch (error) {
      this.logger.error(`Worker Error: ${error.message}`, error.stack);
      throw error;
    }
  }

  private checkIfShortAnswer(text: string): boolean {
    const tokens = text.toLowerCase().split(/\s+/);
    const shortTokens = ['certo', 'sim', 'pode', 'ser', 'ok', 'okay', 'fechado', 'combinado', 'tá', 'ta'];
    return tokens.length <= 3 && tokens.every(t => shortTokens.includes(t) || t.length <= 2);
  }

  private regexExtractEmail(text: string): string | null {
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
    const match = text.match(emailRegex);
    return match ? match[0] : null;
  }
}
