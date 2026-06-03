import { Injectable, Logger, Inject } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AIOrchestratorEngine } from '../../../../common/engines/ai-orchestrator.engine';
import type { ILeadSourceProvider } from '../ports/lead-source.port';

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
    @Inject('ILeadSourceProvider') private readonly leadSource: ILeadSourceProvider,
  ) {}

  async execute(dto: SourceLeadsDto): Promise<void> {
    const { sector, region, organizationId } = dto;
    let { unitId } = dto;

    this.logger.log(`Workflow: Prospecção para ${sector} em ${region}...`);

    // 1. Resolve or Create Unit
    if (!unitId) {
      let firstUnit = await this.prisma.client.unit.findFirst({
        where: { organizationId }
      });

      if (!firstUnit) {
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

    // 2. BUSCA DE LEADS (ADAPTATIVA: MOCK OU REAL)
    const leads = await this.leadSource.findLeads(sector, region);

    if (leads.length === 0) {
       this.logger.warn('Nenhum lead encontrado para os critérios fornecidos.');
       return;
    }

    for (const item of leads) {
      try {
        // 3. Persistência
        const lead = await this.prisma.client.lead.upsert({
          where: { phone_organizationId: { phone: item.phone, organizationId } },
          update: { industry: sector },
          create: {
            name: item.name,
            phone: item.phone,
            organizationId,
            unitId: unitId!,
            industry: sector,
            status: 'NEW',
            metadata: {
               address: item.address,
               rating: item.rating,
               website: item.website,
               source: 'DISCOVERY_MODULE'
            }
          }
        });

        // 4. Geração de Pitch via IA
        const salesContext = `
          VOCÊ É UM SDR ESPECIALISTA EM VENDAS B2B.
          OBJETIVO: Gerar abordagem personalizada para uma empresa real encontrada no Maps.
          DADOS DA EMPRESA:
          - Nome: ${item.name}
          - Endereço: ${item.address || 'Não informado'}
          - Avaliação: ${item.rating || 'N/A'} estrelas
          
          ESTILO: Consultivo, rápido, focado em ajudar a clínica/empresa a crescer.
        `;

        const aiResponse = await this.aiOrchestrator.generate({
          context: salesContext,
          message: `Gere o primeiro contato via WhatsApp para o lead "${item.name}".`
        });

        await this.prisma.client.lead.update({
          where: { id: lead.id },
          data: { pendingMessage: aiResponse.content }
        });

        this.logger.debug(`Lead Processado: ${item.name}`);
      } catch (err) {
        this.logger.error(`Falha ao processar lead ${item.name}: ${err.message}`);
      }
    }

    this.logger.log(`Workflow Concluído: ${leads.length} leads provisionados com pitches personalizados.`);
  }
}
