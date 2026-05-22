export enum PetSize {
  SMALL = 'SMALL',
  MEDIUM = 'MEDIUM',
  LARGE = 'LARGE',
  GIANT = 'GIANT',
}

export class Pet {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly breed: string | null,
    public readonly size: PetSize,
    public readonly weight: number | null,
    public readonly lastBathAt: Date | null,
    public readonly tutorId: string,
    public readonly organizationId: string,
    public readonly branchId: string,
  ) {
    this.validate();
  }

  private validate() {
    if (!this.name) throw new Error('Pet name is required');
    if (!this.tutorId) throw new Error('Tutor ID is required');
    if (this.weight !== null && this.weight < 0) throw new Error('Weight cannot be negative');
  }

  public getDaysSinceLastBath(): number | null {
    if (!this.lastBathAt) return null;
    const diffTime = Math.abs(new Date().getTime() - this.lastBathAt.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
}
