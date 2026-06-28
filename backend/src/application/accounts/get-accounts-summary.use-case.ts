import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { AccountEntity } from '../../infrastructure/database/entities/account.entity';
import { JournalEntryEntity } from '../../infrastructure/database/entities/journal-entry.entity';

@Injectable()
export class GetAccountsSummaryUseCase {
  constructor(
    @InjectRepository(AccountEntity)
    private readonly accountRepository: Repository<AccountEntity>,
    @InjectRepository(JournalEntryEntity)
    private readonly journalEntryRepository: Repository<JournalEntryEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async execute(userId: string) {
    return this.dataSource.transaction('READ UNCOMMITTED', async (entityManager) => {
      // 1. Fetch all user accounts
      const accounts = await entityManager.find(AccountEntity, {
        where: { userId },
        relations: ['currency'],
      });

      // 2. Fetch aggregated debit/credit sums for each account
      const rawSums = await entityManager
        .createQueryBuilder(JournalEntryEntity, 'entry')
        .select('entry.accountId', 'accountId')
        .addSelect('entry.entryType', 'entryType')
        .addSelect('SUM(entry.amountBase)', 'sum')
        .innerJoin('entry.transaction', 'tx', 'tx.userId = :userId', { userId })
        .groupBy('entry.accountId')
        .addGroupBy('entry.entryType')
        .getRawMany();

      // Organize sums into a map: accountId -> { DEBIT: num, CREDIT: num }
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

      // 3. Compute balance for each account
      let totalAssets = 0;
      let totalLiabilities = 0;

      const accountSummaries = accounts.map((acc) => {
        const sums = sumMap[acc.id] || { DEBIT: 0, CREDIT: 0 };
        let balance = 0;

        if (acc.type === 'ASSET' || acc.type === 'EXPENSE') {
          balance = sums.DEBIT - sums.CREDIT;
        } else {
          balance = sums.CREDIT - sums.DEBIT;
        }

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
          parentId: acc.parentId,
          status: acc.status,
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
