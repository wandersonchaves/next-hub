import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { WebhooksService } from './webhooks.service';
import { WebhooksProcessor } from './webhooks.processor';
import { PrismaService } from '../prisma/prisma.service';
import { ClerkWebhookController } from './clerk-webhook.controller';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'webhooks',
    }),
  ],
  controllers: [ClerkWebhookController],
  providers: [WebhooksService, WebhooksProcessor, PrismaService],
  exports: [WebhooksService],
})
export class WebhooksModule {}
