import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { OmniChannelEngine } from '../../../../common/engines/omni-channel.engine';
import { UsageMeteringService } from '../../../nexthub/application/usage-metering.service';

export interface SendMessageDto {
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
    private readonly usageMetering: UsageMeteringService,
  ) {}

  async execute(dto: SendMessageDto): Promise<{ status: string }> {
    const { leadId, text, organizationId } = dto;

    const lead = await this.prisma.client.lead.findUnique({
      where: { id: leadId },
      select: { id: true, phone: true, organizationId: true, unitId: true, name: true }
    });

    if (!lead || lead.organizationId !== organizationId) {
      throw new NotFoundException('Lead não encontrado.');
    }

    // 1. Dispatch via WhatsApp
    await this.omniChannel.sendMessage({
      to: lead.phone,
      text: text,
    });

    // 2. Register Interaction and clear pending state
    await this.prisma.client.$transaction(async (tx) => {
      await tx.interaction.create({
        data: {
          content: text,
          type: 'OUTBOUND',
          leadId: lead.id,
          unitId: lead.unitId,
          organizationId: lead.organizationId,
        }
      });

      await tx.lead.update({
        where: { id: lead.id },
        data: { 
          pendingMessage: null,
          lastInteractionAt: new Date()
        }
      });

      // Clear any pending approval status if exists
      await tx.suggestedMessage.updateMany({
        where: { leadId, status: 'PENDING_APPROVAL' },
        data: { status: 'APPROVED' }
      });
    });

    // 3. Telemetry / Billing
    await this.usageMetering.incrementUsage(organizationId);

    this.logger.log(`Mensagem enviada manualmente/assistida para ${lead.name} (${lead.phone})`);

    return { status: 'sent' };
  }
}
