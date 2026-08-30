import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TransactionEntity } from '../../infrastructure/database/entities/transaction.entity';
import { PeriodEntity } from '../../infrastructure/database/entities/period.entity';
import { AccountEntity } from '../../infrastructure/database/entities/account.entity';
import { AccountPeriodBalanceEntity } from '../../infrastructure/database/entities/account-period-balance.entity';

@Injectable()
export class ReconstructBalancesUseCase {
  constructor(private readonly dataSource: DataSource) {}

  async execute(userId: string): Promise<{ success: boolean; message: string }> {
    return this.dataSource.transaction('SERIALIZABLE', async (entityManager) => {
      // 1. Wipe all account period balances for the user
      await entityManager
        .createQueryBuilder()
        .delete()
        .from(AccountPeriodBalanceEntity)
        .where('periodId IN (SELECT p.id FROM periods p WHERE p.user_id = :userId)', { userId })
        .execute();

      // 2. Fetch all periods for the user ordered chronologically
      const periods = await entityManager
        .createQueryBuilder(PeriodEntity, 'period')
        .where('period.userId = :userId', { userId })
        .orderBy('period.startDate', 'ASC')
        .getMany();

      if (periods.length === 0) {
        return {
          success: true,
          message: 'No periods configured. Balances wiped, but nothing to reconstruct.',
        };
      }

      // 3. Fetch all accounts of the user
      const accounts = await entityManager.find(AccountEntity, {
        where: { userId },
      });

      // 4. Fetch all POSTED transactions for the user chronologically
      const transactions = await entityManager.find(TransactionEntity, {
        where: { userId, status: 'POSTED' },
        relations: ['entries'],
        order: { accountingDate: 'ASC' },
      });

      // Track last closing balance for each account
      const lastClosingBalances = new Map<string, number>();

      // 5. Chronologically reconstruct balances period by period
      for (const period of periods) {
        // Group journal entries of POSTED transactions that fall inside this period's date range
        const periodEntries = transactions
          .filter((t) => t.accountingDate >= period.startDate && t.accountingDate <= period.endDate)
          .flatMap((t) => t.entries);

        const debitsMap = new Map<string, number>();
        const creditsMap = new Map<string, number>();

        for (const entry of periodEntries) {
          if (entry.entryType === 'DEBIT') {
            debitsMap.set(
              entry.accountId,
              (debitsMap.get(entry.accountId) || 0) + Number(entry.amountBase),
            );
          } else {
            creditsMap.set(
              entry.accountId,
              (creditsMap.get(entry.accountId) || 0) + Number(entry.amountBase),
            );
          }
        }

        // For each account, compute and save balance
        for (const account of accounts) {
          const accountId = account.id;
          const totalDebits = debitsMap.get(accountId) || 0;
          const totalCredits = creditsMap.get(accountId) || 0;

          const isTemporary = account.type === 'INCOME' || account.type === 'EXPENSE';
          const openingBalance = isTemporary ? 0 : lastClosingBalances.get(accountId) || 0;

          const isDebitNature = account.type === 'ASSET' || account.type === 'EXPENSE';
          let closingBalance = 0;
          if (isDebitNature) {
            closingBalance = openingBalance + totalDebits - totalCredits;
          } else {
            closingBalance = openingBalance + totalCredits - totalDebits;
          }

          // Update lastClosingBalances map for subsequent periods
          lastClosingBalances.set(accountId, closingBalance);

          if (openingBalance !== 0 || totalDebits !== 0 || totalCredits !== 0) {
            const balEntity = entityManager.create(AccountPeriodBalanceEntity, {
              accountId,
              periodId: period.id,
              openingBalance,
              totalDebits,
              totalCredits,
              closingBalance,
            });
            await entityManager.save(AccountPeriodBalanceEntity, balEntity);
          }
        }
      }

      return {
        success: true,
        message: `Balances successfully reconstructed for ${periods.length} periods.`,
      };
    });
  }
}
