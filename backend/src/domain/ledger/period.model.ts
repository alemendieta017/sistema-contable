export class Period {
  constructor(
    public readonly id: string | undefined,
    public readonly userId: string,
    public readonly name: string,
    public readonly startDate: string,
    public readonly endDate: string,
    public readonly status: 'OPEN' | 'CLOSED' | 'PLANNING' = 'OPEN',
  ) {}
}

export class AccountPeriodBalance {
  constructor(
    public readonly id: string | undefined,
    public readonly accountId: string,
    public readonly periodId: string,
    public readonly openingBalance: number,
    public readonly totalDebits: number,
    public readonly totalCredits: number,
    public readonly closingBalance: number,
    public readonly lastUpdated?: Date,
  ) {}

  public static calculateClosing(
    opening: number,
    debits: number,
    credits: number,
    accountType: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE',
  ): number {
    const isDebitNature = accountType === 'ASSET' || accountType === 'EXPENSE';
    if (isDebitNature) {
      return Number((Number(opening) + Number(debits) - Number(credits)).toFixed(4));
    } else {
      return Number((Number(opening) + Number(credits) - Number(debits)).toFixed(4));
    }
  }
}
