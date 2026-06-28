import { Transaction, Account } from './ledger.model';

export interface LedgerRepository {
  save(transaction: Transaction): Promise<Transaction>;
  findById(id: string): Promise<Transaction | null>;
  findAccountById(id: string): Promise<Account | null>;
}
