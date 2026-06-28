import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { AccountEntity } from '../../infrastructure/database/entities/account.entity';
import { TransactionEntity } from '../../infrastructure/database/entities/transaction.entity';
import { JournalEntryEntity } from '../../infrastructure/database/entities/journal-entry.entity';
import { BudgetEntity } from '../../infrastructure/database/entities/budget.entity';
import { CurrencyEntity } from '../../infrastructure/database/entities/currency.entity';

export interface BackupData {
  accounts: any[];
  budgets: any[];
  transactions: any[];
  journalEntries: any[];
}

@Injectable()
export class BackupService {
  constructor(
    @InjectRepository(AccountEntity)
    private readonly accountRepository: Repository<AccountEntity>,
    @InjectRepository(TransactionEntity)
    private readonly transactionRepository: Repository<TransactionEntity>,
    @InjectRepository(JournalEntryEntity)
    private readonly journalEntryRepository: Repository<JournalEntryEntity>,
    @InjectRepository(BudgetEntity)
    private readonly budgetRepository: Repository<BudgetEntity>,
    @InjectRepository(CurrencyEntity)
    private readonly currencyRepository: Repository<CurrencyEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async exportBackup(userId: string): Promise<BackupData> {
    const accounts = await this.accountRepository.find({ where: { userId } });
    const budgets = await this.budgetRepository.find({ where: { userId } });
    const transactions = await this.transactionRepository.find({ where: { userId } });

    const txIds = transactions.map((t) => t.id);
    let journalEntries: JournalEntryEntity[] = [];
    if (txIds.length > 0) {
      journalEntries = await this.journalEntryRepository.find({
        where: txIds.map((id) => ({ transactionId: id })),
      });
    }

    return {
      accounts,
      budgets,
      transactions,
      journalEntries,
    };
  }

  async importBackup(userId: string, data: BackupData): Promise<{ success: boolean }> {
    if (!data.accounts || !data.transactions) {
      throw new BadRequestException('Invalid backup payload');
    }

    return this.dataSource.transaction('SERIALIZABLE', async (entityManager) => {
      // 1. Delete all current data for this user
      // Delete entries cascades from transactions, but we can do it explicitly
      const currentTransactions = await entityManager.find(TransactionEntity, { where: { userId } });
      const currentTxIds = currentTransactions.map((t) => t.id);
      if (currentTxIds.length > 0) {
        await entityManager.delete(JournalEntryEntity, currentTxIds.map((id) => ({ transactionId: id })));
        await entityManager.delete(TransactionEntity, currentTxIds);
      }

      await entityManager.delete(BudgetEntity, { userId });
      await entityManager.delete(AccountEntity, { userId });

      // Map account IDs to support import mapping if needed, but since we preserve UUIDs it is straightforward.
      // 2. Restore Accounts
      for (const acc of data.accounts) {
        // Ensure dummy currency exists
        const currencyExists = await entityManager.findOne(CurrencyEntity, { where: { id: acc.currencyId } });
        if (!currencyExists) {
          // Fallback to default base currency if not found
          const baseCurrency = await entityManager.findOne(CurrencyEntity, { where: { isBase: true } });
          acc.currencyId = baseCurrency ? baseCurrency.id : acc.currencyId;
        }

        const accountEntity = entityManager.create(AccountEntity, {
          id: acc.id,
          userId,
          name: acc.name,
          type: acc.type,
          parentId: acc.parentId,
          currencyId: acc.currencyId,
          status: acc.status || 'ACTIVE',
          metadata: acc.metadata,
        });
        await entityManager.save(AccountEntity, accountEntity);
      }

      // 3. Restore Budgets
      for (const b of data.budgets) {
        const budgetEntity = entityManager.create(BudgetEntity, {
          id: b.id,
          userId,
          accountId: b.accountId,
          limit: b.limit,
          period: b.period,
        });
        await entityManager.save(BudgetEntity, budgetEntity);
      }

      // 4. Restore Transactions
      for (const tx of data.transactions) {
        const txEntity = entityManager.create(TransactionEntity, {
          id: tx.id,
          userId,
          date: new Date(tx.date),
          description: tx.description,
          status: tx.status || 'POSTED',
          reversalOfId: tx.reversalOfId,
        });
        await entityManager.save(TransactionEntity, txEntity);
      }

      // 5. Restore Journal Entries
      for (const entry of data.journalEntries) {
        const entryEntity = entityManager.create(JournalEntryEntity, {
          id: entry.id,
          transactionId: entry.transactionId,
          accountId: entry.accountId,
          entryType: entry.entryType,
          amount: entry.amount,
          amountBase: entry.amountBase,
          rateAtDate: entry.rateAtDate,
        });
        await entityManager.save(JournalEntryEntity, entryEntity);
      }

      return { success: true };
    });
  }
}
