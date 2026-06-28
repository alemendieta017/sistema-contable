import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { TransactionEntity } from '../../infrastructure/database/entities/transaction.entity';
import { JournalEntryEntity } from '../../infrastructure/database/entities/journal-entry.entity';

@Injectable()
export class ReverseTransactionUseCase {
  constructor(
    @InjectRepository(TransactionEntity)
    private readonly transactionRepository: Repository<TransactionEntity>,
    @InjectRepository(JournalEntryEntity)
    private readonly journalEntryRepository: Repository<JournalEntryEntity>,
    private readonly dataSource: DataSource,
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

      // Mark original transaction as reversed
      originalTx.status = 'REVERSED';
      await entityManager.save(TransactionEntity, originalTx);

      // Create new reversal transaction
      const reversalTx = entityManager.create(TransactionEntity, {
        userId,
        date: new Date(),
        description: `Reversión de asiento: ${originalTx.description}`,
        status: 'POSTED',
        reversalOfId: originalTx.id,
      });

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
