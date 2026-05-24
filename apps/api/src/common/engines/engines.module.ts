import { Module, Global } from '@nestjs/common';
import { AIOrchestratorEngine } from './ai-orchestrator.engine';
import { OmniChannelEngine } from './omni-channel.engine';
import { BusinessClockEngine } from './business-clock.engine';

@Global()
@Module({
  providers: [AIOrchestratorEngine, OmniChannelEngine, BusinessClockEngine],
  exports: [AIOrchestratorEngine, OmniChannelEngine, BusinessClockEngine],
})
export class EnginesModule {}
