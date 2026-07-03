import { Test, TestingModule } from '@nestjs/testing';
import { CreateTransactionUseCase } from '../../src/application/ledger/create-transaction.use-case';
import { DeleteTransactionUseCase } from '../../src/application/ledger/delete-transaction.use-case';
import { UpdateTransactionUseCase } from '../../src/application/ledger/update-transaction.use-case';
import { ReverseTransactionUseCase } from '../../src/application/ledger/reverse-transaction.use-case';
import { BalanceUpdateService } from '../../src/application/periods/balance-update.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TransactionEntity } from '../../src/infrastructure/database/entities/transaction.entity';
import { JournalEntryEntity } from '../../src/infrastructure/database/entities/journal-entry.entity';
import { AccountEntity } from '../../src/infrastructure/database/entities/account.entity';
import { CurrencyEntity } from '../../src/infrastructure/database/entities/currency.entity';
import { PeriodEntity } from '../../src/infrastructure/database/entities/period.entity';
import { FiscalYearEntity } from '../../src/infrastructure/database/entities/fiscal-year.entity';
import { AccountPeriodBalanceEntity } from '../../src/infrastructure/database/entities/account-period-balance.entity';
import { DataSource } from 'typeorm';
import { BadRequestException } from '@nestjs/common';

describe('Periods Locking Integration Tests', () => {
  let createUseCase: CreateTransactionUseCase;
  let deleteUseCase: DeleteTransactionUseCase;
  let updateUseCase: UpdateTransactionUseCase;
  let reverseUseCase: ReverseTransactionUseCase;

  let mockEntityManager: any;
  let mockDataSource: any;

  beforeEach(async () => {
    mockEntityManager = {
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn().mockImplementation((cls, entity) => Promise.resolve({ ...entity, id: entity.id || 'mock-saved-id' })),
      create: jest.fn().mockImplementation((cls, obj) => ({ id: 'mock-id', ...obj })),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
      remove: jest.fn().mockImplementation((cls, obj) => Promise.resolve(obj)),
      createQueryBuilder: jest.fn(),
    };

    mockDataSource = {
      transaction: jest.fn().mockImplementation(async (isolation, cb) => {
        const callback = typeof isolation === 'function' ? isolation : cb;
        return callback(mockEntityManager);
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateTransactionUseCase,
        DeleteTransactionUseCase,
        UpdateTransactionUseCase,
        ReverseTransactionUseCase,
        {
          provide: BalanceUpdateService,
          useValue: {
            updateBalances: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: getRepositoryToken(TransactionEntity),
          useValue: {},
        },
        {
          provide: getRepositoryToken(JournalEntryEntity),
          useValue: {},
        },
        {
          provide: getRepositoryToken(AccountEntity),
          useValue: {},
        },
        {
          provide: getRepositoryToken(CurrencyEntity),
          useValue: {},
        },
        {
          provide: getRepositoryToken(PeriodEntity),
          useValue: {},
        },
        {
          provide: getRepositoryToken(FiscalYearEntity),
          useValue: {},
        },
        {
          provide: getRepositoryToken(AccountPeriodBalanceEntity),
          useValue: {},
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    createUseCase = module.get<CreateTransactionUseCase>(CreateTransactionUseCase);
    deleteUseCase = module.get<DeleteTransactionUseCase>(DeleteTransactionUseCase);
    updateUseCase = module.get<UpdateTransactionUseCase>(UpdateTransactionUseCase);
    reverseUseCase = module.get<ReverseTransactionUseCase>(ReverseTransactionUseCase);
  });

  it('should block creating a transaction in a closed period', async () => {
    const userId = 'user-1';
    const dto = {
      accountingDate: '2026-03-15',
      description: 'Buying supplies',
      entries: [
        { accountId: 'acc-cash', entryType: 'CREDIT' as const, amount: 50 },
        { accountId: 'acc-supplies', entryType: 'DEBIT' as const, amount: 50 },
      ],
    };

    const mockQueryBuilder = {
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue({ id: 'period-1', status: 'CLOSED' }),
    };
    mockEntityManager.createQueryBuilder.mockReturnValue(mockQueryBuilder);

    await expect(createUseCase.execute(userId, dto)).rejects.toThrow(
      new BadRequestException('The accounting period for the transaction date is closed'),
    );
  });

  it('should block deleting a transaction in a closed period', async () => {
    const userId = 'user-1';
    const txId = 'tx-1';

    mockEntityManager.findOne.mockResolvedValue({
      id: txId,
      userId,
      accountingDate: '2026-03-15',
      entries: [],
    });

    const mockQueryBuilder = {
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue({ id: 'period-1', status: 'CLOSED' }),
    };
    mockEntityManager.createQueryBuilder.mockReturnValue(mockQueryBuilder);

    await expect(deleteUseCase.execute(userId, txId)).rejects.toThrow(
      new BadRequestException('The accounting period for the transaction date is closed'),
    );
  });

  it('should block updating a transaction if the original period is closed', async () => {
    const userId = 'user-1';
    const txId = 'tx-1';
    const dto = {
      accountingDate: '2026-03-16',
      description: 'Buying supplies updated',
      entries: [
        { accountId: 'acc-cash', entryType: 'CREDIT' as const, amount: 60 },
        { accountId: 'acc-supplies', entryType: 'DEBIT' as const, amount: 60 },
      ],
    };

    mockEntityManager.findOne.mockResolvedValue({
      id: txId,
      userId,
      accountingDate: '2026-03-15',
      entries: [],
    });

    const mockQueryBuilder = {
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue({ id: 'period-1', status: 'CLOSED' }),
    };
    mockEntityManager.createQueryBuilder.mockReturnValue(mockQueryBuilder);

    await expect(updateUseCase.execute(userId, txId, dto)).rejects.toThrow(
      new BadRequestException('The accounting period for the original transaction date is closed'),
    );
  });

  it('should block updating a transaction if the new period is closed', async () => {
    const userId = 'user-1';
    const txId = 'tx-1';
    const dto = {
      accountingDate: '2026-03-16',
      description: 'Buying supplies updated',
      entries: [
        { accountId: 'acc-cash', entryType: 'CREDIT' as const, amount: 60 },
        { accountId: 'acc-supplies', entryType: 'DEBIT' as const, amount: 60 },
      ],
    };

    mockEntityManager.findOne.mockResolvedValue({
      id: txId,
      userId,
      accountingDate: '2026-03-15',
      entries: [],
    });

    const mockQueryBuilderOpen = {
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue({ id: 'period-1', status: 'OPEN' }),
    };
    const mockQueryBuilderClosed = {
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue({ id: 'period-2', status: 'CLOSED' }),
    };

    mockEntityManager.createQueryBuilder
      .mockReturnValueOnce(mockQueryBuilderOpen)
      .mockReturnValueOnce(mockQueryBuilderClosed);

    await expect(updateUseCase.execute(userId, txId, dto)).rejects.toThrow(
      new BadRequestException('The accounting period for the new transaction date is closed'),
    );
  });

  it('should block reversing a transaction if reversal date is closed', async () => {
    const userId = 'user-1';
    const txId = 'tx-1';

    mockEntityManager.findOne.mockResolvedValue({
      id: txId,
      userId,
      accountingDate: '2026-03-15',
      status: 'POSTED',
      entries: [],
    });

    const mockQueryBuilder = {
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue({ id: 'period-1', status: 'CLOSED' }),
    };
    mockEntityManager.createQueryBuilder.mockReturnValue(mockQueryBuilder);

    await expect(reverseUseCase.execute(userId, txId)).rejects.toThrow(
      new BadRequestException('The accounting period for the reversal date is closed'),
    );
  });
});
