import { Module } from '@nestjs/common';
import { AgentManager } from './agent-manager.service';

@Module({
  providers: [AgentManager],
  exports: [AgentManager],
})
export class AgentsModule { }
