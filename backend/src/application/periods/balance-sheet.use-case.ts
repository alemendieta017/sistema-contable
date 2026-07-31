import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, DataSource } from 'typeorm';
import { PeriodEntity } from '../../infrastructure/database/entities/period.entity';
import { AccountEntity } from '../../infrastructure/database/entities/account.entity';
import { AccountPeriodBalanceEntity } from '../../infrastructure/database/entities/account-period-balance.entity';
import { JournalEntryEntity } from '../../infrastructure/database/entities/journal-entry.entity';
import { FiscalYearEntity } from '../../infrastructure/database/entities/fiscal-year.entity';

@Injectable()
export class BalanceSheetUseCase {
  constructor(
    @InjectRepository(PeriodEntity)
    private readonly periodRepository: Repository<PeriodEntity>,
    @InjectRepository(AccountEntity)
    private readonly accountRepository: Repository<AccountEntity>,
    @InjectRepository(AccountPeriodBalanceEntity)
    private readonly balanceRepository: Repository<AccountPeriodBalanceEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async execute(
    userId: string,
    options: {
      mode: 'period' | 'date' | 'comparative';
      periodId?: string;
      date?: string;
      periodIds?: string[];
      depth?: number;
    },
  ) {
    const { mode, periodId, date, periodIds } = options;
    const depth = options.depth !== undefined ? Math.max(1, Math.min(4, options.depth)) : 4;

    if (!['period', 'date', 'comparative'].includes(mode)) {
      throw new BadRequestException(`Invalid mode: ${mode}`);
    }

    if (mode === 'period') {
      if (!periodId) {
        throw new BadRequestException('periodId is required for period mode');
      }
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

      return this.calculateForPeriod(userId, period, depth);
    }

    if (mode === 'date') {
      if (!date) {
        throw new BadRequestException('date is required for date mode');
      }

      // 1. Fetch all active accounts
      const accounts = await this.accountRepository.find({
        where: {
          userId,
          status: 'ACTIVE',
        },
      });

      // 2. Sum posted journal entries <= date
      const entrySums = await this.dataSource
        .getRepository(JournalEntryEntity)
        .createQueryBuilder('entry')
        .select('entry.accountId', 'accountId')
        .addSelect('entry.entryType', 'entryType')
        .addSelect('SUM(CAST(entry.amountBase AS DECIMAL))', 'total')
        .innerJoin('entry.transaction', 'transaction')
        .where('transaction.userId = :userId', { userId })
        .andWhere('transaction.status = :status', { status: 'POSTED' })
        .andWhere('transaction.accountingDate <= :date', { date })
        .groupBy('entry.accountId')
        .addGroupBy('entry.entryType')
        .getRawMany();

      const debitsMap = new Map<string, number>();
      const creditsMap = new Map<string, number>();

      for (const row of entrySums) {
        const amount = Number(row.total);
        if (row.entryType === 'DEBIT') {
          debitsMap.set(row.accountId, amount);
        } else {
          creditsMap.set(row.accountId, amount);
        }
      }

      const balanceMap = new Map<string, number>();
      for (const account of accounts) {
        const debits = debitsMap.get(account.id) ?? 0;
        const credits = creditsMap.get(account.id) ?? 0;
        const isDebitNature = account.type === 'ASSET' || account.type === 'EXPENSE';
        const balance = isDebitNature ? debits - credits : credits - debits;
        balanceMap.set(account.id, balance);
      }

      // 3. Apply depth collapse to ASSET, LIABILITY, EQUITY
      const collapsed = this.applyDepthCollapse(accounts, balanceMap, depth);

      // 4. Calculate virtual Net Income for the current fiscal year up to date
      const fiscalYear = await this.dataSource
        .getRepository(FiscalYearEntity)
        .createQueryBuilder('fy')
        .where('fy.userId = :userId', { userId })
        .andWhere('fy.startDate <= :date', { date })
        .andWhere('fy.endDate >= :date', { date })
        .getOne();

      let cumulativeNetIncome = 0;
      if (fiscalYear) {
        const tempEntrySums = await this.dataSource
          .getRepository(JournalEntryEntity)
          .createQueryBuilder('entry')
          .select('entry.entryType', 'entryType')
          .addSelect('SUM(CAST(entry.amountBase AS DECIMAL))', 'total')
          .innerJoin('entry.transaction', 'transaction')
          .innerJoin('entry.account', 'account')
          .where('transaction.userId = :userId', { userId })
          .andWhere('transaction.status = :status', { status: 'POSTED' })
          .andWhere('transaction.accountingDate >= :startDate', { startDate: fiscalYear.startDate })
          .andWhere('transaction.accountingDate <= :endDate', { endDate: date })
          .andWhere('account.type IN (:...types)', { types: ['INCOME', 'EXPENSE'] })
          .andWhere('account.status = :statusActive', { statusActive: 'ACTIVE' })
          .groupBy('entry.entryType')
          .getRawMany();

        let tempDebits = 0;
        let tempCredits = 0;
        for (const row of tempEntrySums) {
          const amount = Number(row.total);
          if (row.entryType === 'DEBIT') {
            tempDebits += amount;
          } else {
            tempCredits += amount;
          }
        }
        cumulativeNetIncome = tempCredits - tempDebits;
      }

      // Calculate priorNetIncome (Resultados Acumulados)
      const priorBoundaryDate = fiscalYear ? fiscalYear.startDate : null;

      const priorQuery = this.dataSource
        .getRepository(JournalEntryEntity)
        .createQueryBuilder('entry')
        .select('entry.entryType', 'entryType')
        .addSelect('SUM(CAST(entry.amountBase AS DECIMAL))', 'total')
        .innerJoin('entry.transaction', 'transaction')
        .innerJoin('entry.account', 'account')
        .where('transaction.userId = :userId', { userId })
        .andWhere('transaction.status = :status', { status: 'POSTED' })
        .andWhere('account.type IN (:...types)', { types: ['INCOME', 'EXPENSE'] })
        .andWhere('account.status = :statusActive', { statusActive: 'ACTIVE' });

      if (priorBoundaryDate) {
        priorQuery.andWhere('transaction.accountingDate < :boundaryDate', {
          boundaryDate: priorBoundaryDate,
        });
      } else {
        priorQuery.andWhere('transaction.accountingDate <= :boundaryDate', { boundaryDate: date });
      }

      const priorEntrySums = await priorQuery.groupBy('entry.entryType').getRawMany();

      let priorDebits = 0;
      let priorCredits = 0;
      for (const row of priorEntrySums) {
        const amount = Number(row.total);
        if (row.entryType === 'DEBIT') {
          priorDebits += amount;
        } else {
          priorCredits += amount;
        }
      }
      const priorNetIncome = priorCredits - priorDebits;
      const priorNetIncomeFixed = Number(priorNetIncome.toFixed(4));

      if (priorNetIncomeFixed !== 0) {
        collapsed.equity.push({
          accountId: 'virtual-accumulated-results',
          name: 'Resultados Acumulados',
          balance: priorNetIncomeFixed,
        });
      }

      // Append virtual Net Income
      collapsed.equity.push({
        accountId: 'virtual-net-income',
        name: 'Resultado del Ejercicio',
        balance: Number(cumulativeNetIncome.toFixed(4)),
      });

      // Sort equity by name
      collapsed.equity.sort((a, b) => a.name.localeCompare(b.name));

      // 5. Calculate totals
      const totalAssets = collapsed.assets.reduce((sum, item) => sum + item.balance, 0);
      const totalLiabilities = collapsed.liabilities.reduce((sum, item) => sum + item.balance, 0);
      const totalEquity = collapsed.equity.reduce((sum, item) => sum + item.balance, 0);

      const balanced = Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.0001;

      return {
        date,
        assets: collapsed.assets,
        liabilities: collapsed.liabilities,
        equity: collapsed.equity,
        totalAssets,
        totalLiabilities,
        totalEquity,
        balanced,
      };
    }

    if (mode === 'comparative') {
      if (!periodIds || periodIds.length === 0) {
        throw new BadRequestException('periodIds must be a non-empty array');
      }

      const periods = await this.periodRepository.find({
        where: {
          id: In(periodIds),
          fiscalYear: {
            userId,
          },
        },
        relations: ['fiscalYear'],
      });

      if (periods.length !== periodIds.length) {
        throw new NotFoundException('One or more periods not found');
      }

      // Sort chronologically
      periods.sort((a, b) => a.startDate.localeCompare(b.startDate));

      const periodResults = await Promise.all(
        periods.map((p) => this.calculateForPeriod(userId, p, depth)),
      );

      const mergeCategory = (key: 'assets' | 'liabilities' | 'equity') => {
        const accountMap = new Map<string, { accountId: string; name: string }>();
        for (const res of periodResults) {
          for (const item of res[key]) {
            accountMap.set(item.accountId, { accountId: item.accountId, name: item.name });
          }
        }

        const mergedAccounts = Array.from(accountMap.values());
        mergedAccounts.sort((a, b) => a.name.localeCompare(b.name));

        return mergedAccounts.map((acc) => {
          const balances = periodResults.map((res) => {
            const found = res[key].find((item) => item.accountId === acc.accountId);
            return found ? found.balance : 0.0;
          });
          return {
            accountId: acc.accountId,
            name: acc.name,
            balances,
          };
        });
      };

      const mergedAssets = mergeCategory('assets');
      const mergedLiabilities = mergeCategory('liabilities');
      const mergedEquity = mergeCategory('equity');

      return {
        periods: periods.map((p) => p.name),
        assets: mergedAssets,
        liabilities: mergedLiabilities,
        equity: mergedEquity,
        totalAssets: periodResults.map((r) => r.totalAssets),
        totalLiabilities: periodResults.map((r) => r.totalLiabilities),
        totalEquity: periodResults.map((r) => r.totalEquity),
        balanced: periodResults.map((r) => r.balanced),
      };
    }
  }

  private async calculateForPeriod(userId: string, period: PeriodEntity, targetDepth: number) {
    // 1. Fetch all active accounts
    const accounts = await this.accountRepository.find({
      where: {
        userId,
        status: 'ACTIVE',
      },
    });

    // 2. Fetch balances for this period
    const balances = await this.balanceRepository.find({
      where: {
        periodId: period.id,
      },
    });

    const balanceMap = new Map<string, number>();
    for (const bal of balances) {
      balanceMap.set(bal.accountId, Number(bal.closingBalance));
    }

    // 3. Apply depth collapse to ASSET, LIABILITY, EQUITY
    const collapsed = this.applyDepthCollapse(accounts, balanceMap, targetDepth);

    // 4. Compute virtual Net Income
    const tempAccounts = accounts.filter((a) => a.type === 'INCOME' || a.type === 'EXPENSE');
    const tempAccountIds = tempAccounts.map((a) => a.id);
    const tempBalances =
      tempAccountIds.length > 0
        ? await this.balanceRepository.find({
            where: {
              periodId: period.id,
              accountId: In(tempAccountIds),
            },
          })
        : [];

    const tempBalanceMap = new Map<string, number>();
    for (const bal of tempBalances) {
      tempBalanceMap.set(bal.accountId, Number(bal.closingBalance));
    }

    let totalIncome = 0;
    let totalExpense = 0;
    for (const acc of tempAccounts) {
      const bal = tempBalanceMap.get(acc.id) ?? 0.0;
      if (acc.type === 'INCOME') {
        totalIncome += bal;
      } else if (acc.type === 'EXPENSE') {
        totalExpense += bal;
      }
    }
    const netIncome = Number((totalIncome - totalExpense).toFixed(4));

    // Calculate priorNetIncome (Resultados Acumulados)
    const priorBoundaryDate = period.fiscalYear?.startDate;
    let priorNetIncome = 0;

    if (priorBoundaryDate) {
      const priorEntrySums = await this.dataSource
        .getRepository(JournalEntryEntity)
        .createQueryBuilder('entry')
        .select('entry.entryType', 'entryType')
        .addSelect('SUM(CAST(entry.amountBase AS DECIMAL))', 'total')
        .innerJoin('entry.transaction', 'transaction')
        .innerJoin('entry.account', 'account')
        .where('transaction.userId = :userId', { userId })
        .andWhere('transaction.status = :status', { status: 'POSTED' })
        .andWhere('transaction.accountingDate < :boundaryDate', { boundaryDate: priorBoundaryDate })
        .andWhere('account.type IN (:...types)', { types: ['INCOME', 'EXPENSE'] })
        .andWhere('account.status = :statusActive', { statusActive: 'ACTIVE' })
        .groupBy('entry.entryType')
        .getRawMany();

      let priorDebits = 0;
      let priorCredits = 0;
      for (const row of priorEntrySums) {
        const amount = Number(row.total);
        if (row.entryType === 'DEBIT') {
          priorDebits += amount;
        } else {
          priorCredits += amount;
        }
      }
      priorNetIncome = priorCredits - priorDebits;
    }

    const priorNetIncomeFixed = Number(priorNetIncome.toFixed(4));
    if (priorNetIncomeFixed !== 0) {
      collapsed.equity.push({
        accountId: 'virtual-accumulated-results',
        name: 'Resultados Acumulados',
        balance: priorNetIncomeFixed,
      });
    }

    // Append virtual Net Income
    collapsed.equity.push({
      accountId: 'virtual-net-income',
      name: 'Resultado del Ejercicio',
      balance: netIncome,
    });

    // Sort equity by name again
    collapsed.equity.sort((a, b) => a.name.localeCompare(b.name));

    // 5. Calculate totals
    const totalAssets = collapsed.assets.reduce((sum, item) => sum + item.balance, 0);
    const totalLiabilities = collapsed.liabilities.reduce((sum, item) => sum + item.balance, 0);
    const totalEquity = collapsed.equity.reduce((sum, item) => sum + item.balance, 0);

    const balanced = Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.0001;

    return {
      period: period.name,
      assets: collapsed.assets,
      liabilities: collapsed.liabilities,
      equity: collapsed.equity,
      totalAssets,
      totalLiabilities,
      totalEquity,
      balanced,
    };
  }

  private applyDepthCollapse(
    accounts: AccountEntity[],
    balanceMap: Map<string, number>,
    targetDepth: number,
  ) {
    const accountMap = new Map<string, AccountEntity>();
    for (const acc of accounts) {
      accountMap.set(acc.id, acc);
    }

    const depthCache = new Map<string, number>();
    const getAccountDepth = (accountId: string): number => {
      if (depthCache.has(accountId)) {
        return depthCache.get(accountId)!;
      }
      const account = accountMap.get(accountId);
      if (!account || !account.parentId) {
        depthCache.set(accountId, 1);
        return 1;
      }
      const parent = accountMap.get(account.parentId);
      if (!parent) {
        depthCache.set(accountId, 1);
        return 1;
      }
      const depth = 1 + getAccountDepth(account.parentId);
      depthCache.set(accountId, depth);
      return depth;
    };

    const getReportingAncestor = (accountId: string): string => {
      const depth = getAccountDepth(accountId);
      if (depth <= targetDepth) {
        return accountId;
      }
      let current = accountMap.get(accountId);
      const visited = new Set<string>();
      while (current && getAccountDepth(current.id) > targetDepth) {
        if (visited.has(current.id)) {
          break;
        }
        visited.add(current.id);
        if (!current.parentId) {
          break;
        }
        const parent = accountMap.get(current.parentId);
        if (!parent) {
          break;
        }
        current = parent;
      }
      return current ? current.id : accountId;
    };

    const reportingBalances = new Map<string, number>();
    for (const acc of accounts) {
      const ancestorId = getReportingAncestor(acc.id);
      const currentBalance = balanceMap.get(acc.id) ?? 0;
      const existingBalance = reportingBalances.get(ancestorId) ?? 0;
      reportingBalances.set(ancestorId, existingBalance + currentBalance);
    }

    const reportingAccounts = accounts.filter((acc) => getAccountDepth(acc.id) <= targetDepth);

    const assets: { accountId: string; name: string; balance: number }[] = [];
    const liabilities: { accountId: string; name: string; balance: number }[] = [];
    const equity: { accountId: string; name: string; balance: number }[] = [];

    for (const account of reportingAccounts) {
      const balance = Number((reportingBalances.get(account.id) ?? 0.0).toFixed(4));
      const item = {
        accountId: account.id,
        name: account.name,
        balance,
      };

      if (account.type === 'ASSET') {
        assets.push(item);
      } else if (account.type === 'LIABILITY') {
        liabilities.push(item);
      } else if (account.type === 'EQUITY') {
        equity.push(item);
      }
    }

    // Sort by name for premium look and feel
    assets.sort((a, b) => a.name.localeCompare(b.name));
    liabilities.sort((a, b) => a.name.localeCompare(b.name));
    equity.sort((a, b) => a.name.localeCompare(b.name));

    return { assets, liabilities, equity };
  }
}
