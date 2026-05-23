import {
  Controller,
  Post,
  Body,
  UseGuards,
  Headers,
  Get,
  Param,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ClerkGuard } from '../../../../common/guards/clerk.guard';
import { MembershipGuard } from '../../../../common/guards/membership.guard';
import { BranchIsolationGuard } from '../../../../common/guards/branch-isolation.guard';
import { ModuleAccessGuard } from '../../../../common/guards/module-access.guard';
import { RolesGuard } from '../../../../common/guards/roles.guard';
import { PermissionsGuard } from '../../../../common/guards/permissions.guard';
import { Roles } from '../../../../common/decorators/roles.decorator';
import { RequirePermission } from '../../../../common/decorators/permissions.decorator';
import { RequireModule } from '../../../../common/decorators/module.decorator';
import { Role } from '@enterprise/database';
import { CreateOperationalAppointmentUseCase, CreateOperationalAppointmentDto } from '../../application/use-cases/create-operational-appointment.use-case';
import { GetPatientClinicalSummaryUseCase } from '../../application/use-cases/get-patient-clinical-summary.use-case';
import { CurrentOrg } from '../../../../common/decorators/org.decorator';

@ApiTags('Nexus Health')
@Controller('health-management')
@RequireModule('HEALTH')
@UseGuards(ClerkGuard, MembershipGuard, RolesGuard, PermissionsGuard, BranchIsolationGuard, ModuleAccessGuard)
export class HealthManagementController {
  constructor(
    private readonly createAppointment: CreateOperationalAppointmentUseCase,
    private readonly getSummary: GetPatientClinicalSummaryUseCase,
  ) {}

  @Get('check')
  @ApiOperation({ summary: 'Check module connectivity' })
  async check() {
    return { status: 'Nexus Health module is active' };
  }

  @Get('patients/:id/summary')
  @Roles(Role.ADMIN, Role.OWNER, Role.MEMBER)
  @RequirePermission('appointments:read')
  @ApiOperation({ summary: 'Get AI-generated clinical summary for a patient' })
  async getPatientSummary(@Param('id') id: string) {
    return this.getSummary.execute(id);
  }

  @Post('appointments')
  @Roles(Role.ADMIN, Role.OWNER, Role.MEMBER)
  @RequirePermission('appointments:write')
  async create(
    @Body() dto: CreateOperationalAppointmentDto,
    @CurrentOrg() organization: any,
    @Headers('x-branch-id') branchId: string,
  ) {
    return this.createAppointment.execute({
      ...dto,
      organizationId: organization.id,
      branchId,
    });
  }
}
