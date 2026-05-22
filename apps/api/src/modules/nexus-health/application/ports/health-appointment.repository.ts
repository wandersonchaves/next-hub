import { HealthAppointment } from '../../domain/entities/appointment.entity';
import { Procedure } from '../../domain/entities/procedure.entity';

export interface IHealthAppointmentRepository {
  save(appointment: HealthAppointment): Promise<HealthAppointment>;
  findOverlapping(branchId: string, startTime: Date, endTime: Date): Promise<HealthAppointment[]>;
  findProcedureById(id: string): Promise<Procedure | null>;
}
