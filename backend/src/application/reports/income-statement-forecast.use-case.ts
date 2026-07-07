import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FiscalYearEntity } from '../../infrastructure/database/entities/fiscal-year.entity';
import { AccountPeriodBalanceEntity } from '../../infrastructure/database/entities/account-period-balance.entity';
import { BudgetEntity } from '../../infrastructure/database/entities/budget.entity';

@Injectable()
export class IncomeStatementForecastUseCase {
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

    for (const period of periods) {
      const isReal = period.status === 'CLOSED' || period.startDate < todayStr;

      let income = 0;
      let expense = 0;

      if (isReal) {
        const balances = await this.balanceRepository.find({
          where: { periodId: period.id },
          relations: ['account'],
        });

        for (const bal of balances) {
          if (!bal.account) continue;
          const credits = Number(bal.totalCredits || 0);
          const debits = Number(bal.totalDebits || 0);

          if (bal.account.type === 'INCOME') {
            income += credits - debits;
          } else if (bal.account.type === 'EXPENSE') {
            expense += debits - credits;
          }
        }
      } else {
        const budget = await this.budgetRepository.findOne({
          where: { periodId: period.id, userId },
          relations: ['items', 'items.account'],
        });

        if (budget && budget.items) {
          for (const item of budget.items) {
            if (!item.account) continue;
            const amount = Number(item.amount || 0);

            if (item.account.type === 'INCOME') {
              income += amount;
            } else if (item.account.type === 'EXPENSE') {
              expense += amount;
            }
          }
        }
      }

      months.push({
        periodId: period.id,
        periodName: period.name,
        status: period.status,
        income,
        expense,
        netProfit: income - expense,
        isReal,
      });
    }

    return {
      fiscalYearName: fiscalYear.name,
      months,
    };
  }
}
