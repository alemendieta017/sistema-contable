import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { TransactionEntity } from '../../infrastructure/database/entities/transaction.entity';

@Injectable()
export class DeleteTransactionUseCase {
  constructor(
    @InjectRepository(TransactionEntity)
    private readonly transactionRepository: Repository<TransactionEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async execute(userId: string, transactionId: string) {
    return this.dataSource.transaction('SERIALIZABLE', async (entityManager) => {
      const transaction = await entityManager.findOne(TransactionEntity, {
        where: { id: transactionId, userId },
      });

      if (!transaction) {
        throw new NotFoundException(`Transaction with ID ${transactionId} not found`);
      }

      await entityManager.remove(TransactionEntity, transaction);
      return { id: transactionId, success: true };
    });
  }
}
