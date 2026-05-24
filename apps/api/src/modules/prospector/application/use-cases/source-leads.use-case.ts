import { Injectable, Inject, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import type { ILeadSourceProvider, IContactFinder } from '../ports/lead-source.port';
import type { IWhatsAppClient } from '../ports/whatsapp-client.port';
import { AIOrchestratorEngine } from '../../../../common/engines/ai-orchestrator.engine';
import { normalizePhone } from '../../../../common/utils/phone-normalization';
import { normalizeIndustry } from '../../../../common/utils/industry-normalization';
import { BusinessClockEngine } from '../../../../common/engines/business-clock.engine';

export interface SourceLeadsDto {
  sector: string;
  region: string;
  organizationId: string;
  branchId?: string;
}

@Injectable()
export class SourceLeadsUseCase {
  private readonly logger = new Logger(SourceLeadsUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject('ILeadSourceProvider') private readonly sourceProvider: ILeadSourceProvider,
    @Inject('IContactFinder') private readonly contactFinder: IContactFinder,
    private readonly aiOrchestrator: AIOrchestratorEngine,
    private readonly businessClock: BusinessClockEngine,
  ) {}

  async execute(dto: SourceLeadsDto): Promise<{ processed: number; errors: number }> {
    const { sector, region, organizationId } = dto;
    let { branchId } = dto;

    // Normalização Cirúrgica do Setor (Consolida Clínica de Estética, etc)
    const normalizedSector = normalizeIndustry(sector);

    const isBusinessHours = this.businessClock.isBusinessHours();
    if (!isBusinessHours) {
      this.logger.warn(`Proactive Prospecting triggered outside business hours. Leads will be generated and queued for approval.`);
    }

    this.logger.log(`Starting proactive prospecting for ${normalizedSector} in ${region}`);

    // Ensure we have a branchId
    if (!branchId) {
      let firstBranch = await this.prisma.client.branch.findFirst({
        where: { organizationId }
      });

      if (!firstBranch) {
        this.logger.warn(`No branches found for organization ${organizationId}. Auto-creating default branch.`);
        firstBranch = await this.prisma.client.branch.create({
          data: {
            name: 'Filial Principal',
            organizationId,
          }
        });
      }
      branchId = firstBranch.id;
    }

    // 1. Discovery via Google Maps
    const discovered = await this.sourceProvider.searchCompanies(normalizedSector, region);
    let processedCount = 0;
    let errorCount = 0;

    for (const item of discovered) {
      try {
        let phone = item.phone;

        // 2. Enrichment
        if (!phone) {
          const foundPhone = await this.contactFinder.findMissingPhone(item.name, item.website);
          if (foundPhone) phone = foundPhone;
        }

        if (!phone) continue;

        const cleanPhone = normalizePhone(phone);

        // 3. Idempotency Check
        const existingLead = await this.prisma.client.lead.findUnique({
          where: { phone_organizationId: { phone: cleanPhone, organizationId } }
        });

        if (existingLead?.status === 'AWAITING_APPROVAL') continue;

        // 4. PERSISTENCE (UPSET)
        const lead = await this.prisma.client.lead.upsert({
          where: { phone_organizationId: { phone: cleanPhone, organizationId } },
          update: { industry: normalizedSector },
          create: {
            name: item.name,
            phone: cleanPhone,
            organizationId,
            branchId,
            industry: normalizedSector,
            status: 'NEW',
          }
        });

        // 5. Advanced Sales Engineering
        const salesContext = `
          VOCÊ É UM SDR SÊNIOR ESPECIALISTA EM GROWTH B2B.
          OBJETIVO: Gerar uma abordagem fria (Cold Outreach) via WhatsApp altamente persuasiva.
          
          ESTRUTURA: AIDA + SPIN Selling.
          PROIBIDO: "Como posso te ajudar?", "Sou da empresa X".
          
          CONTEXTO:
          - Empresa: "${item.name}"
          - Setor: "${normalizedSector}"
          - Região: "${region}"
          
          ESTILO: Curto, humano, focado na dor do nicho (Estética: no-show, Pet: ociosidade).
          TERMINAR com uma pergunta de resposta rápida.
        `;

        const aiResponse = await this.aiOrchestrator.generate({
          context: salesContext,
          message: `Gere o pitch ideal para o lead "${item.name}".`
        });

        // 6. COPILOT MODE
        await this.prisma.client.lead.update({
          where: { id: lead.id },
          data: {
            pendingMessage: aiResponse.content,
            status: 'AWAITING_APPROVAL',
            lastInteractionAt: new Date()
          }
        });

        processedCount++;
      } catch (err) {
        this.logger.error(`Error prospecting lead ${item.name}: ${err.message}`);
        errorCount++;
      }
    }

    return { processed: processedCount, errors: errorCount };
  }
}
