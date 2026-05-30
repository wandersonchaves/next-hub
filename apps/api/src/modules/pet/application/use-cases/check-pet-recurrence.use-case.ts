import { Injectable, Logger, Inject } from '@nestjs/common';
import type { PetRepository } from '../ports/pet.repository';
import { AIOrchestratorEngine } from '../../../../common/engines/ai-orchestrator.engine';
import { OmniChannelEngine } from '../../../../common/engines/omni-channel.engine';

@Injectable()
export class CheckPetRecurrenceUseCase {
  private readonly logger = new Logger(CheckPetRecurrenceUseCase.name);

  constructor(
    @Inject('IPetRepository')
    private readonly petRepository: PetRepository,
    private readonly aiOrchestrator: AIOrchestratorEngine,
    private readonly omniChannel: OmniChannelEngine,
  ) {}

  /**
   * Identifica pets que não tomam banho há mais de X dias e dispara notificação via IA.
   */
  async execute(unitId: string, limitDays: number = 12): Promise<void> {
    const limitDate = new Date();
    limitDate.setDate(limitDate.getDate() - limitDays);

    this.logger.log(`Running pet recurrence check for unit ${unitId}`);
    const pets = await this.petRepository.findAllByUnit(unitId);

    const overduePets = pets.filter(p => !p.lastBathAt || p.lastBathAt < limitDate);

    for (const pet of overduePets) {
      try {
        const daysSinceLast = pet.lastBathAt 
          ? Math.floor((Date.now() - pet.lastBathAt.getTime()) / (1000 * 60 * 60 * 24))
          : 'muito';

        const context = `
          VOCÊ É UM ATENDENTE DE PET SHOP MUITO CARINHOSO.
          OBJETIVO: Reativar um cliente cujo pet não aparece há ${daysSinceLast} dias.
          DADOS: Pet: ${pet.name}, Raça: ${pet.breed || 'SRD'}.
        `;

        const response = await this.aiOrchestrator.generate({
          context,
          message: `Gere uma mensagem curta e fofa para o tutor do ${pet.name} sugerindo um banho para esta semana.`
        });

        await this.omniChannel.sendMessage({
          to: '5586994037788', // Simulação, deveria ser do tutor
          text: response.content
        });

        this.logger.debug(`Recurrence message sent for pet ${pet.name}`);
      } catch (err) {
        this.logger.error(`Failed to process recurrence for pet ${pet.name}: ${err.message}`);
      }
    }
  }
}
