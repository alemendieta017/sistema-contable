import { Test, TestingModule } from '@nestjs/testing';
import { DeleteTransactionUseCase } from '../../src/application/ledger/delete-transaction.use-case';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TransactionEntity } from '../../src/infrastructure/database/entities/transaction.entity';
import { NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';

describe('Delete Transaction Integration Tests', () => {
  let useCase: DeleteTransactionUseCase;
  let mockEntityManager: any;

  const mockDataSource = {
    transaction: jest.fn().mockImplementation(async (isolation, cb) => {
      const callback = typeof isolation === 'function' ? isolation : cb;
      return callback(mockEntityManager);
    }),
  };

  beforeEach(async () => {
    mockEntityManager = {
      findOne: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeleteTransactionUseCase,
        {
          provide: getRepositoryToken(TransactionEntity),
          useValue: {},
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    useCase = module.get<DeleteTransactionUseCase>(DeleteTransactionUseCase);
  });

  it('should successfully delete a transaction', async () => {
    const userId = 'user-123';
    const transactionId = 'tx-123';

    const transaction = {
      id: transactionId,
      userId,
      description: 'Buying food',
    };

    mockEntityManager.findOne.mockResolvedValue(transaction);
    mockEntityManager.remove.mockResolvedValue(transaction);

    const result = await useCase.execute(userId, transactionId);

    expect(result).toEqual({ id: transactionId, success: true });
    expect(mockEntityManager.findOne).toHaveBeenCalledWith(TransactionEntity, {
      where: { id: transactionId, userId },
    });
    expect(mockEntityManager.remove).toHaveBeenCalledWith(TransactionEntity, transaction);
  });

  it('should throw NotFoundException if transaction is not found', async () => {
    const userId = 'user-123';
    const transactionId = 'non-existent';

    mockEntityManager.findOne.mockResolvedValue(null);

    await expect(useCase.execute(userId, transactionId)).rejects.toThrow(NotFoundException);
    expect(mockEntityManager.findOne).toHaveBeenCalledWith(TransactionEntity, {
      where: { id: transactionId, userId },
    });
    expect(mockEntityManager.remove).not.toHaveBeenCalled();
  });
});
