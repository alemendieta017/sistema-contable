import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BalanceSheetUseCase } from '../../src/application/periods/balance-sheet.use-case';
import { IncomeStatementUseCase } from '../../src/application/periods/income-statement.use-case';
import { PeriodEntity } from '../../src/infrastructure/database/entities/period.entity';
import { AccountEntity } from '../../src/infrastructure/database/entities/account.entity';
import { AccountPeriodBalanceEntity } from '../../src/infrastructure/database/entities/account-period-balance.entity';
import { JournalEntryEntity } from '../../src/infrastructure/database/entities/journal-entry.entity';
import { FiscalYearEntity } from '../../src/infrastructure/database/entities/fiscal-year.entity';

describe('Fast Reports (Balance Sheet & Income Statement) Integration Tests', () => {
  let balanceSheetUseCase: BalanceSheetUseCase;
  let incomeStatementUseCase: IncomeStatementUseCase;

  let mockPeriodRepo: jest.Mocked<Partial<Repository<PeriodEntity>>>;
  let mockAccountRepo: jest.Mocked<Partial<Repository<AccountEntity>>>;
  let mockBalanceRepo: jest.Mocked<Partial<Repository<AccountPeriodBalanceEntity>>>;
  let mockJournalEntryRepo: any;
  let mockFiscalYearRepo: any;
  let mockDataSource: any;

  beforeEach(async () => {
    mockPeriodRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
    };
    mockAccountRepo = {
      find: jest.fn(),
    };
    mockBalanceRepo = {
      find: jest.fn(),
    };

    mockJournalEntryRepo = {
      createQueryBuilder: jest.fn(),
    };
    mockFiscalYearRepo = {
      createQueryBuilder: jest.fn(),
    };

    mockDataSource = {
      getRepository: jest.fn().mockImplementation((entity) => {
        if (entity === JournalEntryEntity) return mockJournalEntryRepo;
        if (entity === FiscalYearEntity) return mockFiscalYearRepo;
        if (entity === AccountEntity) return mockAccountRepo;
        if (entity === PeriodEntity) return mockPeriodRepo;
        if (entity === AccountPeriodBalanceEntity) return mockBalanceRepo;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BalanceSheetUseCase,
        IncomeStatementUseCase,
        {
          provide: getRepositoryToken(PeriodEntity),
          useValue: mockPeriodRepo,
        },
        {
          provide: getRepositoryToken(AccountEntity),
          useValue: mockAccountRepo,
        },
        {
          provide: getRepositoryToken(AccountPeriodBalanceEntity),
          useValue: mockBalanceRepo,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    balanceSheetUseCase = module.get<BalanceSheetUseCase>(BalanceSheetUseCase);
    incomeStatementUseCase = module.get<IncomeStatementUseCase>(IncomeStatementUseCase);
  });

  describe('BalanceSheetUseCase', () => {
    const userId = 'user-uuid';
    const periodId = 'period-uuid';

    it('should throw NotFoundException if period does not exist or does not belong to the user', async () => {
      mockPeriodRepo.findOne!.mockResolvedValue(null);

      await expect(
        balanceSheetUseCase.execute(userId, { mode: 'period', periodId }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should calculate balance sheet correctly and verify if balanced', async () => {
      const mockPeriod = {
        id: periodId,
        name: '2026-03',
        fiscalYearId: 'fy-uuid',
      } as PeriodEntity;

      const mockAccounts = [
        {
          id: 'acc-asset-1',
          name: 'Cash',
          type: 'ASSET',
          status: 'ACTIVE',
          userId,
        } as AccountEntity,
        {
          id: 'acc-asset-2',
          name: 'Accounts Receivable',
          type: 'ASSET',
          status: 'ACTIVE',
          userId,
        } as AccountEntity,
        {
          id: 'acc-liability-1',
          name: 'Accounts Payable',
          type: 'LIABILITY',
          status: 'ACTIVE',
          userId,
        } as AccountEntity,
        {
          id: 'acc-equity-1',
          name: 'Common Stock',
          type: 'EQUITY',
          status: 'ACTIVE',
          userId,
        } as AccountEntity,
      ];

      const mockBalances = [
        {
          accountId: 'acc-asset-1',
          periodId,
          closingBalance: 15000.5,
        } as AccountPeriodBalanceEntity,
        {
          accountId: 'acc-liability-1',
          periodId,
          closingBalance: 5000.2,
        } as AccountPeriodBalanceEntity,
        {
          accountId: 'acc-equity-1',
          periodId,
          closingBalance: 10000.3,
        } as AccountPeriodBalanceEntity,
      ];

      mockPeriodRepo.findOne!.mockResolvedValue(mockPeriod);
      mockAccountRepo.find!.mockResolvedValue(mockAccounts);
      mockBalanceRepo.find!.mockResolvedValue(mockBalances);

      const result = (await balanceSheetUseCase.execute(userId, {
        mode: 'period',
        periodId,
      })) as any;

      expect(result.period).toBe('2026-03');
      expect(result.assets).toEqual([
        { accountId: 'acc-asset-2', name: 'Accounts Receivable', balance: 0.0 },
        { accountId: 'acc-asset-1', name: 'Cash', balance: 15000.5 },
      ]);
      expect(result.liabilities).toEqual([
        { accountId: 'acc-liability-1', name: 'Accounts Payable', balance: 5000.2 },
      ]);
      expect(result.equity).toEqual([
        { accountId: 'acc-equity-1', name: 'Common Stock', balance: 10000.3 },
      ]);

      expect(result.totalAssets).toBe(15000.5);
      expect(result.totalLiabilities).toBe(5000.2);
      expect(result.totalEquity).toBe(10000.3);
      expect(result.balanced).toBe(true);
    });

    it('should return balanced false if assets != liabilities + equity', async () => {
      const mockPeriod = {
        id: periodId,
        name: '2026-03',
        fiscalYearId: 'fy-uuid',
      } as PeriodEntity;

      const mockAccounts = [
        {
          id: 'acc-asset-1',
          name: 'Cash',
          type: 'ASSET',
          status: 'ACTIVE',
          userId,
        } as AccountEntity,
        {
          id: 'acc-liability-1',
          name: 'Accounts Payable',
          type: 'LIABILITY',
          status: 'ACTIVE',
          userId,
        } as AccountEntity,
      ];

      const mockBalances = [
        { accountId: 'acc-asset-1', periodId, closingBalance: 100.0 } as AccountPeriodBalanceEntity,
        {
          accountId: 'acc-liability-1',
          periodId,
          closingBalance: 80.0,
        } as AccountPeriodBalanceEntity,
      ];

      mockPeriodRepo.findOne!.mockResolvedValue(mockPeriod);
      mockAccountRepo.find!.mockResolvedValue(mockAccounts);
      mockBalanceRepo.find!.mockResolvedValue(mockBalances);

      const result = (await balanceSheetUseCase.execute(userId, {
        mode: 'period',
        periodId,
      })) as any;

      expect(result.totalAssets).toBe(100.0);
      expect(result.totalLiabilities).toBe(80.0);
      expect(result.totalEquity).toBe(0.0);
      expect(result.balanced).toBe(false);
    });

    it('should collapse child accounts by depth level correctly', async () => {
      const mockPeriod = {
        id: periodId,
        name: '2026-03',
        fiscalYearId: 'fy-uuid',
      } as PeriodEntity;

      // Parent/child hierarchy: Cash (1) -> Petty Cash (2) -> Local Petty Cash (3)
      const mockAccounts = [
        {
          id: 'acc-cash',
          name: 'Cash',
          type: 'ASSET',
          parentId: null,
          status: 'ACTIVE',
          userId,
        } as AccountEntity,
        {
          id: 'acc-petty',
          name: 'Petty Cash',
          type: 'ASSET',
          parentId: 'acc-cash',
          status: 'ACTIVE',
          userId,
        } as AccountEntity,
        {
          id: 'acc-local-petty',
          name: 'Local Petty Cash',
          type: 'ASSET',
          parentId: 'acc-petty',
          status: 'ACTIVE',
          userId,
        } as AccountEntity,
      ];

      const mockBalances = [
        { accountId: 'acc-cash', periodId, closingBalance: 1000.0 } as AccountPeriodBalanceEntity,
        { accountId: 'acc-petty', periodId, closingBalance: 500.0 } as AccountPeriodBalanceEntity,
        {
          accountId: 'acc-local-petty',
          periodId,
          closingBalance: 100.0,
        } as AccountPeriodBalanceEntity,
      ];

      mockPeriodRepo.findOne!.mockResolvedValue(mockPeriod);
      mockAccountRepo.find!.mockResolvedValue(mockAccounts);
      mockBalanceRepo.find!.mockResolvedValue(mockBalances);

      // Depth = 1: Should roll up everything to Cash (depth 1)
      const resultD1 = (await balanceSheetUseCase.execute(userId, {
        mode: 'period',
        periodId,
        depth: 1,
      })) as any;

      expect(resultD1.assets).toEqual([
        { accountId: 'acc-cash', name: 'Cash', balance: 1600.0 }, // 1000 + 500 + 100
      ]);

      // Depth = 2: Should keep Cash and Petty Cash, and roll up Local Petty Cash to Petty Cash
      const resultD2 = (await balanceSheetUseCase.execute(userId, {
        mode: 'period',
        periodId,
        depth: 2,
      })) as any;

      expect(resultD2.assets).toEqual([
        { accountId: 'acc-cash', name: 'Cash', balance: 1000.0 },
        { accountId: 'acc-petty', name: 'Petty Cash', balance: 600.0 }, // 500 + 100
      ]);
    });

    it('should calculate date mode balance sheet correctly', async () => {
      const mockAccounts = [
        {
          id: 'acc-asset-1',
          name: 'Cash',
          type: 'ASSET',
          status: 'ACTIVE',
          userId,
        } as AccountEntity,
        {
          id: 'acc-liability-1',
          name: 'Accounts Payable',
          type: 'LIABILITY',
          status: 'ACTIVE',
          userId,
        } as AccountEntity,
      ];

      mockAccountRepo.find!.mockResolvedValue(mockAccounts);

      // Mock journal entry query builder returning sums
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        addGroupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { accountId: 'acc-asset-1', entryType: 'DEBIT', total: '1500' },
          { accountId: 'acc-asset-1', entryType: 'CREDIT', total: '500' },
          { accountId: 'acc-liability-1', entryType: 'CREDIT', total: '1000' },
        ]),
      };
      mockJournalEntryRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      // Mock Fiscal Year query builder returning null
      const mockFyBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };
      mockFiscalYearRepo.createQueryBuilder.mockReturnValue(mockFyBuilder);

      const result = (await balanceSheetUseCase.execute(userId, {
        mode: 'date',
        date: '2026-07-02',
      })) as any;

      expect(result.date).toBe('2026-07-02');
      expect(result.assets).toEqual([
        { accountId: 'acc-asset-1', name: 'Cash', balance: 1000.0 }, // 1500 - 500
      ]);
      expect(result.liabilities).toEqual([
        { accountId: 'acc-liability-1', name: 'Accounts Payable', balance: 1000.0 },
      ]);
      expect(result.balanced).toBe(true);

      // Verify the query builder was called with accountingDate and pure string date parameter
      expect(mockJournalEntryRepo.createQueryBuilder).toHaveBeenCalledWith('entry');
      expect(mockQueryBuilder.innerJoin).toHaveBeenCalledWith('entry.transaction', 'transaction');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('transaction.userId = :userId', {
        userId,
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('transaction.status = :status', {
        status: 'POSTED',
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'transaction.accountingDate <= :date',
        { date: '2026-07-02' },
      );

      // Verify fiscal year query checks are date string based
      expect(mockFiscalYearRepo.createQueryBuilder).toHaveBeenCalledWith('fy');
      expect(mockFyBuilder.where).toHaveBeenCalledWith('fy.userId = :userId', { userId });
      expect(mockFyBuilder.andWhere).toHaveBeenCalledWith('fy.startDate <= :date', {
        date: '2026-07-02',
      });
      expect(mockFyBuilder.andWhere).toHaveBeenCalledWith('fy.endDate >= :date', {
        date: '2026-07-02',
      });
    });

    it('should calculate comparative mode balance sheet correctly', async () => {
      const mockPeriods = [
        {
          id: 'period-1',
          name: '2026-01',
          startDate: '2026-01-01',
          fiscalYearId: 'fy-uuid',
        } as unknown as PeriodEntity,
        {
          id: 'period-2',
          name: '2026-02',
          startDate: '2026-02-01',
          fiscalYearId: 'fy-uuid',
        } as unknown as PeriodEntity,
      ];

      mockPeriodRepo.find!.mockResolvedValue(mockPeriods);

      const mockAccounts = [
        {
          id: 'acc-asset-1',
          name: 'Cash',
          type: 'ASSET',
          status: 'ACTIVE',
          userId,
        } as AccountEntity,
        {
          id: 'acc-liability-1',
          name: 'Accounts Payable',
          type: 'LIABILITY',
          status: 'ACTIVE',
          userId,
        } as AccountEntity,
      ];
      mockAccountRepo.find!.mockResolvedValue(mockAccounts);

      // Mock balances for period 1 & period 2
      mockBalanceRepo.find!.mockImplementation(async (options: any) => {
        const pId = options.where.periodId;
        if (pId === 'period-1') {
          return [
            {
              accountId: 'acc-asset-1',
              periodId: 'period-1',
              closingBalance: 1200,
            } as AccountPeriodBalanceEntity,
            {
              accountId: 'acc-liability-1',
              periodId: 'period-1',
              closingBalance: 400,
            } as AccountPeriodBalanceEntity,
          ];
        } else if (pId === 'period-2') {
          return [
            {
              accountId: 'acc-asset-1',
              periodId: 'period-2',
              closingBalance: 1500,
            } as AccountPeriodBalanceEntity,
            {
              accountId: 'acc-liability-1',
              periodId: 'period-2',
              closingBalance: 500,
            } as AccountPeriodBalanceEntity,
          ];
        }
        return [];
      });

      const result = (await balanceSheetUseCase.execute(userId, {
        mode: 'comparative',
        periodIds: ['period-1', 'period-2'],
      })) as any;

      expect(result.periods).toEqual(['2026-01', '2026-02']);
      expect(result.assets).toEqual([
        { accountId: 'acc-asset-1', name: 'Cash', balances: [1200.0, 1500.0] },
      ]);
      expect(result.liabilities).toEqual([
        { accountId: 'acc-liability-1', name: 'Accounts Payable', balances: [400.0, 500.0] },
      ]);
      expect(result.totalAssets).toEqual([1200, 1500]);
      expect(result.totalLiabilities).toEqual([400, 500]);
      expect(result.balanced).toEqual([false, false]); // Equity is 0, so 1200 != 400 + 0
    });

    it('should calculate Resultados Acumulados and Resultado del Ejercicio correctly in date mode when previous years are unclosed', async () => {
      const mockAccounts = [
        { id: 'acc-cash', name: 'Cash', type: 'ASSET', status: 'ACTIVE', userId } as AccountEntity,
        {
          id: 'acc-ap',
          name: 'Accounts Payable',
          type: 'LIABILITY',
          status: 'ACTIVE',
          userId,
        } as AccountEntity,
      ];

      mockAccountRepo.find!.mockResolvedValue(mockAccounts);

      // Mock queries sequentially:
      // 1. entrySums (all entries <= 2026-06-15)
      // 2. tempEntrySums (entries in [2026-01-01, 2026-06-15])
      // 3. priorEntrySums (entries < 2026-01-01)
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        addGroupBy: jest.fn().mockReturnThis(),
        getRawMany: jest
          .fn()
          .mockResolvedValueOnce([
            { accountId: 'acc-cash', entryType: 'DEBIT', total: '20000' },
            { accountId: 'acc-ap', entryType: 'CREDIT', total: '9000' },
          ])
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([
            { entryType: 'CREDIT', total: '15000' },
            { entryType: 'DEBIT', total: '4000' },
          ]),
      };
      mockJournalEntryRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      // Mock Fiscal Year query builder returning 2026 fiscal year
      const mockFyBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({
          id: 'fy-2026',
          startDate: '2026-01-01',
          endDate: '2026-12-31',
        }),
      };
      mockFiscalYearRepo.createQueryBuilder.mockReturnValue(mockFyBuilder);

      const result = (await balanceSheetUseCase.execute(userId, {
        mode: 'date',
        date: '2026-06-15',
      })) as any;

      expect(result.date).toBe('2026-06-15');
      expect(result.assets).toEqual([{ accountId: 'acc-cash', name: 'Cash', balance: 20000.0 }]);
      expect(result.liabilities).toEqual([
        { accountId: 'acc-ap', name: 'Accounts Payable', balance: 9000.0 },
      ]);
      expect(result.equity).toEqual([
        {
          accountId: 'virtual-accumulated-results',
          name: 'Resultados Acumulados',
          balance: 11000.0,
        },
      ]);
      expect(result.balanced).toBe(true);
    });

    it('should calculate Resultados Acumulados and Resultado del Ejercicio correctly in period mode', async () => {
      const mockPeriod = {
        id: periodId,
        name: '2026-06',
        fiscalYearId: 'fy-2026',
        fiscalYear: {
          id: 'fy-2026',
          startDate: '2026-01-01',
          endDate: '2026-12-31',
        },
      } as unknown as PeriodEntity;

      const mockAccounts = [
        { id: 'acc-cash', name: 'Cash', type: 'ASSET', status: 'ACTIVE', userId } as AccountEntity,
        {
          id: 'acc-ap',
          name: 'Accounts Payable',
          type: 'LIABILITY',
          status: 'ACTIVE',
          userId,
        } as AccountEntity,
        {
          id: 'acc-rev',
          name: 'Revenue',
          type: 'INCOME',
          status: 'ACTIVE',
          userId,
        } as AccountEntity,
        {
          id: 'acc-exp',
          name: 'Expense',
          type: 'EXPENSE',
          status: 'ACTIVE',
          userId,
        } as AccountEntity,
      ];

      mockPeriodRepo.findOne!.mockResolvedValue(mockPeriod);
      mockAccountRepo.find!.mockResolvedValue(mockAccounts);

      // Mock balance sheet balances
      mockBalanceRepo
        .find!.mockResolvedValueOnce([
          { accountId: 'acc-cash', periodId, closingBalance: 20000 } as AccountPeriodBalanceEntity,
          { accountId: 'acc-ap', periodId, closingBalance: 9000 } as AccountPeriodBalanceEntity,
        ])
        .mockResolvedValueOnce([
          { accountId: 'acc-rev', periodId, closingBalance: 0 } as AccountPeriodBalanceEntity,
          { accountId: 'acc-exp', periodId, closingBalance: 0 } as AccountPeriodBalanceEntity,
        ]);

      // Mock prior year entries
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([{ entryType: 'CREDIT', total: '11000' }]),
      };
      mockJournalEntryRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = (await balanceSheetUseCase.execute(userId, {
        mode: 'period',
        periodId,
      })) as any;

      expect(result.assets).toEqual([{ accountId: 'acc-cash', name: 'Cash', balance: 20000.0 }]);
      expect(result.liabilities).toEqual([
        { accountId: 'acc-ap', name: 'Accounts Payable', balance: 9000.0 },
      ]);
      expect(result.equity).toEqual([
        {
          accountId: 'virtual-accumulated-results',
          name: 'Resultados Acumulados',
          balance: 11000.0,
        },
      ]);
      expect(result.balanced).toBe(true);
    });

    it('should omit zero-balance system accounts from equity report section', async () => {
      const mockPeriod = {
        id: periodId,
        name: '2026-03',
        fiscalYearId: 'fy-uuid',
      } as PeriodEntity;

      const mockAccounts = [
        { id: 'acc-cash', name: 'Cash', type: 'ASSET', status: 'ACTIVE', userId } as AccountEntity,
        {
          id: 'acc-stock',
          name: 'Common Stock',
          type: 'EQUITY',
          status: 'ACTIVE',
          userId,
        } as AccountEntity,
        {
          id: 'acc-ni',
          name: 'Resultado del Ejercicio',
          type: 'EQUITY',
          status: 'ACTIVE',
          userId,
          systemRole: 'NET_INCOME',
        } as AccountEntity,
        {
          id: 'acc-re',
          name: 'Resultados Acumulados',
          type: 'EQUITY',
          status: 'ACTIVE',
          userId,
          systemRole: 'RETAINED_EARNINGS',
        } as AccountEntity,
      ];

      const mockBalances = [
        { accountId: 'acc-cash', periodId, closingBalance: 1000 } as AccountPeriodBalanceEntity,
        { accountId: 'acc-stock', periodId, closingBalance: 1000 } as AccountPeriodBalanceEntity,
        { accountId: 'acc-ni', periodId, closingBalance: 0 } as AccountPeriodBalanceEntity,
        { accountId: 'acc-re', periodId, closingBalance: 0 } as AccountPeriodBalanceEntity,
      ];

      mockPeriodRepo.findOne!.mockResolvedValue(mockPeriod);
      mockAccountRepo.find!.mockResolvedValue(mockAccounts);
      mockBalanceRepo.find!.mockResolvedValue(mockBalances);

      const result = (await balanceSheetUseCase.execute(userId, {
        mode: 'period',
        periodId,
      })) as any;

      expect(result.equity).toEqual([
        { accountId: 'acc-stock', name: 'Common Stock', balance: 1000.0 },
      ]);
      expect(result.equity.some((e: any) => e.accountId === 'acc-ni')).toBe(false);
      expect(result.equity.some((e: any) => e.accountId === 'acc-re')).toBe(false);
    });
  });

  describe('IncomeStatementUseCase', () => {
    const userId = 'user-uuid';
    const periodId = 'period-uuid';

    it('should throw NotFoundException if period does not exist or does not belong to the user', async () => {
      mockPeriodRepo.findOne!.mockResolvedValue(null);

      await expect(incomeStatementUseCase.execute(userId, periodId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should calculate income statement correctly', async () => {
      const mockPeriod = {
        id: periodId,
        name: '2026-03',
        fiscalYearId: 'fy-uuid',
      } as PeriodEntity;

      const mockAccounts = [
        {
          id: 'acc-income-1',
          name: 'Sales Revenue',
          type: 'INCOME',
          status: 'ACTIVE',
          userId,
        } as AccountEntity,
        {
          id: 'acc-income-2',
          name: 'Service Revenue',
          type: 'INCOME',
          status: 'ACTIVE',
          userId,
        } as AccountEntity,
        {
          id: 'acc-expense-1',
          name: 'Rent Expense',
          type: 'EXPENSE',
          status: 'ACTIVE',
          userId,
        } as AccountEntity,
        {
          id: 'acc-expense-2',
          name: 'Utilities Expense',
          type: 'EXPENSE',
          status: 'ACTIVE',
          userId,
        } as AccountEntity,
      ];

      const mockBalances = [
        {
          accountId: 'acc-income-1',
          periodId,
          totalDebits: 200,
          totalCredits: 2000,
        } as AccountPeriodBalanceEntity,
        {
          accountId: 'acc-expense-1',
          periodId,
          totalDebits: 800,
          totalCredits: 0,
        } as AccountPeriodBalanceEntity,
        {
          accountId: 'acc-expense-2',
          periodId,
          totalDebits: 150,
          totalCredits: 50,
        } as AccountPeriodBalanceEntity,
      ];

      mockPeriodRepo.findOne!.mockResolvedValue(mockPeriod);
      mockAccountRepo.find!.mockResolvedValue(mockAccounts);
      mockBalanceRepo.find!.mockResolvedValue(mockBalances);

      const result = await incomeStatementUseCase.execute(userId, periodId);

      expect(result.period).toBe('2026-03');
      expect(result.income).toEqual([
        { accountId: 'acc-income-1', name: 'Sales Revenue', amount: 1800 },
        { accountId: 'acc-income-2', name: 'Service Revenue', amount: 0 },
      ]);
      expect(result.expenses).toEqual([
        { accountId: 'acc-expense-1', name: 'Rent Expense', amount: 800 },
        { accountId: 'acc-expense-2', name: 'Utilities Expense', amount: 100 },
      ]);

      expect(result.totalIncome).toBe(1800);
      expect(result.totalExpenses).toBe(900);
      expect(result.netProfit).toBe(900);
    });
  });
});
