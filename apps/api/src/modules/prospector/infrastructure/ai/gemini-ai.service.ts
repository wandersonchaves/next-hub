import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IAIService, AIResponse } from '../../application/ports/ai-service.port';
import { google } from '@ai-sdk/google';
import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';

@Injectable()
export class GeminiAIService implements IAIService {
  private readonly logger = new Logger(GeminiAIService.name);

  constructor(private readonly configService: ConfigService) {}

  async generateResponse(message: string, context: string): Promise<AIResponse> {
    const geminiKey = this.configService.get<string>('GOOGLE_GENERATIVE_AI_API_KEY');
    const openaiKey = this.configService.get<string>('OPENAI_API_KEY');

    const prompt = `
      ${context}
      
      Usuário enviou: "${message}"
      
      Responda em formato JSON com os seguintes campos:
      - content: a resposta para o WhatsApp (curta, informal).
      - intent: 'GREETING', 'BOOKING', 'QUESTION', 'NEGATIVE', ou 'OTHER'.
      - email: e-mail do usuário se mencionado.
      - appointmentDate: data e hora ISO se o usuário confirmou um agendamento.
    `;

    try {
      if (!geminiKey) throw new Error('Gemini API key missing');

      const { text } = await generateText({
        model: google('gemini-1.5-pro'),
        prompt,
      });

      return this.parseResponse(text);
    } catch (geminiError) {
      this.logger.warn(`Gemini failed, trying GPT-4o: ${geminiError.message}`);

      try {
        if (!openaiKey) throw new Error('OpenAI API key missing');

        const { text } = await generateText({
          model: openai('gpt-4o'),
          prompt,
        });

        return this.parseResponse(text);
      } catch (openaiError) {
        this.logger.error(`AI Fallback Error: ${openaiError.message}`);
        return {
          content: 'Oi! Como posso te ajudar?',
          intent: 'GREETING',
        };
      }
    }
  }

  private parseResponse(text: string): AIResponse {
    try {
      const cleanText = text.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleanText);

      return {
        content: parsed.content,
        intent: parsed.intent,
        email: parsed.email,
        appointmentDate: parsed.appointmentDate ? new Date(parsed.appointmentDate) : undefined,
      };
    } catch (e) {
      this.logger.error(`Failed to parse AI response: ${text}`);
      return {
        content: 'Entendido. Pode me falar mais?',
        intent: 'OTHER',
      };
    }
  }
}
