import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { OmniChannelEngine } from '../../../../common/engines/omni-channel.engine';
import { SaaSControlService } from '../../../nexthub/saas-control/saas-control.service';

export interface OutboundMessageDto {
  to: string;
  text: string;
  organizationId: string;
}

@Injectable()
@Processor('whatsapp-outbound')
export class WhatsAppOutboundProcessor extends WorkerHost {
  private readonly logger = new Logger(WhatsAppOutboundProcessor.name);

  constructor(
    private readonly omniChannel: OmniChannelEngine,
    private readonly saasControl: SaaSControlService,
  ) {
    super();
  }

  async process(job: Job<OutboundMessageDto>): Promise<void> {
    const { to, text, organizationId } = job.data;

    // 1. BILLING INTERCEPTOR (Safety Gating)
    const snapshot = await this.saasControl.getTenantSnapshot(organizationId);
    
    if (snapshot.isBlocked) {
      this.logger.warn(`Outbound Blocked: Organization ${organizationId} is SUSPENDED. Job ${job.id} cancelled.`);
      // We don't throw here to avoid retries if it's a billing block
      return;
    }

    this.logger.log(`Worker: Sending outbound message to ${to} (Org: ${organizationId})`);

    try {
      await this.omniChannel.sendMessage({ to, text });
    } catch (err) {
      this.logger.error(`Failed to send outbound message: ${err.message}`);
      throw err; // Trigger BullMQ retry policy
    }
  }
}
