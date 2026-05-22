import { Module } from '@nestjs/common';
import { ProspectorController } from './prospector.controller';
import { HandleIncomingMessageUseCase } from './application/use-cases/handle-incoming-message.use-case';
import { PrismaLeadRepository, PrismaAppointmentRepository } from './infrastructure/adapters/prisma-prospector.repositories';
import { GeminiAIService } from './infrastructure/ai/gemini-ai.service';
import { OrganizationModule } from '../../core/organization/organization.module';

@Module({
  imports: [OrganizationModule],
  controllers: [ProspectorController],
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
