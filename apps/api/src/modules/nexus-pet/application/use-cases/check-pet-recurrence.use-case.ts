import { Injectable, Inject, Logger } from '@nestjs/common';
import type { IPetRepository } from '../ports/pet.repository';
import { AIOrchestratorEngine } from '../../../../common/engines/ai-orchestrator.engine';
import { OmniChannelEngine } from '../../../../common/engines/omni-channel.engine';
import { PrismaService } from '../../../../prisma/prisma.service';
import { BusinessClockEngine } from '../../../../common/engines/business-clock.engine';

@Injectable()
export class CheckPetRecurrenceUseCase {
  private readonly logger = new Logger(CheckPetRecurrenceUseCase.name);

  constructor(
    @Inject('IPetRepository')
    private readonly petRepository: IPetRepository,
    private readonly aiOrchestrator: AIOrchestratorEngine,
    private readonly omniChannel: OmniChannelEngine,
    private readonly prisma: PrismaService,
    private readonly businessClock: BusinessClockEngine,
  ) {}

  async execute(branchId: string, limitDays: number = 12): Promise<void> {
    const isBusinessHours = this.businessClock.isBusinessHours();
    
    if (!isBusinessHours) {
      this.logger.log(`Automatic Pet Reactivation skipped: Outside business hours.`);
      return;
    }

    this.logger.log(`Running pet recurrence check for branch ${branchId}`);
    const pets = await this.petRepository.findAllByBranch(branchId);

    for (const pet of pets) {
      const daysSinceLastBath = pet.getDaysSinceLastBath();

      if (daysSinceLastBath !== null && daysSinceLastBath > limitDays) {
        this.logger.log(`Pet ${pet.name} is overdue for a bath (${daysSinceLastBath} days). Generating AI reactivation...`);

        // Fetch Tutor Phone
        const tutor = await this.prisma.client.lead.findUnique({
          where: { id: pet.tutorId }
        });

        if (!tutor || !tutor.phone) continue;

        // 1. AI Generation
        const aiResponse = await this.aiOrchestrator.generate({
          context: `
            Você é um assistente de pet shop carinhoso. 
            O pet "${pet.name}" (raça: ${pet.breed || 'não informada'}) não toma banho há ${daysSinceLastBath} dias.
            O nome do tutor é "${tutor.name}".
            Gere uma mensagem curta para o WhatsApp convidando para um novo banho, mencionando o bem-estar do pet.
            PROIBIDO: Usar saudações genéricas como "Como posso te ajudar?".
          `,
          message: "Oi, como podemos convidar o tutor para um novo banho?"
        });

        // 2. Send via WhatsApp (Proactive reactivation is automatic but gated by hours)
        await this.omniChannel.sendMessage({
          to: tutor.phone,
          text: aiResponse.content
        });

        this.logger.debug(`Reactivation sent to ${tutor.name} regarding ${pet.name}`);
      }
    }
  }
}
