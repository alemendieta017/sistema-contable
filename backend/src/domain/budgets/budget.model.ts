export class Budget {
  constructor(
    public readonly id: string | undefined,
    public readonly userId: string,
    public readonly accountId: string,
    public readonly limit: number,
    public readonly period: string,
  ) {}

  public isExceeded(spent: number): boolean {
    return spent > this.limit;
  }

  public getSpentPercentage(spent: number): number {
    if (this.limit <= 0) return 0;
    return Number(((spent / this.limit) * 100).toFixed(2));
  }
}
