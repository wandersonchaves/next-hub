import { Injectable, Logger, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AIOrchestratorEngine } from '../../../../common/engines/ai-orchestrator.engine';

export interface GeneratePitchDto {
  leadId: string;
  organizationId: string;
}

interface AIAnalysisResult {
  suggestion: string;
  extractedData?: {
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

    // 1. Fetch Lead context with recent interactions
    const lead = await this.prisma.client.lead.findUnique({
      where: { id: leadId },
      include: {
        interactions: {
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    });

    if (!lead || lead.organizationId !== organizationId) {
      throw new Error('Lead não encontrado.');
    }

    // 2. ANTI-CROSSING DEBOUNCE (Lock de Concorrência)
    // Se houve uma atualização de pendingMessage nos últimos 3 segundos, rejeitamos a duplicidade.
    const lastUpdate = lead.updatedAt.getTime();
    const now = Date.now();
    if (lead.pendingMessage && (now - lastUpdate < 3000)) {
       this.logger.warn(`Debounce: Rejeitando clique duplo para o lead ${leadId}`);
       return { suggestion: lead.pendingMessage };
    }

    // 3. State Mapping
    const isConfirmed = lead.status === 'CONFIRMADO';
    const isGatekeeper = lead.status === 'GATEKEEPER_STAGE';
    const isNew = lead.status === 'NEW' || lead.status === 'NEW_UNTOUCHED';
    
    // 4. Advanced Computational Linguistics
    const linguisticsRules = `
      --- MATRIZ DE VARIAÇÃO LINGUÍSTICA (PROIBIÇÃO DE REPETIÇÃO) ---
      Analise o HISTÓRICO abaixo. Se as expressões em negrito já foram usadas na mensagem anterior, você está PROIBIDO de repeti-las. Use sinônimos:
      - "furos na agenda" -> "horários ociosos", "janelas vagas", "faltas de última hora", "grade bagunçada".
      - "poupar tempo" -> "dar fôlego para sua equipe", "tirar a sobrecarga da recepção", "tornar o dia mais produtivo".
      - "gestão automática" -> "organização fluida", "workflow inteligente", "rotina otimizada".
    `;

    let systemContext = `
      VOCÊ É UM DIRETOR DE VENDAS SÊNIOR (CONSULTOR B2B).
      Sua voz é natural, humana e varia conforme o contexto.
      ${linguisticsRules}
    `;
    
    if (isConfirmed) {
      systemContext += `
        --- MODO CONCIERGE (ENCERRAMENTO CELEBRATIVO) ---
        O agendamento FOI CONCLUÍDO. 
        REGRA ABSOLUTA: Proibido vender, falar de ROI, preço, dores ou problemas.
        MISSÃO: Mensagem de no máximo UMA LINHA, simpática e fática de fechamento.
        Confirme o horário enviado pelo lead como a verdade absoluta.
      `;
    } else if (isGatekeeper) {
      systemContext += `
        --- MODO GATEKEEPER ---
        Foco em ajudar a atendente a ter uma "rotina otimizada" e pedir o contato do dono/gerente.
      `;
    } else {
      systemContext += `
        --- MODO SDR (CONSULTIVO) ---
        PRIORIDADE AO LEAD: Se o lead sugeriu um horário no histórico, adote esse horário imediatamente. 
        ESTRATÉGIA: Responda primeiro, venda depois.
      `;
    }

    const history = lead.interactions.map(i => ({
      role: i.type === 'INBOUND' ? 'user' : 'assistant' as 'user' | 'assistant',
      content: i.content
    }));

    // 5. AI Inference
    const response = await this.aiOrchestrator.generate<AIAnalysisResult>({
      context: systemContext,
      message: "Gere a melhor resposta estratégica, garantindo variação linguística total.",
      history,
      expectedFormat: `
        {
          "suggestion": "Texto da resposta (natural, sem repetições robóticas)",
          "extractedData": { "name": "string", "email": "string" }
        }
      `
    });

    const result = response.extractedData as any;
    const suggestion = result?.suggestion || response.content;

    // 6. Enrichment
    await this.prisma.client.lead.update({
      where: { id: leadId },
      data: {
        name: (!isConfirmed && result?.extractedData?.name && lead.name.includes('Lead')) ? result.extractedData.name : undefined,
        email: (!isConfirmed && result?.extractedData?.email) ? result.extractedData.email : undefined,
        pendingMessage: suggestion,
      }
    });

    this.logger.debug(`Linguistic-aware response generated for Lead ${leadId}`);

    return { suggestion };
  }
}
