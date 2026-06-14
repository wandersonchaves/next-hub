import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { NotificationsService } from './notifications.service';
import { NotificationsProcessor } from './notifications.processor';
import { EMAIL_PROVIDER } from '../../../common/interfaces/email.interface';
import { ResendAdapter } from '../../../common/adapters/email/resend.adapter';
import { MockEmailAdapter } from '../../../common/adapters/email/mock.adapter';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'notifications',
    }),
    BullBoardModule.forFeature({
      name: 'notifications',
      adapter: BullMQAdapter,
    }),
    ConfigModule,
  ],
  providers: [
    NotificationsService,
    NotificationsProcessor,
    {
      provide: EMAIL_PROVIDER,
      useFactory: (configService: ConfigService) => {
        const apiKey = configService.get('RESEND_API_KEY');
        const nodeEnv = configService.get('NODE_ENV');
        
        if (nodeEnv === 'test' || !apiKey || apiKey === 're_123456789') {
          return new MockEmailAdapter();
        }
        return new ResendAdapter();
      },
      inject: [ConfigService],
    },
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
