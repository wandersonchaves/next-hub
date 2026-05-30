import { Module } from '@nestjs/common';
import { PetManagementController } from './infrastructure/controllers/pet-management.controller';
import { CheckPetRecurrenceUseCase } from './application/use-cases/check-pet-recurrence.use-case';
import { PrismaPetRepository } from './infrastructure/adapters/prisma-pet.repository';
import { OrganizationModule } from '../../modules/nexthub/organization/organization.module';

@Module({
  controllers: [PetManagementController],
  providers: [
    CheckPetRecurrenceUseCase,
    {
      provide: 'IPetRepository',
      useClass: PrismaPetRepository,
    },
  ],
  exports: [CheckPetRecurrenceUseCase],
})
export class PetModule { }
