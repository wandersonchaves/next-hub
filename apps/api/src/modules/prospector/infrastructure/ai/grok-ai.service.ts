import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createOpenAI } from '@ai-sdk/openai';
import { generateText, Output } from 'ai';

export interface GrokRequest {
  prompt: string;
  system?: string;
  responseFormat?: 'json';
}

@Injectable()
export class GrokAIService {
  private readonly logger = new Logger(GrokAIService.name);

  constructor(private readonly configService: ConfigService) {}

  async generate(request: GrokRequest): Promise<string | null> {
    const apiKey = this.configService.get<string>('GROK_API_KEY');
    
    if (!apiKey) {
      this.logger.warn('GROK_API_KEY is missing. Skipping Grok inference.');
      return null;
    }

    try {
      this.logger.debug('Attempting AI inference with Grok (xAI)');
      
      const xai = createOpenAI({
        apiKey,
        baseURL: 'https://api.x.ai/v1',
      });

      const { text } = await generateText({
        model: xai('grok-2'), 
        system: request.system,
        prompt: request.prompt,
        ...(request.responseFormat === 'json' ? { output: Output.json() } : {}),
        abortSignal: AbortSignal.timeout(30000),
      });

      return text;
    } catch (error) {
      this.logger.error(`Grok inference failed: ${error.message}`);
      return null;
    }
  }
}
