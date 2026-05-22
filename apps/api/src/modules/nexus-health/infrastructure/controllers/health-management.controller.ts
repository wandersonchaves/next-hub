import {
  Controller,
  Post,
  Body,
  UseGuards,
  Headers,
} from '@nestjs/common';
import { ClerkGuard } from '../../../../common/guards/clerk.guard';
import { MembershipGuard } from '../../../../common/guards/membership.guard';
import { BranchIsolationGuard } from '../../../../common/guards/branch-isolation.guard';
import { RolesGuard } from '../../../../common/guards/roles.guard';
import { PermissionsGuard } from '../../../../common/guards/permissions.guard';
import { Roles } from '../../../../common/decorators/roles.decorator';
import { RequirePermission } from '../../../../common/decorators/permissions.decorator';
import { Role } from '@enterprise/database';
import { CreateOperationalAppointmentUseCase, CreateOperationalAppointmentDto } from '../../application/use-cases/create-operational-appointment.use-case';
import { CurrentOrg } from '../../../../common/decorators/org.decorator';

@Controller('health-management')
@UseGuards(ClerkGuard, MembershipGuard, RolesGuard, PermissionsGuard, BranchIsolationGuard)
export class HealthManagementController {
  constructor(
    private readonly createAppointment: CreateOperationalAppointmentUseCase,
  ) {}

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
