import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FinOpsService {
  private readonly logger = new Logger(FinOpsService.name);
  private TOKEN_COST_PER_1K = 0.01; // Simulação de custo em USD

  constructor(private prisma: PrismaService) {}

  async trackAiUsage(organizationId: string, tokens: number) {
    const cost = (tokens / 1000) * this.TOKEN_COST_PER_1K;
    
    this.logger.log(`Org ${organizationId} used ${tokens} tokens. Estimated cost: $${cost.toFixed(4)}`);

    // In a real scenario, update a usage table or push to Billing system
    await this.prisma.client.subscription.update({
      where: { organizationId },
      data: {
        // Assume metadata contains monthly accumulated cost
        updatedAt: new Date(),
      }
    });

    if (cost > 10.0) { // Limite arbitrário de alerta
      this.logger.warn(`High AI Spend detected for org ${organizationId}: $${cost.toFixed(2)}`);
    }
  }
}
