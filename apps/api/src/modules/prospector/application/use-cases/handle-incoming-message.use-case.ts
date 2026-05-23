import { Injectable, Inject, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import type { IWhatsAppClient } from '../ports/whatsapp-client.port';
import type { IAIService } from '../ports/ai-service.port';
import { ProspectorLead } from '../../domain/entities/prospector-lead.entity';
import { TenantContextService } from '../../../../common/utils/tenant-context/tenant-context.service';

export interface IncomingMessageDto {
  externalId: string;
  phone: string;
  text: string;
  timestamp: Date;
  organizationId: string;
  branchId: string;
}

@Injectable()
export class HandleIncomingMessageUseCase {
  private readonly logger = new Logger(HandleIncomingMessageUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject('IWhatsAppClient') private readonly whatsappClient: IWhatsAppClient,
    @Inject('IAIService') private readonly aiService: IAIService,
    private readonly tenantContext: TenantContextService,
  ) {}

  async execute(dto: IncomingMessageDto): Promise<void> {
    const { externalId, phone, text, timestamp, organizationId, branchId } = dto;

    // 1. Deduplicação Atômica e Temporal Guard
    try {
      await this.prisma.client.$transaction(async (tx) => {
        // Verifica se a mensagem já foi processada
        const alreadyProcessed = await tx.auditLog.findFirst({
          where: { 
            action: 'WHATSAPP_INBOUND_PROCESSED',
            metadata: { path: ['externalId'], equals: externalId } as any
          }
        });

        if (alreadyProcessed) {
          this.logger.warn(`Message ${externalId} already processed. Skipping.`);
          return;
        }

        // Busca ou cria o Lead
        let leadData = await tx.lead.findUnique({
          where: { phone_organizationId: { phone, organizationId } }
        });

        if (!leadData) {
          leadData = await tx.lead.create({
            data: {
              phone,
              organizationId,
              branchId,
              name: 'Novo Lead',
              status: 'NEW',
            }
          });
        }

        const lead = new ProspectorLead(
          leadData.id,
          leadData.name,
          leadData.phone,
          leadData.status,
          leadData.lastInteractionAt,
          leadData.organizationId,
        );

        if (lead.isStale(timestamp)) {
          this.logger.warn(`Stale message received for lead ${lead.id}. Skipping.`);
          return;
        }

        // 2. Chamada à IA com SDR Matrix
        const context = `
          DIRETRIZES SDR SÊNIOR:
          1. BLOQUEIO DE DUPLO AGENDAMENTO: Se já houver agendamento, confirme o existente.
          2. TRATAMENTO DE NEGATIVAS: Seja empático e tente reverter uma vez.
          3. ACEITE IMEDIATO: Se o cliente quiser agendar, peça e-mail se não tiver.
          4. UPSELL MULTI-UNIDADES: Mencione benefícios de outras filiais se relevante.
          5. ANCORAGEM DE ROI: Foque no benefício do tratamento/procedimento.
          6. INFRAESTRUTURA DE TEXTO: Respostas curtas, informais (sem emojis excessivos), simule digitação humana.
        `;

        const aiResponse = await this.aiService.generateResponse(text, context);

        // 3. Hibridismo IA + Regex para Extração
        const extractedEmail = aiResponse.email || this.extractEmail(text);
        const extractedDate = aiResponse.appointmentDate;

        // 4. Persistência Atômica
        await tx.lead.update({
          where: { id: lead.id },
          data: {
            email: extractedEmail || leadData.email,
            lastInteractionAt: timestamp,
            status: aiResponse.intent === 'BOOKING' ? 'QUALIFIED' : leadData.status,
          }
        });

        if (aiResponse.intent === 'BOOKING' && extractedDate) {
          await tx.appointment.create({
            data: {
              title: `Nexus Prospector: Agendamento IA`,
              startTime: extractedDate,
              endTime: new Date(extractedDate.getTime() + 30 * 60000), // Default 30 min
              leadId: lead.id,
              branchId,
              organizationId,
            }
          });
        }

        // Registrar processamento para deduplicação
        await tx.auditLog.create({
          data: {
            action: 'WHATSAPP_INBOUND_PROCESSED',
            entity: 'Lead',
            entityId: lead.id,
            userId: 'SYSTEM',
            organizationId,
            metadata: { externalId, text, aiIntent: aiResponse.intent }
          }
        });

        // 5. Enviar Resposta via WhatsApp
        await this.whatsappClient.sendMessage({
          to: phone,
          text: aiResponse.content,
        });
      });
    } catch (error) {
      if (error.code === 'P2002') {
        this.logger.warn(`Concurrency conflict for message ${externalId}. Skipping.`);
        return;
      }
      this.logger.error(`Error processing incoming message: ${error.message}`, error.stack);
      throw error;
    }
  }

  private extractEmail(text: string): string | null {
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
    const match = text.match(emailRegex);
    return match ? match[0] : null;
  }
}
