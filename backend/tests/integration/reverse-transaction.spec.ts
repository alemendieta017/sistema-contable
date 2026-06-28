import { Test, TestingModule } from '@nestjs/testing';
import { ReverseTransactionUseCase } from '../../src/application/ledger/reverse-transaction.use-case';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TransactionEntity } from '../../src/infrastructure/database/entities/transaction.entity';
import { JournalEntryEntity } from '../../src/infrastructure/database/entities/journal-entry.entity';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';

describe('Reverse Transaction Integration Tests', () => {
  let useCase: ReverseTransactionUseCase;
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
      create: jest.fn().mockImplementation((cls, obj) => ({ id: 'mock-reversal-id', ...obj })),
      save: jest.fn().mockImplementation((cls, entity) => Promise.resolve({ ...entity, id: 'mock-reversal-id' })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReverseTransactionUseCase,
        {
          provide: getRepositoryToken(TransactionEntity),
          useValue: {},
        },
        {
          provide: getRepositoryToken(JournalEntryEntity),
          useValue: {},
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    useCase = module.get<ReverseTransactionUseCase>(ReverseTransactionUseCase);
  });

  it('should successfully reverse a transaction by offset entries', async () => {
    const userId = 'user-123';
    const originalTxId = 'tx-123';

    // Mock finding original transaction
    const originalTx = {
      id: originalTxId,
      userId,
      description: 'Buying food',
      date: new Date(),
      status: 'POSTED',
      entries: [
        {
          id: 'entry-1',
          accountId: 'acc-cash',
          entryType: 'CREDIT',
          amount: 50000,
          amountBase: 50000,
          rateAtDate: 1.0,
        },
        {
          id: 'entry-2',
          accountId: 'acc-food',
          entryType: 'DEBIT',
          amount: 50000,
          amountBase: 50000,
          rateAtDate: 1.0,
        },
      ],
    };

    mockEntityManager.findOne.mockResolvedValue(originalTx);

    const result = await useCase.execute(userId, originalTxId);

    expect(result).toBeDefined();
    expect(result.status).toBe('POSTED');
    expect(result.reversalOfId).toBe(originalTxId);
    expect(result.description).toBe('Reversión de asiento: Buying food');

    // Confirm original transaction marked reversed
    expect(originalTx.status).toBe('REVERSED');

    // Reversal entries should have flipped entry types
    const reversalCashEntry = result.entries.find((e: any) => e.accountId === 'acc-cash');
    const reversalFoodEntry = result.entries.find((e: any) => e.accountId === 'acc-food');

    expect(reversalCashEntry.entryType).toBe('DEBIT');
    expect(reversalFoodEntry.entryType).toBe('CREDIT');
  });

  it('should throw NotFoundException if original transaction not found', async () => {
    mockEntityManager.findOne.mockResolvedValue(null);

    await expect(useCase.execute('user-123', 'non-existent')).rejects.toThrow(NotFoundException);
  });

  it('should throw BadRequestException if transaction is already reversed', async () => {
    mockEntityManager.findOne.mockResolvedValue({
      id: 'tx-123',
      userId: 'user-123',
      status: 'REVERSED',
    });

    await expect(useCase.execute('user-123', 'tx-123')).rejects.toThrow(BadRequestException);
  });
});
