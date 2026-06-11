import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AIOrchestratorEngine } from '../../../common/engines/ai-orchestrator.engine';
import { ProspectorSseService } from '../services/prospector-sse.service';

@Injectable()
export class LeadScoringService {
  private readonly logger = new Logger(LeadScoringService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiOrchestrator: AIOrchestratorEngine,
    private readonly sseService: ProspectorSseService,
  ) {}

  /**
   * Calcula o score do lead baseado no histórico recente e na intenção detectada.
   * Score de 0 a 100.
   */
  async updateLeadScore(leadId: string): Promise<number> {
    try {
      const lead = await this.prisma.client.lead.findUnique({
        where: { id: leadId },
        include: {
          interactions: {
            orderBy: { createdAt: 'desc' },
            take: 10
          }
        }
      });

      if (!lead) return 0;

      const history = lead.interactions.map(i => `${i.type}: ${i.content}`).join('\n');

      const scoringContext = `
        VOCÊ É UM ANALISTA DE QUALIFICAÇÃO DE VENDAS (LEAD SCORING).
        Sua missão é atribuir uma pontuação de 0 a 100 baseada na PROBABILIDADE DE FECHAMENTO.
        
        CRITÉRIOS:
        - 0-30: Desinteresse, respostas curtas/ríspidas, recusa clara.
        - 31-60: Curiosidade, fazendo perguntas sobre o serviço mas ainda em dúvida.
        - 61-85: Passou e-mail, confirmou dores (no-show/recorrência), demonstrou urgência.
        - 86-100: Agendamento concluído, e-mail e data confirmados.
        
        HISTÓRICO RECENTE:
        ${history}
      `;

      const scoringResult = await this.aiOrchestrator.generate<{ score: number }>({
        context: scoringContext,
        message: "Avalie o histórico e retorne o score numérico.",
        expectedFormat: `{ "score": number }`
      });

      const finalScore = scoringResult.extractedData?.score ?? lead.score;

      const updatedLead = await this.prisma.client.lead.update({
        where: { id: leadId },
        data: { score: finalScore },
        select: { id: true, status: true, score: true }
      });

      this.sseService.broadcast({
        leadId: updatedLead.id,
        status: updatedLead.status,
        scoreIA: updatedLead.score
      });

      this.logger.debug(`Lead Scoring: ${lead.name} updated to ${finalScore}`);
      return finalScore;
    } catch (err) {
      this.logger.error(`Scoring failed for lead ${leadId}: ${err.message}`);
      return 0;
    }
  }
}
