import { HealthAppointment } from '../../domain/entities/appointment.entity';

export interface HealthAppointmentRepository {
  save(appointment: HealthAppointment): Promise<HealthAppointment>;
  findById(id: string): Promise<HealthAppointment | null>;
  findOverlapping(unitId: string, startTime: Date, endTime: Date): Promise<HealthAppointment[]>;
}
