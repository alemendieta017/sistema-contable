import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { PeriodEntity } from '../../infrastructure/database/entities/period.entity';
import { BudgetEntity } from '../../infrastructure/database/entities/budget.entity';
import { JournalEntryEntity } from '../../infrastructure/database/entities/journal-entry.entity';
import { AccountEntity } from '../../infrastructure/database/entities/account.entity';
import { AccountPeriodBalanceEntity } from '../../infrastructure/database/entities/account-period-balance.entity';

@Injectable()
export class GetBudgetExecutionUseCase {
  constructor(
    @InjectRepository(BudgetEntity)
    private readonly budgetRepository: Repository<BudgetEntity>,
    @InjectRepository(JournalEntryEntity)
    private readonly journalEntryRepository: Repository<JournalEntryEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async execute(userId: string, periodId: string) {
    return this.dataSource.transaction(async (entityManager) => {
      // 1. Fetch period details
      const period = await entityManager.findOne(PeriodEntity, {
        where: { id: periodId },
        relations: ['fiscalYear'],
      });

      if (!period) {
        throw new NotFoundException(`Period with ID ${periodId} not found`);
      }

      if (period.fiscalYear.userId !== userId) {
        throw new NotFoundException(`Period with ID ${periodId} not found`);
      }

      // 2. Fetch budget metadata & items
      const budget = await entityManager.findOne(BudgetEntity, {
        where: { periodId, userId },
        relations: ['items', 'items.account'],
      });

      if (!budget) {
        throw new NotFoundException(`Budget not found for period ID ${periodId}`);
      }

      // 3. Query real sums for the period
      const rawSums = await entityManager
        .createQueryBuilder(JournalEntryEntity, 'entry')
        .select('entry.accountId', 'accountId')
        .addSelect('entry.entryType', 'entryType')
        .addSelect('SUM(entry.amountBase)', 'sum')
        .innerJoin('entry.transaction', 'tx')
        .where('tx.userId = :userId', { userId })
        .andWhere('tx.status = :status', { status: 'POSTED' })
        .andWhere('tx.accountingDate >= :startDate', { startDate: period.startDate })
        .andWhere('tx.accountingDate <= :endDate', { endDate: period.endDate })
        .groupBy('entry.accountId')
        .addGroupBy('entry.entryType')
        .getRawMany();

      const sumMap: Record<string, { DEBIT: number; CREDIT: number }> = {};
      for (const row of rawSums) {
        const accId = row.accountId;
        const entryType = row.entryType as 'DEBIT' | 'CREDIT';
        const sum = Number(row.sum || 0);

        if (!sumMap[accId]) {
          sumMap[accId] = { DEBIT: 0, CREDIT: 0 };
        }
        sumMap[accId][entryType] = sum;
      }

      // 4. Load all user accounts
      const accounts = await entityManager.find(AccountEntity, {
        where: { userId },
      });

      // Map budget items to Map for quick lookup
      const budgetItemMap = new Map<string, number>();
      if (budget.items) {
        for (const item of budget.items) {
          budgetItemMap.set(item.accountId, Number(item.amount || 0));
        }
      }

      // Filter eligible accounts: exclude EQUITY, and cash/bank from main sections.
      // Must be ACTIVE or have budgeted amount or transaction entries in the period.
      const eligibleAccounts = accounts.filter((acc) => {
        if (acc.type === 'EQUITY') {
          return false;
        }

        if (acc.type === 'ASSET' && acc.isCashOrBank) {
          return false;
        }

        const hasBudget = budgetItemMap.has(acc.id);
        const hasReal = sumMap[acc.id] !== undefined;

        return acc.status === 'ACTIVE' || hasBudget || hasReal;
      });

      // 5. Query Saldo de Caja Inicial Real (Sum of opening balances of cash/bank accounts)
      const cashBalances = await entityManager.find(AccountPeriodBalanceEntity, {
        where: {
          periodId,
          account: {
            isCashOrBank: true,
            userId,
          },
        },
        relations: ['account'],
      });
      const initialCash = cashBalances.reduce(
        (sum, item) => sum + Number(item.openingBalance || 0),
        0,
      );

      // Helper function to format numbers to 2 decimals
      const formatAmount = (val: number): number => {
        const rounded = parseFloat(Number(val).toFixed(2));
        return Object.is(rounded, -0) ? 0 : rounded;
      };

      const income: any[] = [];
      const expense: any[] = [];
      const savings: any[] = [];
      const debt: any[] = [];

      for (const acc of eligibleAccounts) {
        const sums = sumMap[acc.id] || { DEBIT: 0, CREDIT: 0 };
        const budgeted = budgetItemMap.get(acc.id) || 0;

        if (acc.type === 'INCOME') {
          const real = sums.CREDIT - sums.DEBIT;
          const deviation = real - budgeted;
          income.push({
            accountId: acc.id,
            accountName: acc.name,
            budgeted: formatAmount(budgeted),
            real: formatAmount(real),
            deviation: formatAmount(deviation),
            isNegativeDeviation: formatAmount(real) < formatAmount(budgeted),
          });
        } else if (acc.type === 'EXPENSE') {
          const real = sums.DEBIT - sums.CREDIT;
          const available = budgeted - real;
          expense.push({
            accountId: acc.id,
            accountName: acc.name,
            budgeted: formatAmount(budgeted),
            real: formatAmount(real),
            available: formatAmount(available),
            isNegativeDeviation: formatAmount(real) > formatAmount(budgeted),
          });
        } else if (acc.type === 'ASSET') {
          const real = sums.CREDIT - sums.DEBIT;
          const deviation = real - budgeted;
          savings.push({
            accountId: acc.id,
            accountName: acc.name,
            budgeted: formatAmount(budgeted),
            real: formatAmount(real),
            deviation: formatAmount(deviation),
            isNegativeDeviation: formatAmount(deviation) < 0,
          });
        } else if (acc.type === 'LIABILITY') {
          const real = sums.CREDIT - sums.DEBIT;
          const deviation = real - budgeted;
          debt.push({
            accountId: acc.id,
            accountName: acc.name,
            budgeted: formatAmount(budgeted),
            real: formatAmount(real),
            deviation: formatAmount(deviation),
            isNegativeDeviation: formatAmount(deviation) < 0,
          });
        }
      }

      // Sort alphabetically by accountName
      income.sort((a, b) => a.accountName.localeCompare(b.accountName));
      expense.sort((a, b) => a.accountName.localeCompare(b.accountName));
      savings.sort((a, b) => a.accountName.localeCompare(b.accountName));
      debt.sort((a, b) => a.accountName.localeCompare(b.accountName));

      // Calculate totals
      const totalBudgetedIncome = formatAmount(income.reduce((sum, x) => sum + x.budgeted, 0));
      const totalRealIncome = formatAmount(income.reduce((sum, x) => sum + x.real, 0));
      const totalBudgetedExpense = formatAmount(expense.reduce((sum, x) => sum + x.budgeted, 0));
      const totalRealExpense = formatAmount(expense.reduce((sum, x) => sum + x.real, 0));

      const totalBudgetedSavings = savings.reduce((sum, x) => sum + x.budgeted, 0);
      const totalRealSavings = savings.reduce((sum, x) => sum + x.real, 0);
      const totalBudgetedDebt = debt.reduce((sum, x) => sum + x.budgeted, 0);
      const totalRealDebt = debt.reduce((sum, x) => sum + x.real, 0);

      const budgetedNetFinancial = formatAmount(totalBudgetedSavings + totalBudgetedDebt);
      const realNetFinancial = formatAmount(totalRealSavings + totalRealDebt);

      const budgetedNetConsumos = formatAmount(totalBudgetedIncome - totalBudgetedExpense);
      const realNetConsumos = formatAmount(totalRealIncome - totalRealExpense);

      const budgetedNetFlow = formatAmount(budgetedNetConsumos + budgetedNetFinancial);
      const realNetFlow = formatAmount(realNetConsumos + realNetFinancial);

      const projectedFinalCash = formatAmount(initialCash + budgetedNetFlow);
      const realFinalCash = formatAmount(initialCash + realNetFlow);

      return {
        periodName: period.name,
        friendlyName: budget.name || period.name,
        startDate: period.startDate,
        endDate: period.endDate,
        consumos: {
          income,
          expense,
          totalBudgetedIncome,
          totalRealIncome,
          totalBudgetedExpense,
          totalRealExpense,
        },
        ahorrosInversiones: savings,
        deudasTarjetas: debt,
        resumenLiquidez: {
          saldoCajaInicialReal: formatAmount(initialCash),
          flujoNetoConsumos: {
            budgeted: budgetedNetConsumos,
            real: realNetConsumos,
          },
          flujoNetoFinanciero: {
            budgeted: budgetedNetFinancial,
            real: realNetFinancial,
          },
          flujoCajaNetoMes: {
            budgeted: budgetedNetFlow,
            real: realNetFlow,
          },
          saldoCajaFinal: {
            projected: projectedFinalCash,
            real: realFinalCash,
          },
        },
      };
    });
  }
}
