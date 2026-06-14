import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ProspectorController } from './infrastructure/controllers/prospector.controller';
import { WhatsAppWebhookController } from './infrastructure/controllers/whatsapp-webhook.controller';
import { HandleIncomingMessageUseCase } from './application/use-cases/handle-incoming-message.use-case';
import { SourceLeadsUseCase } from './application/use-cases/source-leads.use-case';
import { GenerateSalesPitchUseCase } from './application/use-cases/generate-sales-pitch.use-case';
import { SendOutboundMessageUseCase } from './application/use-cases/send-outbound-message.use-case';
import { CreateLeadWithContextUseCase } from './application/use-cases/create-lead-with-context.use-case';
import { LeadManualController } from './infrastructure/controllers/lead-manual.controller';
import { PrismaLeadRepository, PrismaAppointmentRepository } from './infrastructure/adapters/prisma-prospector.repositories';
import { GeminiAIService } from './infrastructure/ai/gemini-ai.service';
import { OpenRouterAIService } from './infrastructure/ai/open-router-ai.service';
import { GrokAIService } from './infrastructure/ai/grok-ai.service';
import { EvolutionWhatsAppClient } from './infrastructure/adapters/evolution-whatsapp.client';
import { GoogleMapsLeadSourceAdapter } from './infrastructure/adapters/google-maps-lead-source.adapter';
import { MockLeadSourceAdapter } from './infrastructure/adapters/mock-lead-source.adapter';
import { WebSearchContactFinderAdapter } from './infrastructure/adapters/web-search-contact-finder.adapter';
import { WhatsAppInboundProcessor } from './infrastructure/queue/whatsapp-inbound.processor';
import { WhatsAppOutboundProcessor } from './infrastructure/queue/whatsapp-outbound.processor';
import { ProactiveProspectingProcessor } from './infrastructure/queue/proactive-prospecting.processor';
import { SDRConfigEngine } from './infrastructure/sdr-config.engine';
import { GoogleCalendarService } from './infrastructure/google-calendar.service';
import { LeadScoringService } from './application/lead-scoring.service';
import { AIChatService } from './services/ai-chat.service';
import { ProspectorSseService } from './services/prospector-sse.service';
import { TenantContextModule } from '../../common/utils/tenant-context/tenant-context.module';
import { CalendarOrchestratorWorker } from '../../common/workers/calendar-orchestrator.worker';
import { SaaSControlModule } from '../nexthub/saas-control/saas-control.module';

@Module({
  imports: [
    TenantContextModule,
    SaaSControlModule,
    BullModule.registerQueue(
      { name: 'whatsapp-inbound' },
      { name: 'whatsapp-outbound' },
      { name: 'proactive-prospecting' },
      { name: 'calendar-orchestrator' },
    ),
    BullBoardModule.forFeature(
      { name: 'whatsapp-inbound', adapter: BullMQAdapter },
      { name: 'whatsapp-outbound', adapter: BullMQAdapter },
      { name: 'proactive-prospecting', adapter: BullMQAdapter },
      { name: 'calendar-orchestrator', adapter: BullMQAdapter },
    ),
  ],
  controllers: [ProspectorController, WhatsAppWebhookController, LeadManualController],
  providers: [
    CreateLeadWithContextUseCase,
    HandleIncomingMessageUseCase,
    SourceLeadsUseCase,
    GenerateSalesPitchUseCase,
    SendOutboundMessageUseCase,
    WhatsAppInboundProcessor,
    WhatsAppOutboundProcessor,
    ProactiveProspectingProcessor,
    SDRConfigEngine,
    GoogleCalendarService,
    LeadScoringService,
    AIChatService,
    ProspectorSseService,
    GrokAIService,
    OpenRouterAIService,
    CalendarOrchestratorWorker,
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
      useFactory: (maps: GoogleMapsLeadSourceAdapter, mock: MockLeadSourceAdapter) => {
        const useReal = process.env.NODE_ENV === 'production' || process.env.USE_REAL_LEADS === 'true';
        return useReal ? maps : mock;
      },
      inject: [GoogleMapsLeadSourceAdapter, MockLeadSourceAdapter],
    },
    GoogleMapsLeadSourceAdapter,
    MockLeadSourceAdapter,
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
    LeadScoringService,
    AIChatService,
    ProspectorSseService,
    GrokAIService,
    OpenRouterAIService
  ],
})
export class ProspectorModule { }
