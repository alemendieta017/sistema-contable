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
import { AccountPeriodBalanceEntity } from '../../src/infrastructure/database/entities/account-period-balance.entity';
import { EnsurePeriodService } from '../../src/application/periods/ensure-period.service';
import { DataSource } from 'typeorm';

describe('Continuous Periods Non-Blocking Integration Tests (SCO-42)', () => {
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
      save: jest
        .fn()
        .mockImplementation((cls, entity) =>
          Promise.resolve({ ...entity, id: entity.id || 'mock-saved-id' }),
        ),
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
          provide: EnsurePeriodService,
          useValue: {
            ensurePeriod: jest.fn().mockResolvedValue({ id: 'period-1', name: '2026-03' }),
          },
        },
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

  it('should seamlessly create a transaction in any historical or future continuous period', async () => {
    const userId = 'user-1';
    const dto = {
      accountingDate: '2026-03-15',
      description: 'Buying supplies',
      entries: [
        { accountId: 'acc-cash', entryType: 'CREDIT' as const, amount: 50 },
        { accountId: 'acc-supplies', entryType: 'DEBIT' as const, amount: 50 },
      ],
    };

    mockEntityManager.findOne.mockImplementation(async (entityClass: any, options: any) => {
      if (entityClass === AccountEntity || entityClass?.name === 'AccountEntity') {
        const id = options?.where?.id;
        if (id === 'acc-cash') {
          return {
            id: 'acc-cash',
            userId,
            type: 'ASSET',
            status: 'ACTIVE',
            systemRole: null,
            currencyId: 'curr-1',
          };
        }
        if (id === 'acc-supplies') {
          return {
            id: 'acc-supplies',
            userId,
            type: 'EXPENSE',
            status: 'ACTIVE',
            systemRole: null,
            currencyId: 'curr-1',
          };
        }
      }
      if (entityClass === CurrencyEntity || entityClass?.name === 'CurrencyEntity') {
        return { id: 'curr-1', code: 'USD', exchangeRate: '1.0' };
      }
      return null;
    });

    const result = await createUseCase.execute(userId, dto);
    expect(result).toBeDefined();
    expect(result.description).toBe('Buying supplies');
  });

  it('should seamlessly delete a transaction in continuous periods', async () => {
    const userId = 'user-1';
    const txId = 'tx-1';

    mockEntityManager.findOne.mockResolvedValue({
      id: txId,
      userId,
      accountingDate: '2026-03-15',
      entries: [],
    });

    const result = await deleteUseCase.execute(userId, txId);
    expect(result).toEqual({ success: true, id: txId });
  });

  it('should seamlessly update a transaction across continuous periods', async () => {
    const userId = 'user-1';
    const txId = 'tx-1';
    const dto = {
      accountingDate: '2026-04-15',
      description: 'Updated supplies',
      entries: [
        { accountId: 'acc-cash', entryType: 'CREDIT' as const, amount: 60 },
        { accountId: 'acc-supplies', entryType: 'DEBIT' as const, amount: 60 },
      ],
    };

    mockEntityManager.findOne.mockImplementation(async (entityClass: any, options: any) => {
      if (entityClass === TransactionEntity || entityClass?.name === 'TransactionEntity') {
        return {
          id: txId,
          userId,
          accountingDate: '2026-03-15',
          status: 'POSTED',
          reversalOfId: null,
          entries: [],
        };
      }
      if (entityClass === AccountEntity || entityClass?.name === 'AccountEntity') {
        const id = options?.where?.id;
        if (id === 'acc-cash') {
          return {
            id: 'acc-cash',
            userId,
            type: 'ASSET',
            status: 'ACTIVE',
            systemRole: null,
            currencyId: 'curr-1',
          };
        }
        if (id === 'acc-supplies') {
          return {
            id: 'acc-supplies',
            userId,
            type: 'EXPENSE',
            status: 'ACTIVE',
            systemRole: null,
            currencyId: 'curr-1',
          };
        }
      }
      if (entityClass === CurrencyEntity || entityClass?.name === 'CurrencyEntity') {
        return { id: 'curr-1', code: 'USD', exchangeRate: '1.0' };
      }
      return null;
    });

    const result = await updateUseCase.execute(userId, txId, dto);
    expect(result).toBeDefined();
    expect(result.description).toBe('Updated supplies');
  });

  it('should seamlessly reverse a transaction in continuous periods', async () => {
    const userId = 'user-1';
    const txId = 'tx-1';

    mockEntityManager.findOne.mockResolvedValue({
      id: txId,
      userId,
      accountingDate: '2026-03-15',
      status: 'POSTED',
      reversalOfId: null,
      entries: [
        { accountId: 'acc-cash', entryType: 'CREDIT', amount: '50', amountBase: '50' },
        { accountId: 'acc-supplies', entryType: 'DEBIT', amount: '50', amountBase: '50' },
      ],
    });

    const result = await reverseUseCase.execute(userId, txId);
    expect(result).toBeDefined();
    expect(result.status).toBe('POSTED');
  });
});
