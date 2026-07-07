import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FiscalYearEntity } from '../../infrastructure/database/entities/fiscal-year.entity';
import { AccountPeriodBalanceEntity } from '../../infrastructure/database/entities/account-period-balance.entity';
import { BudgetEntity } from '../../infrastructure/database/entities/budget.entity';

@Injectable()
export class CashFlowStatementForecastUseCase {
  constructor(
    @InjectRepository(FiscalYearEntity)
    private readonly fiscalYearRepository: Repository<FiscalYearEntity>,
    @InjectRepository(AccountPeriodBalanceEntity)
    private readonly balanceRepository: Repository<AccountPeriodBalanceEntity>,
    @InjectRepository(BudgetEntity)
    private readonly budgetRepository: Repository<BudgetEntity>,
  ) {}

  async execute(userId: string, fiscalYearId: string, currentDate?: Date) {
    const fiscalYear = await this.fiscalYearRepository.findOne({
      where: { id: fiscalYearId, userId },
      relations: ['periods'],
    });

    if (!fiscalYear) {
      throw new NotFoundException('Fiscal year not found');
    }

    const periods = [...fiscalYear.periods].sort((a, b) =>
      a.startDate.localeCompare(b.startDate),
    );

    const now = currentDate || new Date();
    const year = now.getFullYear();
    const monthStr = String(now.getMonth() + 1).padStart(2, '0');
    const dayStr = String(now.getDate()).padStart(2, '0');
    const todayStr = `${year}-${monthStr}-${dayStr}`;

    const months = [];
    let runningCash = 0;

    for (let i = 0; i < periods.length; i++) {
      const period = periods[i];
      const isReal = period.status === 'CLOSED' || period.startDate < todayStr;

      let initialCash = 0;
      let netFlow = 0;

      if (i === 0) {
        // For the first month of the fiscal year, get the sum of opening balances of cash or bank accounts
        const firstBalances = await this.balanceRepository.find({
          where: {
            periodId: period.id,
            account: { isCashOrBank: true },
          },
          relations: ['account'],
        });

        initialCash = firstBalances.reduce(
          (sum, bal) => sum + Number(bal.openingBalance || 0),
          0,
        );
      } else {
        initialCash = runningCash;
      }

      if (isReal) {
        const balances = await this.balanceRepository.find({
          where: {
            periodId: period.id,
            account: { isCashOrBank: true },
          },
          relations: ['account'],
        });

        for (const bal of balances) {
          const debits = Number(bal.totalDebits || 0);
          const credits = Number(bal.totalCredits || 0);
          netFlow += debits - credits;
        }
      } else {
        const budget = await this.budgetRepository.findOne({
          where: { periodId: period.id, userId },
          relations: ['items', 'items.account'],
        });

        let budgetedIncome = 0;
        let budgetedExpense = 0;
        let budgetedAsset = 0;
        let budgetedLiability = 0;

        if (budget && budget.items) {
          for (const item of budget.items) {
            if (!item.account) continue;
            const amount = Number(item.amount || 0);

            if (item.account.type === 'INCOME') {
              budgetedIncome += amount;
            } else if (item.account.type === 'EXPENSE') {
              budgetedExpense += amount;
            } else if (item.account.type === 'ASSET') {
              budgetedAsset += amount;
            } else if (item.account.type === 'LIABILITY') {
              budgetedLiability += amount;
            }
          }
        }

        netFlow = budgetedIncome - budgetedExpense + budgetedAsset + budgetedLiability;
      }

      const finalCash = initialCash + netFlow;
      runningCash = finalCash;

      months.push({
        periodId: period.id,
        periodName: period.name,
        status: period.status,
        initialCash,
        netFlow,
        finalCash,
        isReal,
      });
    }

    return {
      fiscalYearName: fiscalYear.name,
      months,
    };
  }
}
