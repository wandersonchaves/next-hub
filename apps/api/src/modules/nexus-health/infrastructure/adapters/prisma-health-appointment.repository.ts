import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { IHealthAppointmentRepository } from '../../application/ports/health-appointment.repository';
import { HealthAppointment } from '../../domain/entities/appointment.entity';
import { Procedure } from '../../domain/entities/procedure.entity';

@Injectable()
export class PrismaHealthAppointmentRepository implements IHealthAppointmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findProcedureById(id: string): Promise<Procedure | null> {
    const data = await this.prisma.client.procedure.findUnique({
      where: { id },
    });

    if (!data) return null;

    return new Procedure(
      data.id,
      data.name,
      data.durationInMinutes,
      data.price.toNumber(),
    );
  }

  async findOverlapping(branchId: string, startTime: Date, endTime: Date): Promise<HealthAppointment[]> {
    const data = await this.prisma.client.appointment.findMany({
      where: {
        branchId,
        startTime: { lt: endTime },
        endTime: { gt: startTime },
      },
    });

    return data.map(a => new HealthAppointment(
      a.id,
      a.title,
      a.startTime,
      a.endTime,
      a.leadId,
      a.branchId,
      a.organizationId,
      undefined,
      a.status,
    ));
  }

  async save(appointment: HealthAppointment): Promise<HealthAppointment> {
    const data = await this.prisma.client.appointment.create({
      data: {
        title: appointment.title,
        startTime: appointment.startTime,
        endTime: appointment.endTime,
        leadId: appointment.leadId,
        branchId: appointment.branchId,
        organizationId: appointment.organizationId,
        status: appointment.status,
      },
    });

    return new HealthAppointment(
      data.id,
      data.title,
      data.startTime,
      data.endTime,
      data.leadId,
      data.branchId,
      data.organizationId,
      appointment.procedureId,
      data.status,
    );
  }
}
