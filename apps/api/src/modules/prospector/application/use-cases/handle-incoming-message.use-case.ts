import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AIOrchestratorEngine } from '../../../../common/engines/ai-orchestrator.engine';
import { OmniChannelEngine } from '../../../../common/engines/omni-channel.engine';
import { BusinessClockEngine } from '../../../../common/engines/business-clock.engine';
import { SDRConfigEngine } from '../../infrastructure/sdr-config.engine';
import { GoogleCalendarService } from '../../infrastructure/google-calendar.service';
import { LeadScoringService } from '../lead-scoring.service';

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
  irritationDetected: boolean;
  isGatekeeper?: boolean; // Detects if the person is a receptionist/attendant
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
  ) {}

  async execute(dto: IncomingMessageDto): Promise<void> {
    const { leadId, externalId, phone, organizationId, branchId } = dto;

    try {
      // 1. Fetch Lead context
      const lead = await this.prisma.client.lead.findUnique({
        where: { id: leadId },
      });

      if (!lead) {
        this.logger.error(`Worker Error: Lead ${leadId} not found.`);
        return;
      }

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

      // 3. Extraction Phase (Pipeline-Aware + Gatekeeper detection)
      const extractionContext = `
        VOCÊ É UM ANALISTA DE TRIAGEM SDR. Extraia dados do bloco de mensagens.
        REGRAS DE GATEKEEPER: Detecte se a pessoa que respondeu é da recepção, atendente ou secretária (ex: "eu sou a atendente", "falo da recepção").
        REGRAS DE IRRITAÇÃO: Detecte se o lead está ríspido ou reclamando de "muitas perguntas".
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

      // 4. Pipeline State Machine
      let systemStatus = 'INTERACTION_RECEIVED';
      let newStatus = lead.status;

      if (data.irritationDetected) {
        newStatus = 'STALE';
        systemStatus = 'IRRITACAO_DETECTADA';
      } else if (data.isGatekeeper) {
        newStatus = 'GATEKEEPER_STAGE';
        systemStatus = 'FALANDO_COM_RECEPCAO';
      } else if (extractedEmail && extractedDate) {
        newStatus = 'CONFIRMADO';
        systemStatus = 'AGENDAMENTO_REALIZADO';
      } else if (extractedDate) {
        newStatus = 'AGENDANDO';
        systemStatus = 'DATA_CONFIRMADA_AGUARDANDO_EMAIL';
      } else if (extractedEmail || lead.status === 'NEW' || lead.status === 'NEW_UNTOUCHED') {
        newStatus = 'QUALIFYING';
        systemStatus = 'QUALIFICACAO_EM_CURSO';
      }

      await this.prisma.client.$transaction(async (tx) => {
        if (newStatus === 'CONFIRMADO' && extractedEmail && extractedDate) {
          const googleEventId = await this.googleCalendar.createEvent({
            title: `Confirmado: ${lead.name}`,
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

      // 5. SDR Refined Prompt (Pipeline-Aware + Gatekeeper Behavior)
      const isBusinessHours = this.businessClock.isBusinessHours();
      const nicheContext = this.sdrConfig.getNicheContext(lead.industry);
      const plansContext = this.sdrConfig.getPlansContext();
      
      const fullHistory = await this.prisma.client.interaction.findMany({
        where: { leadId },
        orderBy: { createdAt: 'desc' },
        take: 10
      });

      const isConfirmed = newStatus === 'CONFIRMADO';
      const isGatekeeper = newStatus === 'GATEKEEPER_STAGE';

      const salesContext = `
        VOCÊ É UM DIRETOR DE VENDAS SÊNIOR ESPECIALISTA EM NEUROVENDAS.
        Sua voz é curta, humana, empática e usa formatação estratégica.

        REGRAS DE INFRAESTRUTURA:
        - Use **negrito** em palavras de impacto (ex: **furos na agenda**, **gestão automática**, **poupar tempo**).
        - Use emojis com moderação (🚀, 📅, 🥵, ✨).
        - BANIDO: Termos técnicos como SaaS, ERP, Multi-tenant, API. Use **plataforma**, **sistema** e **automação**.

        ${isConfirmed ? `
        --- MODO CONCIERGE ---
        O agendamento FOI CONCLUÍDO. 
        MISSÃO: Mensagem de 1 linha confirmando e desejando tchau.
        ` : isGatekeeper ? `
        --- MODO GATEKEEPER (BUSCA PELO DECISOR) ---
        Você está falando com a recepção/atendente.
        PROIBIDO: Tentar agendar reunião ou falar de valores com ela.
        MISSÃO: Seja extremamante amigável. Foque em como a ferramenta vai ajudar a PRÓPRIA ATENDENTE a sofrer menos com mensagens manuais e **poupar tempo** dela. Peça o contato do responsável (gerente/dono).
        Ex: "Super entendo! Ficar confirmando tudo na mão deve dar um trabalho absurdo, né? 🥵 Quem cuida da gerência aí para eu enviar como funciona?"
        ` : `
        --- MODO SDR (CONSULTIVO) ---
        SITUAÇÃO ATUAL: ${systemStatus}
        ESTÁGIO: ${newStatus}
        NICHO: ${nicheContext}
        TABELA DE PREÇOS (SE perguntarem): ${plansContext}
        REGRAS: Bloqueio de repetição de pitch (máx 2x). Responda dúvidas antes de pedir o próximo passo.
        `}
        
        HISTÓRICO RECENTE:
        ${fullHistory.reverse().map(h => `${h.type}: ${h.content}`).join('\n')}
      `;

      const outreach = await this.aiOrchestrator.generate({
        context: salesContext,
        message: accumulatedText,
      });

      // 6. Dispatch
      const needsApproval = !isBusinessHours || ['NEW', 'QUALIFYING', 'STALE', 'GATEKEEPER_STAGE'].includes(newStatus);

      if (needsApproval) {
        await this.prisma.client.lead.update({
          where: { id: lead.id },
          data: { pendingMessage: outreach.content, lastInteractionAt: new Date() }
        });
        this.logger.log(`Worker: Response for ${phone} (Status: ${newStatus}) queued for approval.`);
      } else {
        await this.omniChannel.sendMessage({ to: phone, text: outreach.content });

        await this.prisma.client.interaction.create({
          data: {
            content: outreach.content,
            type: 'OUTBOUND',
            leadId: lead.id,
            branchId,
            organizationId,
          }
        });
        
        await this.prisma.client.lead.update({
          where: { id: lead.id },
          data: { lastInteractionAt: new Date() }
        });
      }

    } catch (error) {
      this.logger.error(`Worker Error: ${error.message}`, error.stack);
      throw error;
    }
  }

  private regexExtractEmail(text: string): string | null {
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
    const match = text.match(emailRegex);
    return match ? match[0] : null;
  }
}
