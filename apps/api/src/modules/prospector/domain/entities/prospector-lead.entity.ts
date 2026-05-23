export class ProspectorLead {
  constructor(
    public readonly id: string,
    public readonly name: string | null,
    public readonly phone: string,
    public readonly status: string,
    public readonly lastInteractionAt: Date,
    public readonly organizationId: string,
  ) {}

  /**
   * Temporal Guard: Rejeita mensagens com timestamp anterior ao lastInteractionAt.
   */
  public isStale(incomingTimestamp: Date): boolean {
    return incomingTimestamp < this.lastInteractionAt;
  }
}
