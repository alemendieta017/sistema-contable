import { Test, TestingModule } from '@nestjs/testing';
import { DeleteTransactionUseCase } from '../../src/application/ledger/delete-transaction.use-case';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TransactionEntity } from '../../src/infrastructure/database/entities/transaction.entity';
import { NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BalanceUpdateService } from '../../src/application/periods/balance-update.service';

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
      createQueryBuilder: jest.fn().mockReturnValue({
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({ id: 'period-1', status: 'OPEN' }),
      }),
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
        {
          provide: BalanceUpdateService,
          useValue: {
            updateBalances: jest.fn().mockResolvedValue(undefined),
          },
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
      date: new Date(),
      entries: [],
    };

    mockEntityManager.findOne.mockResolvedValue(transaction);
    mockEntityManager.remove.mockResolvedValue(transaction);

    const result = await useCase.execute(userId, transactionId);

    expect(result).toEqual({ id: transactionId, success: true });
    expect(mockEntityManager.findOne).toHaveBeenCalledWith(TransactionEntity, {
      where: { id: transactionId, userId },
      relations: ['entries'],
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
      relations: ['entries'],
    });
    expect(mockEntityManager.remove).not.toHaveBeenCalled();
  });
});
