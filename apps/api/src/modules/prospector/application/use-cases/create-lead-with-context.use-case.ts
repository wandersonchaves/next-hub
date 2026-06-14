import { Injectable, Logger, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { CreateManualLeadDto } from '../../infrastructure/dtos/create-manual-lead.dto';
import { normalizePhone } from '../../../../common/utils/phone-normalization';

@Injectable()
export class CreateLeadWithContextUseCase {
  private readonly logger = new Logger(CreateLeadWithContextUseCase.name);

  constructor(private readonly prisma: PrismaService) {}

  async execute(dto: CreateManualLeadDto) {
    const { name, phone, organizationId, unitId, historicalMessages } = dto;
    const cleanPhone = normalizePhone(phone);

    let lastInteractionAt = new Date();
    if (historicalMessages && historicalMessages.length > 0) {
      const dates = historicalMessages.map(m => new Date(m.createdAt).getTime());
      lastInteractionAt = new Date(Math.max(...dates));
    }

    return this.prisma.client.$transaction(async (tx) => {
      let resolvedUnitId = unitId;
      if (!resolvedUnitId) {
        const defaultUnit = await tx.unit.findFirst({
          where: { organizationId }
        });
        if (!defaultUnit) {
          throw new Error('Nenhuma unidade cadastrada para esta organização.');
        }
        resolvedUnitId = defaultUnit.id;
      }

      const existing = await tx.lead.findUnique({
        where: {
          phone_organizationId: {
            phone: cleanPhone,
            organizationId,
          },
        },
      });

      if (existing) {
        throw new ConflictException('Lead já cadastrado com este telefone nesta organização.');
      }

      // 1. Insert Lead with isPending: false and lastInteractionAt computed
      const lead = await tx.lead.create({
        data: {
          name,
          phone: cleanPhone,
          organizationId,
          unitId: resolvedUnitId,
          isPending: false,
          lastInteractionAt,
        },
      });

      // 2. Perform createMany in Interaction table linking messages
      if (historicalMessages && historicalMessages.length > 0) {
        const interactionsData = historicalMessages.map((msg) => ({
          content: msg.content,
          type: msg.sender === 'LEAD' ? 'INBOUND' : 'OUTBOUND',
          leadId: lead.id,
          unitId: resolvedUnitId,
          organizationId,
          createdAt: new Date(msg.createdAt),
        }));

        await tx.interaction.createMany({
          data: interactionsData,
        });
      }

      this.logger.log(`Manual lead created with context. Lead ID: ${lead.id}, Phone: ${cleanPhone}`);

      return tx.lead.findUnique({
        where: { id: lead.id },
        include: {
          interactions: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });
    });
  }
}
