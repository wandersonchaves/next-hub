import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WebhooksService {
  constructor(
    @InjectQueue('webhooks') private readonly webhooksQueue: Queue,
    private prisma: PrismaService,
  ) {}

  async triggerEvent(organizationId: string, event: string, payload: any) {
    const webhooks = await this.prisma.client.webhook.findMany({
      where: { organizationId, active: true, events: { has: event } },
    });

    for (const webhook of webhooks) {
      await this.webhooksQueue.add('dispatch-webhook', {
        webhookId: webhook.id,
        url: webhook.url,
        secret: webhook.secret,
        event,
        payload,
      }, {
        attempts: 5,
        backoff: { type: 'exponential', delay: 1000 },
      });
    }
  }
}
