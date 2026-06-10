import { Test, TestingModule } from '@nestjs/testing';
import { AIOrchestratorEngine } from '../ai-orchestrator.engine';
import { ConfigService } from '@nestjs/config';
import { OpenRouterAIService } from '../../../modules/prospector/infrastructure/ai/open-router-ai.service';
import { GrokAIService } from '../../../modules/prospector/infrastructure/ai/grok-ai.service';
import { OpenAIService } from '../openai.service';

describe('AIOrchestratorEngine', () => {
  let engine: AIOrchestratorEngine;
  let openRouterAI: OpenRouterAIService;
  let grokAI: GrokAIService;
  let openAI: OpenAIService;

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
        {
          provide: OpenRouterAIService,
          useValue: {
            generate: jest.fn(),
          },
        },
        {
          provide: GrokAIService,
          useValue: {
            generate: jest.fn(),
          },
        },
        {
          provide: OpenAIService,
          useValue: {
            generate: jest.fn(),
          },
        },
      ],
    }).compile();

    engine = module.get<AIOrchestratorEngine>(AIOrchestratorEngine);
    openRouterAI = module.get<OpenRouterAIService>(OpenRouterAIService);
    grokAI = module.get<GrokAIService>(GrokAIService);
    openAI = module.get<OpenAIService>(OpenAIService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(engine).toBeDefined();
  });

  describe('generate', () => {
    it('should use OpenRouter by default and return successful response with strict system instruction appended', async () => {
      (openRouterAI.generate as jest.Mock).mockResolvedValue('Resposta do Gemini');

      const response = await engine.generate({
        context: 'Contexto',
        message: 'Oi',
      });

      expect(response.content).toBe('Resposta do Gemini');
      expect(openRouterAI.generate).toHaveBeenCalledWith({
        system: `Contexto\n\n[INSTRUÇÃO SEVERA DE AGENDAMENTO E RITMO COMERCIAL]\n- É TERMINANTEMENTE PROIBIDO inventar, chutar ou gerar links fictícios do Google Meet ou Zoom (como xxx-xxxx-xxx). Se o link real do convite não for explicitamente fornecido pelo [SISTEMA], limite-se a dizer que o convite está sendo enviado para o e-mail do lead.\n- Você é o SDR Automatizado de Elite do NextHub. Seu objetivo é conduzir uma conversa humana, educada, concisa e SEM PRESSA para agendar reuniões qualificadas.\n\nDIRETRIZES DE CADÊNCIA E RITMO COMERCIAL:\n1. SEJA CONCISO E ESCUTE: Nunca envie blocos gigantes de texto com todas as funcionalidades logo no início. Apresente um benefício por vez.\n2. PROIBIÇÃO DE ANTECIPAÇÃO: É terminantemente proibido falar de preços, sugerir horários de reunião ou pedir o e-mail na PRIMEIRA mensagem de abordagem (se não houver interações prévias no histórico). Descubra a dor do cliente primeiro.\n3. CONVERSA FLUIDA: Empregue o framework de venda consultiva gradual (Escuta -> Validação da Dor -> Ancoragem de Preço -> Chamada para Ação). Divida o processo em etapas lógicas:\n   - Passo A: Saudação e pergunta sobre o principal gargalo operacional da clínica/pet.\n   - Passo B: Resposta empática focando em como a nossa automação sana exatamente a dor descrita pelo lead.\n   - Passo C: Só após o lead demonstrar interesse ou responder, proponha a demonstração de 5 minutos e solicite o e-mail/canal.\n4. FORMATO: Responda em parágrafos curtos (no máximo 2 ou 3 linhas por bloco), usando espaçamentos limpos e formatação de negrito nativa do WhatsApp (*texto*), reduzindo a densidade do texto e garantindo uma abordagem sem pressa.`,
        prompt: 'Oi',
      });
      expect(openRouterAI.generate).toHaveBeenCalledTimes(1);
    });

    it('should fallback to GPT-4o if OpenRouter and Grok fail', async () => {
      (openRouterAI.generate as jest.Mock).mockRejectedValue(new Error('OpenRouter Error'));
      (grokAI.generate as jest.Mock).mockRejectedValue(new Error('Grok Error'));
      (openAI.generate as jest.Mock).mockResolvedValue('Resposta do GPT-4o');

      const response = await engine.generate({
        context: 'Contexto',
        message: 'Oi',
      });

      expect(response.content).toBe('Resposta do GPT-4o');
      expect(openRouterAI.generate).toHaveBeenCalledTimes(1);
      expect(grokAI.generate).toHaveBeenCalledTimes(1);
      expect(openAI.generate).toHaveBeenCalledTimes(1);
    });

    it('should parse JSON if expectedFormat is provided', async () => {
      const jsonResponse = JSON.stringify({ content: 'Olá', intent: 'GREETING' });
      (openRouterAI.generate as jest.Mock).mockResolvedValue(`\`\`\`json\n${jsonResponse}\n\`\`\``);

      const response = await engine.generate({
        context: 'Contexto',
        message: 'Oi',
        expectedFormat: 'JSON'
      });

      expect(response.extractedData).toEqual({ content: 'Olá', intent: 'GREETING' });
      expect(response.content).toBe('Olá');
    });

    it('should throw error if all models fail', async () => {
      (openRouterAI.generate as jest.Mock).mockRejectedValue(new Error('Critical Fail L1'));
      (grokAI.generate as jest.Mock).mockRejectedValue(new Error('Critical Fail L2'));
      (openAI.generate as jest.Mock).mockRejectedValue(new Error('Critical Fail L3'));

      await expect(engine.generate({ context: 'C', message: 'M' }))
        .rejects.toThrow('Falha catastrófica: Todos os provedores de IA falharam (OpenRouter, Grok, OpenAI).');
    });
  });
});
