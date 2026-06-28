import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { JournalEntryEntity } from '../../infrastructure/database/entities/journal-entry.entity';
import { AccountEntity } from '../../infrastructure/database/entities/account.entity';

@Injectable()
export class GetCategoryStatisticsUseCase {
  constructor(
    @InjectRepository(JournalEntryEntity)
    private readonly journalEntryRepository: Repository<JournalEntryEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async execute(userId: string, period: string, type: 'INCOME' | 'EXPENSE') {
    return this.dataSource.transaction('READ UNCOMMITTED', async (entityManager) => {
      // Parse period boundaries
      const [year, month] = period.split('-').map(Number);
      const startDate = new Date(Date.UTC(year, month - 1, 1));
      const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

      // Query aggregated sums for the chosen type in the period
      const sums = await entityManager
        .createQueryBuilder(JournalEntryEntity, 'entry')
        .select('entry.accountId', 'accountId')
        .addSelect('acc.name', 'accountName')
        .addSelect('SUM(entry.amountBase)', 'sum')
        .innerJoin('entry.transaction', 'tx')
        .innerJoin('entry.account', 'acc')
        .where('tx.userId = :userId', { userId })
        .andWhere('acc.type = :type', { type })
        .andWhere('tx.date >= :startDate', { startDate })
        .andWhere('tx.date <= :endDate', { endDate })
        // If it's an expense, we track DEBIT entries. If income, we track CREDIT entries.
        .andWhere('entry.entryType = :entryType', { entryType: type === 'EXPENSE' ? 'DEBIT' : 'CREDIT' })
        .groupBy('entry.accountId')
        .addGroupBy('acc.name')
        .getRawMany();

      const items = sums.map((row) => ({
        accountId: row.accountId,
        accountName: row.accountName,
        amount: Number(row.sum || 0),
        percentage: 0,
      }));

      // Calculate grand total
      const grandTotal = items.reduce((sum, item) => sum + item.amount, 0);

      // Compute percentages
      if (grandTotal > 0) {
        for (const item of items) {
          item.percentage = Number(((item.amount / grandTotal) * 100).toFixed(2));
        }
      }

      // Sort DESC by amount
      return items.sort((a, b) => b.amount - a.amount);
    });
  }
}
