export class ProspectorLead {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly phone: string,
    public readonly organizationId: string,
    public readonly unitId: string,
    public readonly industry?: string,
    public readonly email?: string,
    public readonly score: number = 0,
    public readonly status: string = 'NEW',
    public readonly pendingMessage?: string,
    public readonly lastInteractionAt: Date = new Date(),
  ) {}
}
