import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { FiscalYearEntity } from '../../infrastructure/database/entities/fiscal-year.entity';
import { AccountEntity } from '../../infrastructure/database/entities/account.entity';
import { JournalEntryEntity } from '../../infrastructure/database/entities/journal-entry.entity';
import { BudgetEntity } from '../../infrastructure/database/entities/budget.entity';
import { BudgetItemEntity } from '../../infrastructure/database/entities/budget-item.entity';

@Injectable()
export class GetPriorYearActualsUseCase {
  constructor(private readonly dataSource: DataSource) {}

  private shiftYear(dateStr: string, years = -1): string {
    const d = new Date(dateStr + 'T00:00:00Z');
    d.setUTCFullYear(d.getUTCFullYear() + years);
    return d.toISOString().substring(0, 10);
  }

  async execute(
    userId: string,
    params: { fiscalYearId: string; adjustmentPercentage?: number; accountIds?: string[] },
  ): Promise<{
    success: boolean;
    matrix: Array<{ accountId: string; amounts: Record<string, number> }>;
  }> {
    const { fiscalYearId, adjustmentPercentage = 0, accountIds } = params;

    return this.dataSource.transaction(async (manager) => {
      const fiscalYear = await manager.findOne(FiscalYearEntity, {
        where: { id: fiscalYearId },
        relations: ['periods'],
      });

      if (!fiscalYear) {
        throw new NotFoundException(`Fiscal year with ID '${fiscalYearId}' not found.`);
      }

      const periods = (fiscalYear.periods || []).sort((a, b) =>
        a.startDate.localeCompare(b.startDate),
      );
      const priorYearStart = this.shiftYear(fiscalYear.startDate, -1);
      const priorYearEnd = this.shiftYear(fiscalYear.endDate, -1);

      // Query target accounts
      const accountsQuery = manager
        .createQueryBuilder(AccountEntity, 'account')
        .where('account.user_id = :userId', { userId })
        .andWhere('account.status = :activeStatus', { activeStatus: 'ACTIVE' })
        .andWhere('account.type != :equityType', { equityType: 'EQUITY' })
        .andWhere('account.is_cash_or_bank = :isCash', { isCash: false });

      if (accountIds && accountIds.length > 0) {
        accountsQuery.andWhere('account.id IN (:...accountIds)', { accountIds });
      }

      const accounts = await accountsQuery.getMany();

      const multiplier = 1 + adjustmentPercentage / 100;
      const matrixResult: Array<{ accountId: string; amounts: Record<string, number> }> = [];

      for (const account of accounts) {
        // Query journal entries for this account in prior year date range
        const entries = await manager
          .createQueryBuilder(JournalEntryEntity, 'entry')
          .innerJoinAndSelect('entry.transaction', 'tx')
          .where('entry.account_id = :accountId', { accountId: account.id })
          .andWhere('tx.accounting_date >= :startDate AND tx.accounting_date <= :endDate', {
            startDate: priorYearStart,
            endDate: priorYearEnd,
          })
          .getMany();

        const amounts: Record<string, number> = {};

        for (let i = 0; i < periods.length; i++) {
          const p = periods[i];
          const pPriorStart = this.shiftYear(p.startDate, -1);
          const pPriorEnd = this.shiftYear(p.endDate, -1);

          const periodEntries = entries.filter((entry) => {
            const txDate = entry.transaction?.accountingDate;
            return txDate && txDate >= pPriorStart && txDate <= pPriorEnd;
          });

          let netSum = 0;
          for (const entry of periodEntries) {
            const debit = entry.entryType === 'DEBIT' ? Number(entry.amount) : 0;
            const credit = entry.entryType === 'CREDIT' ? Number(entry.amount) : 0;
            const net = account.type === 'INCOME' ? credit - debit : debit - credit;
            netSum += net;
          }

          if (p.status !== 'CLOSED') {
            const rawActual = Math.max(0, netSum);
            const adjustedVal = Number((rawActual * multiplier).toFixed(2));
            amounts[p.id] = adjustedVal;

            // Save to database
            let budget = await manager.findOne(BudgetEntity, {
              where: { userId, periodId: p.id },
              relations: ['items'],
            });

            if (!budget) {
              budget = manager.create(BudgetEntity, {
                userId,
                periodId: p.id,
                name: p.name,
                items: [],
              });
              budget = await manager.save(BudgetEntity, budget);
            }

            let item = (budget.items || []).find((it) => it.accountId === account.id);
            if (item) {
              item.amount = adjustedVal;
            } else {
              item = manager.create(BudgetItemEntity, {
                budgetId: budget.id,
                accountId: account.id,
                amount: adjustedVal,
              });
            }
            await manager.save(BudgetItemEntity, item);
          }
        }

        matrixResult.push({
          accountId: account.id,
          amounts,
        });
      }

      return {
        success: true,
        matrix: matrixResult,
      };
    });
  }
}
