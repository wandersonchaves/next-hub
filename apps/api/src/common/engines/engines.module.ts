import { Module, Global } from '@nestjs/common';
import { AIOrchestratorEngine } from './ai-orchestrator.engine';
import { OmniChannelEngine } from './omni-channel.engine';
import { BusinessClockEngine } from './business-clock.engine';
import { GrokAIService } from '../../modules/prospector/infrastructure/ai/grok-ai.service';
import { OpenAIService } from './openai.service';
import { OpenRouterAIService } from '../../modules/prospector/infrastructure/ai/open-router-ai.service';

@Global()
@Module({
  providers: [
    AIOrchestratorEngine, 
    OmniChannelEngine, 
    BusinessClockEngine, 
    GrokAIService,
    OpenAIService,
    OpenRouterAIService
  ],
  exports: [
    AIOrchestratorEngine, 
    OmniChannelEngine, 
    BusinessClockEngine, 
    GrokAIService,
    OpenAIService,
    OpenRouterAIService
  ],
})
export class EnginesModule {}
