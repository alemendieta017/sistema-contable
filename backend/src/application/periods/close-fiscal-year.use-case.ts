import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { DataSource, In } from 'typeorm';
import { FiscalYearEntity } from '../../infrastructure/database/entities/fiscal-year.entity';
import { PeriodEntity } from '../../infrastructure/database/entities/period.entity';
import { AccountEntity } from '../../infrastructure/database/entities/account.entity';
import { TransactionEntity } from '../../infrastructure/database/entities/transaction.entity';
import { JournalEntryEntity } from '../../infrastructure/database/entities/journal-entry.entity';
import { AccountPeriodBalanceEntity } from '../../infrastructure/database/entities/account-period-balance.entity';
import { CloseFiscalYearRequest } from '@sistema-contable/shared';
import { IsString, IsNotEmpty } from 'class-validator';
import { BalanceUpdateService } from './balance-update.service';

export class CloseFiscalYearDto implements CloseFiscalYearRequest {
  @IsString()
  @IsNotEmpty()
  retainedEarningsAccountId: string;
}

@Injectable()
export class CloseFiscalYearUseCase {
  constructor(
    private readonly dataSource: DataSource,
    private readonly balanceUpdateService: BalanceUpdateService,
  ) {}

  async execute(userId: string, fiscalYearId: string, dto: CloseFiscalYearDto) {
    return this.dataSource.transaction('SERIALIZABLE', async (entityManager) => {
      // 1. Fetch the fiscal year with periods
      const fiscalYear = await entityManager.findOne(FiscalYearEntity, {
        where: { id: fiscalYearId, userId },
        relations: ['periods'],
      });

      if (!fiscalYear) {
        throw new NotFoundException(`Fiscal year with ID ${fiscalYearId} not found`);
      }

      if (fiscalYear.status === 'CLOSED') {
        throw new BadRequestException('Fiscal year is already closed');
      }

      // 2. Automatically set all nested periods' status to CLOSED
      for (const period of fiscalYear.periods) {
        period.status = 'CLOSED';
      }
      await entityManager.save(PeriodEntity, fiscalYear.periods);

      // 3. Check if Retained Earnings account exists, belongs to the user, and is an EQUITY account
      const retainedEarningsAcc = await entityManager.findOne(AccountEntity, {
        where: { id: dto.retainedEarningsAccountId, userId },
      });

      if (!retainedEarningsAcc || retainedEarningsAcc.type !== 'EQUITY') {
        throw new BadRequestException(
          'Retained earnings account not found or is not an EQUITY account',
        );
      }

      // 4. Identify the last period of the fiscal year (usually period 12, e.g. latest endDate)
      const sortedPeriods = [...fiscalYear.periods].sort(
        (a, b) => a.endDate.getTime() - b.endDate.getTime(),
      );
      const lastPeriod = sortedPeriods[sortedPeriods.length - 1];

      // 5. Fetch all temporary accounts (INCOME and EXPENSE) closing balances at the end of this last period
      const tempAccounts = await entityManager.find(AccountEntity, {
        where: { userId, type: In(['INCOME', 'EXPENSE']) },
      });

      const tempAccountIds = tempAccounts.map((a) => a.id);
      const balances =
        tempAccountIds.length > 0
          ? await entityManager.find(AccountPeriodBalanceEntity, {
              where: { periodId: lastPeriod.id, accountId: In(tempAccountIds) },
            })
          : [];

      const balanceMap = new Map<string, AccountPeriodBalanceEntity>();
      for (const b of balances) {
        balanceMap.set(b.accountId, b);
      }

      // 6. Generate closing entry candidates
      const closingEntries: { accountId: string; entryType: 'DEBIT' | 'CREDIT'; amount: number }[] =
        [];
      let totalDebits = 0;
      let totalCredits = 0;

      for (const acc of tempAccounts) {
        const balEntity = balanceMap.get(acc.id);
        const closingBalance = balEntity ? Number(balEntity.closingBalance) : 0;

        if (Math.abs(closingBalance) < 0.0001) {
          continue;
        }

        const isDebitNature = acc.type === 'EXPENSE';
        let entryType: 'DEBIT' | 'CREDIT';
        const amount = Math.abs(closingBalance);

        if (isDebitNature) {
          // Debit Nature: to close, credit positive balance, debit negative balance
          entryType = closingBalance > 0 ? 'CREDIT' : 'DEBIT';
        } else {
          // Credit Nature: to close, debit positive balance, credit negative balance
          entryType = closingBalance > 0 ? 'DEBIT' : 'CREDIT';
        }

        closingEntries.push({
          accountId: acc.id,
          entryType,
          amount,
        });

        if (entryType === 'DEBIT') {
          totalDebits += amount;
        } else {
          totalCredits += amount;
        }
      }

      let closingTxId: string | null = null;

      // 7. If there are closing entries, post the year-end closing entry
      if (closingEntries.length > 0) {
        // Balance discrepancy goes to Retained Earnings
        const discrepancy = Number((totalDebits - totalCredits).toFixed(4));
        if (Math.abs(discrepancy) > 0.0001) {
          const reEntryType = discrepancy > 0 ? 'CREDIT' : 'DEBIT';
          const reAmount = Math.abs(discrepancy);

          closingEntries.push({
            accountId: dto.retainedEarningsAccountId,
            entryType: reEntryType,
            amount: reAmount,
          });
        }

        // Save closing transaction header
        const closingTx = entityManager.create(TransactionEntity, {
          userId,
          date: fiscalYear.endDate,
          description: `Asiento de cierre anual: ${fiscalYear.name}`,
          status: 'POSTED',
        });
        const savedTx = await entityManager.save(TransactionEntity, closingTx);
        closingTxId = savedTx.id;

        // Save closing journal entries
        const savedEntries: JournalEntryEntity[] = [];
        for (const entry of closingEntries) {
          const entryEntity = entityManager.create(JournalEntryEntity, {
            transactionId: savedTx.id,
            accountId: entry.accountId,
            entryType: entry.entryType,
            amount: entry.amount,
            amountBase: entry.amount,
            rateAtDate: 1.0,
          });
          const savedEntry = await entityManager.save(JournalEntryEntity, entryEntity);
          savedEntries.push(savedEntry);
        }

        // Call balanceUpdateService to update balances (bypassLock: true)
        const balanceChanges = savedEntries.map((e) => ({
          accountId: e.accountId,
          debitDiff: e.entryType === 'DEBIT' ? Number(e.amountBase) : 0,
          creditDiff: e.entryType === 'CREDIT' ? Number(e.amountBase) : 0,
        }));

        await this.balanceUpdateService.updateBalances(
          entityManager,
          userId,
          fiscalYear.endDate,
          balanceChanges,
          true, // bypassLock
        );
      }

      // 8. Mark the fiscal year as CLOSED
      fiscalYear.status = 'CLOSED';
      await entityManager.save(FiscalYearEntity, fiscalYear);

      return {
        message: 'Fiscal year closed successfully',
        closingTransactionId: closingTxId,
      };
    });
  }
}
