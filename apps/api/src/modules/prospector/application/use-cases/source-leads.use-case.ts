import { Injectable, Inject, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import type { ILeadSourceProvider, IContactFinder } from '../ports/lead-source.port';
import type { IWhatsAppClient } from '../ports/whatsapp-client.port';
import type { IAIService } from '../ports/ai-service.port';

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
    @Inject('IAIService') private readonly aiService: IAIService,
    @Inject('IWhatsAppClient') private readonly whatsappClient: IWhatsAppClient,
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

        // Clean phone (keep only digits)
        const cleanPhone = phone.replace(/\D/g, '');

        // 3. Persistence & Deduplication
        const lead = await this.prisma.client.lead.upsert({
          where: { phone_organizationId: { phone: cleanPhone, organizationId } },
          update: { industry: sector },
          create: {
            name: item.name,
            phone: cleanPhone,
            organizationId,
            branchId,
            industry: sector,
            status: 'PROSPECTING',
          }
        });

        // 4. First AI Contact (The "Icebreaker")
        const promptContext = `
          SDR ICEBREAKER MODE:
          Você é um SDR sênior abordando uma empresa descoberta via indicação regional.
          CONTEXTO: Empresa "${item.name}", setor "${sector}", localizada em "${region}".
          OBJETIVO: Iniciar uma conversa amigável, despertar curiosidade sobre como aumentamos o ROI de empresas similares e tentar agendar uma avaliação.
          TOM: Profissional, mas informal, curto e sem cara de spam automático.
        `;

        const icebreaker = await this.aiService.generateResponse(
          "Olá, acabei de conhecer o trabalho de vocês e achei incrível.", 
          promptContext
        );

        // 5. Dispatch to WhatsApp
        await this.whatsappClient.sendMessage({
          to: cleanPhone,
          text: icebreaker.content,
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
