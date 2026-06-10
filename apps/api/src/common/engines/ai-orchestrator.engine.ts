import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GrokAIService } from '../../modules/prospector/infrastructure/ai/grok-ai.service';
import { OpenAIService } from './openai.service';
import { OpenRouterAIService } from '../../modules/prospector/infrastructure/ai/open-router-ai.service';

export interface AIOrchestratorRequest {
  context: string;
  message: string;
  history?: { role: 'user' | 'assistant', content: string }[];
  expectedFormat?: string;
  leadName?: string; // Para sanitização pós-geração
}

export interface AIOrchestratorResponse<T = any> {
  content: string;
  extractedData?: T;
  rawResponse: string;
}

@Injectable()
export class AIOrchestratorEngine {
  private readonly logger = new Logger(AIOrchestratorEngine.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly openRouterAI: OpenRouterAIService,
    private readonly grokAI: GrokAIService,
    private readonly openAI: OpenAIService,
  ) { }

  async generate<T = any>(request: AIOrchestratorRequest): Promise<AIOrchestratorResponse<T>> {
    const strictInstruction = `

[INSTRUÇÃO SEVERA DE AGENDAMENTO E RITMO COMERCIAL]
- É TERMINANTEMENTE PROIBIDO inventar, chutar ou gerar links fictícios do Google Meet ou Zoom (como xxx-xxxx-xxx). Se o link real do convite não for explicitamente fornecido pelo [SISTEMA], limite-se a dizer que o convite está sendo enviado para o e-mail do lead.
- Você é o SDR Automatizado de Elite do NextHub. Seu objetivo é conduzir uma conversa humana, educada, concisa e SEM PRESSA para agendar reuniões qualificadas.

DIRETRIZES DE CADÊNCIA E RITMO COMERCIAL:
1. SEJA CONCISO E ESCUTE: Nunca envie blocos gigantes de texto com todas as funcionalidades logo no início. Apresente um benefício por vez.
2. PROIBIÇÃO DE ANTECIPAÇÃO: É terminantemente proibido falar de preços, sugerir horários de reunião ou pedir o e-mail na PRIMEIRA mensagem de abordagem (se não houver interações prévias no histórico). Descubra a dor do cliente primeiro.
3. CONVERSA FLUIDA: Empregue o framework de venda consultiva gradual (Escuta -> Validação da Dor -> Ancoragem de Preço -> Chamada para Ação). Divida o processo em etapas lógicas:
   - Passo A: Saudação e pergunta sobre o principal gargalo operacional da clínica/pet.
   - Passo B: Resposta empática focando em como a nossa automação sana exatamente a dor descrita pelo lead.
   - Passo C: Só após o lead demonstrar interesse ou responder, proponha a demonstração de 5 minutos e solicite o e-mail/canal.
4. FORMATO: Responda em parágrafos curtos (no máximo 2 ou 3 linhas por bloco), usando espaçamentos limpos e formatação de negrito nativa do WhatsApp (*texto*), reduzindo a densidade do texto e garantindo uma abordagem sem pressa.`;
    const systemContext = request.context.includes('INSTRUÇÃO SEVERA DE AGENDAMENTO E RITMO COMERCIAL')
      ? request.context
      : `${request.context}${strictInstruction}`;

    // 1. LAYER 1: OpenRouter (Gemini Free) - Cost Zero
    try {
      this.logger.debug('Attempting L1: OpenRouter (Gemini Free)');
      const text = await this.openRouterAI.generate({
        system: systemContext,
        prompt: request.message,
      });

      if (text) return this.parseAndSanitizeResponse<T>(text, !!request.expectedFormat, request.leadName);
    } catch (err) {
      this.logger.warn(`OpenRouter failed: ${err.message}`);
    }

    // 2. LAYER 2: xAI Grok (Grok-2) - High Performance Contingency
    try {
      this.logger.debug('Attempting L2: Grok-2');
      const text = await this.grokAI.generate({
        system: systemContext,
        prompt: request.message,
      });

      if (text) return this.parseAndSanitizeResponse<T>(text, !!request.expectedFormat, request.leadName);
    } catch (err) {
      this.logger.warn(`Grok-2 failed: ${err.message}`);
    }

    // 3. LAYER 3: OpenAI (GPT-4o) - Ultimate Fallback
    try {
      this.logger.debug('Attempting L3: OpenAI (GPT-4o)');
      const text = await this.openAI.generate({
        system: systemContext,
        prompt: request.message,
      });

      if (text) return this.parseAndSanitizeResponse<T>(text, !!request.expectedFormat, request.leadName);
    } catch (err) {
      this.logger.error(`AI Orchestration Failure: ${err.message}`);
    }

    throw new Error(`Falha catastrófica: Todos os provedores de IA falharam (OpenRouter, Grok, OpenAI).`);
  }

  /**
   * 2. PARSING TOLERANTE DE PAYLOAD: Extrai JSON de Markdown ou texto puro
   * Adiciona conversão de Markdown para WhatsApp e sanitização de placeholders.
   */
  private parseAndSanitizeResponse<T>(text: string, expectsJson: boolean, leadName?: string): AIOrchestratorResponse<T> {
    let cleanText = text.trim();

    // REGEX DE COMPATIBILIDADE WHATSAPP: Converte **negrito** para *negrito*
    cleanText = cleanText.replace(/\*\*(.*?)\*\*/g, "*$1*");

    // SANITIZAÇÃO PÓS-GERAÇÃO: Substitui placeholders pelo nome real ou saudação genérica
    const templateTags = /{{first_name}}|{{nome}}|{{name}}|{nome}|{name}/gi;
    if (leadName && leadName !== "Lead") {
      cleanText = cleanText.replace(templateTags, leadName);
    } else {
      cleanText = cleanText.replace(templateTags, "Olá"); // Fallback amigável
    }

    if (expectsJson) {
      try {
        const jsonMatch = cleanText.match(/```json\s*([\s\S]*?)\s*```/) || cleanText.match(/({[\s\S]*})/);
        const jsonString = jsonMatch ? jsonMatch[1] || jsonMatch[0] : cleanText;
        const parsed = JSON.parse(jsonString);

        // Sanitize inner content if it exists
        if (parsed.content) {
          let innerContent = parsed.content as string;
          innerContent = innerContent.replace(/\*\*(.*?)\*\*/g, "*$1*");

          if (leadName && leadName !== "Lead") {
            innerContent = innerContent.replace(templateTags, leadName);
          } else {
            innerContent = innerContent.replace(templateTags, "Olá");
          }
          parsed.content = innerContent;
        }

        return {
          content: parsed.content || cleanText,
          extractedData: parsed as T,
          rawResponse: cleanText,
        };
      } catch (e) {
        this.logger.warn(`Failed to parse AI JSON response, falling back to regex extraction.`);

        // Regex Fallback: Tenta extrair o campo "content" se o JSON quebrou mas o texto está lá
        const contentMatch = cleanText.match(/"content":\s*"(.*?)"/s);
        if (contentMatch) {
          return {
            content: contentMatch[1],
            rawResponse: cleanText
          };
        }
      }
    }

    return {
      content: cleanText,
      rawResponse: cleanText,
    };
  }
}
