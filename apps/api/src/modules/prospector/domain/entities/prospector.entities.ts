export class Lead {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly phone: string,
    public readonly organizationId: string,
    public readonly unitId: string,
    public readonly status: string = 'NEW',
    public readonly industry?: string,
    public readonly email?: string,
    public readonly score: number = 0,
    public readonly pendingMessage?: string,
    public readonly lastInteractionAt: Date = new Date(),
  ) {}
}

export class Appointment {
  constructor(
    public readonly id: string,
    public readonly title: string,
    public readonly startTime: Date,
    public readonly endTime: Date,
    public readonly leadId: string,
    public readonly organizationId: string,
    public readonly unitId: string,
    public readonly googleEventId?: string,
  ) {}
}

export class SuggestedMessage {
  constructor(
    public readonly id: string,
    public readonly content: string,
    public readonly leadId: string,
    public readonly organizationId: string,
    public readonly unitId: string,
    public readonly status: string = 'PENDING_APPROVAL',
  ) {}
}
