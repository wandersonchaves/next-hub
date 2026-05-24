import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AIOrchestratorEngine } from '../../../../common/engines/ai-orchestrator.engine';
import { OmniChannelEngine } from '../../../../common/engines/omni-channel.engine';
import { BusinessClockEngine } from '../../../../common/engines/business-clock.engine';
import { SDRConfigEngine } from '../../infrastructure/sdr-config.engine';
import { GoogleCalendarService } from '../../infrastructure/google-calendar.service';

export interface IncomingMessageDto {
  leadId: string;
  externalId: string;
  phone: string;
  text: string;
  timestamp: number; // Unix timestamp
  organizationId: string;
  branchId: string;
}

interface ExtractionResult {
  intent: 'GREETING' | 'BOOKING' | 'QUESTION' | 'NEGATIVE' | 'OTHER';
  email?: string;
  appointmentDate?: string; // ISO String
  leadName?: string;
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
  ) {}

  async execute(dto: IncomingMessageDto): Promise<void> {
    const { leadId, externalId, phone, text, timestamp, organizationId, branchId } = dto;
    const messageDate = new Date(timestamp * 1000);

    try {
      // 1. Fetch Lead context with last 20 interactions for AI context
      const lead = await this.prisma.client.lead.findUnique({
        where: { id: leadId },
        include: {
          interactions: {
            orderBy: { createdAt: 'desc' },
            take: 20
          }
        }
      });

      if (!lead) {
        this.logger.error(`Worker Error: Lead ${leadId} not found in database.`);
        return;
      }

      // 2. Extraction Phase (IA + Regex)
      // The interaction is already saved in the controller, so we just use it for context.
      const extractionContext = `
        VOCÊ É UM ANALISTA DE TRIAGEM SDR. Sua missão é extrair dados de uma mensagem do WhatsApp.
        HISTÓRICO RECENTE: ${lead.interactions.map(i => `${i.type}: ${i.content}`).join(' | ')}
      `;

      const extraction = await this.aiOrchestrator.generate<ExtractionResult>({
        context: extractionContext,
        message: text,
        expectedFormat: `
          {
            "intent": "GREETING | BOOKING | QUESTION | NEGATIVE | OTHER",
            "email": "string ou null",
            "appointmentDate": "ISO8601 string ou null",
            "leadName": "string ou null"
          }
        `
      });

      const data = extraction.extractedData || { intent: 'OTHER' };
      const extractedEmail = data.email || this.regexExtractEmail(text);
      const extractedDate = data.appointmentDate ? new Date(data.appointmentDate) : null;

      // 3. Atomic State Machine (Transaction)
      let systemStatus = 'INTERACTION_RECEIVED';
      
      await this.prisma.client.$transaction(async (tx) => {
        // Determine Logic
        if (extractedEmail && extractedDate) {
          systemStatus = 'AGENDAMENTO_REALIZADO_COM_SUCESSO';
          
          const googleEventId = await this.googleCalendar.createEvent({
            title: `Prospector: ${lead.name}`,
            startTime: extractedDate,
            endTime: new Date(extractedDate.getTime() + 30 * 60000),
            attendeeEmail: extractedEmail
          });

          await tx.appointment.create({
            data: {
              title: `Agendamento Nexus: ${lead.name}`,
              startTime: extractedDate,
              endTime: new Date(extractedDate.getTime() + 30 * 60000),
              leadId: lead.id,
              branchId,
              organizationId,
              status: 'SCHEDULED',
              googleEventId
            }
          });
          
          await tx.lead.update({
            where: { id: lead.id },
            data: { status: 'CONVERTED', email: extractedEmail }
          });
        } else if (extractedDate) {
          systemStatus = 'DATA_CONFIRMADA_AGUARDANDO_EMAIL';
          await tx.lead.update({
            where: { id: lead.id },
            data: { status: 'BOOKING_IN_PROGRESS' }
          });
        } else if (extractedEmail) {
          systemStatus = 'EMAIL_CAPTURADO';
          await tx.lead.update({
            where: { id: lead.id },
            data: { email: extractedEmail, status: 'QUALIFIED' }
          });
        } else if (data.intent === 'NEGATIVE') {
          systemStatus = 'RECUSA_DETECTADA';
          await tx.lead.update({
            where: { id: lead.id },
            data: { status: 'NEGATIVE' }
          });
        }

        // Update name if AI found one
        if (data.leadName && (lead.name === 'Lead Novo' || lead.name === 'Novo Lead')) {
           await tx.lead.update({
             where: { id: lead.id },
             data: { name: data.leadName }
           });
        }
      });

      // 4. SDR Voicing (Generation)
      const isBusinessHours = this.businessClock.isBusinessHours();
      const nicheContext = this.sdrConfig.getNicheContext(lead.industry);
      const plansContext = this.sdrConfig.getPlansContext();
      
      const salesContext = `
        VOCÊ É UM SDR SÊNIOR ESPECIALISTA EM GROWTH B2B. Sua voz é humana, curta e persuasiva.
        
        SITUAÇÃO ATUAL DO SISTEMA: ${systemStatus}
        CONTEXTO DO NICHO: ${nicheContext}
        TABELA DE PREÇOS: ${plansContext}
        
        AS 6 LEIS DO SDR:
        1. Nunca peça para agendar se o status for CONVERTED ou BOOKING_IN_PROGRESS.
        2. Nunca envie textos longos (máximo 3 frases).
        3. Nunca repita estruturas sintáticas do histórico recente.
        4. Despeça-se educadamente em caso de RECUSA_DETECTADA.
        5. Nunca use "Como posso te ajudar?".
        6. Se fora de horário (ATUAL: ${isBusinessHours ? 'SIM' : 'NÃO'}), avise que amanhã cedo dará continuidade.
      `;

      const outreach = await this.aiOrchestrator.generate({
        context: salesContext,
        message: text,
        history: lead.interactions.map(i => ({ 
          role: i.type === 'INBOUND' ? 'user' : 'assistant', 
          content: i.content 
        }))
      });

      // 5. Dispatch and Register Output
      // COPILOT MODE: Se não for QUALIFIED/CONVERTED ou for fora de horário, manda para aprovação
      const needsApproval = !isBusinessHours || (lead.status !== 'QUALIFIED' && lead.status !== 'CONVERTED');

      if (needsApproval) {
        await this.prisma.client.$transaction([
          this.prisma.client.suggestedMessage.create({
            data: {
              content: outreach.content,
              status: 'PENDING_APPROVAL',
              leadId: lead.id,
              branchId,
              organizationId,
            }
          }),
          this.prisma.client.lead.update({
            where: { id: lead.id },
            data: { 
              status: 'AWAITING_APPROVAL',
              pendingMessage: outreach.content,
              lastInteractionAt: new Date() // Use current date for the response lock
            }
          })
        ]);
        this.logger.log(`Worker: Response for ${phone} queued for human approval.`);
      } else {
        await this.omniChannel.sendMessage({
          to: phone,
          text: outreach.content,
        });

        await this.prisma.client.$transaction([
          this.prisma.client.interaction.create({
            data: {
              content: outreach.content,
              type: 'OUTBOUND',
              leadId: lead.id,
              branchId,
              organizationId,
            }
          }),
          this.prisma.client.lead.update({
            where: { id: lead.id },
            data: { lastInteractionAt: new Date() }
          })
        ]);
        this.logger.debug(`Worker: Direct SDR reply sent to ${phone}`);
      }

    } catch (error) {
      this.logger.error(`Worker: Failed to process message ${externalId}: ${error.message}`, error.stack);
      throw error;
    }
  }

  private regexExtractEmail(text: string): string | null {
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
    const match = text.match(emailRegex);
    return match ? match[0] : null;
  }
}
