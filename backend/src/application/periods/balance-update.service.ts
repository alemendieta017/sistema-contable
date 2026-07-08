import { Injectable, BadRequestException } from '@nestjs/common';
import { EntityManager, In } from 'typeorm';
import { PeriodEntity } from '../../infrastructure/database/entities/period.entity';
import { AccountEntity } from '../../infrastructure/database/entities/account.entity';
import { AccountPeriodBalanceEntity } from '../../infrastructure/database/entities/account-period-balance.entity';

@Injectable()
export class BalanceUpdateService {
  /**
   * Updates period balances for a user starting from a specific transaction date,
   * and propagates changes chronologically to subsequent periods.
   */
  async updateBalances(
    entityManager: EntityManager,
    userId: string,
    date: string,
    changes: { accountId: string; debitDiff: number; creditDiff: number }[],
    bypassLock: boolean = false,
  ): Promise<void> {
    if (changes.length === 0) {
      return;
    }

    // 1. Fetch all periods for this user to avoid N+1 queries during propagation
    const allUserPeriods = await entityManager
      .createQueryBuilder(PeriodEntity, 'period')
      .innerJoinAndSelect('period.fiscalYear', 'fiscalYear')
      .where('fiscalYear.userId = :userId', { userId })
      .orderBy('period.startDate', 'ASC')
      .getMany();

    if (allUserPeriods.length === 0) {
      throw new BadRequestException('No accounting periods configured for this user');
    }

    // 2. Identify the period containing the transaction date
    const targetPeriod = allUserPeriods.find((p) => p.startDate <= date && p.endDate >= date);

    if (!targetPeriod) {
      throw new BadRequestException('No accounting period found for the transaction date');
    }

    if (!bypassLock && targetPeriod.status === 'CLOSED') {
      throw new BadRequestException('The accounting period for the transaction date is closed');
    }
    if (!bypassLock && targetPeriod.status === 'PLANNING') {
      throw new BadRequestException('The accounting period for the transaction date is in planning status');
    }

    // 3. Precompute first periods of all fiscal years for the user
    const firstPeriodOfFiscalYear = new Map<string, string>(); // fiscalYearId -> periodId
    const periodsByFy = new Map<string, PeriodEntity[]>();
    for (const p of allUserPeriods) {
      if (!periodsByFy.has(p.fiscalYearId)) {
        periodsByFy.set(p.fiscalYearId, []);
      }
      periodsByFy.get(p.fiscalYearId)!.push(p);
    }
    for (const [fyId, pList] of periodsByFy.entries()) {
      pList.sort((a, b) => a.startDate.localeCompare(b.startDate));
      if (pList.length > 0) {
        firstPeriodOfFiscalYear.set(fyId, pList[0].id);
      }
    }

    // 4. Fetch all accounts affected by the changes
    const accountIds = changes.map((c) => c.accountId);
    const accounts = await entityManager.find(AccountEntity, {
      where: { id: In(accountIds), userId },
    });
    const accountMap = new Map<string, AccountEntity>();
    for (const acc of accounts) {
      accountMap.set(acc.id, acc);
    }

    // 5. Group changes by accountId just in case there are multiple entries for the same account
    const groupedChanges = new Map<string, { debitDiff: number; creditDiff: number }>();
    for (const change of changes) {
      const existing = groupedChanges.get(change.accountId) || { debitDiff: 0, creditDiff: 0 };
      groupedChanges.set(change.accountId, {
        debitDiff: existing.debitDiff + change.debitDiff,
        creditDiff: existing.creditDiff + change.creditDiff,
      });
    }

    // 6. Chronological future periods list
    const futurePeriods = allUserPeriods.filter((p) => p.startDate > targetPeriod.endDate);

    // 7. Apply and propagate balances for each account
    for (const [accountId, diffs] of groupedChanges.entries()) {
      const account = accountMap.get(accountId);
      if (!account) {
        throw new BadRequestException(`Account with ID ${accountId} not found`);
      }

      const isDebitNature = account.type === 'ASSET' || account.type === 'EXPENSE';

      // Update current period balance
      let currentBalance = await entityManager.findOne(AccountPeriodBalanceEntity, {
        where: { accountId, periodId: targetPeriod.id },
      });

      if (!currentBalance) {
        // Need to find if there was a previous period to inherit the opening balance
        const previousPeriod = allUserPeriods
          .slice()
          .reverse()
          .find((p) => p.startDate < targetPeriod.startDate);

        let inheritedOpening = 0;
        if (previousPeriod) {
          const prevBalance = await entityManager.findOne(AccountPeriodBalanceEntity, {
            where: { accountId, periodId: previousPeriod.id },
          });
          if (prevBalance) {
            // Check if targetPeriod is first period of its fiscal year
            const isFirstPeriod =
              firstPeriodOfFiscalYear.get(targetPeriod.fiscalYearId) === targetPeriod.id;
            if (isFirstPeriod && (account.type === 'INCOME' || account.type === 'EXPENSE')) {
              inheritedOpening = 0;
            } else {
              inheritedOpening = Number(prevBalance.closingBalance);
            }
          }
        }

        currentBalance = entityManager.create(AccountPeriodBalanceEntity, {
          accountId,
          periodId: targetPeriod.id,
          openingBalance: inheritedOpening,
          totalDebits: 0,
          totalCredits: 0,
          closingBalance: inheritedOpening,
        });
      }

      currentBalance.totalDebits = Number(currentBalance.totalDebits) + diffs.debitDiff;
      currentBalance.totalCredits = Number(currentBalance.totalCredits) + diffs.creditDiff;

      const currentOpening = Number(currentBalance.openingBalance);
      if (isDebitNature) {
        currentBalance.closingBalance =
          currentOpening + currentBalance.totalDebits - currentBalance.totalCredits;
      } else {
        currentBalance.closingBalance =
          currentOpening + currentBalance.totalCredits - currentBalance.totalDebits;
      }

      await entityManager.save(AccountPeriodBalanceEntity, currentBalance);

      // Roll forward to future periods chronologically
      let previousClosing = currentBalance.closingBalance;

      for (const futurePeriod of futurePeriods) {
        let futureBalance = await entityManager.findOne(AccountPeriodBalanceEntity, {
          where: { accountId, periodId: futurePeriod.id },
        });

        const isFirstPeriodOfFy =
          firstPeriodOfFiscalYear.get(futurePeriod.fiscalYearId) === futurePeriod.id;
        const expectedOpening =
          isFirstPeriodOfFy && (account.type === 'INCOME' || account.type === 'EXPENSE')
            ? 0
            : previousClosing;

        if (!futureBalance) {
          futureBalance = entityManager.create(AccountPeriodBalanceEntity, {
            accountId,
            periodId: futurePeriod.id,
            openingBalance: expectedOpening,
            totalDebits: 0,
            totalCredits: 0,
            closingBalance: expectedOpening,
          });
        } else {
          futureBalance.openingBalance = expectedOpening;
        }

        const debits = Number(futureBalance.totalDebits);
        const credits = Number(futureBalance.totalCredits);

        if (isDebitNature) {
          futureBalance.closingBalance = expectedOpening + debits - credits;
        } else {
          futureBalance.closingBalance = expectedOpening + credits - debits;
        }

        await entityManager.save(AccountPeriodBalanceEntity, futureBalance);
        previousClosing = futureBalance.closingBalance;
      }
    }
  }

