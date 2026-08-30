import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, DataSource, LessThanOrEqual, MoreThanOrEqual, LessThan } from 'typeorm';
import { PeriodEntity } from '../../infrastructure/database/entities/period.entity';
import { AccountEntity } from '../../infrastructure/database/entities/account.entity';
import { AccountPeriodBalanceEntity } from '../../infrastructure/database/entities/account-period-balance.entity';
import { JournalEntryEntity } from '../../infrastructure/database/entities/journal-entry.entity';

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

      return this.calculateForPeriod(userId, period, depth);
    }

    if (mode === 'date') {
      if (!date) {
        throw new BadRequestException('date is required for date mode');
      }

      // 1. Fetch all accounts for user
      const accounts = await this.accountRepository.find({
        where: {
          userId,
        },
      });

      // 2. Check if a PeriodEntity exists for 'date' to use pre-calculated opening balances
      const currentPeriod = await this.periodRepository.findOne({
        where: {
          userId,
          startDate: LessThanOrEqual(date),
          endDate: MoreThanOrEqual(date),
        },
      });

      const balanceMap = new Map<string, number>();

      if (currentPeriod) {
        // Load opening balances from currentPeriod
        const periodBalances = await this.balanceRepository.find({
          where: { periodId: currentPeriod.id },
        });
        for (const bal of periodBalances) {
          balanceMap.set(bal.accountId, Number(bal.openingBalance));
        }

        // Query posted journal entries in window [currentPeriod.startDate, date]
        const entrySums = await this.dataSource
          .getRepository(JournalEntryEntity)
          .createQueryBuilder('entry')
          .select('entry.accountId', 'accountId')
          .addSelect('entry.entryType', 'entryType')
          .addSelect('SUM(CAST(entry.amountBase AS DECIMAL))', 'total')
          .innerJoin('entry.transaction', 'transaction')
          .where('transaction.userId = :userId', { userId })
          .andWhere('transaction.status = :status', { status: 'POSTED' })
          .andWhere('transaction.accountingDate >= :startDate', {
            startDate: currentPeriod.startDate,
          })
          .andWhere('transaction.accountingDate <= :date', { date })
          .groupBy('entry.accountId')
          .addGroupBy('entry.entryType')
          .getRawMany();

        for (const row of entrySums) {
          const amount = Number(row.total);
          const current = balanceMap.get(row.accountId) ?? 0;
          const account = accounts.find((a) => a.id === row.accountId);
          const isDebitNature = account
            ? account.type === 'ASSET' || account.type === 'EXPENSE'
            : true;
          const net = this.calculateNetEntryAmount(row.entryType, amount, isDebitNature);
          balanceMap.set(row.accountId, current + net);
        }
      } else {
        // Check if there is a latest prior period ending before date
        const latestPriorPeriod = await this.periodRepository.findOne({
          where: {
            userId,
            endDate: LessThan(date),
          },
          order: { endDate: 'DESC' },
        });

        if (latestPriorPeriod) {
          const periodBalances = await this.balanceRepository.find({
            where: { periodId: latestPriorPeriod.id },
          });
          for (const bal of periodBalances) {
            balanceMap.set(bal.accountId, Number(bal.closingBalance));
          }

          const entrySums = await this.dataSource
            .getRepository(JournalEntryEntity)
            .createQueryBuilder('entry')
            .select('entry.accountId', 'accountId')
            .addSelect('entry.entryType', 'entryType')
            .addSelect('SUM(CAST(entry.amountBase AS DECIMAL))', 'total')
            .innerJoin('entry.transaction', 'transaction')
            .where('transaction.userId = :userId', { userId })
            .andWhere('transaction.status = :status', { status: 'POSTED' })
            .andWhere('transaction.accountingDate > :startDate', {
              startDate: latestPriorPeriod.endDate,
            })
            .andWhere('transaction.accountingDate <= :date', { date })
            .groupBy('entry.accountId')
            .addGroupBy('entry.entryType')
            .getRawMany();

          for (const row of entrySums) {
            const amount = Number(row.total);
            const current = balanceMap.get(row.accountId) ?? 0;
            const account = accounts.find((a) => a.id === row.accountId);
            const isDebitNature = account
              ? account.type === 'ASSET' || account.type === 'EXPENSE'
              : true;
            const net = this.calculateNetEntryAmount(row.entryType, amount, isDebitNature);
            balanceMap.set(row.accountId, current + net);
          }
        } else {
          // Fallback: Query all entries <= date (for scenarios with no periods configured)
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

          for (const account of accounts) {
            const debits = debitsMap.get(account.id) ?? 0;
            const credits = creditsMap.get(account.id) ?? 0;
            const isDebitNature = account.type === 'ASSET' || account.type === 'EXPENSE';
            const balance = isDebitNature ? debits - credits : credits - debits;
            balanceMap.set(account.id, balance);
          }
        }
      }

      // 3. Calculate cumulative earnings from Income/Expense entries up to date
      const cumulativeEntries = await this.dataSource
        .getRepository(JournalEntryEntity)
        .createQueryBuilder('entry')
        .select('entry.entryType', 'entryType')
        .addSelect('SUM(CAST(entry.amountBase AS DECIMAL))', 'total')
        .innerJoin('entry.transaction', 'transaction')
        .innerJoin('entry.account', 'account')
        .where('transaction.userId = :userId', { userId })
        .andWhere('transaction.status = :status', { status: 'POSTED' })
        .andWhere('transaction.accountingDate <= :date', { date })
        .andWhere('account.type IN (:...types)', { types: ['INCOME', 'EXPENSE'] })
        .groupBy('entry.entryType')
        .getRawMany();

      let inc = 0;
      let exp = 0;
      for (const row of cumulativeEntries) {
        const amt = Number(row.total);
        if (row.entryType === 'CREDIT') {
          inc += amt;
        } else {
          exp += amt;
        }
      }
      const cumulativeEarnings = inc - exp;

      // 4. Apply depth collapse to ASSET, LIABILITY
      const collapsed = this.applyDepthCollapse(accounts, balanceMap, depth);

      // 5. Calculate totals and real double-entry balance check
      const equityAccounts = accounts.filter((a) => a.type === 'EQUITY');
      let capitalSum = 0;
      for (const acc of equityAccounts) {
        capitalSum += balanceMap.get(acc.id) ?? 0;
      }

      const totalAssets = Number(
        collapsed.assets.reduce((sum, item) => sum + item.balance, 0).toFixed(4),
      );
      const totalLiabilities = Number(
        collapsed.liabilities.reduce((sum, item) => sum + item.balance, 0).toFixed(4),
      );
      const calculatedEquity = Number((capitalSum + cumulativeEarnings).toFixed(4));
      const netWorth = Number((totalAssets - totalLiabilities).toFixed(4));
      const balanced = Math.abs(totalAssets - (totalLiabilities + calculatedEquity)) < 0.0001;

      return {
        mode: 'date',
        date,
        assets: collapsed.assets,
        liabilities: collapsed.liabilities,
        equity: [],
        totalAssets,
        totalLiabilities,
        totalEquity: calculatedEquity,
        netWorth,
        balanced,
        isBalanced: balanced,
      };
    }

    if (mode === 'comparative') {
      if (!periodIds || periodIds.length === 0) {
        throw new BadRequestException('periodIds must be a non-empty array');
      }

      let periods = await this.periodRepository.find({
        where: {
          id: In(periodIds),
          userId,
        },
      });

      if (periods.length !== periodIds.length) {
        // Try finding by name for any non-UUID entries
        const foundIds = new Set(periods.map((p) => p.id));
        const missingIds = periodIds.filter((id) => !foundIds.has(id));
        if (missingIds.length > 0) {
          const periodsByName = await this.periodRepository.find({
            where: {
              name: In(missingIds),
              userId,
            },
          });
          periods = [...periods, ...periodsByName];
        }
      }

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

      return {
        mode: 'comparative',
        periods: periods.map((p) => p.name),
        assets: mergedAssets,
        liabilities: mergedLiabilities,
        equity: [],
        totalAssets: periodResults.map((r) => r.totalAssets),
        totalLiabilities: periodResults.map((r) => r.totalLiabilities),
        totalEquity: periodResults.map((r) => r.totalEquity),
        netWorth: periodResults.map((r) => r.netWorth),
        balanced: periodResults.map((r) => r.balanced),
        isBalanced: periodResults.map((r) => r.isBalanced),
      };
    }
  }

  private async calculateForPeriod(userId: string, period: PeriodEntity, targetDepth: number) {
    // 1. Fetch all accounts for user
    const accounts = await this.accountRepository.find({
      where: {
        userId,
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

    // 3. Apply depth collapse to ASSET, LIABILITY
    const collapsed = this.applyDepthCollapse(accounts, balanceMap, targetDepth);

    // 4. Calculate totals and real double-entry Net Worth directly from snapshots
    const totalAssets = Number(
      collapsed.assets.reduce((sum, item) => sum + item.balance, 0).toFixed(4),
    );
    const totalLiabilities = Number(
      collapsed.liabilities.reduce((sum, item) => sum + item.balance, 0).toFixed(4),
    );
    const netWorth = Number((totalAssets - totalLiabilities).toFixed(4));
    const totalEquity = netWorth;
    const balanced = true;

    return {
      mode: 'period',
      period: period.name,
      assets: collapsed.assets,
      liabilities: collapsed.liabilities,
      equity: [],
      totalAssets,
      totalLiabilities,
      totalEquity,
      netWorth,
      balanced,
      isBalanced: balanced,
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
      // If account is INACTIVE and has 0 balance, omit from reporting
      if (account.status === 'INACTIVE' && Math.abs(balance) < 0.0001) {
        continue;
      }

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

  private calculateNetEntryAmount(
    entryType: string,
    amount: number,
    isDebitNature: boolean,
  ): number {
    if (entryType === 'DEBIT') {
      return isDebitNature ? amount : -amount;
    } else {
      return isDebitNature ? -amount : amount;
    }
  }
}
