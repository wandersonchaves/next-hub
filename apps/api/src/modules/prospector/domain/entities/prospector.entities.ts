export class Lead {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly phone: string,
    public readonly organizationId: string,
    public readonly branchId: string,
    public readonly email?: string,
    public readonly status: string = 'NEW',
    public readonly score: number = 0,
    public readonly industry?: string,
    public readonly lastInteractionAt: Date = new Date(),
  ) { }
}

export class Appointment {
  constructor(
    public readonly id: string,
    public readonly title: string,
    public readonly startTime: Date,
    public readonly endTime: Date,
    public readonly leadId: string,
    public readonly branchId: string,
    public readonly organizationId: string,
    public readonly status: string = 'SCHEDULED',
    public readonly googleEventId?: string,
  ) { }
}
