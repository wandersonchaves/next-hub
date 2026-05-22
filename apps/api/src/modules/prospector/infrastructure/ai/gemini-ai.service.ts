import { Injectable } from '@nestjs/common';
import { google } from '@ai-sdk/google';
import { generateText, LanguageModel } from 'ai';
import { IAIService } from '../../application/ports/prospector.ports';

@Injectable()
export class GeminiAIService implements IAIService {
  private model: LanguageModel;

  constructor() {
    this.model = google('gemini-1.5-pro-latest');
  }

  async analyzeMessage(message: string, context: { nicheContext: string; plansContext: string }): Promise<{
    name?: string;
    email?: string;
    intent: string;
    appointmentDate?: Date;
  }> {
    const prompt = `
      Você é um assistente de triagem especializado em ${context.nicheContext}.
      Contexto dos planos: ${context.plansContext}

      Analise a seguinte mensagem recebida via chat e extraia:
      1. Nome do contato (se fornecido).
      2. Email do contato (se fornecido).
      3. Intenção (SCHEDULE se quiser agendar, INFO se quiser saber mais, OTHER se for irrelevante).
      4. Data e hora de agendamento (se for SCHEDULE e uma data for mencionada). Use o formato ISO.

      Mensagem: "${message}"

      Responda APENAS em formato JSON puro, sem blocos de código:
      {
        "name": "string | null",
        "email": "string | null",
        "intent": "SCHEDULE | INFO | OTHER",
        "appointmentDate": "ISOString | null"
      }
    `;

    const { text } = await generateText({
      model: this.model,
      prompt,
    });

    try {
      const result = JSON.parse(text);
      return {
        ...result,
        appointmentDate: result.appointmentDate ? new Date(result.appointmentDate) : undefined,
      };
    } catch (error) {
      console.error('Failed to parse AI response:', text);
      return { intent: 'OTHER' };
    }
  }
}
