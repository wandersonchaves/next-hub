export class CompensationRange {
  constructor(
    public readonly min: number | null,
    public readonly max: number | null,
    public readonly currency: string | null,
  ) {
    if (min !== null && max !== null && min > max) {
      throw new Error('Minimum compensation cannot be greater than maximum compensation');
    }
  }

  static create(min: number | null, max: number | null, currency: string | null): CompensationRange {
    return new CompensationRange(min, max, currency);
  }

  static empty(): CompensationRange {
    return new CompensationRange(null, null, null);
  }

  get hasValue(): boolean {
    return this.min !== null || this.max !== null;
  }

  equals(other: CompensationRange): boolean {
    return (
      this.min === other.min &&
      this.max === other.max &&
      this.currency === other.currency
    );
  }
}
