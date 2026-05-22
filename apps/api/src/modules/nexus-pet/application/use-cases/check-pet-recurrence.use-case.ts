import { Injectable, Inject } from '@nestjs/common';
import type { IPetRepository } from '../ports/pet.repository';

@Injectable()
export class CheckPetRecurrenceUseCase {
  constructor(
    @Inject('IPetRepository')
    private readonly petRepository: IPetRepository,
  ) {}

  async execute(branchId: string, limitDays: number = 12): Promise<void> {
    const pets = await this.petRepository.findAllByBranch(branchId);

    for (const pet of pets) {
      const daysSinceLastBath = pet.getDaysSinceLastBath();

      if (daysSinceLastBath !== null && daysSinceLastBath > limitDays) {
        // Disparar evento ou job para o Prospector
        console.log(`Pet ${pet.name} (Tutor: ${pet.tutorId}) is overdue for a bath (${daysSinceLastBath} days). Triggering reactivation...`);
        // TODO: Emitir evento para o BullMQ/Prospector
      }
    }
  }
}
