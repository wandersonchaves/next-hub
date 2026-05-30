import { Lead, Appointment } from '@enterprise/database';

export interface ILeadRepository {
  findById(id: string): Promise<Lead | null>;
  findByPhone(phone: string, organizationId: string): Promise<Lead | null>;
  save(lead: Partial<Lead>): Promise<Lead>;
  findAll(organizationId: string): Promise<Lead[]>;
}

export interface IAppointmentRepository {
  save(appointment: Partial<Appointment>): Promise<Appointment>;
  findOverlapping(unitId: string, startTime: Date, endTime: Date): Promise<Appointment[]>;
}
