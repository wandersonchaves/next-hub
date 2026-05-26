import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ProspectorController } from './prospector.controller';
import { WhatsAppWebhookController } from './infrastructure/controllers/whatsapp-webhook.controller';
import { HandleIncomingMessageUseCase } from './application/use-cases/handle-incoming-message.use-case';
import { SourceLeadsUseCase } from './application/use-cases/source-leads.use-case';
import { GenerateSalesPitchUseCase } from './application/use-cases/generate-sales-pitch.use-case';
import { SendOutboundMessageUseCase } from './application/use-cases/send-outbound-message.use-case';
import { PrismaLeadRepository, PrismaAppointmentRepository } from './infrastructure/adapters/prisma-prospector.repositories';
import { GeminiAIService } from './infrastructure/ai/gemini-ai.service';
import { EvolutionWhatsAppClient } from './infrastructure/adapters/evolution-whatsapp.client';
import { GoogleMapsLeadSourceAdapter } from './infrastructure/adapters/google-maps-lead-source.adapter';
import { WebSearchContactFinderAdapter } from './infrastructure/adapters/web-search-contact-finder.adapter';
import { WhatsAppInboundProcessor } from './infrastructure/queue/whatsapp-inbound.processor';
import { ProactiveProspectingProcessor } from './infrastructure/queue/proactive-prospecting.processor';
import { SDRConfigEngine } from './infrastructure/sdr-config.engine';
import { GoogleCalendarService } from './infrastructure/google-calendar.service';
import { LeadScoringService } from './application/lead-scoring.service';
import { TenantContextModule } from '../../common/utils/tenant-context/tenant-context.module';

@Module({
  imports: [
    TenantContextModule,
    BullModule.registerQueue(
      { name: 'whatsapp-inbound' },
      { name: 'proactive-prospecting' },
    ),
  ],
  controllers: [ProspectorController, WhatsAppWebhookController],
  providers: [
    HandleIncomingMessageUseCase,
    SourceLeadsUseCase,
    GenerateSalesPitchUseCase,
    SendOutboundMessageUseCase,
    WhatsAppInboundProcessor,
    ProactiveProspectingProcessor,
    SDRConfigEngine,
    GoogleCalendarService,
    LeadScoringService,
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
  exports: [
    HandleIncomingMessageUseCase, 
    SourceLeadsUseCase, 
    GenerateSalesPitchUseCase, 
    SendOutboundMessageUseCase,
    LeadScoringService
  ],
})
export class ProspectorModule { }
