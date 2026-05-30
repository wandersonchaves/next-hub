import { Pet } from '../../domain/entities/pet.entity';
import { PetService } from '../../domain/entities/service.entity';

export interface PetRepository {
  save(pet: Pet): Promise<Pet>;
  findAllByUnit(unitId: string): Promise<Pet[]>;
  findById(id: string): Promise<Pet | null>;
  saveService(service: PetService, organizationId: string, unitId: string): Promise<PetService>;
  findServicesByUnit(unitId: string): Promise<PetService[]>;
}
