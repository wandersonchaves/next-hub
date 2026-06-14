import { Module, OnModuleInit } from '@nestjs/common';
import { BullModule, InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { BackupProcessor } from './backup.processor';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'backups',
    }),
    BullBoardModule.forFeature({
      name: 'backups',
      adapter: BullMQAdapter,
    }),
  ],
  providers: [BackupProcessor],
})
export class BackupModule implements OnModuleInit {
  constructor(@InjectQueue('backups') private readonly backupQueue: Queue) {}

  async onModuleInit() {
    const isDev = !process.env.NODE_ENV || process.env.NODE_ENV === 'development';
    if (isDev && process.env.ENABLE_BACKUP_SCHEDULING !== 'true') {
      this.backupQueue.getRepeatableJobs().then(jobs => {
        jobs.forEach(job => {
          if (job.name === 'daily-db-backup') {
            this.backupQueue.removeRepeatableByKey(job.key);
          }
        });
      });
      return;
    }

    // Schedule daily backup at 3 AM
    await this.backupQueue.add('daily-db-backup', {}, {
      repeat: { pattern: '0 3 * * *' },
    });
  }
}
