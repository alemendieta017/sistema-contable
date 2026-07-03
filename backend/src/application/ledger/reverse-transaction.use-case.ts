import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { TransactionEntity } from '../../infrastructure/database/entities/transaction.entity';
import { JournalEntryEntity } from '../../infrastructure/database/entities/journal-entry.entity';
import { PeriodEntity } from '../../infrastructure/database/entities/period.entity';
import { BalanceUpdateService } from '../periods/balance-update.service';

@Injectable()
export class ReverseTransactionUseCase {
  constructor(
    @InjectRepository(TransactionEntity)
    private readonly transactionRepository: Repository<TransactionEntity>,
    @InjectRepository(JournalEntryEntity)
    private readonly journalEntryRepository: Repository<JournalEntryEntity>,
    private readonly dataSource: DataSource,
    private readonly balanceUpdateService: BalanceUpdateService,
  ) {}

  async execute(userId: string, transactionId: string) {
    return this.dataSource.transaction('SERIALIZABLE', async (entityManager) => {
      // Find original transaction
      const originalTx = await entityManager.findOne(TransactionEntity, {
        where: { id: transactionId, userId },
        relations: ['entries'],
      });

      if (!originalTx) {
        throw new NotFoundException(`Transaction with ID ${transactionId} not found`);
      }

      if (originalTx.status === 'REVERSED') {
        throw new BadRequestException('Transaction is already reversed');
      }

      // Create new reversal transaction
      const reversalTx = entityManager.create(TransactionEntity, {
        userId,
        date: new Date(),
        description: `Reversión de asiento: ${originalTx.description}`,
        status: 'POSTED',
        reversalOfId: originalTx.id,
      });

      // 1. Check period lock on reversal date
      const reversalDate = reversalTx.date;
      const period = await entityManager.createQueryBuilder(PeriodEntity, 'period')
        .innerJoin('period.fiscalYear', 'fiscalYear')
        .where('fiscalYear.userId = :userId', { userId })
        .andWhere('period.startDate <= :date', { date: reversalDate })
        .andWhere('period.endDate >= :date', { date: reversalDate })
        .getOne();

      if (!period) {
        throw new BadRequestException('No accounting period found for the reversal date');
      }
      if (period.status === 'CLOSED') {
        throw new BadRequestException('The accounting period for the reversal date is closed');
      }

      // Mark original transaction as reversed
      originalTx.status = 'REVERSED';
      await entityManager.save(TransactionEntity, originalTx);

      const savedReversalTx = await entityManager.save(TransactionEntity, reversalTx);

      // Create offset entries (flipped types)
      const reversalEntries: JournalEntryEntity[] = [];
      for (const entry of originalTx.entries) {
        const offsetEntry = entityManager.create(JournalEntryEntity, {
          transactionId: savedReversalTx.id,
          accountId: entry.accountId,
          entryType: entry.entryType === 'DEBIT' ? 'CREDIT' : 'DEBIT',
          amount: entry.amount,
          amountBase: entry.amountBase,
          rateAtDate: entry.rateAtDate,
        });
        const savedEntry = await entityManager.save(JournalEntryEntity, offsetEntry);
        reversalEntries.push(savedEntry);
      }

      // 2. Call balance-update.service to add reversal balances
      const balanceChanges = reversalEntries.map((e) => ({
        accountId: e.accountId,
        debitDiff: e.entryType === 'DEBIT' ? Number(e.amountBase) : 0,
        creditDiff: e.entryType === 'CREDIT' ? Number(e.amountBase) : 0,
      }));

      await this.balanceUpdateService.updateBalances(entityManager, userId, reversalDate, balanceChanges);

      return {
        id: savedReversalTx.id,
        date: savedReversalTx.date,
        description: savedReversalTx.description,
        status: savedReversalTx.status,
        reversalOfId: savedReversalTx.reversalOfId,
        entries: reversalEntries.map((e) => ({
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

