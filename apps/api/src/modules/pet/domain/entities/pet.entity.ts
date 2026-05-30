export class Pet {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly breed: string | null,
    public readonly size: string,
    public readonly weight: number | null,
    public readonly lastBathAt: Date | null,
    public readonly tutorId: string,
    public readonly organizationId: string,
    public readonly unitId: string,
  ) {}
}
