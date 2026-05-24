import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
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
    // Attempt with v1beta (supports -latest aliases)
    const googleV1Beta = createGoogleGenerativeAI({
      apiKey: geminiKey || '',
      baseURL: 'https://generativelanguage.googleapis.com/v1beta',
    });

    // Attempt with v1 (standard stable)
    const googleV1 = createGoogleGenerativeAI({
      apiKey: geminiKey || '',
    });

    const modelsToTry = [
      { provider: googleV1Beta, name: 'gemini-flash-latest' },
      { provider: googleV1Beta, name: 'gemini-1.5-flash-latest' },
      { provider: googleV1, name: 'gemini-1.5-flash' },
      { provider: googleV1, name: 'gemini-pro' }
    ];

for (const { provider, name } of modelsToTry) {
  try {
    if (!geminiKey) break;

    this.logger.debug(`Attempting AI inference with model: ${name}`);
    const { text } = await generateText({
      model: provider(name),
      prompt,
      abortSignal: AbortSignal.timeout(30000), // 30s timeout
    });

    return this.parseResponse<T>(text, !!request.expectedFormat);
  } catch (err) {
    this.logger.warn(`Gemini model ${name} failed: ${err.message}`);
    continue;
  }
}
    // 2. Fallback to OpenAI if Gemini fails or is missing key
    this.logger.warn(`All Gemini models failed or unavailable, trying GPT-4o as fallback...`);

    try {
      if (!openaiKey) throw new Error('OpenAI API key missing');

      const { text } = await generateText({
        model: openai('gpt-4o'),
        prompt,
        abortSignal: AbortSignal.timeout(35000), // 35s for GPT fallback
      });

      return this.parseResponse<T>(text, !!request.expectedFormat);
    } catch (openaiError) {
      this.logger.error(`AI Final Fallback Error: ${openaiError.message}`);
      throw new Error('Falha catastrófica no Motor de IA: Todos os modelos (Gemini/GPT) falharam.');
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
          content: parsed.content || cleanText,
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
