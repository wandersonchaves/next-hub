import { Module, Global } from '@nestjs/common';
import { AIOrchestratorEngine } from './ai-orchestrator.engine';
import { OmniChannelEngine } from './omni-channel.engine';

@Global()
@Module({
  providers: [AIOrchestratorEngine, OmniChannelEngine],
  exports: [AIOrchestratorEngine, OmniChannelEngine],
})
export class EnginesModule {}
