import { Test, TestingModule } from '@nestjs/testing';
import { AIOrchestratorEngine } from '../ai-orchestrator.engine';
import { ConfigService } from '@nestjs/config';
import * as ai from 'ai';

jest.mock('ai');

describe('AIOrchestratorEngine', () => {
  let engine: AIOrchestratorEngine;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AIOrchestratorEngine,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'GOOGLE_GENERATIVE_AI_API_KEY') return 'gemini-key';
              if (key === 'OPENAI_API_KEY') return 'openai-key';
              return null;
            }),
          },
        },
      ],
    }).compile();

    engine = module.get<AIOrchestratorEngine>(AIOrchestratorEngine);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(engine).toBeDefined();
  });

  describe('generate', () => {
    it('should use Gemini by default and return successful response', async () => {
      (ai.generateText as jest.Mock).mockResolvedValue({ text: 'Resposta do Gemini' });

      const response = await engine.generate({
        context: 'Contexto',
        message: 'Oi',
      });

      expect(response.content).toBe('Resposta do Gemini');
      expect(ai.generateText).toHaveBeenCalledTimes(1);
    });

    it('should fallback to GPT-4o if Gemini fails', async () => {
      (ai.generateText as jest.Mock)
        .mockRejectedValueOnce(new Error('Gemini Error'))
        .mockResolvedValueOnce({ text: 'Resposta do GPT-4o' });

      const response = await engine.generate({
        context: 'Contexto',
        message: 'Oi',
      });

      expect(response.content).toBe('Resposta do GPT-4o');
      expect(ai.generateText).toHaveBeenCalledTimes(2);
    });

    it('should parse JSON if expectedFormat is provided', async () => {
      const jsonResponse = JSON.stringify({ content: 'Olá', intent: 'GREETING' });
      (ai.generateText as jest.Mock).mockResolvedValue({ text: `\`\`\`json\n${jsonResponse}\n\`\`\`` });

      const response = await engine.generate({
        context: 'Contexto',
        message: 'Oi',
        expectedFormat: 'JSON'
      });

      expect(response.extractedData).toEqual({ content: 'Olá', intent: 'GREETING' });
      expect(response.content).toBe('Olá');
    });

    it('should throw error if both models fail', async () => {
      (ai.generateText as jest.Mock).mockRejectedValue(new Error('Critical Fail'));

      await expect(engine.generate({ context: 'C', message: 'M' }))
        .rejects.toThrow('Falha catastrófica no Motor de IA');
    });
  });
});
