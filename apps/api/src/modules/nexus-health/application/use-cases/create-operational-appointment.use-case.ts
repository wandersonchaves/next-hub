import { Injectable, ForbiddenException, NotFoundException, Inject } from '@nestjs/common';
import type { IHealthAppointmentRepository } from '../ports/health-appointment.repository';
import { HealthAppointment } from '../../domain/entities/appointment.entity';
import { IsString, IsNotEmpty, IsDate, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateOperationalAppointmentDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  leadId: string;

  @IsString()
  @IsNotEmpty()
  procedureId: string;

  @Type(() => Date)
  @IsDate()
  startTime: Date;

  @IsString()
  @IsOptional()
  branchId: string;

  @IsString()
  @IsOptional()
  organizationId: string;
}

@Injectable()
export class CreateOperationalAppointmentUseCase {
  constructor(
    @Inject('IHealthAppointmentRepository')
    private readonly repository: IHealthAppointmentRepository,
  ) {}

  async execute(dto: CreateOperationalAppointmentDto): Promise<HealthAppointment> {
    const { title, leadId, procedureId, startTime, branchId, organizationId } = dto;

    // 1. Busca o procedimento para saber a duração
    const procedure = await this.repository.findProcedureById(procedureId);
    if (!procedure) {
      throw new NotFoundException('Procedure not found');
    }

    // 2. Calcula o horário de término
    const endTime = HealthAppointment.calculateEndTime(startTime, procedure.durationInMinutes);

    // 3. Busca agendamentos conflitantes na mesma filial
    const overlapping = await this.repository.findOverlapping(branchId, startTime, endTime);

    // console.log(`Checking conflict for ${startTime.toISOString()} - ${endTime.toISOString()}`);
    // console.log(`Found ${overlapping.length} overlapping appointments`);

    const newAppointment = new HealthAppointment(
      '', // ID será gerado pelo BD
      title,
      startTime,
      endTime,
      leadId,
      branchId,
      organizationId,
      procedureId,
    );

    // 4. Validação em memória das regras de negócio
    if (newAppointment.hasConflict(overlapping)) {
      // console.log('CONFLICT DETECTED');
      throw new ForbiddenException('Schedule conflict: The professional or room is occupied at this time');
    }

    // 5. Persistência
    return this.repository.save(newAppointment);
  }
}
