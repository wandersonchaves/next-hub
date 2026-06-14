import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TasksService } from './tasks.service';
import { TasksProcessor } from './tasks.processor';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'tasks',
    }),
    BullBoardModule.forFeature({
      name: 'tasks',
      adapter: BullMQAdapter,
    }),
  ],
  providers: [TasksService, TasksProcessor],
  exports: [TasksService],
})
export class TasksModule { }
