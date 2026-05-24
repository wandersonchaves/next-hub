import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AIOrchestratorEngine } from '../../../../common/engines/ai-orchestrator.engine';

export interface GeneratePitchDto {
  leadId: string;
  organizationId: string;
}

interface AIAnalysisResult {
  suggestion: string;
  extractedData: {
    name?: string;
    email?: string;
    industry?: string;
    intent?: string;
  }
}

@Injectable()
export class GenerateSalesPitchUseCase {
  private readonly logger = new Logger(GenerateSalesPitchUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiOrchestrator: AIOrchestratorEngine,
  ) {}

  async execute(dto: GeneratePitchDto): Promise<{ suggestion: string }> {
    const { leadId, organizationId } = dto;

    // 1. Fetch Lead and History for context
    const lead = await this.prisma.client.lead.findUnique({
      where: { id: leadId },
      include: {
        interactions: {
          orderBy: { createdAt: 'desc' },
          take: 15
        }
      }
    });

    if (!lead || lead.organizationId !== organizationId) {
      throw new Error('Lead não encontrado.');
    }

    // 2. Advanced SDR Prompt (Copilot Mode)
    const salesContext = `
      VOCÊ É UM SDR SÊNIOR ATUANDO COMO COPILOTO DE VENDAS.
      Sua missão é ler o histórico e sugerir a MELHOR próxima resposta para o usuário humano enviar.
      
      ESTRATÉGIA:
      - Use SPIN Selling e Framework AIDA.
      - PROIBIDO: "Como posso te ajudar?", "O que você deseja?".
      - FOCO: Gerar curiosidade, tocar na dor do nicho e levar para o fechamento/agendamento.
      - Se o lead já passou dados, use-os. Se não, tente capturar sutilmente.
      
      CONTEXTO DO LEAD:
      - Nome: ${lead.name}
      - Indústria: ${lead.industry || 'B2B'}
      - Status Atual: ${lead.status}
      
      INSTRUÇÃO ADICIONAL: Analise a conversa e extraia qualquer dado novo (nome real, e-mail, interesse específico).
    `;

    const history = lead.interactions.map(i => ({
      role: i.type === 'INBOUND' ? 'user' : 'assistant' as 'user' | 'assistant',
      content: i.content
    }));

    // 3. AI Inference (Generation + Extraction)
    const response = await this.aiOrchestrator.generate<AIAnalysisResult['extractedData']>({
      context: salesContext,
      message: "Analise o histórico e gere a sugestão de resposta ideal. Responda em JSON.",
      history,
      expectedFormat: `
        {
          "suggestion": "O texto da mensagem sugerida (curto, matador, com CTA)",
          "extractedData": {
            "name": "nome extraído se houver",
            "email": "email extraído se houver",
            "industry": "setor identificado",
            "intent": "GREETING | QUALIFICATION | NEGOTIATION | BOOKING | NEGATIVE"
          }
        }
      `
    });

    const result = response.extractedData as any; // Cast for simplified access
    const suggestion = result?.suggestion || response.content;

    // 4. Update Lead Data in Background (Enrichment)
    if (result?.extractedData) {
      const { name, email, industry } = result.extractedData;
      await this.prisma.client.lead.update({
        where: { id: leadId },
        data: {
          name: (name && lead.name.includes('Lead')) ? name : undefined,
          email: email || undefined,
          industry: industry || undefined,
          pendingMessage: suggestion, // Buffer for UI sync
        }
      });
    }

    this.logger.debug(`Copilot suggestion generated for Lead ${leadId}`);

    return { suggestion };
  }
}
