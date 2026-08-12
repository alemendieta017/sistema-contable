import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { FiscalYearEntity } from '../../infrastructure/database/entities/fiscal-year.entity';
import { BudgetEntity } from '../../infrastructure/database/entities/budget.entity';
import { BudgetItemEntity } from '../../infrastructure/database/entities/budget-item.entity';
import { JournalEntryEntity } from '../../infrastructure/database/entities/journal-entry.entity';
import { IBudgetDriverApplyParams } from '../../domain/budgets/budget.model';

@Injectable()
export class ApplyBudgetDriverUseCase {
  constructor(private readonly dataSource: DataSource) {}

  private shiftYear(dateStr: string, years = -1): string {
    const d = new Date(dateStr + 'T00:00:00Z');
    d.setUTCFullYear(d.getUTCFullYear() + years);
    return d.toISOString().substring(0, 10);
  }

  async execute(
    userId: string,
    params: IBudgetDriverApplyParams,
  ): Promise<{ success: boolean; accountId: string; monthlyAmounts: Record<string, number> }> {
    const { fiscalYearId, accountId, driverType, annualTotal, growthPercentage, sourcePeriodId } =
      params;

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
      const openPeriods = periods.filter((p) => p.status !== 'CLOSED');

      if (openPeriods.length === 0) {
        throw new BadRequestException(
          'No open periods available in fiscal year for driver application.',
        );
      }

      const monthlyAmounts: Record<string, number> = {};

      if (driverType === 'FLAT_PRORATE') {
        const total = annualTotal ?? 0;
        const perPeriod = Math.floor((total / openPeriods.length) * 100) / 100;
        const remainder = Number((total - perPeriod * openPeriods.length).toFixed(2));

        for (let i = 0; i < openPeriods.length; i++) {
          const p = openPeriods[i];
          const val =
            i === openPeriods.length - 1 ? Number((perPeriod + remainder).toFixed(2)) : perPeriod;
          monthlyAmounts[p.id] = Math.max(0, val);
        }
      } else if (driverType === 'FORWARD_FILL') {
        if (!sourcePeriodId) {
          throw new BadRequestException('Source period ID is required for FORWARD_FILL driver.');
        }

        const sourceBudget = await manager.findOne(BudgetEntity, {
          where: { userId, periodId: sourcePeriodId },
          relations: ['items'],
        });

        const sourceItem = (sourceBudget?.items || []).find((it) => it.accountId === accountId);
        const fillAmount = sourceItem ? Number(sourceItem.amount) : 0;

        const sourceIdx = periods.findIndex((p) => p.id === sourcePeriodId);
        const targetPeriods = sourceIdx >= 0 ? periods.slice(sourceIdx) : periods;

        for (const p of targetPeriods) {
          if (p.status !== 'CLOSED') {
            monthlyAmounts[p.id] = fillAmount;
          }
        }
      } else if (driverType === 'PERCENTAGE_GROWTH') {
        if (!sourcePeriodId) {
          throw new BadRequestException(
            'Source period ID is required for PERCENTAGE_GROWTH driver.',
          );
        }

        const growthRate = (growthPercentage || 0) / 100;

        const sourceBudget = await manager.findOne(BudgetEntity, {
          where: { userId, periodId: sourcePeriodId },
          relations: ['items'],
        });

        const sourceItem = (sourceBudget?.items || []).find((it) => it.accountId === accountId);
        const baseAmount = sourceItem ? Number(sourceItem.amount) : 0;

        const sourceIdx = periods.findIndex((p) => p.id === sourcePeriodId);
        const targetPeriods = sourceIdx >= 0 ? periods.slice(sourceIdx) : periods;

        let currentVal = baseAmount;
        for (let i = 0; i < targetPeriods.length; i++) {
          const p = targetPeriods[i];
          if (p.status !== 'CLOSED') {
            monthlyAmounts[p.id] = Number(currentVal.toFixed(2));
          }
          currentVal = currentVal * (1 + growthRate);
        }
      } else if (driverType === 'WEIGHTED_HISTORICAL' || driverType === 'PRIOR_YEAR_ACTUAL') {
        const priorYearStart = this.shiftYear(fiscalYear.startDate, -1);
        const priorYearEnd = this.shiftYear(fiscalYear.endDate, -1);

        const priorEntries = await manager
          .createQueryBuilder(JournalEntryEntity, 'entry')
          .innerJoinAndSelect('entry.transaction', 'tx')
          .where('entry.account_id = :accountId', { accountId })
          .andWhere('tx.accounting_date >= :startDate AND tx.accounting_date <= :endDate', {
            startDate: priorYearStart,
            endDate: priorYearEnd,
          })
          .getMany();

        const periodActuals: Record<string, number> = {};
        let totalPriorActual = 0;

        for (let i = 0; i < periods.length; i++) {
          const p = periods[i];
          const pPriorStart = this.shiftYear(p.startDate, -1);
          const pPriorEnd = this.shiftYear(p.endDate, -1);

          const matchingEntries = priorEntries.filter((entry) => {
            const txDate = entry.transaction?.accountingDate;
            return txDate && txDate >= pPriorStart && txDate <= pPriorEnd;
          });

          let net = 0;
          for (const entry of matchingEntries) {
            const amt = entry.entryType === 'DEBIT' ? Number(entry.amount) : -Number(entry.amount);
            net += amt;
          }

          periodActuals[p.id] = net;
          totalPriorActual += net;
        }

        if (driverType === 'WEIGHTED_HISTORICAL') {
          const targetTotal = annualTotal ?? 0;
          for (let i = 0; i < openPeriods.length; i++) {
            const p = openPeriods[i];
            const weight =
              totalPriorActual > 0
                ? (periodActuals[p.id] || 0) / totalPriorActual
                : 1 / openPeriods.length;
            monthlyAmounts[p.id] = Number((targetTotal * weight).toFixed(2));
          }
        } else {
          // PRIOR_YEAR_ACTUAL
          const mult = 1 + (growthPercentage || 0) / 100;
          for (let i = 0; i < openPeriods.length; i++) {
            const p = openPeriods[i];
            const actualVal = Math.max(0, periodActuals[p.id] || 0);
            monthlyAmounts[p.id] = Number((actualVal * mult).toFixed(2));
          }
        }
      }

      // Persist monthly amounts to database
      for (const [periodId, amount] of Object.entries(monthlyAmounts)) {
        let budget = await manager.findOne(BudgetEntity, {
          where: { userId, periodId },
          relations: ['items'],
        });

        if (!budget) {
          const periodObj = periods.find((p) => p.id === periodId);
          budget = manager.create(BudgetEntity, {
            userId,
            periodId,
            name: periodObj?.name || 'Presupuesto',
            items: [],
          });
          budget = await manager.save(BudgetEntity, budget);
        }

        let item = (budget.items || []).find((it) => it.accountId === accountId);
        if (item) {
          item.amount = amount;
        } else {
          item = manager.create(BudgetItemEntity, {
            budgetId: budget.id,
            accountId,
            amount,
          });
        }
        await manager.save(BudgetItemEntity, item);
      }

      return {
        success: true,
        accountId,
        monthlyAmounts,
      };
    });
  }
}
