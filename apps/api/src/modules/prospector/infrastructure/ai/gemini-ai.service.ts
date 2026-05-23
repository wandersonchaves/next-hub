import { Injectable, Logger } from '@nestjs/common';
import { AIOrchestratorEngine } from '../../../../common/engines/ai-orchestrator.engine';
import { IAIService, AIResponse } from '../../application/ports/ai-service.port';

@Injectable()
export class GeminiAIService implements IAIService {
  private readonly logger = new Logger(GeminiAIService.name);

  constructor(private readonly aiOrchestrator: AIOrchestratorEngine) {}

  async generateResponse(message: string, context: string): Promise<AIResponse> {
    try {
      const response = await this.aiOrchestrator.generate<Omit<AIResponse, 'content'>>({
        context,
        message,
        expectedFormat: `
          {
            "content": "A resposta humanizada para o WhatsApp",
            "intent": "GREETING | BOOKING | QUESTION | NEGATIVE | OTHER",
            "email": "email do usuario caso ele tenha informado (opcional)",
            "appointmentDate": "data e hora ISO se houver agendamento (opcional)"
          }
        `
      });

      return {
        content: response.content,
        intent: response.extractedData?.intent || 'OTHER',
        email: response.extractedData?.email,
        appointmentDate: response.extractedData?.appointmentDate ? new Date(response.extractedData.appointmentDate) : undefined,
      } as AIResponse;

    } catch (error) {
      this.logger.error(`GeminiAIService adapter failed: ${error.message}`);
      return {
        content: 'Oi! Tudo bem? Como posso te ajudar hoje?',
        intent: 'GREETING',
      };
    }
  }
}
