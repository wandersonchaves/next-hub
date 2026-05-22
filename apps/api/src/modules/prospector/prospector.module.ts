import { Module } from '@nestjs/common';
import { HandleIncomingMessageUseCase } from './application/use-cases/handle-incoming-message.use-case';
import { PrismaLeadRepository, PrismaAppointmentRepository } from './infrastructure/adapters/prisma-prospector.repositories';
import { GeminiAIService } from './infrastructure/ai/gemini-ai.service';

@Module({
  imports: [],
  providers: [
    HandleIncomingMessageUseCase,
    {
      provide: 'ILeadRepository',
      useClass: PrismaLeadRepository,
    },
    {
      provide: 'IAppointmentRepository',
      useClass: PrismaAppointmentRepository,
    },
    {
      provide: 'IAIService',
      useClass: GeminiAIService,
    },
  ],
  exports: [HandleIncomingMessageUseCase],
})
export class ProspectorModule { }
