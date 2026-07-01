import { Test, TestingModule } from '@nestjs/testing';
import { UpdateTransactionUseCase } from '../../src/application/ledger/update-transaction.use-case';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TransactionEntity } from '../../src/infrastructure/database/entities/transaction.entity';
import { JournalEntryEntity } from '../../src/infrastructure/database/entities/journal-entry.entity';
import { AccountEntity } from '../../src/infrastructure/database/entities/account.entity';
import { CurrencyEntity } from '../../src/infrastructure/database/entities/currency.entity';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';

describe('Update Transaction Integration Tests', () => {
  let useCase: UpdateTransactionUseCase;
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
      delete: jest.fn(),
      create: jest.fn().mockImplementation((cls, obj) => ({ id: 'mock-id', ...obj })),
      save: jest.fn().mockImplementation((cls, entity) => Promise.resolve({ ...entity, id: entity.id || 'saved-id' })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateTransactionUseCase,
        {
          provide: getRepositoryToken(TransactionEntity),
          useValue: {},
        },
        {
          provide: getRepositoryToken(AccountEntity),
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

    useCase = module.get<UpdateTransactionUseCase>(UpdateTransactionUseCase);
  });

  it('should successfully update transaction dates, description, and journal entries', async () => {
    const userId = 'user-123';
    const transactionId = 'tx-123';

    const originalTx = {
      id: transactionId,
      userId,
      date: new Date('2026-06-01T00:00:00Z'),
      description: 'Old Description',
      status: 'POSTED',
      reversalOfId: null,
      entries: [
        { id: 'e-1', accountId: 'acc-cash', entryType: 'CREDIT', amount: 100 },
        { id: 'e-2', accountId: 'acc-food', entryType: 'DEBIT', amount: 100 },
      ],
    };

    const dto = {
      date: '2026-06-02T10:00:00Z',
      description: 'New Description',
      entries: [
        { accountId: 'acc-cash', entryType: 'CREDIT' as const, amount: 200 },
        { accountId: 'acc-rent', entryType: 'DEBIT' as const, amount: 200 },
      ],
    };

    mockEntityManager.findOne.mockImplementation(async (cls, options) => {
      if (cls === TransactionEntity) {
        return originalTx;
      }
      if (cls === AccountEntity) {
        const id = options.where.id;
        return {
          id,
          userId,
          name: id === 'acc-cash' ? 'Cash Account' : 'Rent Account',
          status: 'ACTIVE',
          currencyId: 'USD',
        };
      }
      if (cls === CurrencyEntity) {
        return { id: 'USD', rateToBase: 1.0 };
      }
      return null;
    });

    const result = await useCase.execute(userId, transactionId, dto);

    expect(result).toBeDefined();
    expect(result.id).toBe(transactionId);
    expect(result.description).toBe('New Description');
    expect(result.date).toEqual(new Date(dto.date));
    expect(result.entries).toHaveLength(2);
    expect(mockEntityManager.delete).toHaveBeenCalledWith(JournalEntryEntity, { transactionId });
  });

  it('should throw NotFoundException if transaction is not found', async () => {
    mockEntityManager.findOne.mockResolvedValue(null);

    const dto = {
      date: '2026-06-02T10:00:00Z',
      description: 'New Description',
      entries: [
        { accountId: 'acc-cash', entryType: 'CREDIT' as const, amount: 200 },
        { accountId: 'acc-rent', entryType: 'DEBIT' as const, amount: 200 },
      ],
    };

    await expect(useCase.execute('user-123', 'non-existent', dto)).rejects.toThrow(NotFoundException);
  });

  it('should throw BadRequestException if transaction status is REVERSED', async () => {
    const originalTx = {
      id: 'tx-123',
      userId: 'user-123',
      date: new Date('2026-06-01T00:00:00Z'),
      description: 'Old Description',
      status: 'REVERSED',
      reversalOfId: null,
    };

    mockEntityManager.findOne.mockResolvedValue(originalTx);

    const dto = {
      date: '2026-06-02T10:00:00Z',
      description: 'New Description',
      entries: [
        { accountId: 'acc-cash', entryType: 'CREDIT' as const, amount: 200 },
        { accountId: 'acc-rent', entryType: 'DEBIT' as const, amount: 200 },
      ],
    };

    await expect(useCase.execute('user-123', 'tx-123', dto)).rejects.toThrow(BadRequestException);
  });

  it('should throw BadRequestException if transaction is a reversal transaction', async () => {
    const originalTx = {
      id: 'tx-123',
      userId: 'user-123',
      date: new Date('2026-06-01T00:00:00Z'),
      description: 'Old Description',
      status: 'POSTED',
      reversalOfId: 'tx-original',
    };

    mockEntityManager.findOne.mockResolvedValue(originalTx);

    const dto = {
      date: '2026-06-02T10:00:00Z',
      description: 'New Description',
      entries: [
        { accountId: 'acc-cash', entryType: 'CREDIT' as const, amount: 200 },
        { accountId: 'acc-rent', entryType: 'DEBIT' as const, amount: 200 },
      ],
    };

    await expect(useCase.execute('user-123', 'tx-123', dto)).rejects.toThrow(BadRequestException);
  });

  it('should throw BadRequestException if updated entries are unbalanced', async () => {
    const userId = 'user-123';
    const transactionId = 'tx-123';

    const originalTx = {
      id: transactionId,
      userId,
      date: new Date('2026-06-01T00:00:00Z'),
      description: 'Old Description',
      status: 'POSTED',
      reversalOfId: null,
    };

    const dto = {
      date: '2026-06-02T10:00:00Z',
      description: 'New Description',
      entries: [
        { accountId: 'acc-cash', entryType: 'CREDIT' as const, amount: 200 },
        { accountId: 'acc-rent', entryType: 'DEBIT' as const, amount: 150 }, // unbalanced
      ],
    };

    mockEntityManager.findOne.mockImplementation(async (cls, options) => {
      if (cls === TransactionEntity) {
        return originalTx;
      }
      if (cls === AccountEntity) {
        const id = options.where.id;
        return {
          id,
          userId,
          name: id === 'acc-cash' ? 'Cash Account' : 'Rent Account',
          status: 'ACTIVE',
          currencyId: 'USD',
        };
      }
      if (cls === CurrencyEntity) {
        return { id: 'USD', rateToBase: 1.0 };
      }
      return null;
    });

    await expect(useCase.execute(userId, transactionId, dto)).rejects.toThrow(BadRequestException);
  });

  it('should throw BadRequestException if updated entry account is inactive', async () => {
    const userId = 'user-123';
    const transactionId = 'tx-123';

    const originalTx = {
      id: transactionId,
      userId,
      date: new Date('2026-06-01T00:00:00Z'),
      description: 'Old Description',
      status: 'POSTED',
      reversalOfId: null,
    };

    const dto = {
      date: '2026-06-02T10:00:00Z',
      description: 'New Description',
      entries: [
        { accountId: 'acc-cash', entryType: 'CREDIT' as const, amount: 200 },
        { accountId: 'acc-rent', entryType: 'DEBIT' as const, amount: 200 },
      ],
    };

    mockEntityManager.findOne.mockImplementation(async (cls, options) => {
      if (cls === TransactionEntity) {
        return originalTx;
      }
      if (cls === AccountEntity) {
        const id = options.where.id;
        return {
          id,
          userId,
          name: id === 'acc-cash' ? 'Cash Account' : 'Rent Account',
          status: id === 'acc-rent' ? 'INACTIVE' : 'ACTIVE',
          currencyId: 'USD',
        };
      }
      if (cls === CurrencyEntity) {
        return { id: 'USD', rateToBase: 1.0 };
      }
      return null;
    });

    await expect(useCase.execute(userId, transactionId, dto)).rejects.toThrow(BadRequestException);
  });

  it('should throw NotFoundException if account does not exist or is not owned by the user', async () => {
    const userId = 'user-123';
    const transactionId = 'tx-123';

    const originalTx = {
      id: transactionId,
      userId,
      date: new Date('2026-06-01T00:00:00Z'),
      description: 'Old Description',
      status: 'POSTED',
      reversalOfId: null,
    };

    const dto = {
      date: '2026-06-02T10:00:00Z',
      description: 'New Description',
      entries: [
        { accountId: 'acc-cash', entryType: 'CREDIT' as const, amount: 200 },
        { accountId: 'acc-rent', entryType: 'DEBIT' as const, amount: 200 },
      ],
    };

    mockEntityManager.findOne.mockImplementation(async (cls, options) => {
      if (cls === TransactionEntity) {
        return originalTx;
      }
      if (cls === AccountEntity) {
        // Return null if looking for Rent account to simulate not found/not owned
        const id = options.where.id;
        if (id === 'acc-rent') {
          return null;
        }
        return {
          id,
          userId,
          name: 'Cash Account',
          status: 'ACTIVE',
          currencyId: 'USD',
        };
      }
      return null;
    });

    await expect(useCase.execute(userId, transactionId, dto)).rejects.toThrow(NotFoundException);
  });
});
