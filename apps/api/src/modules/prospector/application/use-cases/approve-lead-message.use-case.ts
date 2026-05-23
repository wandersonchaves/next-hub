import { Injectable, Inject, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { OmniChannelEngine } from '../../../../common/engines/omni-channel.engine';

export interface ApproveMessageDto {
  leadId: string;
  approvedText?: string; // Permitir edição humana
  organizationId: string;
}

@Injectable()
export class ApproveLeadMessageUseCase {
  private readonly logger = new Logger(ApproveLeadMessageUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly omniChannel: OmniChannelEngine,
  ) {}

  async execute(dto: ApproveMessageDto): Promise<{ status: string }> {
    const { leadId, approvedText, organizationId } = dto;

    const lead = await this.prisma.client.lead.findUnique({
      where: { id: leadId },
    });

    if (!lead || lead.organizationId !== organizationId) {
      throw new Error('Lead não encontrado ou acesso negado.');
    }

    if (lead.status !== 'AWAITING_APPROVAL' && !lead.pendingMessage) {
      throw new Error('Não há mensagem pendente para aprovação neste lead.');
    }

    const finalMessage = approvedText || lead.pendingMessage;

    if (!finalMessage) {
      throw new Error('Conteúdo da mensagem está vazio.');
    }

    // 1. Enviar via WhatsApp (Usa normalização internacional por segurança)
    await this.omniChannel.sendMessage({
      to: lead.phone,
      text: finalMessage,
      channel: 'WHATSAPP'
    });

    // 2. Atualizar status para prospectando e limpar fila
    await this.prisma.client.lead.update({
      where: { id: leadId },
      data: {
        status: 'PROSPECTING',
        pendingMessage: null,
        lastInteractionAt: new Date(),
      }
    });

    this.logger.log(`Mensagem aprovada e enviada para ${lead.name} (${lead.phone})`);

    return { status: 'sent' };
  }
}
