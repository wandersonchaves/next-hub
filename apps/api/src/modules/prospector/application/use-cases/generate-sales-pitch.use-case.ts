import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AIChatService } from '../../services/ai-chat.service';
import { BusinessClockEngine } from '../../../../common/engines/business-clock.engine';

export interface GeneratePitchDto {
  leadId: string;
  organizationId: string;
}

@Injectable()
export class GenerateSalesPitchUseCase {
  private readonly logger = new Logger(GenerateSalesPitchUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiChat: AIChatService,
    private readonly businessClock: BusinessClockEngine,
  ) {}

  async execute(dto: GeneratePitchDto): Promise<{ suggestion: string }> {
    const { leadId, organizationId } = dto;

    // 1. Fetch Lead context
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

    // 2. ANTI-CROSSING DEBOUNCE
    const lastUpdate = lead.updatedAt.getTime();
    const now = Date.now();
    if (lead.pendingMessage && (now - lastUpdate < 3000)) {
       return { suggestion: lead.pendingMessage };
    }

    // 3. AI Inference via AIChatService
    const fullHistory = lead.interactions.reverse().map(h => `${h.type}: ${h.content}`).join('\n');
    const isBusinessHours = this.businessClock.isBusinessHours();

    const response = await this.aiChat.generateResponse({
      lead: {
        id: lead.id,
        name: lead.name,
        status: lead.status,
        industry: lead.industry || undefined,
        email: lead.email || undefined,
        metadata: lead.metadata
      },
      fullHistory,
      isBusinessHours,
      systemStatus: 'MANUAL_SUGGESTION_REQUESTED'
    }, "O usuário solicitou uma sugestão de resposta manual agora.");

    const suggestion = response.content;

    // 4. Persistence & Profiling
    await this.prisma.client.lead.update({
      where: { id: leadId },
      data: {
        pendingMessage: suggestion,
      }
    });

    if (response.operationalProfiling) {
       await this.prisma.client.organization.update({
         where: { id: organizationId },
         data: {
           metadata: {
             ...(lead.metadata as any || {}),
             profiling: response.operationalProfiling
           }
         }
       });
    }

    return { suggestion };
  }
}
