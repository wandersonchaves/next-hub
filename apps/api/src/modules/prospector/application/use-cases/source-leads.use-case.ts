import { Injectable, Inject, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import type { ILeadSourceProvider, IContactFinder } from '../ports/lead-source.port';
import type { IWhatsAppClient } from '../ports/whatsapp-client.port';
import { AIOrchestratorEngine } from '../../../../common/engines/ai-orchestrator.engine';

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
  ) {}

  async execute(dto: SourceLeadsDto): Promise<{ processed: number; errors: number }> {
    const { sector, region, organizationId } = dto;
    let { branchId } = dto;
    this.logger.log(`Starting proactive prospecting for ${sector} in ${region}`);

    // Ensure we have a branchId (fallback or auto-create)
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
      this.logger.debug(`Using branch ${branchId} for prospecting`);
    }

    // 1. Discovery via Google Maps
    const discovered = await this.sourceProvider.searchCompanies(sector, region);
    let processedCount = 0;
    let errorCount = 0;

    for (const item of discovered) {
      try {
        let phone = item.phone;

        // 2. Enrichment: If phone is missing, search web/website
        if (!phone) {
          const foundPhone = await this.contactFinder.findMissingPhone(item.name, item.website);
          if (foundPhone) phone = foundPhone;
        }

        if (!phone) {
          this.logger.debug(`Could not find phone for ${item.name}. Skipping.`);
          continue;
        }

        // Normalização Cirúrgica: Garantir formato internacional (55)
        const cleanPhone = this.normalizePhone(phone);

        // 3. Protocolo de Idempotência: Se já houver mensagem aguardando aprovação, não floodar.
        const existingLead = await this.prisma.client.lead.findUnique({
          where: { phone_organizationId: { phone: cleanPhone, organizationId } }
        });

        if (existingLead?.status === 'AWAITING_APPROVAL') {
          this.logger.debug(`Lead ${cleanPhone} already awaiting approval. Skipping.`);
          continue;
        }

        // 4. PERSISTENCE (UPSET) - Criamos o lead antes da IA para garantir integridade
        const lead = await this.prisma.client.lead.upsert({
          where: { phone_organizationId: { phone: cleanPhone, organizationId } },
          update: { industry: sector },
          create: {
            name: item.name,
            phone: cleanPhone,
            organizationId,
            branchId,
            industry: sector,
            status: 'NEW',
          }
        });

        // 5. Advanced Sales Engineering (AIDA + SPIN)
        const salesContext = `
          VOCÊ É UM SDR SÊNIOR ESPECIALISTA EM GROWTH B2B.
          OBJETIVO: Gerar uma mensagem de abordagem fria (Cold Outreach) via WhatsApp que gere CURIOSIDADE.
          
          REGRAS DE OURO:
          - PROIBIDO usar "Como posso te ajudar?".
          - PROIBIDO usar linguagem de suporte ou telemarketing.
          - Use o framework AIDA (Atenção, Interesse, Desejo, Ação).
          - Use SPIN Selling (Foque no Problema e na Implicação).
          
          Ganchos por Nicho:
          - PET SHOP: Foque em horários vazios na agenda de banho ou perda de clientes recorrentes.
          - ESTÉTICA: Foque em furos na agenda (no-show) e no valor vitalício do paciente (LTV).
          - GERAL: Foque em eficiência operacional e ROI.
          
          ESTILO: Curto (máx 3 parágrafos curtos), sem emojis excessivos, tom profissional mas humano (quase informal).
          TERMINAR SEMPRE com uma pergunta de resposta rápida (Ex: "Faz sentido batermos um papo de 5 min sobre isso?").
        `;

        const aiResponse = await this.aiOrchestrator.generate({
          context: salesContext,
          message: `Empresa: "${item.name}", Setor: "${sector}", Região: "${region}". Gere o pitch de abertura.`
        });

        // 6. COPILOT MODE: Salva para aprovação em vez de disparar
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

  private normalizePhone(phone: string): string {
    let clean = phone.replace(/\D/g, '');
    if (clean.length >= 10 && clean.length <= 11 && !clean.startsWith('55')) {
      clean = `55${clean}`;
    }
    return clean;
  }
}
