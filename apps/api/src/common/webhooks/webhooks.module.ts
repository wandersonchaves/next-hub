import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { WebhooksService } from './webhooks.service';
import { WebhooksProcessor } from './webhooks.processor';
import { ClerkWebhookController } from './clerk-webhook.controller';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'webhooks',
    }),
    BullBoardModule.forFeature({
      name: 'webhooks',
      adapter: BullMQAdapter,
    }),
  ],
  controllers: [ClerkWebhookController],
  providers: [WebhooksService, WebhooksProcessor],
  exports: [WebhooksService],
})
export class WebhooksModule { }
