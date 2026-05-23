import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from '@ai-sdk/google';
import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';

export interface AIOrchestratorRequest {
  context: string;
  message: string;
  history?: { role: 'user' | 'assistant', content: string }[];
  expectedFormat?: string; // Optional JSON schema or instructions
}

export interface AIOrchestratorResponse<T = any> {
  content: string;
  extractedData?: T;
  rawResponse: string;
}

@Injectable()
export class AIOrchestratorEngine {
  private readonly logger = new Logger(AIOrchestratorEngine.name);

  constructor(private readonly configService: ConfigService) {}

  async generate<T = any>(request: AIOrchestratorRequest): Promise<AIOrchestratorResponse<T>> {
    const geminiKey = this.configService.get<string>('GOOGLE_GENERATIVE_AI_API_KEY');
    const openaiKey = this.configService.get<string>('OPENAI_API_KEY');

    const prompt = `
      CONTEXTO DO SISTEMA:
      ${request.context}
      
      ${request.expectedFormat ? `\nINSTRUÇÕES DE FORMATO OBRIGATÓRIO (JSON):\n${request.expectedFormat}\n` : ''}
      
      HISTÓRICO:
      ${request.history?.map(h => `${h.role.toUpperCase()}: ${h.content}`).join('\n') || 'Nenhum histórico'}
      
      MENSAGEM ATUAL DO USUÁRIO: "${request.message}"
    `;

    try {
      if (!geminiKey) throw new Error('Gemini API key missing');

      const { text } = await generateText({
        model: google('gemini-1.5-pro'),
        prompt,
      });

      return this.parseResponse<T>(text, !!request.expectedFormat);
    } catch (geminiError) {
      this.logger.warn(`Gemini failed, trying GPT-4o: ${geminiError.message}`);

      try {
        if (!openaiKey) throw new Error('OpenAI API key missing');

        const { text } = await generateText({
          model: openai('gpt-4o'),
          prompt,
        });

        return this.parseResponse<T>(text, !!request.expectedFormat);
      } catch (openaiError) {
        this.logger.error(`AI Fallback Error: ${openaiError.message}`);
        throw new Error('Falha catastrófica no Motor de IA');
      }
    }
  }

  private parseResponse<T>(text: string, expectsJson: boolean): AIOrchestratorResponse<T> {
    const cleanText = text.trim();
    if (expectsJson) {
      try {
        const jsonMatch = cleanText.match(/```json\s*([\s\S]*?)\s*```/) || cleanText.match(/({[\s\S]*})/);
        const jsonString = jsonMatch ? jsonMatch[1] || jsonMatch[0] : cleanText;
        const parsed = JSON.parse(jsonString);
        return {
          content: parsed.content || cleanText, // Fallback to raw text if no 'content' key
          extractedData: parsed as T,
          rawResponse: cleanText,
        };
      } catch (e) {
        this.logger.error(`Failed to parse AI JSON response: ${cleanText}`);
      }
    }
    
    return {
      content: cleanText,
      rawResponse: cleanText,
    };
  }
}
