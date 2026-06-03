import { Injectable, Logger } from '@nestjs/common';
import { AIOrchestratorEngine } from '../../../common/engines/ai-orchestrator.engine';
import { SDRConfigEngine } from '../infrastructure/sdr-config.engine';

export interface AIChatContext {
  lead: {
    id: string;
    name: string;
    status: string;
    industry?: string;
    email?: string;
    metadata?: any;
  };
  fullHistory: string;
  isBusinessHours: boolean;
  systemStatus: string;
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
  ) {}

  async generateResponse(ctx: AIChatContext, message: string): Promise<AIChatResponse> {
    const nicheContext = this.sdrConfig.getNicheContext(ctx.lead.industry);
    const plansContext = this.sdrConfig.getPlansContext();
    
    const leadEmail = (ctx.lead.email && ctx.lead.email !== 'undefined' && ctx.lead.email !== 'null') 
      ? ctx.lead.email 
      : null;

    const hasSizeData = ctx.lead.metadata?.profiling?.capacityClass || false;

    // 1. ADVANCED SDR MATRIX (Consultative + Humanized)
    const salesContext = `
      VOCÊ É UM CONSULTOR DE SOLUÇÕES (OU ASSISTENTE EXECUTIVO) DO NEXTHUB. Sua voz é natural, transparente e estratégica.
      NUNCA se apresente como "Diretor". Mantenha a identidade padronizada.
      
      ESTÁGIO ATUAL: ${ctx.lead.status}
      SITUAÇÃO DO SISTEMA: ${ctx.systemStatus}
      NICHO: ${nicheContext}

      --- REGRAS DE OURO (VENDAS CONSULTIVAS) ---
      1. PRICE GUARD (CHECA PORTE ANTES DE PREÇO):
         - Se o lead pedir preço/planos:
           - Se NÃO soubermos o porte (${hasSizeData ? 'JÁ SABEMOS' : 'NÃO SABEMOS'}): PROIBIDO dar preço. Pergunte sutilmente: "Para eu te passar o valor exato, hoje vocês têm quantos consultórios e profissionais na unidade?"
           - Se JÁ soubermos o porte: Apresente a faixa ${plansContext} de forma transparente.
           - ANCORAGEM DE ROI: Na mesma resposta do preço, mostre que o valor se paga nas primeiras faltas recuperadas.

      2. CALENDAR GUARD (SUCESSÃO CRONOLÓGICA):
         - A ORDEM DEVE SER: 1. Capturar E-mail ➔ 2. Ofertar Horários ➔ 3. Escolha do Lead ➔ 4. Confirmação do Envio.
         - PARSING FLEXÍVEL: Se o lead sugerir um dia/horário fora das opções (Ex: "quarta as 15h"), ACEITE imediatamente e confirme.
         - PROIBIDO dizer "Convite enviado" se o LEAD ainda não escolheu um horário específico.

      3. OBJECTION INTERCEPTOR (POS-AGENDAMENTO):
         - Se a situação do sistema for "OBJECAO_POS_AGENDAMENTO":
           - O lead já agendou, mas enviou uma dúvida de última hora (provavelmente preço/planos).
           - MISSÃO: Responda a dúvida com transparência e ancoragem de ROI, e RECONFIRME o horário que já foi marcado.
           - Ex: "Claro! Nossos planos variam de X a Y. O bom é que com apenas 2 faltas recuperadas o sistema já se paga. Combinado para amanhã às 15h então? 👋"

      4. SILENT CLOSE (TOM LOGÍSTICO):
         - Se o estágio for 'CONFIRMADO' e NÃO houver objeção (situação comum):
           - PROIBIDO pitch de venda, dores ou ROI.
           - MISSÃO: Resposta única, curta e celebrativa confirmando o envio. Máximo 1 linha.

      5. PROATIVIDADE COM DADOS:
         - Se possuímos o e-mail: "${leadEmail || 'NÃO'}". Sugira confirmação direta.

      --- ONBOARDING PROFILING ---
      Classifique a capacidade operacional baseada no diálogo.

      HISTÓRICO RECENTE:
      ${ctx.fullHistory}
    `;

    const response = await this.aiOrchestrator.generate<AIChatResponse>({
      context: salesContext,
      message,
      expectedFormat: `
        {
          "content": "Sua resposta de WhatsApp (curta, humana, com negrito estratégico)",
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
