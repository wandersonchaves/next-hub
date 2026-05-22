export class HealthAppointment {
  constructor(
    public readonly id: string,
    public readonly title: string,
    public readonly startTime: Date,
    public readonly endTime: Date,
    public readonly leadId: string,
    public readonly branchId: string,
    public readonly organizationId: string,
    public readonly procedureId?: string,
    public readonly status: string = 'SCHEDULED',
  ) {}

  /**
   * Valida conflitos de horários entre este agendamento e uma lista de agendamentos existentes.
   */
  public hasConflict(existingAppointments: HealthAppointment[]): boolean {
    return existingAppointments.some((appointment) => {
      // Ignora o próprio agendamento se for uma atualização
      if (appointment.id === this.id) return false;

      const startsBeforeEnds = this.startTime < appointment.endTime;
      const endsAfterStarts = this.endTime > appointment.startTime;

      return startsBeforeEnds && endsAfterStarts;
    });
  }

  /**
   * Calcula o horário de término baseado na duração do procedimento.
   */
  public static calculateEndTime(startTime: Date, durationInMinutes: number): Date {
    const endTime = new Date(startTime);
    endTime.setMinutes(endTime.getMinutes() + durationInMinutes);
    return endTime;
  }
}
