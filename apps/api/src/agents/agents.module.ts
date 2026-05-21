import { Module } from '@nestjs/common';
import { AgentManager } from './agent-manager.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  providers: [AgentManager, PrismaService],
  exports: [AgentManager],
})
export class AgentsModule {}
