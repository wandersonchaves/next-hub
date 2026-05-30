import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AIOrchestratorEngine } from '../../../../common/engines/ai-orchestrator.engine';
import { normalizeIndustry } from '../../../../common/utils/industry-normalization';

export interface SourceLeadsDto {
  sector: string;
  region: string;
  organizationId: string;
  unitId?: string;
}

@Injectable()
export class SourceLeadsUseCase {
  private readonly logger = new Logger(SourceLeadsUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiOrchestrator: AIOrchestratorEngine,
  ) {}

  async execute(dto: SourceLeadsDto): Promise<void> {
    const { sector, region, organizationId } = dto;
    let { unitId } = dto;

    this.logger.log(`Iniciando busca de leads para ${sector} em ${region}...`);

    // 1. Resolve or Create Unit
    if (!unitId) {
      let firstUnit = await this.prisma.client.unit.findFirst({
        where: { organizationId }
      });

      if (!firstUnit) {
        this.logger.warn(`No units found for organization ${organizationId}. Auto-creating default unit.`);
        firstUnit = await this.prisma.client.unit.create({
          data: {
            name: 'Matriz Principal',
            organizationId,
            type: 'CORE'
          }
        });
      }
      unitId = firstUnit.id;
    }

    // 2. Normalização de Nicho
    const normalizedSector = normalizeIndustry(sector);

    // 3. Mocked Scraping Logic (Simulando Google Maps + AI)
    const mockedLeads = [
      { name: `${normalizedSector} Central`, phone: '5586994037788' },
      { name: `${normalizedSector} Bairro`, phone: '5586994037789' }
    ];

    for (const item of mockedLeads) {
      try {
        // 4. Persistence
        const lead = await this.prisma.client.lead.upsert({
          where: { phone_organizationId: { phone: item.phone, organizationId } },
          update: { industry: normalizedSector },
          create: {
            name: item.name,
            phone: item.phone,
            organizationId,
            unitId: unitId!,
            industry: normalizedSector,
            status: 'NEW',
          }
        });

        // 5. Advanced Sales Engineering (Purified SaaS Scope + Gatekeeper Discovery)
        const salesContext = `
          VOCÊ É UM DIRETOR DE VENDAS SÊNIOR ESPECIALISTA EM NEUROVENDAS.
          OBJETIVO: Gerar uma abordagem fria (Cold Outreach) focada em EFICIÊNCIA OPERACIONAL.
          
          REGRAS DE OURO:
          - Use **negrito** em palavras de impactoo (ex: **furos na agenda**, **gestão automática**, **poupar tempo**).
          - Use emojis com moderação (🚀, ✨).
          - BANIDO: Termos técnicos (SaaS, ERP, API). Use **plataforma**, **sistema de gestão** e **automação**.
          
          ESTRATÉGIA:
          - Toque no gargalo do setor (furos na agenda/salas vazias).
          - Inclua uma pergunta sutil para descobrir quem está falando (ex: "Quem cuida da organização dos horários e da recepção aí hoje? É você mesma?").
          
          PONTOS DE ANCORAGEM:
          - ESTÉTICA: Furos na agenda (no-show) e perda de faturamento por falta de reativação.
          - PET SHOP: Equipe ociosa e falta de lembretes automáticos para tutores.
          
          ESTILO: Curto, profissional (consultivo), focado na dor da desorganização.
        `;

        const aiResponse = await this.aiOrchestrator.generate({
          context: salesContext,
          message: `Gere o pitch ideal para o lead "${item.name}".`
        });

        await this.prisma.client.lead.update({
          where: { id: lead.id },
          data: { pendingMessage: aiResponse.content }
        });

        this.logger.debug(`Lead provisioned: ${item.name} with AI pitch.`);
      } catch (err) {
        this.logger.error(`Failed to source lead ${item.name}: ${err.message}`);
      }
    }
  }
}
