export class HealthAppointment {
  constructor(
    public readonly id: string,
    public readonly title: string,
    public readonly startTime: Date,
    public readonly endTime: Date,
    public readonly leadId: string,
    public readonly organizationId: string,
    public readonly unitId: string,
    public readonly procedureId?: string,
  ) {}
}
