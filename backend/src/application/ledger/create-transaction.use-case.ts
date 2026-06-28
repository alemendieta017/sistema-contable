import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { TransactionEntity } from '../../infrastructure/database/entities/transaction.entity';
import { JournalEntryEntity } from '../../infrastructure/database/entities/journal-entry.entity';
import { AccountEntity } from '../../infrastructure/database/entities/account.entity';
import { CurrencyEntity } from '../../infrastructure/database/entities/currency.entity';
import { Transaction, JournalEntry } from '../../domain/ledger/ledger.model';

export interface CreateTransactionDto {
  date: string;
  description: string;
  entries: {
    accountId: string;
    entryType: 'DEBIT' | 'CREDIT';
    amount: number;
  }[];
}

@Injectable()
export class CreateTransactionUseCase {
  constructor(
    @InjectRepository(TransactionEntity)
    private readonly transactionRepository: Repository<TransactionEntity>,
    @InjectRepository(AccountEntity)
    private readonly accountRepository: Repository<AccountEntity>,
    @InjectRepository(JournalEntryEntity)
    private readonly journalEntryRepository: Repository<JournalEntryEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async execute(userId: string, dto: CreateTransactionDto) {
    if (!dto.entries || dto.entries.length < 2) {
      throw new BadRequestException('Transaction must contain at least two entries');
    }

    // Run within a database transaction with SERIALIZABLE isolation to ensure ledger consistency
    return this.dataSource.transaction('SERIALIZABLE', async (entityManager) => {
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
        undefined,
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

      // Save Transaction Header
      const txEntity = entityManager.create(TransactionEntity, {
        userId,
        date: transactionModel.date,
        description: transactionModel.description,
        status: transactionModel.status,
      });

      const savedTx = await entityManager.save(TransactionEntity, txEntity);

      // Save Journal Entries
      for (const entry of journalEntries) {
        const entryEntity = entityManager.create(JournalEntryEntity, {
          transactionId: savedTx.id,
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
        id: savedTx.id,
        date: savedTx.date,
        description: savedTx.description,
        status: savedTx.status,
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
