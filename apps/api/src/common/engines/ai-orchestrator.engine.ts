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
  sector?: string; // Para indexação do Knowledge Base
}

export interface AIOrchestratorResponse<T = any> {
  content: string;
  extractedData?: T;
  rawResponse: string;
}

interface SectorConfig {
  nomeSistema: string;
  terminologiaClientes: string;
  terminologiaProfissionais: string;
  valores: string;
  dores: string;
}

const SECTOR_KNOWLEDGE_BASE: Record<string, SectorConfig> = {
  'CLINICA DE ESTETICA': {
    nomeSistema: 'NextHub Estética',
    terminologiaClientes: 'pacientes',
    terminologiaProfissionais: 'médicos',
    valores: 'planos mensais a partir de R$ 200 para até 5 profissionais (pequeno porte), e entre R$ 400 e R$ 900 para clínicas de médio e grande porte',
    dores: 'no-show de pacientes, falta de engajamento no pós-tratamento e dificuldade no controle de agenda dos médicos especialistas',
  },
  'PET SHOP': {
    nomeSistema: 'NextHub Pet',
    terminologiaClientes: 'tutores',
    terminologiaProfissionais: 'veterinários',
    valores: 'planos mensais a partir de R$ 200 para até 5 profissionais (pequeno porte), e entre R$ 400 e R$ 900 para pet shops/clínicas veterinárias de médio e grande porte',
    dores: 'esquecimento de banho e tosa por parte dos tutores, controle ineficiente de vacinas/consultas com veterinários e baixa recorrência de serviços básicos',
  }
};

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
    // Resolve sector configuration
    let sectorKey = 'CLINICA DE ESTETICA'; // Default fallback
    
    if (request.sector) {
      const reqSec = request.sector.toUpperCase().trim();
      if (reqSec.includes('PET') || reqSec.includes('VET')) {
        sectorKey = 'PET SHOP';
      } else if (reqSec.includes('ESTETICA') || reqSec.includes('CLINICA')) {
        sectorKey = 'CLINICA DE ESTETICA';
      }
    } else {
      // Try to infer from context
      const normalizedContext = request.context.toUpperCase();
      if (normalizedContext.includes('PET') || normalizedContext.includes('TUTOR') || normalizedContext.includes('VET')) {
        sectorKey = 'PET SHOP';
      }
    }

    const configSetor = SECTOR_KNOWLEDGE_BASE[sectorKey];

    const strictInstruction = `
Você é o Consultor SDR Avançado da plataforma ${configSetor.nomeSistema}.
Seu tom deve ser altamente educado, refinado, cortês, acolhedor e empático em todas as saudações e interações. Trate o lead com o máximo respeito, fazendo-o se sentir acolhido e especial.

**DIRETRIZES DE PROSPECÇÃO ATIVA (OUTBOUND):**
- Inicie a prospecção de forma ativa (Outbound) referenciando que encontramos o contato do lead no Google Maps e que notamos sua excelente atuação e prestígio no setor de ${sectorKey === 'PET SHOP' ? 'pet/veterinária' : 'estética/beleza'}.
- Apresente-se de maneira profissional e empática, levantando as dores comuns de gestão, automação de agendamentos e redução de no-shows (faltas de clientes) do segmento, estabelecendo uma conexão consultiva antes de sugerir horários.
- Utilize estritamente a terminologia do segmento. Refira-se aos clientes como *${configSetor.terminologiaClientes}* e aos especialistas como *${configSetor.terminologiaProfissionais}*.
- Baseie-se exclusivamente nesta tabela de valores autorizada: ${configSetor.valores}. É terminantemente proibido inventar ou chutar qualquer outro preço.
- Foque na dor principal mapeada do setor: ${configSetor.dores}.

**DIRETRIZES DE CADÊNCIA E CONDUTA CONVERSACIONAL (HUMANIZADA):**
- Proíba respostas robóticas em loop, scripts afobados ou mensagens insistentes que empurrem horários repetidamente. 
- Se o lead fizer uma pergunta sobre processos ou valores, responda de forma cortês à dúvida dele primeiro. Não repita o bloco de convite de agendamento de forma idêntica se ele mudou o foco. Mantenha o ritmo calmo.
- Restrinja toda e qualquer formatação de negrito no output gerado à sintaxe nativa de um único asterisco do WhatsApp (*texto*). Nunca utilize dois asteriscos (**texto**).

**INSTRUÇÃO SEVERA DE AGENDAMENTO E FECHAMENTO COMERCIAL:**
- É TERMINANTEMENTE PROIBIDO inventar, chutar ou gerar links fictícios do Google Meet ou Zoom.
- Se o link real do convite for fornecido no contexto do [SISTEMA], envie-o e encerre a conversa de forma imediata, educada e objetiva (fechamento seco), sem incluir novas perguntas, ganchos ou chamadas para ação (CTAs) que provoquem o lead a responder novamente. Isso elimina loops ou re-respostas concorrentes no WhatsApp.
- Se o link real não for explicitamente fornecido, limite-se a dizer que o convite com o link oficial está sendo enviado para o e-mail cadastrado do lead, despedindo-se formalmente sem fazer perguntas.
- Seu objetivo é conduzir uma conversa humana, educada, concisa e sem pressa para agendar reuniões qualificadas.

DIRETRIZES DE CADÊNCIA E RITMO COMERCIAL:
1. SEJA CONCISO E ESCUTE: Evite enviar blocos extensos de texto com todas as configurações ou funcionalidades logo no início. Apresente um benefício por vez.
2. PROIBIÇÃO DE ANTECIPAÇÃO: É terminantemente proibido discutir preços, sugerir horários de reunião ou solicitar o endereço de e-mail na primeira mensagem de abordagem (salvo exceções com interações prévias no histórico). Primeiramente, identifique a necessidade do cliente.
3. CONVERSA FLUIDA: Utilize o framework de venda consultiva gradual (Escuta -> Validação da Necessidade -> Ancoragem de Preço -> Chamada para Ação). Divida o processo em etapas lógicas:
   - Passo A: Saudação ativa de vendas (Outbound), mencionando que encontramos a empresa no Google Maps e levantando as dores operacionais e desafios de gestão de forma empática.
   - Passo B: Resposta empática focando em como nossa automação soluciona exatamente a necessidade descrita pelo lead.
   - Passo C: Somente após o lead demonstrar interesse ou responder, proponha a demonstração de 5 minutos e solicite o endereço de e-mail ou canal de comunicação.
   - Passo D (Fechamento): Assim que o link real do Meet for gerado pelo sistema, envie-o diretamente e finalize com um fechamento seco e objetivo. Não acrescente perguntas ou novos ganchos conversacionais para evitar loops e duplicidades de confirmação.
4. FORMATO: Responda em parágrafos curtos (no máximo 2 ou 3 linhas por bloco), utilizando espaçamentos adequados e formatação de negrito nativa do WhatsApp (*texto*), reduzindo a densidade do texto e garantindo uma abordagem sem pressa.`;

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
