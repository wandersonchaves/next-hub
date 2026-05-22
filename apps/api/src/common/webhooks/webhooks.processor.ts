import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import axios from 'axios';
import * as crypto from 'crypto';

@Processor('webhooks')
export class WebhooksProcessor extends WorkerHost {
  private readonly logger = new Logger(WebhooksProcessor.name);

  async process(job: Job<any, any, string>): Promise<any> {
    const { url, secret, event, payload } = job.data;

    const signature = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('hex');

    try {
      await axios.post(url, payload, {
        headers: {
          'x-saas-event': event,
          'x-saas-signature': signature,
          'Content-Type': 'application/json',
        },
        timeout: 5000,
      });
      this.logger.log(`Webhook successfully delivered to ${url}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Webhook delivery failed to ${url}: ${message}`);
      throw error; // Let BullMQ handle retries
    }
  }
}
