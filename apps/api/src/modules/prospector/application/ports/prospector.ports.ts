import { Lead, Appointment } from '../../domain/entities/prospector.entities';

export interface ILeadRepository {
  findById(id: string): Promise<Lead | null>;
  findByPhone(phone: string, organizationId: string): Promise<Lead | null>;
  save(lead: Lead): Promise<Lead>;
  update(lead: Lead): Promise<Lead>;
}

export interface IAppointmentRepository {
  save(appointment: Appointment): Promise<Appointment>;
  findOverlapping(branchId: string, startTime: Date, endTime: Date): Promise<Appointment[]>;
}

export interface IAIService {
  analyzeMessage(message: string, context: { nicheContext: string; plansContext: string }): Promise<{
    name?: string;
    email?: string;
    intent: string;
    appointmentDate?: Date;
  }>;
}
