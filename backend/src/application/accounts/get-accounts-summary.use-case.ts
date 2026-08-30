import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AccountEntity } from '../../infrastructure/database/entities/account.entity';
import { JournalEntryEntity } from '../../infrastructure/database/entities/journal-entry.entity';
import { PeriodEntity } from '../../infrastructure/database/entities/period.entity';
import { AccountPeriodBalanceEntity } from '../../infrastructure/database/entities/account-period-balance.entity';

@Injectable()
export class GetAccountsSummaryUseCase {
  constructor(private readonly dataSource: DataSource) {}

  async execute(userId: string) {
    return this.dataSource.transaction('READ UNCOMMITTED', async (entityManager) => {
      // 1. Fetch all user accounts
      const accounts = await entityManager.find(AccountEntity, {
        where: { userId },
        relations: ['currency'],
      });

      // 2. Find the latest closed accounting period for this user
      const latestClosedPeriod = await entityManager
        .createQueryBuilder(PeriodEntity, 'period')
        .where('period.userId = :userId', { userId })
        .andWhere('period.status = :status', { status: 'CLOSED' })
        .orderBy('period.endDate', 'DESC')
        .addOrderBy('period.startDate', 'DESC')
        .getOne();

      // 3. Load baseline balances from the latest closed period if present
      const baseBalances = new Map<string, number>();

      if (latestClosedPeriod) {
        const periodBalances = await entityManager.find(AccountPeriodBalanceEntity, {
          where: { periodId: latestClosedPeriod.id },
        });
        for (const bal of periodBalances) {
          baseBalances.set(bal.accountId, Number(bal.closingBalance || 0));
        }
      }

      // 4. Query incremental journal entries beyond the last closed period
      const queryBuilder = entityManager
        .createQueryBuilder(JournalEntryEntity, 'entry')
        .select('entry.accountId', 'accountId')
        .addSelect('entry.entryType', 'entryType')
        .addSelect('SUM(entry.amountBase)', 'sum')
        .innerJoin('entry.transaction', 'tx', 'tx.userId = :userId', { userId })
        .groupBy('entry.accountId')
        .addGroupBy('entry.entryType');

      if (latestClosedPeriod) {
        queryBuilder.andWhere('tx.accountingDate > :lastClosedEndDate', {
          lastClosedEndDate: latestClosedPeriod.endDate,
        });
      }

      const rawSums = await queryBuilder.getRawMany();

      // Organize incremental sums: accountId -> { DEBIT: num, CREDIT: num }
      const sumMap: Record<string, { DEBIT: number; CREDIT: number }> = {};
      for (const row of rawSums) {
        const accId = row.accountId;
        const type = row.entryType as 'DEBIT' | 'CREDIT';
        const sum = Number(row.sum || 0);

        if (!sumMap[accId]) {
          sumMap[accId] = { DEBIT: 0, CREDIT: 0 };
        }
        sumMap[accId][type] = sum;
      }

      // 5. Compute consolidated balance for each account (Base Snapshot + Incremental Delta)
      let totalAssets = 0;
      let totalLiabilities = 0;

      const accountSummaries = accounts.map((acc) => {
        const baseBalance = baseBalances.get(acc.id) ?? 0;
        const sums = sumMap[acc.id] || { DEBIT: 0, CREDIT: 0 };
        let delta = 0;

        if (acc.type === 'ASSET' || acc.type === 'EXPENSE') {
          delta = sums.DEBIT - sums.CREDIT;
        } else {
          delta = sums.CREDIT - sums.DEBIT;
        }

        let balance = baseBalance + delta;

        // Round to 4 decimals to avoid float discrepancies
        balance = Number(balance.toFixed(4));

        if (acc.type === 'ASSET') {
          totalAssets += balance;
        } else if (acc.type === 'LIABILITY') {
          totalLiabilities += balance;
        }

        return {
          id: acc.id,
          name: acc.name,
          type: acc.type,
          currencyId: acc.currencyId,
          currencyCode: acc.currency?.code || '',
          currencySymbol: acc.currency?.symbol || '',
          decimalPlaces: acc.currency?.decimalPlaces ?? 2,
          parentId: acc.parentId,
          status: acc.status,
          isCashOrBank: acc.isCashOrBank,
          systemRole: acc.systemRole || null,
          balance,
        };
      });

      totalAssets = Number(totalAssets.toFixed(4));
      totalLiabilities = Number(totalLiabilities.toFixed(4));
      const netWorth = Number((totalAssets - totalLiabilities).toFixed(4));

      return {
        netWorth,
        totalAssets,
        totalLiabilities,
        accounts: accountSummaries,
      };
    });
  }
}
