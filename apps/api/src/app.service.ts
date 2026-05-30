import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class AppService implements OnModuleInit {
  private readonly logger = new Logger(AppService.name);

  constructor(
    @InjectQueue('data-archiver') private readonly archiveQueue: Queue,
  ) {}

  getHello(): string {
    return 'NextHub API v2.0 - Operations Center';
  }

  async onModuleInit() {
    this.logger.log('Initializing System Cron Jobs...');
    
    // Setup Daily Data Archiving (Cold Storage sync)
    // Run every night at 3 AM
    await this.archiveQueue.add('daily-archive', {}, {
      repeat: {
        pattern: '0 3 * * *',
      },
      removeOnComplete: true,
    });

    this.logger.log('Data Archiver CRON scheduled for 03:00 AM daily.');
  }
}
