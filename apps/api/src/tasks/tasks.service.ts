import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class TasksService {
  constructor(@InjectQueue('tasks') private readonly tasksQueue: Queue) {}

  async createReportTask(organizationId: string, format: 'PDF' | 'CSV') {
    return await this.tasksQueue.add('generate-report', {
      organizationId,
      format,
    });
  }

  async createAiTask(organizationId: string, documentId: string) {
    return await this.tasksQueue.add('ai-process-document', {
      organizationId,
      documentId,
    });
  }
}
