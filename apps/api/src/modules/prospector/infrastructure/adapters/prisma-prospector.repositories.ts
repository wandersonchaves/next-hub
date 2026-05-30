import { Injectable } from '@nestjs/common';
import { Lead, Appointment } from '@enterprise/database';
import { PrismaService } from '../../../../prisma/prisma.service';
import { ILeadRepository, IAppointmentRepository } from '../../application/ports/prospector.ports';

@Injectable()
export class PrismaLeadRepository implements ILeadRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Lead | null> {
    return this.prisma.client.lead.findUnique({ where: { id } });
  }

  async findByPhone(phone: string, organizationId: string): Promise<Lead | null> {
    return this.prisma.client.lead.findUnique({
      where: { phone_organizationId: { phone, organizationId } }
    });
  }

  async save(lead: Partial<Lead>): Promise<Lead> {
    // Destructure to avoid updating readonly/context fields
    const { organizationId, unitId, id, ...updateData } = lead;
    
    return this.prisma.client.lead.upsert({
      where: { id: id || 'new' },
      update: updateData as any,
      create: lead as any
    });
  }

  async findAll(organizationId: string): Promise<Lead[]> {
    return this.prisma.client.lead.findMany({ where: { organizationId } });
  }
}

@Injectable()
export class PrismaAppointmentRepository implements IAppointmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(appointment: Partial<Appointment>): Promise<Appointment> {
    const { organizationId, unitId, id, ...updateData } = appointment;

    return this.prisma.client.appointment.upsert({
      where: { id: id || 'new' },
      update: updateData as any,
      create: appointment as any
    });
  }

  async findOverlapping(unitId: string, startTime: Date, endTime: Date): Promise<Appointment[]> {
    return this.prisma.client.appointment.findMany({
      where: {
        unitId,
        OR: [
          { startTime: { lt: endTime }, endTime: { gt: startTime } }
        ]
      }
    });
  }
}
