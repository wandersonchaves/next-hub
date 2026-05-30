import { Module } from '@nestjs/common';
import { HealthManagementController } from './infrastructure/controllers/health-management.controller';
import { CreateOperationalAppointmentUseCase } from './application/use-cases/create-operational-appointment.use-case';
import { GetPatientClinicalSummaryUseCase } from './application/use-cases/get-patient-clinical-summary.use-case';
import { PrismaHealthAppointmentRepository } from './infrastructure/adapters/prisma-health-appointment.repository';
import { OrganizationModule } from '../../modules/nexthub/organization/organization.module';

@Module({
  controllers: [HealthManagementController],
  providers: [
    CreateOperationalAppointmentUseCase,
    GetPatientClinicalSummaryUseCase,
    {
      provide: 'IHealthAppointmentRepository',
      useClass: PrismaHealthAppointmentRepository,
    },
  ],
  exports: [CreateOperationalAppointmentUseCase, GetPatientClinicalSummaryUseCase],
})
export class HealthModule {}

