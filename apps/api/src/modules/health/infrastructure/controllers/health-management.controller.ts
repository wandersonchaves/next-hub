import { Controller, Post, Body, UseGuards, Get, Headers } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { CreateOperationalAppointmentUseCase } from '../../application/use-cases/create-operational-appointment.use-case';
import { ClerkGuard } from '../../../../common/guards/clerk.guard';
import { MembershipGuard } from '../../../../common/guards/membership.guard';
import { RolesGuard } from '../../../../common/guards/roles.guard';
import { TenantContextGuard } from '../../../../common/guards/tenant-context.guard';
import { ModuleAccessGuard } from '../../../../common/guards/module-access.guard';
import { RequireModule } from '../../../../common/decorators/module.decorator';
import { CurrentOrg } from '../../../../common/decorators/org.decorator';
import type { Organization } from '@enterprise/database';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Nexus Health')
@Controller('modules/health')
@RequireModule('HEALTH')
@UseGuards(ClerkGuard, MembershipGuard, RolesGuard, TenantContextGuard, ModuleAccessGuard)
export class HealthManagementController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly createAppointment: CreateOperationalAppointmentUseCase,
  ) {}

  @Get('agenda')
  @ApiOperation({ summary: 'Get health unit agenda' })
  async getAgenda(@Headers('x-unit-id') unitId: string) {
    return this.prisma.client.appointment.findMany({
      where: { unitId },
      include: { lead: true, procedure: true }
    });
  }

  @Post('appointments')
  @ApiOperation({ summary: 'Create clinic appointment' })
  async schedule(
    @CurrentOrg() org: Organization,
    @Headers('x-unit-id') unitId: string,
    @Body() body: any
  ) {
    return this.createAppointment.execute({
      ...body,
      organizationId: org.id,
      unitId,
    });
  }

  @Get('procedures')
  @ApiOperation({ summary: 'List unit procedures' })
  async listProcedures(@Headers('x-unit-id') unitId: string) {
    return this.prisma.client.procedure.findMany({
      where: { unitId }
    });
  }
}
