import { Module, Global } from '@nestjs/common';
import { AIOrchestratorEngine } from './ai-orchestrator.engine';
import { OmniChannelEngine } from './omni-channel.engine';
import { BusinessClockEngine } from './business-clock.engine';
import { GrokAIService } from './grok-ai.service';

@Global()
@Module({
  providers: [AIOrchestratorEngine, OmniChannelEngine, BusinessClockEngine, GrokAIService],
  exports: [AIOrchestratorEngine, OmniChannelEngine, BusinessClockEngine, GrokAIService],
})
export class EnginesModule {}
