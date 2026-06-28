import { Test, TestingModule } from '@nestjs/testing';
import { CreateTransactionUseCase } from '../../src/application/ledger/create-transaction.use-case';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TransactionEntity } from '../../src/infrastructure/database/entities/transaction.entity';
import { JournalEntryEntity } from '../../src/infrastructure/database/entities/journal-entry.entity';
import { AccountEntity } from '../../src/infrastructure/database/entities/account.entity';
import { BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';

describe('Ledger Validation Integration Tests (Double-Entry)', () => {
  let useCase: CreateTransactionUseCase;
  let mockEntityManager: any;

  const mockTransactionRepo = {};
  const mockAccountRepo = {};
  const mockJournalEntryRepo = {};

  const mockDataSource = {
    transaction: jest.fn().mockImplementation(async (isolation, cb) => {
      const callback = typeof isolation === 'function' ? isolation : cb;
      return callback(mockEntityManager);
    }),
  };

  beforeEach(async () => {
    mockEntityManager = {
      findOne: jest.fn(),
      create: jest.fn().mockImplementation((cls, obj) => ({ id: 'mock-id', ...obj })),
      save: jest.fn().mockImplementation((cls, entity) => Promise.resolve({ ...entity, id: 'saved-id' })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateTransactionUseCase,
        {
          provide: getRepositoryToken(TransactionEntity),
          useValue: mockTransactionRepo,
        },
        {
          provide: getRepositoryToken(AccountEntity),
          useValue: mockAccountRepo,
        },
        {
          provide: getRepositoryToken(JournalEntryEntity),
          useValue: mockJournalEntryRepo,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    useCase = module.get<CreateTransactionUseCase>(CreateTransactionUseCase);
  });

  it('should save a balanced transaction successfully (Sum of Debits === Sum of Credits)', async () => {
    // Arrange
    const userId = 'user-uuid';
    const dto = {
      date: new Date().toISOString(),
      description: 'Compra supermercado',
      entries: [
        { accountId: 'acc-cash', entryType: 'CREDIT' as const, amount: 50000 },
        { accountId: 'acc-food', entryType: 'DEBIT' as const, amount: 50000 },
      ],
    };

    mockEntityManager.findOne.mockImplementation((cls, options) => {
      const id = options.where.id;
      return Promise.resolve({
        id,
        userId,
        name: id === 'acc-cash' ? 'Efectivo' : 'Comida',
        type: id === 'acc-cash' ? 'ASSET' : 'EXPENSE',
        status: 'ACTIVE',
        currency: { rateToBase: 1.0 },
      });
    });

    // Act
    const result = await useCase.execute(userId, dto);

    // Assert
    expect(result).toBeDefined();
    expect(result.id).toBe('saved-id');
    expect(result.entries).toHaveLength(2);
    expect(mockDataSource.transaction).toHaveBeenCalled();
  });

  it('should throw BadRequestException if debits and credits do not balance (FR-002)', async () => {
    // Arrange
    const userId = 'user-uuid';
    const dto = {
      date: new Date().toISOString(),
      description: 'Asiento descuadrado',
      entries: [
        { accountId: 'acc-cash', entryType: 'CREDIT' as const, amount: 50000 },
        { accountId: 'acc-food', entryType: 'DEBIT' as const, amount: 48000 }, // Descuadrado por 2000
      ],
    };

    mockEntityManager.findOne.mockImplementation((cls, options) => {
      const id = options.where.id;
      return Promise.resolve({
        id,
        userId,
        name: id === 'acc-cash' ? 'Efectivo' : 'Comida',
        type: id === 'acc-cash' ? 'ASSET' : 'EXPENSE',
        status: 'ACTIVE',
        currency: { rateToBase: 1.0 },
      });
    });

    // Act & Assert
    await expect(useCase.execute(userId, dto)).rejects.toThrow(
      new BadRequestException('Transaction is unbalanced by 2000'),
    );
  });
});