  async propagateBalancesFromPeriod(
    entityManager: EntityManager,
    userId: string,
    periodId: string,
  ): Promise<void> {
    // 1. Fetch all periods for this user to avoid N+1 queries during propagation
    const allUserPeriods = await entityManager
      .createQueryBuilder(PeriodEntity, 'period')
      .innerJoinAndSelect('period.fiscalYear', 'fiscalYear')
      .where('fiscalYear.userId = :userId', { userId })
      .orderBy('period.startDate', 'ASC')
      .getMany();

    if (allUserPeriods.length === 0) {
      throw new BadRequestException('No accounting periods configured for this user');
    }

    const targetPeriod = allUserPeriods.find((p) => p.id === periodId);
    if (!targetPeriod) {
      throw new BadRequestException('Target period not found');
    }

    // 2. Identify all subsequent periods (future periods starting after this period's endDate)
    const futurePeriods = allUserPeriods.filter((p) => p.startDate > targetPeriod.endDate);

    if (futurePeriods.length === 0) {
      return;
    }

    // 3. Precompute first periods of all fiscal years for the user
    const firstPeriodOfFiscalYear = new Map<string, string>(); // fiscalYearId -> periodId
    const periodsByFy = new Map<string, PeriodEntity[]>();
    for (const p of allUserPeriods) {
      if (!periodsByFy.has(p.fiscalYearId)) {
        periodsByFy.set(p.fiscalYearId, []);
      }
      periodsByFy.get(p.fiscalYearId)!.push(p);
    }
    for (const [fyId, pList] of periodsByFy.entries()) {
      pList.sort((a, b) => a.startDate.localeCompare(b.startDate));
      if (pList.length > 0) {
        firstPeriodOfFiscalYear.set(fyId, pList[0].id);
      }
    }

    // 4. Get the current period's closing balance for all accounts that have balance records in that period
    const currentPeriodBalances = await entityManager.find(AccountPeriodBalanceEntity, {
      where: { periodId: targetPeriod.id },
    });

    if (currentPeriodBalances.length === 0) {
      return;
    }

    // 5. Fetch all accounts affected
    const accountIds = currentPeriodBalances.map((b) => b.accountId);
    const accounts = await entityManager.find(AccountEntity, {
      where: { id: In(accountIds), userId },
    });
    const accountMap = new Map<string, AccountEntity>();
    for (const acc of accounts) {
      accountMap.set(acc.id, acc);
    }

    // 6. Propagate balance forward for each account
    for (const currentBalance of currentPeriodBalances) {
      const accountId = currentBalance.accountId;
      const account = accountMap.get(accountId);
      if (!account) {
        continue;
      }

      const isDebitNature = account.type === 'ASSET' || account.type === 'EXPENSE';
      let previousClosing = Number(currentBalance.closingBalance);

      for (const futurePeriod of futurePeriods) {
        let futureBalance = await entityManager.findOne(AccountPeriodBalanceEntity, {
          where: { accountId, periodId: futurePeriod.id },
        });

        const isFirstPeriodOfFy =
          firstPeriodOfFiscalYear.get(futurePeriod.fiscalYearId) === futurePeriod.id;
        const expectedOpening =
          isFirstPeriodOfFy && (account.type === 'INCOME' || account.type === 'EXPENSE')
            ? 0
            : previousClosing;

        if (!futureBalance) {
          futureBalance = entityManager.create(AccountPeriodBalanceEntity, {
            accountId,
            periodId: futurePeriod.id,
            openingBalance: expectedOpening,
            totalDebits: 0,
            totalCredits: 0,
            closingBalance: expectedOpening,
          });
        } else {
          futureBalance.openingBalance = expectedOpening;
        }

        const debits = Number(futureBalance.totalDebits);
        const credits = Number(futureBalance.totalCredits);

        if (isDebitNature) {
          futureBalance.closingBalance = expectedOpening + debits - credits;
        } else {
          futureBalance.closingBalance = expectedOpening + credits - debits;
        }

        await entityManager.save(AccountPeriodBalanceEntity, futureBalance);
        previousClosing = futureBalance.closingBalance;
      }
    }
  }
}
