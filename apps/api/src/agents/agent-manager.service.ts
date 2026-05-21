import { Injectable, Logger } from '@nestjs/common';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { SystemMessage, HumanMessage } from '@langchain/core/messages';

@Injectable()
export class AgentManager {
  private readonly logger = new Logger(AgentManager.name);
  private model: ChatGoogleGenerativeAI;

  constructor() {
    this.model = new ChatGoogleGenerativeAI({
      model: "gemini-1.5-pro",
      maxOutputTokens: 2048,
    });
  }

  async runOrchestration(query: string, organizationId: string) {
    this.logger.log(`Orchestrating agents for org ${organizationId}: ${query}`);

    // Simple orchestration logic: router determines which specialized agent to call
    const routerPrompt = `You are a coordinator for a SaaS platform. 
                          Determine if the following request is related to BILLING, SUPPORT, or GROWTH: "${query}"`;
    
    const classification = await this.model.invoke([
      new SystemMessage(routerPrompt),
      new HumanMessage(query),
    ]);

    const route = classification.content.toString();

    if (route.includes('BILLING')) {
      return this.runBillingAgent(query, organizationId);
    } else if (route.includes('GROWTH')) {
      return this.runGrowthAgent(query, organizationId);
    }

    return this.runSupportAgent(query, organizationId);
  }

  private async runBillingAgent(query: string, organizationId: string) {
    return { agent: 'BillingAgent', response: `Analyzing billing data for ${organizationId}...` };
  }

  private async runSupportAgent(query: string, organizationId: string) {
    return { agent: 'SupportAgent', response: `Searching knowledge base for ${organizationId}...` };
  }

  private async runGrowthAgent(query: string, organizationId: string) {
    return { agent: 'GrowthAgent', response: `Generating growth strategy for ${organizationId}...` };
  }
}
