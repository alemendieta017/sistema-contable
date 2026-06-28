import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { BudgetEntity } from '../../infrastructure/database/entities/budget.entity';
import { JournalEntryEntity } from '../../infrastructure/database/entities/journal-entry.entity';
import { Budget } from '../../domain/budgets/budget.model';

@Injectable()
export class GetBudgetsSummaryUseCase {
  constructor(
    @InjectRepository(BudgetEntity)
    private readonly budgetRepository: Repository<BudgetEntity>,
    @InjectRepository(JournalEntryEntity)
    private readonly journalEntryRepository: Repository<JournalEntryEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async execute(userId: string, period: string) {
    return this.dataSource.transaction('READ UNCOMMITTED', async (entityManager) => {
      // 1. Fetch budgets for the period and general budgets (period '0000-00')
      const allBudgets = await entityManager.find(BudgetEntity, {
        where: [
          { userId, period },
          { userId, period: '0000-00' },
        ],
        relations: ['account'],
      });

      // Deduplicate: group by accountId, prefer the one with matching period
      const budgetMap = new Map<string, BudgetEntity>();
      for (const b of allBudgets) {
        const existing = budgetMap.get(b.accountId);
        if (!existing || b.period === period) {
          budgetMap.set(b.accountId, b);
        }
      }
      const budgets = Array.from(budgetMap.values());

      // 2. Parse period boundaries
      const [year, month] = period.split('-').map(Number);
      const startDate = new Date(Date.UTC(year, month - 1, 1));
      const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

      // 3. Query aggregated DEBIT spending for these accounts in the month period
      const spentSums = await entityManager
        .createQueryBuilder(JournalEntryEntity, 'entry')
        .select('entry.accountId', 'accountId')
        .addSelect('SUM(entry.amountBase)', 'sum')
        .innerJoin('entry.transaction', 'tx')
        .where('tx.userId = :userId', { userId })
        .andWhere('entry.entryType = :type', { type: 'DEBIT' })
        .andWhere('tx.date >= :startDate', { startDate })
        .andWhere('tx.date <= :endDate', { endDate })
        .groupBy('entry.accountId')
        .getRawMany();

      const spentMap: Record<string, number> = {};
      for (const row of spentSums) {
        spentMap[row.accountId] = Number(row.sum || 0);
      }

      // 4. Map to summary data
      return budgets.map((b) => {
        const spent = spentMap[b.accountId] || 0.0;
        const limit = Number(b.limit);

        const domainBudget = new Budget(b.id, userId, b.accountId, limit, period);
        const percentage = domainBudget.getSpentPercentage(spent);
        const isExceeded = domainBudget.isExceeded(spent);

        return {
          id: b.id,
          accountId: b.accountId,
          accountName: b.account?.name || 'Category',
          limit,
          spent,
          percentage,
          isExceeded,
          period,
        };
      });
    });
  }
}
