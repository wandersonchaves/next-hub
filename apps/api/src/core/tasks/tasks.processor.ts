import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Processor('tasks')
export class TasksProcessor extends WorkerHost {
  private readonly logger = new Logger(TasksProcessor.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    const { organizationId } = job.data;
    this.logger.log(`Processing task ${job.name} for organization ${organizationId}`);

    switch (job.name) {
      case 'generate-report':
        // Simulação de geração de PDF pesado
        await new Promise(resolve => setTimeout(resolve, 5000));
        this.logger.log(`Report generated for organization ${organizationId}`);
        break;
      case 'ai-process-document':
        // Simulação de processamento de IA
        await new Promise(resolve => setTimeout(resolve, 3000));
        this.logger.log(`AI processing completed for organization ${organizationId}`);
        break;
    }
  }
}
