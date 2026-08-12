import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { FiscalYearEntity } from '../../infrastructure/database/entities/fiscal-year.entity';
import { AccountEntity } from '../../infrastructure/database/entities/account.entity';
import { BudgetEntity } from '../../infrastructure/database/entities/budget.entity';
import {
  BudgetMatrixResponse,
  BudgetMatrixPeriod,
  BudgetMatrixRow,
} from '@sistema-contable/shared';

@Injectable()
export class GetBudgetMatrixUseCase {
  constructor(private readonly dataSource: DataSource) {}

  async execute(
    userId: string,
    fiscalYearId: string,
    categoryId?: string,
  ): Promise<BudgetMatrixResponse> {
    return this.dataSource.transaction(async (manager) => {
      const fiscalYear = await manager.findOne(FiscalYearEntity, {
        where: { id: fiscalYearId },
        relations: ['periods'],
      });

      if (!fiscalYear) {
        throw new NotFoundException(`Fiscal year with ID '${fiscalYearId}' not found.`);
      }

      // Sort periods chronologically
      const periodsList = (fiscalYear.periods || []).sort((a, b) =>
        a.startDate.localeCompare(b.startDate),
      );

      const periodIds = periodsList.map((p) => p.id);

      const formattedPeriods: BudgetMatrixPeriod[] = periodsList.map((p) => ({
        id: p.id,
        name: p.name,
        friendlyName: p.name,
        status: p.status,
      }));

      // Fetch accounts (excluding EQUITY and cash/bank liquid asset accounts)
      const accountsQuery = manager
        .createQueryBuilder(AccountEntity, 'account')
        .where('account.user_id = :userId', { userId })
        .andWhere('account.status = :activeStatus', { activeStatus: 'ACTIVE' })
        .andWhere('account.type != :equityType', { equityType: 'EQUITY' })
        .andWhere('account.is_cash_or_bank = :isCash', { isCash: false });

      if (categoryId) {
        accountsQuery.andWhere('account.type = :categoryId', { categoryId });
      }

      const accounts = await accountsQuery.orderBy('account.name', 'ASC').getMany();

      // Fetch existing budgets for these periods
      let budgets: BudgetEntity[] = [];
      if (periodIds.length > 0) {
        budgets = await manager
          .createQueryBuilder(BudgetEntity, 'budget')
          .leftJoinAndSelect('budget.items', 'items')
          .where('budget.user_id = :userId', { userId })
          .andWhere('budget.period_id IN (:...periodIds)', { periodIds })
          .getMany();
      }

      // Map (periodId, accountId) -> amount & flowIntention
      const amountMap = new Map<string, number>();
      const flowIntentionMap = new Map<string, any>();
      for (const budget of budgets) {
        if (budget.items) {
          for (const item of budget.items) {
            amountMap.set(`${budget.periodId}_${item.accountId}`, Number(item.amount));
            if (item.flowIntention) {
              flowIntentionMap.set(`${budget.periodId}_${item.accountId}`, item.flowIntention);
            }
          }
        }
      }

      const rows: BudgetMatrixRow[] = [];
      const categoryTotals: Record<string, Record<string, number> & { total: number }> = {};

      for (const account of accounts) {
        const amounts: Record<string, number> = {};
        const flowIntentions: Record<string, any> = {};
        let rowTotal = 0;

        for (const period of formattedPeriods) {
          const val = amountMap.get(`${period.id}_${account.id}`) || 0;
          const intention = flowIntentionMap.get(`${period.id}_${account.id}`) || null;
          amounts[period.id] = val;
          flowIntentions[period.id] = intention;
          rowTotal += val;

          // Initialize category totals structure
          if (!categoryTotals[account.type]) {
            categoryTotals[account.type] = { total: 0 };
          }
          if (!categoryTotals[account.type][period.id]) {
            categoryTotals[account.type][period.id] = 0;
          }
          categoryTotals[account.type][period.id] += val;
          categoryTotals[account.type].total += val;
        }

        rows.push({
          accountId: account.id,
          accountCode: account.name.substring(0, 10),
          accountName: account.name,
          accountType: account.type,
          parentId: account.parentId || null,
          amounts,
          flowIntentions,
          rowTotal,
        });
      }

      return {
        fiscalYearId: fiscalYear.id,
        fiscalYearName: fiscalYear.name,
        periods: formattedPeriods,
        rows,
        categoryTotals,
      };
    });
  }
}
