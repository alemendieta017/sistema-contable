import { Test, TestingModule } from '@nestjs/testing';
import { UpdatePeriodUseCase } from '../../src/application/periods/update-period.use-case';
import { BalanceUpdateService } from '../../src/application/periods/balance-update.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PeriodEntity } from '../../src/infrastructure/database/entities/period.entity';
import { FiscalYearEntity } from '../../src/infrastructure/database/entities/fiscal-year.entity';
import { AccountEntity } from '../../src/infrastructure/database/entities/account.entity';
import { AccountPeriodBalanceEntity } from '../../src/infrastructure/database/entities/account-period-balance.entity';
import { DataSource } from 'typeorm';

describe('Balance Roll Forward Integration Tests', () => {
  let updateUseCase: UpdatePeriodUseCase;
  let balanceUpdateService: BalanceUpdateService;
  let mockEntityManager: any;
  let mockDataSource: any;

  beforeEach(async () => {
    mockEntityManager = {
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn().mockImplementation((cls, entity) => Promise.resolve(entity)),
      create: jest.fn().mockImplementation((cls, obj) => obj),
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
        UpdatePeriodUseCase,
        BalanceUpdateService,
        {
          provide: getRepositoryToken(PeriodEntity),
          useValue: {},
        },
        {
          provide: getRepositoryToken(AccountEntity),
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

    updateUseCase = module.get<UpdatePeriodUseCase>(UpdatePeriodUseCase);
    balanceUpdateService = module.get<BalanceUpdateService>(BalanceUpdateService);
  });

  it('should trigger balance propagation when reopening a period (CLOSED -> OPEN)', async () => {
    const userId = 'user-1';
    const periodId = 'p-1';

    // Mock period and its fiscal year returned by findOne inside UpdatePeriodUseCase
    const mockPeriod = {
      id: periodId,
      fiscalYearId: 'fy-2026',
      name: '2026-01',
      startDate: new Date('2026-01-01T00:00:00Z'),
      endDate: new Date('2026-01-31T23:59:59Z'),
      status: 'CLOSED',
      fiscalYear: {
        id: 'fy-2026',
        userId: userId,
        name: '2026',
      },
    };

    mockEntityManager.findOne.mockImplementation(async (cls, options) => {
      if (cls === PeriodEntity) {
        return mockPeriod;
      }
      return null;
    });

    // Mock query builder for fetching all periods for the user in propagateBalancesFromPeriod
    const periodsMock = [
      {
        id: 'p-1',
        fiscalYearId: 'fy-2026',
        name: '2026-01',
        startDate: new Date('2026-01-01T00:00:00Z'),
        endDate: new Date('2026-01-31T23:59:59Z'),
        status: 'CLOSED',
        fiscalYear: { id: 'fy-2026', userId, name: '2026' },
      },
      {
        id: 'p-2',
        fiscalYearId: 'fy-2026',
        name: '2026-02',
        startDate: new Date('2026-02-01T00:00:00Z'),
        endDate: new Date('2026-02-28T23:59:59Z'),
        status: 'OPEN',
        fiscalYear: { id: 'fy-2026', userId, name: '2026' },
      },
      {
        id: 'p-3',
        fiscalYearId: 'fy-2027', // New Fiscal Year!
        name: '2027-01',
        startDate: new Date('2027-01-01T00:00:00Z'),
        endDate: new Date('2027-01-31T23:59:59Z'),
        status: 'OPEN',
        fiscalYear: { id: 'fy-2027', userId, name: '2027' },
      },
    ];

    const mockQueryBuilder = {
      innerJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue(periodsMock),
    };
    mockEntityManager.createQueryBuilder.mockReturnValue(mockQueryBuilder);

    // Mock accounts
    const mockAccounts = [
      { id: 'acc-asset', type: 'ASSET', userId },
      { id: 'acc-expense', type: 'EXPENSE', userId },
    ];

    // Mock current period balances in p-1
    const mockCurrentBalances = [
      {
        accountId: 'acc-asset',
        periodId: 'p-1',
        openingBalance: 100,
        totalDebits: 50,
        totalCredits: 20,
        closingBalance: 130, // 100 + 50 - 20
      },
      {
        accountId: 'acc-expense',
        periodId: 'p-1',
        openingBalance: 0,
        totalDebits: 40,
        totalCredits: 10,
        closingBalance: 30, // 0 + 40 - 10
      },
    ];

    // Mock finding entities in propagateBalancesFromPeriod
    mockEntityManager.find.mockImplementation(async (cls, options) => {
      if (cls === AccountPeriodBalanceEntity) {
        if (options && options.where && options.where.periodId === 'p-1') {
          return mockCurrentBalances;
        }
        return [];
      }
      if (cls === AccountEntity) {
        return mockAccounts;
      }
      return [];
    });

    // Mock existing subsequent balances (or lack thereof)
    const existingBalances = new Map<string, any>();
    existingBalances.set('acc-asset:p-2', {
      accountId: 'acc-asset',
      periodId: 'p-2',
      openingBalance: 0,
      totalDebits: 10,
      totalCredits: 5,
      closingBalance: 5,
    });
    existingBalances.set('acc-expense:p-2', {
      accountId: 'acc-expense',
      periodId: 'p-2',
      openingBalance: 0,
      totalDebits: 20,
      totalCredits: 0,
      closingBalance: 20,
    });

    mockEntityManager.findOne.mockImplementation(async (cls, options) => {
      if (cls === PeriodEntity) {
        return mockPeriod;
      }
      if (cls === AccountPeriodBalanceEntity) {
        const where = options.where;
        const key = `${where.accountId}:${where.periodId}`;
        return existingBalances.get(key) || null;
      }
      return null;
    });

    const savedBalances: any[] = [];
    mockEntityManager.save.mockImplementation(async (cls, entity) => {
      if (cls === AccountPeriodBalanceEntity || entity.openingBalance !== undefined) {
        savedBalances.push(entity);
      }
      return entity;
    });

    // Call UseCase
    const result = await updateUseCase.execute(userId, periodId, { status: 'OPEN' });

    expect(result.status).toBe('OPEN');

    // Asset account propagation checks:
    // Period 2 (p-2):
    // Expected opening balance: 130 (closing of p-1)
    // debits = 10, credits = 5. Nature is ASSET (debit).
    // Expected closing: 130 + 10 - 5 = 135
    const assetP2 = savedBalances.find((b) => b.accountId === 'acc-asset' && b.periodId === 'p-2');
    expect(assetP2).toBeDefined();
    expect(assetP2.openingBalance).toBe(130);
    expect(assetP2.closingBalance).toBe(135);

    // Period 3 (p-3):
    // Expected opening balance: 135 (closing of p-2). Since ASSET is permanent, it carries forward even to a new FY.
    // debits = 0, credits = 0.
    // Expected closing: 135
    const assetP3 = savedBalances.find((b) => b.accountId === 'acc-asset' && b.periodId === 'p-3');
    expect(assetP3).toBeDefined();
    expect(assetP3.openingBalance).toBe(135);
    expect(assetP3.closingBalance).toBe(135);

    // Expense account propagation checks:
    // Period 2 (p-2):
    // Expected opening balance: 30 (closing of p-1)
    // debits = 20, credits = 0. Nature is EXPENSE (debit).
    // Expected closing: 30 + 20 - 0 = 50
    const expenseP2 = savedBalances.find((b) => b.accountId === 'acc-expense' && b.periodId === 'p-2');
    expect(expenseP2).toBeDefined();
    expect(expenseP2.openingBalance).toBe(30);
    expect(expenseP2.closingBalance).toBe(50);

    // Period 3 (p-3):
    // Expected opening balance: 0. Since EXPENSE is temporary and p-3 is the first period of a new fiscal year (fy-2027).
    // debits = 0, credits = 0.
    // Expected closing: 0 + 0 - 0 = 0
    const expenseP3 = savedBalances.find((b) => b.accountId === 'acc-expense' && b.periodId === 'p-3');
    expect(expenseP3).toBeDefined();
    expect(expenseP3.openingBalance).toBe(0);
    expect(expenseP3.closingBalance).toBe(0);
  });
});
