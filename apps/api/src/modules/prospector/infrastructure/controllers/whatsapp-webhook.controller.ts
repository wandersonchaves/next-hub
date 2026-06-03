import { Controller, Post, Body, BadRequestException, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../../../../prisma/prisma.service';

@ApiTags('Nexus Prospector Webhooks')
@Controller('webhooks/whatsapp')
export class WhatsAppWebhookController {
  private readonly logger = new Logger(WhatsAppWebhookController.name);

  constructor(
    @InjectQueue('whatsapp-inbound') private readonly whatsappQueue: Queue,
    private readonly prisma: PrismaService,
  ) {}

  @Post('evolution')
  @ApiOperation({ summary: 'Evolution API Webhook Inbound (High-Performance Secretary Mode)' })
  async handleEvolutionWebhook(
    @Body() payload: any,
  ) {
    this.logger.debug(`GOD-MODE: Webhook Received. Event: ${payload.event}`);

    // 1. Robust Data Extraction (Evolution Go / v2 Schema)
    const data = payload.data || {};
    const info = data.Info || {};
    const message = data.Message || {};

    const externalId = info.ID || data.key?.id;
    const remoteJid = info.Sender || info.Chat || data.key?.remoteJid || '';
    const isFromMe = info.IsFromMe === true || data.key?.fromMe === true;
    
    let messageDate: Date;
    if (info.Timestamp && typeof info.Timestamp === 'string') {
      messageDate = new Date(info.Timestamp);
    } else {
      const ts = data.messageTimestamp || info.Timestamp || Math.floor(Date.now() / 1000);
      messageDate = new Date(ts * 1000);
    }

    const messageContent = message.conversation || 
                           message.extendedTextMessage?.text ||
                           message.buttonsResponseMessage?.selectedDisplayText ||
                           data.message?.conversation ||
                           '';

    if (!externalId) return { skipped: true, reason: 'no_id' };
    if (isFromMe) return { skipped: true, reason: 'is_from_me' };
    if (remoteJid.includes('@status') || remoteJid.includes('@newsletter')) return { skipped: true, reason: 'system_message' };
    if (!messageContent) return { skipped: true, reason: 'empty_content' };

    // 2. Contact Normalization & Global Match (Signature Surgery)
    const rawPhone = remoteJid.split('@')[0].split(':')[0];
    const phoneSignature = rawPhone.replace(/\D/g, '').slice(-8);

    this.logger.debug(`GOD-MODE: Looking for lead with signature ending in ${phoneSignature} globally`);

    // GLOBAL SEARCH: Ignore headers for routing, trust the phone signature.
    const lead = await this.prisma.client.lead.findFirst({
      where: {
        phone: { endsWith: phoneSignature }
      },
      select: { id: true, lastInteractionAt: true, phone: true, name: true, unitId: true, organizationId: true }
    });

    if (!lead) {
      this.logger.warn(`GOD-MODE WARN: Lead not found globally! Phone: ${rawPhone}, Signature: ${phoneSignature}`);
      return { skipped: true, reason: 'lead_not_found' };
    }

    const organizationId = lead.organizationId;
    this.logger.log(`GOD-MODE SUCCESS: Match found! Lead: ${lead.name} (${lead.id}) in Org ${organizationId}`);

    const resolvedUnitId = lead.unitId;

    // 3. Guards
    const existingInteraction = await this.prisma.client.interaction.findUnique({
      where: { externalId },
      select: { id: true }
    });
    if (existingInteraction) return { skipped: true, reason: 'duplicate' };

    if (messageDate < lead.lastInteractionAt) {
      this.logger.warn(`GOD-MODE: Stale message ${externalId}. Skipping.`);
      return { skipped: true, reason: 'temporal_guard' };
    }

    // 4. Immediate Recording (The context is saved here, allowing worker to harvest it later)
    try {
      await this.prisma.client.$transaction([
        this.prisma.client.interaction.create({
          data: {
            externalId,
            content: messageContent,
            type: 'INBOUND',
            leadId: lead.id,
            unitId: resolvedUnitId,
            organizationId,
            createdAt: messageDate,
          }
        }),
        this.prisma.client.lead.update({
          where: { id: lead.id },
          data: { lastInteractionAt: messageDate }
        })
      ]);
      this.logger.log(`GOD-MODE SUCCESS: Interaction saved for ${lead.name}`);
    } catch (err) {
      if (err.code === 'P2002') return { skipped: true, reason: 'duplicate' };
      throw err;
    }

    // 5. DEBOUNCE DISPATCH (30s window - Humanized Buffer)
    // Using jobId: lead.id ensures BullMQ will reject subsequent additions within the delay window
    await this.whatsappQueue.add('process-message', {
      leadId: lead.id,
      externalId,
      phone: lead.phone,
      text: messageContent, // Individual text passed but worker will re-harvest full context
      timestamp: Math.floor(messageDate.getTime() / 1000),
      organizationId,
      unitId: resolvedUnitId,
    }, {
      jobId: `debounce-${lead.id}`, // Fixed: Use hyphen instead of colon
      delay: 30000, // 30s typing wait (Staff-level debounce)
      removeOnComplete: true,
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 }
    });

    return { status: 'accepted', externalId };
  }
}
