import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TasksService } from './tasks.service';
import { TasksProcessor } from './tasks.processor';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'tasks',
    }),
  ],
  providers: [TasksService, TasksProcessor, PrismaService],
  exports: [TasksService],
})
export class TasksModule {}
