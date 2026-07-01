import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { TransactionEntity } from '../../infrastructure/database/entities/transaction.entity';
import { JournalEntryEntity } from '../../infrastructure/database/entities/journal-entry.entity';
import { AccountEntity } from '../../infrastructure/database/entities/account.entity';
import { CurrencyEntity } from '../../infrastructure/database/entities/currency.entity';
import { Transaction, JournalEntry } from '../../domain/ledger/ledger.model';
import { CreateTransactionDto } from './create-transaction.use-case';

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
        new Date(dto.date),
        dto.description,
        journalEntries,
      );

      if (!transactionModel.isBalanced()) {
        throw new BadRequestException(
          `Transaction is unbalanced by ${transactionModel.getDiscrepancy()}`,
        );
      }

      // Update fields of originalTx
      originalTx.date = new Date(dto.date);
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

      return {
        id: originalTx.id,
        date: originalTx.date,
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
