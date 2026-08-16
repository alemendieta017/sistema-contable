import { Test, TestingModule } from '@nestjs/testing';
import { GetAccountsSummaryUseCase } from '../../src/application/accounts/get-accounts-summary.use-case';
import { AccountEntity } from '../../src/infrastructure/database/entities/account.entity';
import { PeriodEntity } from '../../src/infrastructure/database/entities/period.entity';
import { AccountPeriodBalanceEntity } from '../../src/infrastructure/database/entities/account-period-balance.entity';
import { DataSource } from 'typeorm';

describe('Balance Calculation and Net Worth Integration Tests', () => {
  let useCase: GetAccountsSummaryUseCase;
  let mockEntityManager: any;

  const mockDataSource = {
    transaction: jest.fn().mockImplementation(async (isolation, cb) => {
      const callback = typeof isolation === 'function' ? isolation : cb;
      return callback(mockEntityManager);
    }),
  };

  beforeEach(async () => {
    mockEntityManager = {
      find: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetAccountsSummaryUseCase,
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    useCase = module.get<GetAccountsSummaryUseCase>(GetAccountsSummaryUseCase);
  });

  it('should correctly fallback to calculating all journal entries when no closed periods exist', async () => {
    const userId = 'user-uuid';

    // Mock accounts list
    mockEntityManager.find.mockResolvedValue([
      { id: 'acc-cash', name: 'Cash', type: 'ASSET' },
      { id: 'acc-bank', name: 'Bank', type: 'ASSET' },
      { id: 'acc-debt', name: 'Loan', type: 'LIABILITY' },
      { id: 'acc-food', name: 'Food', type: 'EXPENSE' },
    ]);

    // Period query returns null (no closed period)
    const periodQueryBuilder = {
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(null),
    };

    // Entry query builder
    const entryQueryBuilder = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      addGroupBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([
        { accountId: 'acc-cash', entryType: 'DEBIT', sum: '100000.0000' },
        { accountId: 'acc-cash', entryType: 'CREDIT', sum: '30000.0000' },
        { accountId: 'acc-bank', entryType: 'DEBIT', sum: '50000.0000' },
        { accountId: 'acc-bank', entryType: 'CREDIT', sum: '10000.0000' },
        { accountId: 'acc-debt', entryType: 'CREDIT', sum: '20000.0000' },
        { accountId: 'acc-food', entryType: 'DEBIT', sum: '15000.0000' },
      ]),
    };

    mockEntityManager.createQueryBuilder.mockImplementation((entity: any) => {
      if (entity === PeriodEntity) return periodQueryBuilder;
      return entryQueryBuilder;
    });

    const result = await useCase.execute(userId);

    expect(result).toBeDefined();
    // Assets: Cash (70k) + Bank (40k) = 110k
    // Liabilities: Loan = 20k
    // Net Worth = 110k - 20k = 90k
    expect(result.netWorth).toBe(90000);
    expect(result.totalAssets).toBe(110000);
    expect(result.totalLiabilities).toBe(20000);

    const cashSummary = result.accounts.find((a: any) => a.id === 'acc-cash');
    expect(cashSummary?.balance).toBe(70000);
    expect(entryQueryBuilder.andWhere).not.toHaveBeenCalled();
  });

  it('should accurately combine account_period_balances snapshot with incremental journal entries after last closed period', async () => {
    const userId = 'user-uuid';

    mockEntityManager.find.mockImplementation((entity: any) => {
      if (entity === AccountEntity) {
        return Promise.resolve([
          { id: 'acc-cash', name: 'Cash', type: 'ASSET' },
          { id: 'acc-bank', name: 'Bank', type: 'ASSET' },
          { id: 'acc-debt', name: 'Loan', type: 'LIABILITY' },
          { id: 'acc-new', name: 'New Account Post-Close', type: 'ASSET' },
          { id: 'acc-inactive', name: 'Old Account Inactive', type: 'ASSET', status: 'INACTIVE' },
        ]);
      }
      if (entity === AccountPeriodBalanceEntity) {
        // Balances from latest closed period (May 2026)
        return Promise.resolve([
          { accountId: 'acc-cash', closingBalance: 100000 },
          { accountId: 'acc-bank', closingBalance: 50000 },
          { accountId: 'acc-debt', closingBalance: 30000 },
          { accountId: 'acc-inactive', closingBalance: 12000 },
          // acc-new is NOT in period balances (created in June)
        ]);
      }
      return Promise.resolve([]);
    });

    const periodQueryBuilder = {
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue({
        id: 'period-may-2026',
        name: '2026-05',
        endDate: '2026-05-31',
        status: 'CLOSED',
      }),
    };

    const entryQueryBuilder = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      addGroupBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([
        // June movements:
        // Cash: +20000 debit, -5000 credit -> delta = +15000. Total = 100000 + 15000 = 115000
        { accountId: 'acc-cash', entryType: 'DEBIT', sum: '20000.0000' },
        { accountId: 'acc-cash', entryType: 'CREDIT', sum: '5000.0000' },
        // Bank: -10000 credit -> delta = -10000. Total = 50000 - 10000 = 40000
        { accountId: 'acc-bank', entryType: 'CREDIT', sum: '10000.0000' },
        // Debt: 5000 debit -> delta = -5000. Total = 30000 - 5000 = 25000
        { accountId: 'acc-debt', entryType: 'DEBIT', sum: '5000.0000' },
        // New Account: +8000 debit -> Total = 0 + 8000 = 8000
        { accountId: 'acc-new', entryType: 'DEBIT', sum: '8000.0000' },
        // acc-inactive: 0 movements in June -> Total = 12000 + 0 = 12000
      ]),
    };

    mockEntityManager.createQueryBuilder.mockImplementation((entity: any) => {
      if (entity === PeriodEntity) return periodQueryBuilder;
      return entryQueryBuilder;
    });

    const result = await useCase.execute(userId);

    // Verify strict date filter: tx.accountingDate > '2026-05-31'
    expect(entryQueryBuilder.andWhere).toHaveBeenCalledWith(
      'tx.accountingDate > :lastClosedEndDate',
      { lastClosedEndDate: '2026-05-31' },
    );

    // Assert account balances
    const cash = result.accounts.find((a: any) => a.id === 'acc-cash');
    expect(cash?.balance).toBe(115000);

    const bank = result.accounts.find((a: any) => a.id === 'acc-bank');
    expect(bank?.balance).toBe(40000);

    const debt = result.accounts.find((a: any) => a.id === 'acc-debt');
    expect(debt?.balance).toBe(25000);

    const newAcc = result.accounts.find((a: any) => a.id === 'acc-new');
    expect(newAcc?.balance).toBe(8000);

    const inactiveAcc = result.accounts.find((a: any) => a.id === 'acc-inactive');
    expect(inactiveAcc?.balance).toBe(12000);

    // Total Assets: Cash (115k) + Bank (40k) + New (8k) + Inactive (12k) = 175000
    expect(result.totalAssets).toBe(175000);

    // Total Liabilities: Debt = 25000
    expect(result.totalLiabilities).toBe(25000);

    // Net Worth = 175000 - 25000 = 150000
    expect(result.netWorth).toBe(150000);
  });
});
