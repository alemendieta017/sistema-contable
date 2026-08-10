import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { TransactionEntity } from '../../infrastructure/database/entities/transaction.entity';
import { JournalEntryEntity } from '../../infrastructure/database/entities/journal-entry.entity';
import { AccountEntity } from '../../infrastructure/database/entities/account.entity';
import { CurrencyEntity } from '../../infrastructure/database/entities/currency.entity';
import { PeriodEntity } from '../../infrastructure/database/entities/period.entity';
import { Transaction, JournalEntry } from '../../domain/ledger/ledger.model';
import { CreateTransactionDto } from './create-transaction.use-case';
import { BalanceUpdateService } from '../periods/balance-update.service';

@Injectable()
export class UpdateTransactionUseCase {
  constructor(
    @InjectRepository(TransactionEntity)
    private readonly transactionRepository: Repository<TransactionEntity>,
    @InjectRepository(AccountEntity)
    private readonly accountRepository: Repository<AccountEntity>,
    @InjectRepository(JournalEntryEntity)
    private readonly journalEntryRepository: Repository<JournalEntryEntity>,
    private readonly dataSource: DataSource,
    private readonly balanceUpdateService: BalanceUpdateService,
  ) {}

  async execute(userId: string, transactionId: string, dto: CreateTransactionDto) {
    if (!dto.entries || dto.entries.length < 2) {
      throw new BadRequestException('Transaction must contain at least two entries');
    }

    // Run within a database transaction with SERIALIZABLE isolation to ensure ledger consistency
    return this.dataSource.transaction('SERIALIZABLE', async (entityManager) => {
      // Find the existing transaction first
      const originalTx = await entityManager.findOne(TransactionEntity, {
        where: { id: transactionId, userId },
        relations: ['entries'],
      });

      if (!originalTx) {
        throw new NotFoundException(`Transaction with ID ${transactionId} not found`);
      }

      if (originalTx.status === 'REVERSED') {
        throw new BadRequestException('Cannot update a reversed transaction');
      }

      if (originalTx.reversalOfId !== null && originalTx.reversalOfId !== undefined) {
        throw new BadRequestException('Cannot update a reversal transaction');
      }

      // 1. Check period lock on old transaction date
      const oldTxDate = originalTx.accountingDate;
      const oldPeriod = await entityManager
        .createQueryBuilder(PeriodEntity, 'period')
        .innerJoin('period.fiscalYear', 'fiscalYear')
        .where('fiscalYear.userId = :userId', { userId })
        .andWhere('period.startDate <= :date', { date: oldTxDate })
        .andWhere('period.endDate >= :date', { date: oldTxDate })
        .getOne();

      if (!oldPeriod) {
        throw new BadRequestException(
          'No accounting period found for the original transaction date',
        );
      }
      if (oldPeriod.status === 'CLOSED') {
        throw new BadRequestException(
          'The accounting period for the original transaction date is closed',
        );
      }
      if (oldPeriod.status === 'PLANNING') {
        throw new BadRequestException(
          'The accounting period for the original transaction date is in planning status',
        );
      }

      // 2. Check period lock on new transaction date
      const newTxDate = dto.accountingDate;
      const newPeriod = await entityManager
        .createQueryBuilder(PeriodEntity, 'period')
        .innerJoin('period.fiscalYear', 'fiscalYear')
        .where('fiscalYear.userId = :userId', { userId })
        .andWhere('period.startDate <= :date', { date: newTxDate })
        .andWhere('period.endDate >= :date', { date: newTxDate })
        .getOne();

      if (!newPeriod) {
        throw new BadRequestException('No accounting period found for the new transaction date');
      }
      if (newPeriod.status === 'CLOSED') {
        throw new BadRequestException(
          'The accounting period for the new transaction date is closed',
        );
      }
      if (newPeriod.status === 'PLANNING') {
        throw new BadRequestException(
          'The accounting period for the new transaction date is in planning status',
        );
      }

      // 3. Call balance-update.service to subtract old balances
      const oldBalanceChanges = originalTx.entries.map((e) => ({
        accountId: e.accountId,
        debitDiff: e.entryType === 'DEBIT' ? -Number(e.amountBase) : 0,
        creditDiff: e.entryType === 'CREDIT' ? -Number(e.amountBase) : 0,
      }));

      await this.balanceUpdateService.updateBalances(
        entityManager,
        userId,
        oldTxDate,
        oldBalanceChanges,
      );

      // Delete the existing journal entries of this transaction
      await entityManager.delete(JournalEntryEntity, { transactionId });

      const journalEntries: JournalEntry[] = [];
      const dbEntriesToSave: JournalEntryEntity[] = [];

      for (const entry of dto.entries) {
        // Find account with locks to prevent concurrent mutations during verification
        const account = await entityManager.findOne(AccountEntity, {
          where: { id: entry.accountId, userId },
          lock: { mode: 'pessimistic_write' },
        });

        if (!account) {
          throw new NotFoundException(`Account with ID ${entry.accountId} not found`);
        }

        const currency = await entityManager.findOne(CurrencyEntity, {
          where: { id: account.currencyId },
        });

        if (account.status === 'INACTIVE') {
          throw new BadRequestException(`Account ${account.name} is inactive`);
        }

        if (account.systemRole === 'NET_INCOME') {
          throw new BadRequestException(
            'System account NET_INCOME is non-operable for manual journal entries',
          );
        }


        const rateAtDate = Number(currency?.rateToBase ?? 1.0);
        const amountBase = Number((entry.amount * rateAtDate).toFixed(4));

        journalEntries.push(
          new JournalEntry(
            undefined,
            entry.accountId,
            entry.entryType,
            entry.amount,
            amountBase,
            rateAtDate,
          ),
        );
      }

      // Create domain Transaction model and check balancing
      const transactionModel = new Transaction(
        originalTx.id,
        userId,
        newTxDate,
        dto.description,
        journalEntries,
      );

      if (!transactionModel.isBalanced()) {
        throw new BadRequestException(
          `Transaction is unbalanced by ${transactionModel.getDiscrepancy()}`,
        );
      }

      // Update fields of originalTx
      originalTx.accountingDate = newTxDate;
      originalTx.description = dto.description;
      originalTx.status = 'POSTED';

      await entityManager.save(TransactionEntity, originalTx);

      // Create and save the new JournalEntryEntity rows
      for (const entry of journalEntries) {
        const entryEntity = entityManager.create(JournalEntryEntity, {
          transactionId: originalTx.id,
          accountId: entry.accountId,
          entryType: entry.entryType,
          amount: entry.amount,
          amountBase: entry.amountBase,
          rateAtDate: entry.rateAtDate,
        });
        const savedEntry = await entityManager.save(JournalEntryEntity, entryEntity);
        dbEntriesToSave.push(savedEntry);
      }

      // 4. Call balance-update.service to add new balances
      const newBalanceChanges = dbEntriesToSave.map((e) => ({
        accountId: e.accountId,
        debitDiff: e.entryType === 'DEBIT' ? Number(e.amountBase) : 0,
        creditDiff: e.entryType === 'CREDIT' ? Number(e.amountBase) : 0,
      }));

      await this.balanceUpdateService.updateBalances(
        entityManager,
        userId,
        newTxDate,
        newBalanceChanges,
      );

      return {
        id: originalTx.id,
        accountingDate: originalTx.accountingDate,
        description: originalTx.description,
        status: originalTx.status,
        entries: dbEntriesToSave.map((e) => ({
          id: e.id,
          accountId: e.accountId,
          entryType: e.entryType,
          amount: Number(e.amount),
          amountBase: Number(e.amountBase),
          rateAtDate: Number(e.rateAtDate),
        })),
      };
    });
  }
}
