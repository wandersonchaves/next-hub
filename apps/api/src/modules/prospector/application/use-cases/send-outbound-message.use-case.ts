import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { OmniChannelEngine } from '../../../../common/engines/omni-channel.engine';

export interface SendOutboundDto {
  leadId: string;
  text: string;
  organizationId: string;
}

@Injectable()
export class SendOutboundMessageUseCase {
  private readonly logger = new Logger(SendOutboundMessageUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly omniChannel: OmniChannelEngine,
  ) {}

  async execute(dto: SendOutboundDto): Promise<{ status: string }> {
    const { leadId, text, organizationId } = dto;

    // 1. Fetch Lead context
    const lead = await this.prisma.client.lead.findUnique({
      where: { id: leadId },
    });

    if (!lead || lead.organizationId !== organizationId) {
      throw new NotFoundException('Lead não encontrado.');
    }

    // 2. Dispatch real WhatsApp message via OmniChannel (Evolution Go)
    await this.omniChannel.sendMessage({
      to: lead.phone,
      text: text,
      channel: 'WHATSAPP'
    });

    // 3. Update DB Atomically
    await this.prisma.client.$transaction(async (tx) => {
      // Record Interaction
      await tx.interaction.create({
        data: {
          content: text,
          type: 'OUTBOUND',
          leadId: leadId,
          branchId: lead.branchId,
          organizationId: organizationId,
        }
      });

      // Update Lead Status and Clear Pending Buffer
      await tx.lead.update({
        where: { id: leadId },
        data: { 
          status: 'OUTBOUND_SENT',
          pendingMessage: null,
          lastInteractionAt: new Date()
        }
      });

      // If there was a pending suggested message, mark it as approved
      await tx.suggestedMessage.updateMany({
        where: { leadId, status: 'PENDING_APPROVAL' },
        data: { status: 'APPROVED' }
      });
    });

    this.logger.log(`Mensagem enviada manualmente/assistida para ${lead.name} (${lead.phone})`);

    return { status: 'sent' };
  }
}
