import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { PeriodEntity } from '../../infrastructure/database/entities/period.entity';
import { BudgetEntity } from '../../infrastructure/database/entities/budget.entity';
import { AccountEntity } from '../../infrastructure/database/entities/account.entity';
import { JournalEntryEntity } from '../../infrastructure/database/entities/journal-entry.entity';
import {
  BudgetControlResponse,
  BudgetControlSummary,
  BudgetControlCategory,
  BudgetControlItem,
  BudgetGaugeStatus,
} from '@sistema-contable/shared';

@Injectable()
export class GetBudgetControlUseCase {
  constructor(private readonly dataSource: DataSource) {}

  async execute(userId: string, periodId: string): Promise<BudgetControlResponse> {
    return this.dataSource.transaction(async (manager) => {
      const period = await manager.findOne(PeriodEntity, {
        where: { id: periodId },
      });

      if (!period) {
        throw new NotFoundException(`Period with ID '${periodId}' not found.`);
      }

      // Fetch accounts (excluding EQUITY and cash/bank liquid asset accounts)
      const accounts = await manager
        .createQueryBuilder(AccountEntity, 'account')
        .where('account.user_id = :userId', { userId })
        .andWhere('account.status = :status', { status: 'ACTIVE' })
        .andWhere('account.type != :equityType', { equityType: 'EQUITY' })
        .andWhere('account.is_cash_or_bank = :isCash', { isCash: false })
        .orderBy('account.name', 'ASC')
        .getMany();

      // Fetch budget header and items for this period
      const budget = await manager.findOne(BudgetEntity, {
        where: { userId, periodId },
        relations: ['items'],
      });

      const budgetMap = new Map<string, number>();
      if (budget && budget.items) {
        for (const item of budget.items) {
          budgetMap.set(item.accountId, Number(item.amount));
        }
      }

      // Query posted journal entries for this period
      const entries = await manager
        .createQueryBuilder(JournalEntryEntity, 'entry')
        .innerJoinAndSelect('entry.transaction', 'tx')
        .innerJoin('entry.account', 'account')
        .where('account.user_id = :userId', { userId })
        .andWhere('tx.accounting_date >= :startDate', { startDate: period.startDate })
        .andWhere('tx.accounting_date <= :endDate', { endDate: period.endDate })
        .getMany();

      const executedMap = new Map<string, number>();
      for (const entry of entries) {
        const accId = entry.accountId;
        const debit = entry.entryType === 'DEBIT' ? Number(entry.amount) : 0;
        const credit = entry.entryType === 'CREDIT' ? Number(entry.amount) : 0;
        const current = executedMap.get(accId) || 0;

        // Will adjust net sign per account type later
        executedMap.set(accId, current + (debit - credit));
      }

      const itemsByCategory = new Map<string, BudgetControlItem[]>();

      let grandTotalBudgeted = 0;
      let grandTotalExecuted = 0;
      let grandTotalCommitted = 0;
      let grandTotalAvailable = 0;

      for (const account of accounts) {
        const budgeted = budgetMap.get(account.id) || 0;
        const rawNet = executedMap.get(account.id) || 0;

        // For EXPENSE/ASSET: executed = debit - credit
        // For INCOME/LIABILITY: executed = credit - debit
        const executed =
          account.type === 'INCOME' || account.type === 'LIABILITY' ? -rawNet : rawNet;
        const committed = 0; // Future extension for PO commitments
        const available = budgeted - executed - committed;

        const consumptionPercentage =
          budgeted > 0 ? Number(((executed / budgeted) * 100).toFixed(1)) : executed > 0 ? 100 : 0;

        let gaugeStatus = BudgetGaugeStatus.NORMAL;
        if (consumptionPercentage >= 100) {
          gaugeStatus = BudgetGaugeStatus.OVERBUDGET;
        } else if (consumptionPercentage >= 75) {
          gaugeStatus = BudgetGaugeStatus.WARNING;
        }

        const item: BudgetControlItem = {
          accountId: account.id,
          accountName: account.name,
          budgeted,
          executed: Math.max(0, executed),
          committed,
          available,
          consumptionPercentage,
          gaugeStatus,
        };

        if (!itemsByCategory.has(account.type)) {
          itemsByCategory.set(account.type, []);
        }
        itemsByCategory.get(account.type)!.push(item);

        grandTotalBudgeted += budgeted;
        grandTotalExecuted += Math.max(0, executed);
        grandTotalCommitted += committed;
        grandTotalAvailable += available;
      }

      const categories: BudgetControlCategory[] = [];

      for (const [type, items] of itemsByCategory.entries()) {
        const catBudgeted = items.reduce((sum, i) => sum + i.budgeted, 0);
        const catExecuted = items.reduce((sum, i) => sum + i.executed, 0);
        const catCommitted = items.reduce((sum, i) => sum + i.committed, 0);
        const catAvailable = catBudgeted - catExecuted - catCommitted;

        const catConsumption =
          catBudgeted > 0
            ? Number(((catExecuted / catBudgeted) * 100).toFixed(1))
            : catExecuted > 0
              ? 100
              : 0;

        let catGauge = BudgetGaugeStatus.NORMAL;
        if (catConsumption >= 100) {
          catGauge = BudgetGaugeStatus.OVERBUDGET;
        } else if (catConsumption >= 75) {
          catGauge = BudgetGaugeStatus.WARNING;
        }

        categories.push({
          categoryName: `Categoría ${type}`,
          accountType: type,
          budgeted: catBudgeted,
          executed: catExecuted,
          committed: catCommitted,
          available: catAvailable,
          consumptionPercentage: catConsumption,
          gaugeStatus: catGauge,
          items,
        });
      }

      const overallConsumption =
        grandTotalBudgeted > 0
          ? Number(((grandTotalExecuted / grandTotalBudgeted) * 100).toFixed(1))
          : grandTotalExecuted > 0
            ? 100
            : 0;

      let overallGauge = BudgetGaugeStatus.NORMAL;
      if (overallConsumption >= 100) {
        overallGauge = BudgetGaugeStatus.OVERBUDGET;
      } else if (overallConsumption >= 75) {
        overallGauge = BudgetGaugeStatus.WARNING;
      }

      const summary: BudgetControlSummary = {
        totalBudgeted: grandTotalBudgeted,
        totalExecuted: grandTotalExecuted,
        totalCommitted: grandTotalCommitted,
        totalAvailable: grandTotalAvailable,
        overallConsumptionPercentage: overallConsumption,
        overallGaugeStatus: overallGauge,
      };

      return {
        periodId: period.id,
        periodName: period.name,
        friendlyName: period.name,
        isLocked: period.status === 'CLOSED',
        summary,
        categories,
      };
    });
  }
}
