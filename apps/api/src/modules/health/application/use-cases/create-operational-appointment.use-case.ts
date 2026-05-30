import { Injectable, Logger, ConflictException, Inject } from '@nestjs/common';
import type { HealthAppointmentRepository } from '../ports/health-appointment.repository';
import { HealthAppointment } from '../../domain/entities/appointment.entity';

export interface CreateAppointmentDto {
  title: string;
  leadId: string;
  procedureId?: string;
  startTime: Date;
  durationInMinutes?: number;
  organizationId: string;
  unitId: string;
}

@Injectable()
export class CreateOperationalAppointmentUseCase {
  private readonly logger = new Logger(CreateOperationalAppointmentUseCase.name);

  constructor(
    @Inject('IHealthAppointmentRepository')
    private readonly repository: HealthAppointmentRepository
  ) {}

  async execute(dto: CreateAppointmentDto): Promise<HealthAppointment> {
    const { title, leadId, procedureId, startTime, unitId, organizationId } = dto;
    
    // Default duration 30m
    const duration = dto.durationInMinutes || 30;
    const endTime = new Date(startTime.getTime() + duration * 60000);

    // 1. Validation: Check overlapping
    const overlapping = await this.repository.findOverlapping(unitId, startTime, endTime);
    
    if (overlapping.length > 0) {
      this.logger.warn(`Overlapping appointment detected for unit ${unitId} at ${startTime}`);
      throw new ConflictException('Este horário já está ocupado por outro atendimento.');
    }

    // 2. Creation
    const appointment = new HealthAppointment(
      '',
      title,
      startTime,
      endTime,
      leadId,
      organizationId,
      unitId,
      procedureId
    );

    return this.repository.save(appointment);
  }
}
