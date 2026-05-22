import { Pet } from '../../domain/entities/pet.entity';
import { PetService } from '../../domain/entities/service.entity';

export interface IPetRepository {
  findById(id: string): Promise<Pet | null>;
  findAllByBranch(branchId: string): Promise<Pet[]>;
  save(pet: Pet): Promise<Pet>;
  saveService(service: PetService, organizationId: string, branchId: string): Promise<PetService>;
  findServicesByBranch(branchId: string): Promise<PetService[]>;
}
