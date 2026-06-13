import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { openai } from '@ai-sdk/openai';
import { generateText, Output } from 'ai';

export interface OpenAIRequest {
  prompt: string;
  system?: string;
  responseFormat?: 'json';
}

@Injectable()
export class OpenAIService {
  private readonly logger = new Logger(OpenAIService.name);

  constructor(private readonly configService: ConfigService) {}

  async generate(request: OpenAIRequest): Promise<string | null> {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    
    if (!apiKey) {
      this.logger.warn('OPENAI_API_KEY is missing. Skipping OpenAI inference.');
      return null;
    }

    try {
      this.logger.debug('Attempting AI inference with OpenAI (GPT-4o)');
      
      const { text } = await generateText({
        model: openai('gpt-4o'),
        system: request.system,
        prompt: request.prompt,
        ...(request.responseFormat === 'json' ? { output: Output.json() } : {}),
        abortSignal: AbortSignal.timeout(35000), // 35s timeout
      });

      return text;
    } catch (error) {
      this.logger.error(`OpenAI inference failed: ${error.message}`);
      return null;
    }
  }
}
