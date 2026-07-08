import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { TransactionEntity } from '../../infrastructure/database/entities/transaction.entity';
import { PeriodEntity } from '../../infrastructure/database/entities/period.entity';
import { BalanceUpdateService } from '../periods/balance-update.service';

@Injectable()
export class DeleteTransactionUseCase {
  constructor(
    @InjectRepository(TransactionEntity)
    private readonly transactionRepository: Repository<TransactionEntity>,
    private readonly dataSource: DataSource,
    private readonly balanceUpdateService: BalanceUpdateService,
  ) {}

  async execute(userId: string, transactionId: string) {
    return this.dataSource.transaction('SERIALIZABLE', async (entityManager) => {
      const transaction = await entityManager.findOne(TransactionEntity, {
        where: { id: transactionId, userId },
        relations: ['entries'],
      });

      if (!transaction) {
        throw new NotFoundException(`Transaction with ID ${transactionId} not found`);
      }

      // 1. Check period lock on transaction date
      const txDate = transaction.accountingDate;
      const period = await entityManager
        .createQueryBuilder(PeriodEntity, 'period')
        .innerJoin('period.fiscalYear', 'fiscalYear')
        .where('fiscalYear.userId = :userId', { userId })
        .andWhere('period.startDate <= :date', { date: txDate })
        .andWhere('period.endDate >= :date', { date: txDate })
        .getOne();

      if (!period) {
        throw new BadRequestException('No accounting period found for the transaction date');
      }
      if (period.status === 'CLOSED') {
        throw new BadRequestException('The accounting period for the transaction date is closed');
      }
      if (period.status === 'PLANNING') {
        throw new BadRequestException('The accounting period for the transaction date is in planning status');
      }

      // 2. Call balance-update.service to subtract debits/credits
      const balanceChanges = transaction.entries.map((e) => ({
        accountId: e.accountId,
        debitDiff: e.entryType === 'DEBIT' ? -Number(e.amountBase) : 0,
        creditDiff: e.entryType === 'CREDIT' ? -Number(e.amountBase) : 0,
      }));

      await this.balanceUpdateService.updateBalances(entityManager, userId, txDate, balanceChanges);

      await entityManager.remove(TransactionEntity, transaction);
      return { id: transactionId, success: true };
    });
  }
}
