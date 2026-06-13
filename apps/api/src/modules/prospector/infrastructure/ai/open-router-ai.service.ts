import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createOpenAI } from '@ai-sdk/openai';
import { generateText, Output } from 'ai';

export interface OpenRouterRequest {
  prompt: string;
  system?: string;
  responseFormat?: 'json';
}

@Injectable()
export class OpenRouterAIService {
  private readonly logger = new Logger(OpenRouterAIService.name);

  constructor(private readonly configService: ConfigService) {}

  async generate(request: OpenRouterRequest): Promise<string | null> {
    const apiKey = this.configService.get<string>('OPENROUTER_API_KEY');
    
    if (!apiKey) {
      this.logger.warn('OPENROUTER_API_KEY is missing. Skipping OpenRouter inference.');
      return null;
    }

    try {
      this.logger.debug('Attempting real AI inference with OpenRouter (Dynamic Free Tier)');
      
      const openrouter = createOpenAI({
        apiKey,
        baseURL: 'https://openrouter.ai/api/v1',
      });

      // Configured strictly for the official dynamic free barramento
      const { text } = await generateText({
        model: openrouter('openrouter/auto:free'),
        system: request.system,
        prompt: request.prompt,
        ...(request.responseFormat === 'json' ? { output: Output.json() } : {}),
        abortSignal: AbortSignal.timeout(40000), // 40s staff-level guard
      });

      return text;
    } catch (error) {
      this.logger.error(`OpenRouter inference failed: ${error.message}`);
      return null;
    }
  }
}
