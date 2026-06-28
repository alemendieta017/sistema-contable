export class Account {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly name: string,
    public readonly type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE',
    public readonly currencyId: string,
    public readonly parentId?: string,
    public readonly status: 'ACTIVE' | 'INACTIVE' = 'ACTIVE',
    public readonly metadata?: Record<string, any>,
  ) {}
}

export class JournalEntry {
  constructor(
    public readonly id: string | undefined,
    public readonly accountId: string,
    public readonly entryType: 'DEBIT' | 'CREDIT',
    public readonly amount: number,
    public readonly amountBase: number,
    public readonly rateAtDate: number = 1.0,
  ) {}
}

export class Transaction {
  constructor(
    public readonly id: string | undefined,
    public readonly userId: string,
    public readonly date: Date,
    public readonly description: string,
    public readonly entries: JournalEntry[],
    public readonly status: 'POSTED' | 'REVERSED' = 'POSTED',
    public readonly reversalOfId?: string,
    public readonly createdAt?: Date,
  ) {}

  /**
   * Enforces double-entry constraint: sum of DEBITS must equal sum of CREDITS.
   * Tolerates floating-point discrepancies up to a tiny margin (e.g. 0.0001).
   */
  public isBalanced(): boolean {
    let balance = 0;
    for (const entry of this.entries) {
      if (entry.entryType === 'DEBIT') {
        balance += entry.amountBase;
      } else {
        balance -= entry.amountBase;
      }
    }
    return Math.abs(balance) < 0.0001;
  }

  /**
   * Returns the discrepancy amount if unbalanced.
   */
  public getDiscrepancy(): number {
    let balance = 0;
    for (const entry of this.entries) {
      if (entry.entryType === 'DEBIT') {
        balance += entry.amountBase;
      } else {
        balance -= entry.amountBase;
      }
    }
    return Math.abs(balance);
  }
}
