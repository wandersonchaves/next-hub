import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { Lead, Appointment } from '../../domain/entities/prospector.entities';
import type { ILeadRepository, IAppointmentRepository } from '../../application/ports/prospector.ports';

@Injectable()
export class PrismaLeadRepository implements ILeadRepository {
  constructor(private readonly prisma: PrismaService) { }

  async findById(id: string): Promise<Lead | null> {
    const data = await this.prisma.client.lead.findUnique({ where: { id } });
    if (!data) return null;
    return this.mapToEntity(data);
  }

  async findByPhone(phone: string, organizationId: string): Promise<Lead | null> {
    const data = await this.prisma.client.lead.findUnique({
      where: { phone_organizationId: { phone, organizationId } },
    });
    if (!data) return null;
    return this.mapToEntity(data);
  }

  async save(lead: Lead): Promise<Lead> {
    const data = await this.prisma.client.lead.create({
      data: {
        id: lead.id,
        name: lead.name,
        phone: lead.phone,
        email: lead.email,
        organizationId: lead.organizationId,
        branchId: lead.branchId,
        status: lead.status,
        score: lead.score,
        industry: lead.industry,
      },
    });
    return this.mapToEntity(data);
  }

  async update(lead: Lead): Promise<Lead> {
    const data = await this.prisma.client.lead.update({
      where: { id: lead.id },
      data: {
        name: lead.name,
        email: lead.email,
        status: lead.status,
        score: lead.score,
        lastInteractionAt: lead.lastInteractionAt,
      },
    });
    return this.mapToEntity(data);
  }

  private mapToEntity(data: any): Lead {
    return new Lead(
      data.id,
      data.name,
      data.phone,
      data.organizationId,
      data.branchId,
      data.email,
      data.status,
      data.score,
      data.industry,
      data.lastInteractionAt,
    );
  }
}

@Injectable()
export class PrismaAppointmentRepository implements IAppointmentRepository {
  constructor(private readonly prisma: PrismaService) { }

  async save(appointment: Appointment): Promise<Appointment> {
    const data = await this.prisma.client.appointment.create({
      data: {
        id: appointment.id,
        title: appointment.title,
        startTime: appointment.startTime,
        endTime: appointment.endTime,
        leadId: appointment.leadId,
        branchId: appointment.branchId,
        organizationId: appointment.organizationId,
        status: appointment.status,
        googleEventId: appointment.googleEventId,
      },
    });
    return this.mapToEntity(data);
  }

  async findOverlapping(branchId: string, startTime: Date, endTime: Date): Promise<Appointment[]> {
    const data = await this.prisma.client.appointment.findMany({
      where: {
        branchId,
        OR: [
          { startTime: { lt: endTime, gte: startTime } },
          { endTime: { gt: startTime, lte: endTime } },
        ],
      },
    });
    return data.map(this.mapToEntity);
  }

  private mapToEntity(data: any): Appointment {
    return new Appointment(
      data.id,
      data.title,
      data.startTime,
      data.endTime,
      data.leadId,
      data.branchId,
      data.organizationId,
      data.status,
      data.googleEventId,
    );
  }
}
