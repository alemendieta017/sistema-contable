import { Injectable, NotFoundException, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { PeriodEntity } from '../../infrastructure/database/entities/period.entity';
import { AccountEntity } from '../../infrastructure/database/entities/account.entity';
import { AccountPeriodBalanceEntity } from '../../infrastructure/database/entities/account-period-balance.entity';
import { BudgetEntity } from '../../infrastructure/database/entities/budget.entity';

@Injectable()
export class IncomeStatementUseCase {
  constructor(
    @InjectRepository(PeriodEntity)
    private readonly periodRepository: Repository<PeriodEntity>,
    @InjectRepository(AccountEntity)
    private readonly accountRepository: Repository<AccountEntity>,
    @InjectRepository(AccountPeriodBalanceEntity)
    private readonly balanceRepository: Repository<AccountPeriodBalanceEntity>,
    @Optional()
    @InjectRepository(BudgetEntity)
    private readonly budgetRepository?: Repository<BudgetEntity>,
  ) {}

  async execute(userId: string, periodId: string, mode: 'real' | 'projected' = 'real') {
    // 1. Fetch period and verify ownership
    let period = await this.periodRepository.findOne({
      where: {
        id: periodId,
        userId,
      },
    });

    if (!period && /^\d{4}-(0[1-9]|1[0-2])$/.test(periodId)) {
      period = await this.periodRepository.findOne({
        where: {
          name: periodId,
          userId,
        },
      });
    }

    if (!period) {
      throw new NotFoundException('Period not found');
    }

    // 2. Fetch all INCOME and EXPENSE accounts for the user
    const accounts = await this.accountRepository.find({
      where: {
        userId,
        type: In(['INCOME', 'EXPENSE']),
      },
    });

    const income: { accountId: string; name: string; amount: number }[] = [];
    const expenses: { accountId: string; name: string; amount: number }[] = [];

    if (mode === 'projected') {
      const budget = this.budgetRepository
        ? await this.budgetRepository.findOne({
            where: { periodId: period.id, userId },
            relations: ['items', 'items.account'],
          })
        : null;

      const budgetMap = new Map<string, number>();
      if (budget?.items) {
        for (const item of budget.items) {
          const cur = budgetMap.get(item.accountId) ?? 0;
          budgetMap.set(item.accountId, cur + Number(item.amount || 0));
        }
      }

      for (const account of accounts) {
        const amount = budgetMap.get(account.id) ?? 0;
        if (account.type === 'INCOME') {
          if (account.status === 'ACTIVE' || Math.abs(amount) >= 0.0001) {
            income.push({ accountId: account.id, name: account.name, amount });
          }
        } else if (account.type === 'EXPENSE') {
          if (account.status === 'ACTIVE' || Math.abs(amount) >= 0.0001) {
            expenses.push({ accountId: account.id, name: account.name, amount });
          }
        }
      }
    } else {
      // 3. Fetch period balances
      const balances = await this.balanceRepository.find({
        where: {
          periodId: period.id,
        },
      });

      const balanceMap = new Map<string, { totalDebits: number; totalCredits: number }>();
      for (const bal of balances) {
        balanceMap.set(bal.accountId, {
          totalDebits: Number(bal.totalDebits),
          totalCredits: Number(bal.totalCredits),
        });
      }

      // 4. Map accounts to their category lists and compute amounts
      for (const account of accounts) {
        const bal = balanceMap.get(account.id) ?? { totalDebits: 0, totalCredits: 0 };
        let amount = 0;

        if (account.type === 'INCOME') {
          amount = bal.totalCredits - bal.totalDebits;
          if (account.status === 'ACTIVE' || Math.abs(amount) >= 0.0001) {
            income.push({
              accountId: account.id,
              name: account.name,
              amount,
            });
          }
        } else if (account.type === 'EXPENSE') {
          amount = bal.totalDebits - bal.totalCredits;
          if (account.status === 'ACTIVE' || Math.abs(amount) >= 0.0001) {
            expenses.push({
              accountId: account.id,
              name: account.name,
              amount,
            });
          }
        }
      }
    }

    // Sort by name
    income.sort((a, b) => a.name.localeCompare(b.name));
    expenses.sort((a, b) => a.name.localeCompare(b.name));

    // 5. Calculate totals
    const totalIncome = Number(income.reduce((sum, item) => sum + item.amount, 0).toFixed(4));
    const totalExpenses = Number(expenses.reduce((sum, item) => sum + item.amount, 0).toFixed(4));
    const netProfit = Number((totalIncome - totalExpenses).toFixed(4));

    return {
      period: period.name,
      mode,
      income,
      expenses,
      totalIncome,
      totalExpenses,
      netProfit,
    };
  }
}
