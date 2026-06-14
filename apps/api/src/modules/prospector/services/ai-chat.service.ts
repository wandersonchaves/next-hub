import { Injectable, Logger } from '@nestjs/common';
import { AIOrchestratorEngine } from '../../../common/engines/ai-orchestrator.engine';
import { SDRConfigEngine } from '../infrastructure/sdr-config.engine';
import { PrismaService } from '../../../prisma/prisma.service';

export interface AIChatContext {
  lead: {
    id: string;
    name: string;
    status: string;
    industry?: string;
    region?: string;
    email?: string;
    metadata?: any;
  };
  isBusinessHours: boolean;
  systemStatus: string;
  historyOverride?: string; 
}

interface AIChatResponse {
  content: string;
  operationalProfiling?: {
    staffCount: number;
    unitsCount: number;
    capacityClass: 'SMALL' | 'MEDIUM' | 'LARGE' | 'ENTERPRISE';
  };
}

@Injectable()
export class AIChatService {
  private readonly logger = new Logger(AIChatService.name);

  constructor(
    private readonly aiOrchestrator: AIOrchestratorEngine,
    private readonly sdrConfig: SDRConfigEngine,
    private readonly prisma: PrismaService,
  ) {}

  async generateResponse(ctx: AIChatContext, message: string): Promise<AIChatResponse> {
    const interactions = await this.prisma.client.interaction.findMany({
      where: { leadId: ctx.lead.id },
      orderBy: { createdAt: 'asc' },
      take: 40,
    });

    let historyString = '';

    if (ctx.historyOverride) {
      historyString = ctx.historyOverride;
    } else {
      historyString = interactions
        .map(i => `${i.type === 'INBOUND' ? 'Lead' : 'SDR'}: ${i.content}`)
        .join('\n');
    }

    // Resolve sector for static knowledge base mapping
    let matchedSector = 'CLINICA DE ESTETICA';
    if (ctx.lead.industry) {
      const normalizedIndustry = ctx.lead.industry.toUpperCase().trim();
      if (normalizedIndustry.includes('PET') || normalizedIndustry.includes('VET')) {
        matchedSector = 'PET SHOP';
      } else if (normalizedIndustry.includes('ESTETICA') || normalizedIndustry.includes('CLINICA')) {
        matchedSector = 'CLINICA DE ESTETICA';
      }
    }

    const hasEmail = !!(ctx.lead.email && ctx.lead.email !== 'undefined' && ctx.lead.email !== 'null');

    // REESTRUTURAÇÃO DO PROMPT DE AGENDAMENTO (Framework SDR Inside Sales)
    const systemPrompt = `Você é o SDR Automatizado de Alta Performance da plataforma NextHub. Seu objetivo exclusivo é qualificar leads do setor de estética/pet e agendar reuniões de demonstração do sistema de gestão B2B.

REGRAS DE CONVERSAÇÃO IMPERATIVAS:
1. RESPOSTA DIRETA A PREÇO E VALORES:
   - Se o lead solicitar preços, tabelas ou médias de valores, é OBRIGATÓRIO fornecer uma faixa estimada realista baseada no porte informado/equipe do lead.
   - Exemplo de faixas realistas: Para equipes de até 5 profissionais (porte pequeno), planos a partir de R$ 200/mês; para estruturas maiores com 15 profissionais (porte médio/grande), planos entre R$ 400 e R$ 900/mês.
   - Nunca recuse o envio de valores por três vezes seguidas na conversa. Sacie a dúvida do cliente com os valores de referência estimados e use essa informação de preço como gancho para demonstrar valor, justificar a demonstração e fazer o cálculo de ROI.

2. PROIBIÇÃO DE RE-PERGUNTAS (AMNÉSIA DE CANAL):
   - Antes de gerar qualquer pergunta sobre a preferência de plataforma de videoconferência (Zoom ou Google Meet), analise detalhadamente todo o histórico de interações anteriores.
   - Se o lead já tiver escrito a palavra "meet" ou "zoom" em qualquer momento anterior da conversa, capture essa informação como definitiva. NÃO pergunte novamente. Prossiga imediatamente escrevendo a confirmação direto utilizando o canal escolhido pelo lead.

3. PROATIVIDADE NA CAPTURA DE CONTATO:
   - Assim que o lead confirmar o dia e o horário da reunião, verifique se o E-MAIL DO LEAD NO SISTEMA está como "NÃO CADASTRADO".
   - Se o e-mail não estiver cadastrado, peça-o explicitamente de forma proativa na mesma mensagem. Exemplo: "Excelente, agendado para quarta-feira às 15h via Google Meet! Qual o seu melhor e-mail para eu enviar o link oficial do convite?".

REGRAS ESTRITAS DE VERIFICAÇÃO DE HISTÓRICO:
1. Leia atentamente TODAS as interações anteriores. É TERMINANTEMENTE PROIBIDO perguntar algo que o lead já respondeu ou repetir uma informação já enviada.
2. Identifique se palavras-chave como dados de horário/data já foram fornecidos. Se sim, NÃO pergunte novamente; avance imediatamente para a confirmação final ou fechamento da call.
3. Se o lead aceitar o agendamento e propor um dia/horário específico, responda IMEDIATAMENTE confirmando o recebimento. Se já sabemos o canal de preferência (Zoom/Meet), feche o agendamento. Se não sabemos, pergunte a preferência de plataforma (Zoom ou Google Meet).
4. Mantenha as mensagens curtas (máximo 3 parágrafos), humanizadas e termine sempre com um CTA claro.

REGRAS DE SINTAXE E FORMATAÇÃO:
- É TERMINANTEMENTE PROIBIDO utilizar chaves duplas, colchetes ou tags de template como {{first_name}} ou {{nome}} nas saudações. Use saudações diretas e humanas.
- Toda formatação de destaque ou negrito deve utilizar estritamente a sintaxe do WhatsApp: apenas um asterisco no início e no fim da palavra (Ex: *importante* em vez de **importante**).
- Nunca gere tabelas em formato Markdown de texto corrido (linhas com barras verticais e traços), pois elas quebram visualmente na tela do celular. Quando precisar listar fatores e valores, utilize listas com marcadores em tópicos limpos.
- You must return a valid JSON object. The JSON must contain a single key named "response" holding the raw message string.`;

    const contextualMessage = `
STATUS DO SISTEMA: ${ctx.systemStatus}
E-MAIL DO LEAD NO SISTEMA: ${hasEmail ? ctx.lead.email : 'NÃO CADASTRADO'}

HISTÓRICO DE INTERAÇÕES:
${historyString || 'Nenhuma interação prévia.'}

MENSAGEM ATUAL DO LEAD:
"${message}"
    `;

    const response = await this.aiOrchestrator.generate<AIChatResponse>({
      context: systemPrompt,
      message: contextualMessage,
      leadName: ctx.lead.name, // Passando o nome para sanitização
      sector: matchedSector, // Passando o setor para indexação do Knowledge Base
      lead: {
        id: ctx.lead.id,
        name: ctx.lead.name,
        interactions: interactions
      },
      expectedFormat: `
        {
          "content": "Sua resposta curta, empática e focada em agendamento (Sintaxe WhatsApp: *texto*)",
          "operationalProfiling": {
            "staffCount": number,
            "unitsCount": number,
            "capacityClass": "SMALL | MEDIUM | LARGE | ENTERPRISE"
          }
        }
      `
    });

    return {
      content: response.extractedData?.content || response.content,
      operationalProfiling: response.extractedData?.operationalProfiling
    };
  }
}
