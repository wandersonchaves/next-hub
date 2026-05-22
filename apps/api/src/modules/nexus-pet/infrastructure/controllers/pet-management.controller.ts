import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Headers,
  Query,
  Inject,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ClerkGuard } from '../../../../common/guards/clerk.guard';
import { MembershipGuard } from '../../../../common/guards/membership.guard';
import { BranchIsolationGuard } from '../../../../common/guards/branch-isolation.guard';
import { RolesGuard } from '../../../../common/guards/roles.guard';
import { PermissionsGuard } from '../../../../common/guards/permissions.guard';
import { Roles } from '../../../../common/decorators/roles.decorator';
import { RequirePermission } from '../../../../common/decorators/permissions.decorator';
import { Role } from '@enterprise/database';
import { CurrentOrg } from '../../../../common/decorators/org.decorator';
import type { IPetRepository } from '../../application/ports/pet.repository';
import { Pet, PetSize } from '../../domain/entities/pet.entity';
import { PetService, PetServiceType } from '../../domain/entities/service.entity';
import { CheckPetRecurrenceUseCase } from '../../application/use-cases/check-pet-recurrence.use-case';

@ApiTags('Nexus Pet')
@Controller('pet-management')
@UseGuards(ClerkGuard, MembershipGuard, RolesGuard, PermissionsGuard, BranchIsolationGuard)
export class PetManagementController {
  constructor(
    @Inject('IPetRepository')
    private readonly petRepository: IPetRepository,
    private readonly checkRecurrence: CheckPetRecurrenceUseCase,
  ) {}

  @Post('pets')
  @Roles(Role.ADMIN, Role.OWNER, Role.MEMBER)
  @RequirePermission('pet:write')
  @ApiOperation({ summary: 'Register a new pet' })
  async createPet(
    @Body() dto: { name: string; breed?: string; size: PetSize; weight?: number; tutorId: string },
    @CurrentOrg() org: any,
    @Headers('x-branch-id') branchId: string,
  ) {
    const pet = new Pet(
      '',
      dto.name,
      dto.breed || null,
      dto.size,
      dto.weight || null,
      null,
      dto.tutorId,
      org.id,
      branchId,
    );
    return this.petRepository.save(pet);
  }

  @Get('pets')
  @Roles(Role.ADMIN, Role.OWNER, Role.MEMBER, Role.VIEWER)
  @RequirePermission('pet:read')
  @ApiOperation({ summary: 'List all pets in the branch' })
  async listPets(@Headers('x-branch-id') branchId: string) {
    return this.petRepository.findAllByBranch(branchId);
  }

  @Post('services')
  @Roles(Role.ADMIN, Role.OWNER)
  @RequirePermission('pet:write')
  @ApiOperation({ summary: 'Create a new pet service (bath, grooming, etc)' })
  async createService(
    @Body() dto: { name: string; price: number; durationInMinutes: number; type: PetServiceType },
    @CurrentOrg() org: any,
    @Headers('x-branch-id') branchId: string,
  ) {
    const service = new PetService(
      '',
      dto.name,
      dto.price,
      dto.durationInMinutes,
      dto.type,
    );
    return this.petRepository.saveService(service, org.id, branchId);
  }

  @Get('check-recurrence')
  @Roles(Role.ADMIN, Role.OWNER)
  @RequirePermission('pet:write')
  @ApiOperation({ summary: 'Run recurrence check to trigger reactivation' })
  async runCheck(@Headers('x-branch-id') branchId: string, @Query('limit') limit?: string) {
    await this.checkRecurrence.execute(branchId, limit ? parseInt(limit) : 12);
    return { message: 'Recurrence check completed' };
  }
}
