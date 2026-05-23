import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ProspectorController } from './prospector.controller';
import { WhatsAppWebhookController } from './infrastructure/controllers/whatsapp-webhook.controller';
import { HandleIncomingMessageUseCase } from './application/use-cases/handle-incoming-message.use-case';
import { SourceLeadsUseCase } from './application/use-cases/source-leads.use-case';
import { PrismaLeadRepository, PrismaAppointmentRepository } from './infrastructure/adapters/prisma-prospector.repositories';
import { GeminiAIService } from './infrastructure/ai/gemini-ai.service';
import { EvolutionWhatsAppClient } from './infrastructure/adapters/evolution-whatsapp.client';
import { GoogleMapsLeadSourceAdapter } from './infrastructure/adapters/google-maps-lead-source.adapter';
import { WebSearchContactFinderAdapter } from './infrastructure/adapters/web-search-contact-finder.adapter';
import { WhatsAppInboundProcessor } from './infrastructure/queue/whatsapp-inbound.processor';
import { OrganizationModule } from '../../core/organization/organization.module';
import { TenantContextModule } from '../../common/utils/tenant-context/tenant-context.module';

@Module({
  imports: [
    TenantContextModule,
    BullModule.registerQueue({
      name: 'whatsapp-inbound',
    }),
  ],
  controllers: [ProspectorController, WhatsAppWebhookController],
  providers: [
    HandleIncomingMessageUseCase,
    SourceLeadsUseCase,
    WhatsAppInboundProcessor,
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
    {
      provide: 'IWhatsAppClient',
      useClass: EvolutionWhatsAppClient,
    },
    {
      provide: 'ILeadSourceProvider',
      useClass: GoogleMapsLeadSourceAdapter,
    },
    {
      provide: 'IContactFinder',
      useClass: WebSearchContactFinderAdapter,
    },
  ],
  exports: [HandleIncomingMessageUseCase, SourceLeadsUseCase],
})
export class ProspectorModule { }
