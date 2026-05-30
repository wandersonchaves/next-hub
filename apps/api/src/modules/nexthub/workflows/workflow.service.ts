import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AgentManager } from '../../../common/agents/agent-manager.service';
import { PluginsService } from '../plugins/plugins.service';

@Injectable()
export class WorkflowService {
  private readonly logger = new Logger(WorkflowService.name);

  constructor(
    private prisma: PrismaService,
    private agents: AgentManager,
    private plugins: PluginsService,
  ) {}

  async triggerWorkflow(event: string, organizationId: string, payload: any) {
    const workflows = await this.prisma.client.workflow.findMany({
      where: { organizationId, triggerEvent: event, active: true },
      include: { steps: { orderBy: { order: 'asc' } } },
    });

    for (const workflow of workflows) {
      this.logger.log(`Executing workflow ${workflow.name} for org ${organizationId}`);
      
      let currentPayload = payload;

      for (const step of workflow.steps) {
        switch (step.type) {
          case 'AI_AGENT':
            const aiResult = await this.agents.runOrchestration(JSON.stringify(currentPayload), organizationId);
            currentPayload = { ...currentPayload, aiResult };
            break;
          case 'PLUGIN':
            // Integração com o Plugin Engine da Fase 21
            await this.plugins.runPluginsForEvent(event, organizationId, currentPayload);
            break;
        }
      }
    }
  }
}
