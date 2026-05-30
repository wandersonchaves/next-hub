import { Controller, Post, Body, UseGuards, Get, Headers, Query, Inject } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { CheckPetRecurrenceUseCase } from '../../application/use-cases/check-pet-recurrence.use-case';
import { ClerkGuard } from '../../../../common/guards/clerk.guard';
import { MembershipGuard } from '../../../../common/guards/membership.guard';
import { RolesGuard } from '../../../../common/guards/roles.guard';
import { TenantContextGuard } from '../../../../common/guards/tenant-context.guard';
import { ModuleAccessGuard } from '../../../../common/guards/module-access.guard';
import { RequireModule } from '../../../../common/decorators/module.decorator';
import { CurrentOrg } from '../../../../common/decorators/org.decorator';
import type { Organization } from '@enterprise/database';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import type { PetRepository } from '../../application/ports/pet.repository';

@ApiTags('Nexus Pet')
@Controller('modules/pet')
@RequireModule('PET')
@UseGuards(ClerkGuard, MembershipGuard, RolesGuard, TenantContextGuard, ModuleAccessGuard)
export class PetManagementController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly checkRecurrence: CheckPetRecurrenceUseCase,
    @Inject('IPetRepository') private readonly petRepository: PetRepository,
  ) {}

  @Get('pets')
  @ApiOperation({ summary: 'List all pets in the unit' })
  async listPets(@Headers('x-unit-id') unitId: string) {
    return this.petRepository.findAllByUnit(unitId);
  }

  @Post('services')
  @ApiOperation({ summary: 'Register pet service' })
  async registerService(
    @CurrentOrg() org: Organization,
    @Headers('x-unit-id') unitId: string,
    @Body() service: any
  ) {
    return this.petRepository.saveService(service, org.id, unitId);
  }

  @Post('check-recurrence')
  @ApiOperation({ summary: 'Trigger AI recurrence check' })
  async runCheck(@Headers('x-unit-id') unitId: string, @Query('limit') limit?: string) {
    await this.checkRecurrence.execute(unitId, limit ? parseInt(limit) : 12);
    return { status: 'check_initiated' };
  }
}
