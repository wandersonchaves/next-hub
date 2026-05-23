import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { OmniChannelEngine } from '../../../../common/engines/omni-channel.engine';

export interface ApproveMessageDto {
  leadId: string;
  messageId: string;
  editedText?: string;
  organizationId: string;
}

@Injectable()
export class ApproveSuggestedMessageUseCase {
  private readonly logger = new Logger(ApproveSuggestedMessageUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly omniChannel: OmniChannelEngine,
  ) {}

  async execute(dto: ApproveMessageDto): Promise<{ status: string }> {
    const { leadId, messageId, editedText, organizationId } = dto;

    // 1. Fetch Suggested Message and Lead
    const suggested = await this.prisma.client.suggestedMessage.findUnique({
      where: { id: messageId },
      include: { lead: true }
    });

    if (!suggested || suggested.leadId !== leadId) {
      throw new NotFoundException('Mensagem sugerida não encontrada.');
    }

    if (suggested.lead.organizationId !== organizationId) {
      throw new ForbiddenException('Acesso negado ao lead da organização.');
    }

    if (suggested.status !== 'PENDING_APPROVAL') {
      throw new Error('Esta mensagem já foi processada.');
    }

    const finalMessage = editedText || suggested.content;

    // 2. Dispatch real WhatsApp message
    await this.omniChannel.sendMessage({
      to: suggested.lead.phone,
      text: finalMessage,
      channel: 'WHATSAPP'
    });

    // 3. Atomically Update DB
    await this.prisma.client.$transaction([
      this.prisma.client.suggestedMessage.update({
        where: { id: messageId },
        data: { status: 'APPROVED', content: finalMessage }
      }),
      this.prisma.client.lead.update({
        where: { id: leadId },
        data: { 
          status: 'OUTBOUND_SENT',
          lastInteractionAt: new Date()
        }
      })
    ]);

    this.logger.log(`Pitch aprovado e enviado para ${suggested.lead.name} (${suggested.lead.phone})`);

    return { status: 'sent' };
  }
}
