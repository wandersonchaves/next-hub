import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AIOrchestratorEngine } from '../../../../common/engines/ai-orchestrator.engine';

export interface GeneratePitchDto {
  leadId: string;
  organizationId: string;
}

@Injectable()
export class GenerateSalesPitchUseCase {
  private readonly logger = new Logger(GenerateSalesPitchUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiOrchestrator: AIOrchestratorEngine,
  ) {}

  async execute(dto: GeneratePitchDto): Promise<{ suggestedMessageId: string; content: string }> {
    const { leadId, organizationId } = dto;

    // 1. Fetch Lead context
    const lead = await this.prisma.client.lead.findUnique({
      where: { id: leadId },
    });

    if (!lead || lead.organizationId !== organizationId) {
      throw new Error('Lead não encontrado ou acesso negado.');
    }

    // 2. Advanced Sales Engineering Prompt (Neurosales + SPIN + Pattern Interruption)
    const salesContext = `
      ATUE COMO UM CONSULTOR DE NEGÓCIOS E SDR SÊNIOR ESPECIALISTA EM GROWTH B2B.
      
      OBJETIVO: Criar uma abordagem de prospecção fria via WhatsApp altamente persuasiva e personalizada.
      
      ESTRUTURA OBRIGATÓRIA (Técnicas):
      1. QUEBRA DE PADRÃO (Pattern Interruption): Inicie de forma que não pareça um robô ou vendedor chato.
      2. SPIN SELLING: Foque no Problema (P) e na Implicação (I).
      3. PROIBIDO: "Como posso te ajudar?", "Sou da empresa X", "Gostaria de apresentar...".
      
      CONTEXTO DO LEAD:
      - Empresa/Nome: ${lead.name}
      - Setor: ${lead.industry || 'B2B'}
      - Região: Teresina (usar ganchos regionais se fizer sentido, mas manter profissionalismo)
      
      DIRETRIZES POR NICHO:
      - CLÍNICA DE ESTÉTICA: Foque em salas vazias em horários de pico ou perda de LTV (pacientes que não voltam).
      - PET SHOP: Foque em ociosidade na equipe de banho e tosa ou concorrência com grandes redes.
      
      ESTILO DE ESCRITA:
      - Máximo 3 parágrafos curtos.
      - Sem jargão técnico de marketing.
      - Tom profissional, porém quase informal (como um parceiro de negócios falaria).
      - TERMINAR SEMPRE com uma pergunta aberta e assertiva que instigue resposta.
    `;

    const aiRequest = {
      context: salesContext,
      message: `Gere o pitch de abertura ideal para o lead "${lead.name}" do setor "${lead.industry}".`,
    };

    // 3. AI Inference
    const aiResponse = await this.aiOrchestrator.generate(aiRequest);

    // 4. Persistence as PENDING_APPROVAL
    const suggested = await this.prisma.client.suggestedMessage.create({
      data: {
        content: aiResponse.content,
        status: 'PENDING_APPROVAL',
        leadId: lead.id,
      }
    });

    // Update lead status to indicate it was processed by AI but not yet sent
    await this.prisma.client.lead.update({
      where: { id: leadId },
      data: { status: 'AWAITING_APPROVAL' }
    });

    this.logger.debug(`Pitch gerado para Lead ${leadId}: ${suggested.id}`);

    return {
      suggestedMessageId: suggested.id,
      content: suggested.content,
    };
  }
}
