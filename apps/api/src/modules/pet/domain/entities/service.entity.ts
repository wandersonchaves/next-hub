export enum PetServiceType {
  BATH = 'BATH',
  GROOMING = 'GROOMING',
  VET = 'VET',
}

export class PetService {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly price: number,
    public readonly durationInMinutes: number,
    public readonly type: PetServiceType,
  ) {
    this.validate();
  }

  private validate() {
    if (!this.name) throw new Error('Service name is required');
    if (this.price < 0) throw new Error('Price cannot be negative');
    if (this.durationInMinutes <= 0) throw new Error('Duration must be positive');
  }
}
