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
    let historyString = '';

    if (ctx.historyOverride) {
      historyString = ctx.historyOverride;
    } else {
      const interactions = await this.prisma.client.interaction.findMany({
        where: { leadId: ctx.lead.id },
        orderBy: { createdAt: 'asc' },
        take: 40,
      });

      historyString = interactions
        .map(i => `${i.type === 'INBOUND' ? 'Lead' : 'SDR'}: ${i.content}`)
        .join('\n');
    }

    const sector = ctx.lead.industry || 'B2B';

    // REESTRUTURAÇÃO DO PROMPT DE AGENDAMENTO (Framework SDR Inside Sales)
    const systemPrompt = `Você é o SDR Automatizado da plataforma NextHub. Seu objetivo é qualificar leads reais e agendar demonstrações de sistemas de gestão B2B.

REGRAS ESTRITAS DE VERIFICAÇÃO DE HISTÓRICO:
1. Leia atentamente TODAS as interações anteriores. É TERMINANTEMENTE PROIBIDO perguntar algo que o lead já respondeu ou repetir uma informação já enviada.
2. Identifique se palavras-chave como 'Meet', 'Zoom', 'WhatsApp' ou dados de horário/data já foram fornecidos. Se sim, NÃO pergunte novamente; avance imediatamente para a confirmação final ou fechamento da call.
3. Se o lead aceitar o agendamento e propor um dia/horário específico, responda IMEDIATAMENTE confirmando o recebimento, pergunte a preferência de plataforma (Zoom ou Google Meet) e encerre a interação sem sugerir horários alternativos.
4. Se o lead pedir preços ou planos, contorne estrategicamente demonstrando o valor de automação para o nicho dele (${sector}), e diga que os valores são flexíveis. Chame-o para uma call de 5 minutos.
5. Mantenha as mensagens curtas (máximo 3 parágrafos), humanizadas e termine sempre com um CTA claro.

REGRAS DE SINTAXE E FORMATAÇÃO:
- É TERMINANTEMENTE PROIBIDO utilizar chaves duplas, colchetes ou tags de template como {{first_name}} ou {{nome}} nas saudações. Use saudações diretas e humanas.
- Toda formatação de destaque ou negrito deve utilizar estritamente a sintaxe do WhatsApp: apenas um asterisco no início e no fim da palavra (Ex: *importante* em vez de **importante**).
- Nunca gere tabelas em formato Markdown de texto corrido (linhas com barras verticais e traços), pois elas quebram visualmente na tela do celular. Quando precisar listar fatores e valores, utilize listas com marcadores em tópicos limpos.`;

    const contextualMessage = `
STATUS DO SISTEMA: ${ctx.systemStatus}

HISTÓRICO DE INTERAÇÕES:
${historyString || 'Nenhuma interação prévia.'}

MENSAGEM ATUAL DO LEAD:
"${message}"
    `;

    const response = await this.aiOrchestrator.generate<AIChatResponse>({
      context: systemPrompt,
      message: contextualMessage,
      leadName: ctx.lead.name, // Passando o nome para sanitização
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
