import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { HealthAppointmentRepository } from '../../application/ports/health-appointment.repository';
import { HealthAppointment } from '../../domain/entities/appointment.entity';

@Injectable()
export class PrismaHealthAppointmentRepository implements HealthAppointmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(appointment: HealthAppointment): Promise<HealthAppointment> {
    const data = await this.prisma.client.appointment.upsert({
      where: { id: appointment.id || 'new' },
      update: {
        title: appointment.title,
        startTime: appointment.startTime,
        endTime: appointment.endTime,
        procedureId: appointment.procedureId,
      },
      create: {
        title: appointment.title,
        startTime: appointment.startTime,
        endTime: appointment.endTime,
        leadId: appointment.leadId,
        organizationId: appointment.organizationId,
        unitId: appointment.unitId,
        procedureId: appointment.procedureId,
      }
    });

    return new HealthAppointment(
      data.id,
      data.title,
      data.startTime,
      data.endTime,
      data.leadId,
      data.organizationId,
      data.unitId,
      data.procedureId || undefined
    );
  }

  async findOverlapping(unitId: string, startTime: Date, endTime: Date): Promise<HealthAppointment[]> {
    const appointments = await this.prisma.client.appointment.findMany({
      where: {
        unitId,
        OR: [
          { startTime: { lt: endTime }, endTime: { gt: startTime } }
        ]
      }
    });

    return appointments.map(a => new HealthAppointment(
      a.id,
      a.title,
      a.startTime,
      a.endTime,
      a.leadId,
      a.organizationId,
      a.unitId,
      a.procedureId || undefined
    ));
  }

  async findById(id: string): Promise<HealthAppointment | null> {
    const appointment = await this.prisma.client.appointment.findUnique({
      where: { id }
    });

    if (!appointment) return null;

    return new HealthAppointment(
      appointment.id,
      appointment.title,
      appointment.startTime,
      appointment.endTime,
      appointment.leadId,
      appointment.organizationId,
      appointment.unitId,
      appointment.procedureId || undefined
    );
  }
}
