export class Procedure {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly durationInMinutes: number,
    public readonly price: number,
  ) {}
}
