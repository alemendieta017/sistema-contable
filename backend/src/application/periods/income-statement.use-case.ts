import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { PeriodEntity } from '../../infrastructure/database/entities/period.entity';
import { AccountEntity } from '../../infrastructure/database/entities/account.entity';
import { AccountPeriodBalanceEntity } from '../../infrastructure/database/entities/account-period-balance.entity';

@Injectable()
export class IncomeStatementUseCase {
  constructor(
    @InjectRepository(PeriodEntity)
    private readonly periodRepository: Repository<PeriodEntity>,
    @InjectRepository(AccountEntity)
    private readonly accountRepository: Repository<AccountEntity>,
    @InjectRepository(AccountPeriodBalanceEntity)
    private readonly balanceRepository: Repository<AccountPeriodBalanceEntity>,
  ) {}

  async execute(userId: string, periodId: string) {
    // 1. Fetch period and verify ownership
    const period = await this.periodRepository.findOne({
      where: {
        id: periodId,
        fiscalYear: {
          userId,
        },
      },
      relations: ['fiscalYear'],
    });

    if (!period) {
      throw new NotFoundException('Period not found');
    }

    // 2. Fetch all active INCOME and EXPENSE accounts for the user
    const accounts = await this.accountRepository.find({
      where: {
        userId,
        status: 'ACTIVE',
        type: In(['INCOME', 'EXPENSE']),
      },
    });

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

    const income: { accountId: string; name: string; amount: number }[] = [];
    const expenses: { accountId: string; name: string; amount: number }[] = [];

    // 4. Map accounts to their category lists and compute amounts
    for (const account of accounts) {
      const bal = balanceMap.get(account.id) ?? { totalDebits: 0, totalCredits: 0 };
      let amount = 0;

      if (account.type === 'INCOME') {
        amount = bal.totalCredits - bal.totalDebits;
        income.push({
          accountId: account.id,
          name: account.name,
          amount,
        });
      } else if (account.type === 'EXPENSE') {
        amount = bal.totalDebits - bal.totalCredits;
        expenses.push({
          accountId: account.id,
          name: account.name,
          amount,
        });
      }
    }

    // Sort by name
    income.sort((a, b) => a.name.localeCompare(b.name));
    expenses.sort((a, b) => a.name.localeCompare(b.name));

    // 5. Calculate totals
    const totalIncome = income.reduce((sum, item) => sum + item.amount, 0);
    const totalExpenses = expenses.reduce((sum, item) => sum + item.amount, 0);
    const netProfit = totalIncome - totalExpenses;

    return {
      period: period.name,
      income,
      expenses,
      totalIncome,
      totalExpenses,
      netProfit,
    };
  }
}
