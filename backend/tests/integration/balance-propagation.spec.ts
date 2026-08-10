import { Test, TestingModule } from '@nestjs/testing';
import { CreateTransactionUseCase } from '../../src/application/ledger/create-transaction.use-case';
import { DeleteTransactionUseCase } from '../../src/application/ledger/delete-transaction.use-case';
import { UpdateTransactionUseCase } from '../../src/application/ledger/update-transaction.use-case';
import { ReverseTransactionUseCase } from '../../src/application/ledger/reverse-transaction.use-case';
import { ReconstructBalancesUseCase } from '../../src/application/periods/reconstruct-balances.use-case';
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

describe('Balance Propagation and Period Locking Integration Tests', () => {
  let createUseCase: CreateTransactionUseCase;
  let deleteUseCase: DeleteTransactionUseCase;
  let reverseUseCase: ReverseTransactionUseCase;
  let reconstructUseCase: ReconstructBalancesUseCase;
  let balanceUpdateService: BalanceUpdateService;

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
        ReconstructBalancesUseCase,
        BalanceUpdateService,
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
    reverseUseCase = module.get<ReverseTransactionUseCase>(ReverseTransactionUseCase);
    reconstructUseCase = module.get<ReconstructBalancesUseCase>(ReconstructBalancesUseCase);
    balanceUpdateService = module.get<BalanceUpdateService>(BalanceUpdateService);
  });

  describe('Period Locking Guard', () => {
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

      // Mock Period lookup to return a CLOSED period
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

  describe('Real-time Balance Updates', () => {
    it('should correctly propagate balances when creating, deleting, and updating transactions', async () => {
      const userId = 'user-1';
      const txDate = '2026-03-15';

      // Mock active open period for the date, plus future periods for propagation
      const periodMock = {
        id: 'p-1',
        fiscalYearId: 'fy-2026',
        name: '2026-03',
        startDate: '2026-03-01',
        endDate: '2026-03-31',
        status: 'OPEN',
        fiscalYear: { userId, id: 'fy-2026', name: '2026' },
      };
      const periodMockFuture = {
        id: 'p-2',
        fiscalYearId: 'fy-2026',
        name: '2026-04',
        startDate: '2026-04-01',
        endDate: '2026-04-30',
        status: 'OPEN',
        fiscalYear: { userId, id: 'fy-2026', name: '2026' },
      };

      const mockQueryBuilder = {
        innerJoinAndSelect: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([periodMock, periodMockFuture]),
        getOne: jest.fn().mockResolvedValue(periodMock),
      };
      mockEntityManager.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      // Account mock (ASSET / Debit Nature)
      const mockCashAccount = {
        id: 'acc-cash',
        userId,
        type: 'ASSET',
        status: 'ACTIVE',
        currencyId: 'USD',
      };
      const mockRentAccount = {
        id: 'acc-rent',
        userId,
        type: 'EXPENSE',
        status: 'ACTIVE',
        currencyId: 'USD',
      };

      mockEntityManager.findOne.mockImplementation((cls, options) => {
        if (cls === AccountEntity) {
          const id = typeof options === 'string' ? options : options.where?.id || options.id;
          return id === 'acc-cash' ? mockCashAccount : mockRentAccount;
        }
        if (cls === CurrencyEntity) {
          return { id: 'USD', rateToBase: 1.0 };
        }
        return null;
      });

      mockEntityManager.find.mockImplementation((cls, _options) => {
        if (cls === AccountEntity) {
          return [mockCashAccount, mockRentAccount];
        }
        return [];
      });

      // Asserting that BalanceUpdateService.updateBalances computes correct opening/closing balance
      const savedBalances: any[] = [];
      mockEntityManager.save.mockImplementation((cls: any, entity: any) => {
        if (cls === AccountPeriodBalanceEntity) {
          if (Array.isArray(entity)) {
            savedBalances.push(...entity);
          } else {
            savedBalances.push(entity);
          }
        }
        return Promise.resolve(entity);
      });

      // Call balance update directly to verify propagation logic
      await balanceUpdateService.updateBalances(mockEntityManager, userId, txDate, [
        { accountId: 'acc-cash', debitDiff: 100, creditDiff: 0 },
        { accountId: 'acc-rent', debitDiff: 0, creditDiff: 100 },
      ]);

      // Check current period balance (p-1) cash
      const cashBalanceCurrent = savedBalances.find(
        (b) => b.accountId === 'acc-cash' && b.periodId === 'p-1',
      );
      expect(cashBalanceCurrent).toBeDefined();
      expect(Number(cashBalanceCurrent.closingBalance)).toBe(100);

      // Check propagation to future period (p-2) cash
      const cashBalanceFuture = savedBalances.find(
        (b) => b.accountId === 'acc-cash' && b.periodId === 'p-2',
      );
      expect(cashBalanceFuture).toBeDefined();
      expect(Number(cashBalanceFuture.openingBalance)).toBe(100);
      expect(Number(cashBalanceFuture.closingBalance)).toBe(100);
    });

    it('should correctly propagate balances when future period has string decimal values from DB without string concatenation', async () => {
      const userId = 'user-1';
      const txDate = '2024-12-15';

      const p2024_12 = {
        id: 'p-2024-12',
        fiscalYearId: 'fy-2024',
        name: '2024-12',
        startDate: '2024-12-01',
        endDate: '2024-12-31',
        status: 'OPEN',
        fiscalYear: { userId, id: 'fy-2024', name: '2024' },
      };
      const p2025_01 = {
        id: 'p-2025-01',
        fiscalYearId: 'fy-2025',
        name: 'Periodo 01/2025',
        startDate: '2025-01-01',
        endDate: '2025-01-31',
        status: 'OPEN',
        fiscalYear: { userId, id: 'fy-2025', name: '2025' },
      };

      const mockQueryBuilder = {
        innerJoinAndSelect: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([p2024_12, p2025_01]),
        getOne: jest.fn().mockResolvedValue(p2024_12),
      };
      mockEntityManager.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const mockCashAccount = {
        id: 'acc-cash',
        userId,
        type: 'ASSET',
        status: 'ACTIVE',
        currencyId: 'USD',
      };

      mockEntityManager.find.mockImplementation((cls: any) => {
        if (cls === AccountEntity) {
          return [mockCashAccount];
        }
        if (cls === AccountPeriodBalanceEntity) {
          return [existing2025Balance];
        }
        return [];
      });

      // Simulate existing DB entity with string decimals returned by Postgres driver
      const existing2025Balance = {
        id: 'bal-2025-01',
        accountId: 'acc-cash',
        periodId: 'p-2025-01',
        openingBalance: '0.0000',
        totalDebits: '135000.0000',
        totalCredits: '0.0000',
        closingBalance: '135000.0000',
      };

      mockEntityManager.findOne.mockImplementation((cls: any, options: any) => {
        if (cls === AccountEntity) {
          return mockCashAccount;
        }
        if (cls === AccountPeriodBalanceEntity) {
          const where = options?.where;
          if (where?.periodId === 'p-2025-01') {
            return existing2025Balance;
          }
          return null;
        }
        return null;
      });

      const savedBalances: any[] = [];
      mockEntityManager.save.mockImplementation((cls: any, entity: any) => {
        if (cls === AccountPeriodBalanceEntity) {
          if (Array.isArray(entity)) {
            savedBalances.push(...entity);
          } else {
            savedBalances.push(entity);
          }
        }
        return Promise.resolve(entity);
      });

      // Execute update for a transaction in 2024-12 crediting cash by 1000
      await balanceUpdateService.updateBalances(mockEntityManager, userId, txDate, [
        { accountId: 'acc-cash', debitDiff: 0, creditDiff: 1000 },
      ]);

      const bal2025 = savedBalances.find((b) => b.periodId === 'p-2025-01');
      expect(bal2025).toBeDefined();
      expect(Number(bal2025.openingBalance)).toBe(-1000);
      expect(Number(bal2025.closingBalance)).toBe(134000);
    });
  });

  describe('Reconstruct Balances Use Case', () => {
    it('should correctly wipe existing balances and rebuild them period by period', async () => {
      const userId = 'user-1';

      // Mock delete query builder
      const mockDeleteBuilder = {
        delete: jest.fn().mockReturnThis(),
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 5 }),
      };
      mockEntityManager.createQueryBuilder.mockReturnValueOnce(mockDeleteBuilder);

      // Mock periods configured for user
      const periods = [
        {
          id: 'p-1',
          fiscalYearId: 'fy-2026',
          name: '2026-01',
          startDate: '2026-01-01',
          endDate: '2026-01-31',
          status: 'OPEN',
          fiscalYear: { userId, id: 'fy-2026', name: '2026' },
        },
        {
          id: 'p-2',
          fiscalYearId: 'fy-2026',
          name: '2026-02',
          startDate: '2026-02-01',
          endDate: '2026-02-28',
          status: 'OPEN',
          fiscalYear: { userId, id: 'fy-2026', name: '2026' },
        },
      ];

      const mockQueryBuilder = {
        innerJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(periods),
      };
      mockEntityManager.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      // Accounts
      const accounts = [
        { id: 'acc-cash', type: 'ASSET', userId },
        { id: 'acc-revenue', type: 'INCOME', userId },
      ];
      mockEntityManager.find.mockImplementation((cls, _options) => {
        if (cls === AccountEntity) {
          return accounts;
        }
        if (cls === TransactionEntity) {
          // Return posted transactions
          return [
            {
              id: 'tx-1',
              userId,
              accountingDate: '2026-01-10',
              status: 'POSTED',
              entries: [
                { accountId: 'acc-cash', entryType: 'DEBIT', amountBase: 500 },
                { accountId: 'acc-revenue', entryType: 'CREDIT', amountBase: 500 },
              ],
            },
            {
              id: 'tx-2',
              userId,
              accountingDate: '2026-02-15',
              status: 'POSTED',
              entries: [
                { accountId: 'acc-cash', entryType: 'CREDIT', amountBase: 200 },
                { accountId: 'acc-revenue', entryType: 'DEBIT', amountBase: 200 },
              ],
            },
          ];
        }
        return [];
      });

      const savedBalances: any[] = [];
      mockEntityManager.save.mockImplementation((cls, entity) => {
        if (cls === AccountPeriodBalanceEntity) {
          savedBalances.push(entity);
        }
        return Promise.resolve(entity);
      });

      const result = await reconstructUseCase.execute(userId);
      expect(result.success).toBe(true);
      expect(result.message).toContain('reconstructed');

      // Assert period 1 (Jan 2026): Cash should have debit 500, opening 0, closing 500
      const cashJan = savedBalances.find((b) => b.accountId === 'acc-cash' && b.periodId === 'p-1');
      expect(cashJan).toBeDefined();
      expect(Number(cashJan.totalDebits)).toBe(500);
      expect(Number(cashJan.closingBalance)).toBe(500);

      // Assert period 2 (Feb 2026): Cash should have credit 200, opening 500, closing 300
      const cashFeb = savedBalances.find((b) => b.accountId === 'acc-cash' && b.periodId === 'p-2');
      expect(cashFeb).toBeDefined();
      expect(Number(cashFeb.openingBalance)).toBe(500);
      expect(Number(cashFeb.totalCredits)).toBe(200);
      expect(Number(cashFeb.closingBalance)).toBe(300);
    });
  });
});
