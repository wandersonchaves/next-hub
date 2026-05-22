import { Module } from '@nestjs/common';
import { HealthManagementController } from './infrastructure/controllers/health-management.controller';
import { CreateOperationalAppointmentUseCase } from './application/use-cases/create-operational-appointment.use-case';
import { PrismaHealthAppointmentRepository } from './infrastructure/adapters/prisma-health-appointment.repository';
import { OrganizationModule } from '../../core/organization/organization.module';

@Module({
  imports: [OrganizationModule],
  controllers: [HealthManagementController],
  providers: [
    CreateOperationalAppointmentUseCase,
    {
      provide: 'IHealthAppointmentRepository',
      useClass: PrismaHealthAppointmentRepository,
    },
  ],
  exports: [CreateOperationalAppointmentUseCase],
})
export class NexusHealthModule { }
