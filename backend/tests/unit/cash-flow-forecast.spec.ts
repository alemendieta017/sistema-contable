import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { IncomeStatementForecastUseCase } from '../../src/application/reports/income-statement-forecast.use-case';
import { CashFlowStatementForecastUseCase } from '../../src/application/reports/cash-flow-statement.use-case';
import { PeriodEntity } from '../../src/infrastructure/database/entities/period.entity';
import { AccountPeriodBalanceEntity } from '../../src/infrastructure/database/entities/account-period-balance.entity';
import { BudgetEntity } from '../../src/infrastructure/database/entities/budget.entity';
import { AccountEntity } from '../../src/infrastructure/database/entities/account.entity';
import { CashFlowDirection, FlowIntention } from '@sistema-contable/shared';

describe('Financial Forecast Reports (Income Statement & Cash Flow)', () => {
  let incomeUseCase: IncomeStatementForecastUseCase;
  let cashFlowUseCase: CashFlowStatementForecastUseCase;

  let mockFiscalYearRepo: any;
  let mockBalanceRepo: any;
  let mockBudgetRepo: any;
  let mockEntityManager: any;
  let mockManager: any;

  beforeEach(async () => {
    mockEntityManager = {
      findOne: jest.fn().mockImplementation((cls, options) => {
        if (cls === PeriodEntity) {
          return mockFiscalYearRepo.findOne(options);
        }
        if (cls === BudgetEntity) {
          return mockBudgetRepo.findOne(options);
        }
        return null;
      }),
      find: jest.fn().mockImplementation((cls, options) => {
        if (cls === AccountPeriodBalanceEntity) {
          return mockBalanceRepo.find(options);
        }
        if (cls === AccountEntity) {
          return [
            { id: 'acc-inc', name: 'Salario', type: 'INCOME', parentId: null, isCashOrBank: false },
            {
              id: 'acc-exp',
              name: 'Alquiler',
              type: 'EXPENSE',
              parentId: null,
              isCashOrBank: false,
            },
            {
              id: 'acc-ast',
              name: 'Ahorro Bolsa',
              type: 'ASSET',
              parentId: null,
              isCashOrBank: false,
            },
            {
              id: 'acc-liab',
              name: 'Deuda Vehículo',
              type: 'LIABILITY',
              parentId: null,
              isCashOrBank: false,
            },
          ];
        }
        return [];
      }),
      save: jest.fn().mockImplementation((cls, entity) => Promise.resolve(entity)),
      create: jest.fn().mockImplementation((cls, obj) => obj),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
      getRepository: jest.fn().mockReturnValue({
        createQueryBuilder: jest.fn().mockReturnValue({
          innerJoin: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          getOne: jest.fn(),
        }),
      }),
    };

    mockManager = {
      transaction: jest.fn().mockImplementation(async (cb) => {
        return cb(mockEntityManager);
      }),
    };

    mockFiscalYearRepo = {
      findOne: jest.fn(),
      manager: mockManager,
    };
    mockBalanceRepo = {
      find: jest.fn(),
    };
    mockBudgetRepo = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IncomeStatementForecastUseCase,
        CashFlowStatementForecastUseCase,
        {
          provide: getRepositoryToken(PeriodEntity),
          useValue: mockFiscalYearRepo,
        },
        {
          provide: getRepositoryToken(AccountPeriodBalanceEntity),
          useValue: mockBalanceRepo,
        },
        {
          provide: getRepositoryToken(BudgetEntity),
          useValue: mockBudgetRepo,
        },
      ],
    }).compile();

    incomeUseCase = module.get<IncomeStatementForecastUseCase>(IncomeStatementForecastUseCase);
    cashFlowUseCase = module.get<CashFlowStatementForecastUseCase>(
      CashFlowStatementForecastUseCase,
    );
  });

  describe('IncomeStatementForecastUseCase', () => {
    it('should throw NotFoundException if fiscal year is not found', async () => {
      mockFiscalYearRepo.findOne.mockResolvedValue(null);

      await expect(incomeUseCase.execute('user-123', 'fy-uuid')).rejects.toThrow(NotFoundException);
    });

    it('should calculate monthly real and projected income statement correctly', async () => {
      // Mock Fiscal Year with 3 periods (Jan - CLOSED, Feb - OPEN/past, Mar - OPEN/future)
      // Current date is set to 2026-02-15
      const mockFiscalYear = {
        id: 'fy-uuid',
        name: 'Ejercicio 2026',
        periods: [
          {
            id: 'p-jan',
            name: '2026-01',
            startDate: '2026-01-01',
            endDate: '2026-01-31',
            status: 'CLOSED',
          },
          {
            id: 'p-feb',
            name: '2026-02',
            startDate: '2026-02-01',
            endDate: '2026-02-28',
            status: 'OPEN',
          },
          {
            id: 'p-mar',
            name: '2026-03',
            startDate: '2026-03-01',
            endDate: '2026-03-31',
            status: 'OPEN',
          },
        ],
      };
      mockFiscalYearRepo.findOne.mockResolvedValue(mockFiscalYear);

      // Mock balances for past/closed periods (Jan and Feb have start date < 2026-02-15)
      // Jan balances: Income account (Credits 10,000, Debits 0), Expense account (Debits 3,000, Credits 0)
      // Feb balances: Income account (Credits 12,000, Debits 1,000), Expense account (Debits 4,000, Credits 500)
      mockBalanceRepo.find.mockImplementation(async (options) => {
        const periodId = options.where.periodId;
        if (periodId === 'p-jan') {
          return [
            {
              accountId: 'acc-inc',
              totalDebits: 0,
              totalCredits: 10000,
              account: { type: 'INCOME', name: 'Salario' },
            },
            {
              accountId: 'acc-exp',
              totalDebits: 3000,
              totalCredits: 0,
              account: { type: 'EXPENSE', name: 'Alquiler' },
            },
          ];
        }
        if (periodId === 'p-feb') {
          return [
            {
              accountId: 'acc-inc',
              totalDebits: 1000,
              totalCredits: 12000,
              account: { type: 'INCOME', name: 'Salario' },
            },
            {
              accountId: 'acc-exp',
              totalDebits: 4000,
              totalCredits: 500,
              account: { type: 'EXPENSE', name: 'Alquiler' },
            },
          ];
        }
        return [];
      });

      // Mock Budget for future period (Mar has start date >= 2026-02-15)
      mockBudgetRepo.findOne.mockImplementation(async (options) => {
        const periodId = options.where.periodId;
        if (periodId === 'p-mar') {
          return {
            id: 'b-mar',
            items: [
              {
                amount: 15000,
                account: { type: 'INCOME', name: 'Salario' },
              },
              {
                amount: 3500,
                account: { type: 'EXPENSE', name: 'Alquiler' },
              },
            ],
          };
        }
        return null;
      });

      const currentDate = new Date('2026-02-15');
      const result = await incomeUseCase.execute('user-123', 'fy-uuid', false, currentDate);

      expect(result.fiscalYearName).toBe('Ejercicio 2026');
      expect(result.months).toHaveLength(3);

      // Jan: CLOSED (Real)
      expect(result.months[0]).toEqual({
        periodId: 'p-jan',
        periodName: '2026-01',
        status: 'CLOSED',
        income: 10000,
        expense: 3000,
        netProfit: 7000,
        isReal: true,
      });

      // Feb: OPEN but start date < 2026-02-15 (Real)
      expect(result.months[1]).toEqual({
        periodId: 'p-feb',
        periodName: '2026-02',
        status: 'OPEN',
        income: 11000, // 12000 - 1000
        expense: 3500, // 4000 - 500
        netProfit: 7500,
        isReal: true,
      });

      // Mar: OPEN and start date >= 2026-02-15 (Projected)
      expect(result.months[2]).toEqual({
        periodId: 'p-mar',
        periodName: '2026-03',
        status: 'OPEN',
        income: 15000,
        expense: 3500,
        netProfit: 11500,
        isReal: false,
      });
    });
  });

  describe('CashFlowStatementForecastUseCase', () => {
    it('should throw NotFoundException if fiscal year is not found', async () => {
      mockFiscalYearRepo.findOne.mockResolvedValue(null);

      await expect(cashFlowUseCase.execute('user-123', 'fy-uuid')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should calculate monthly real and projected cash flows correctly', async () => {
      // Mock Fiscal Year with 3 periods (Jan - CLOSED, Feb - OPEN/past, Mar - OPEN/future)
      const mockFiscalYear = {
        id: 'fy-uuid',
        name: 'Ejercicio 2026',
        periods: [
          {
            id: 'p-jan',
            name: '2026-01',
            startDate: '2026-01-01',
            endDate: '2026-01-31',
            status: 'CLOSED',
          },
          {
            id: 'p-feb',
            name: '2026-02',
            startDate: '2026-02-01',
            endDate: '2026-02-28',
            status: 'OPEN',
          },
          {
            id: 'p-mar',
            name: '2026-03',
            startDate: '2026-03-01',
            endDate: '2026-03-31',
            status: 'OPEN',
          },
        ],
      };
      mockFiscalYearRepo.findOne.mockResolvedValue(mockFiscalYear);

      // Mock balances:
      // Jan: Opening cash balance = 5,000 (isCashOrBank = true).
      //      Jan entries on cash: Debits = 8,000, Credits = 2,000. -> netFlow = 6,000. -> finalCash = 11,000.
      // Feb: Opening cash balance = 11,000.
      //      Feb entries on cash: Debits = 9,000, Credits = 4,000. -> netFlow = 5,000. -> finalCash = 16,000.
      mockBalanceRepo.find.mockImplementation(async (options) => {
        const periodId = options.where.periodId;
        if (periodId === 'p-jan') {
          return [
            {
              accountId: 'acc-cash',
              openingBalance: 5000,
              totalDebits: 8000,
              totalCredits: 2000,
              account: { isCashOrBank: true, name: 'Caja' },
            },
            {
              accountId: 'acc-inc',
              totalDebits: 0,
              totalCredits: 10000,
              account: { id: 'acc-inc', type: 'INCOME', name: 'Salario', isCashOrBank: false },
            },
            {
              accountId: 'acc-exp',
              totalDebits: 4000,
              totalCredits: 0,
              account: { id: 'acc-exp', type: 'EXPENSE', name: 'Alquiler', isCashOrBank: false },
            },
          ];
        }
        if (periodId === 'p-feb') {
          return [
            {
              accountId: 'acc-cash',
              openingBalance: 11000,
              totalDebits: 9000,
              totalCredits: 4000,
              account: { isCashOrBank: true, name: 'Caja' },
            },
            {
              accountId: 'acc-inc',
              totalDebits: 0,
              totalCredits: 10000,
              account: { id: 'acc-inc', type: 'INCOME', name: 'Salario', isCashOrBank: false },
            },
            {
              accountId: 'acc-exp',
              totalDebits: 5000,
              totalCredits: 0,
              account: { id: 'acc-exp', type: 'EXPENSE', name: 'Alquiler', isCashOrBank: false },
            },
          ];
        }
        return [];
      });

      // Mock Budget for future period (Mar):
      // Budgeted income = 15,000. Budgeted expense = 4,000.
      // Budgeted asset change = -1,500 (savings/investment outflow).
      // Budgeted liability change = -500 (debt paydown outflow).
      // Projected Net Flow = 15,000 - 4,000 + (-1,500) + (-500) = 9,000.
      // Projected finalCash = 16,000 + 9,000 = 25,000.
      mockBudgetRepo.findOne.mockImplementation(async (options) => {
        const periodId = options.where.periodId;
        if (periodId === 'p-mar') {
          return {
            id: 'b-mar',
            items: [
              {
                amount: 15000,
                account: { id: 'acc-inc', type: 'INCOME', name: 'Salario', isCashOrBank: false },
              },
              {
                amount: 4000,
                account: { id: 'acc-exp', type: 'EXPENSE', name: 'Alquiler', isCashOrBank: false },
              },
              {
                amount: -1500,
                account: {
                  id: 'acc-ast',
                  type: 'ASSET',
                  name: 'Ahorro Bolsa',
                  isCashOrBank: false,
                },
              },
              {
                amount: -500,
                account: {
                  id: 'acc-liab',
                  type: 'LIABILITY',
                  name: 'Deuda Vehículo',
                  isCashOrBank: false,
                },
              },
            ],
          };
        }
        return null;
      });

      const currentDate = new Date('2026-02-15');
      const result = await cashFlowUseCase.execute('user-123', 'fy-uuid', false, currentDate);

      expect(result.fiscalYearName).toBe('Ejercicio 2026');
      expect(result.months).toHaveLength(3);
      expect(result.accounts).toBeDefined();
      expect(result.accounts.length).toBeGreaterThan(0);

      // Jan: Real
      expect(result.months[0]).toEqual({
        periodId: 'p-jan',
        periodName: '2026-01',
        status: 'CLOSED',
        initialCash: 5000,
        ingresosOperativos: 10000,
        entradasActivoPasivo: 0,
        totalEntradas: 10000,
        egresosOperativos: 4000,
        salidasActivoPasivo: 0,
        totalSalidas: 4000,
        netFlow: 6000,
        finalCash: 11000,
        isReal: true,
      });

      // Feb: Real
      expect(result.months[1]).toEqual({
        periodId: 'p-feb',
        periodName: '2026-02',
        status: 'OPEN',
        initialCash: 11000,
        ingresosOperativos: 10000,
        entradasActivoPasivo: 0,
        totalEntradas: 10000,
        egresosOperativos: 5000,
        salidasActivoPasivo: 0,
        totalSalidas: 5000,
        netFlow: 5000,
        finalCash: 16000,
        isReal: true,
      });

      // Mar: Projected
      expect(result.months[2]).toEqual({
        periodId: 'p-mar',
        periodName: '2026-03',
        status: 'OPEN',
        initialCash: 16000,
        ingresosOperativos: 15000,
        entradasActivoPasivo: 0,
        totalEntradas: 15000,
        egresosOperativos: 4000,
        salidasActivoPasivo: 2000, // 1500 (Asset) + 500 (Liability)
        totalSalidas: 6000,
        netFlow: 9000,
        finalCash: 25000,
        isReal: false,
      });
    });

    it('should support rolling 12-month forecast and pre-open next fiscal year when periods are missing', async () => {
      const userId = 'user-123';
      const fiscalYearId = 'fy-uuid';

      // Mock start closed period: 2026-05
      const lastClosedPeriod = {
        id: 'p-may',
        name: '2026-05',
        startDate: '2026-05-01',
        endDate: '2026-05-31',
        status: 'CLOSED',
      };

      const queryBuilder = mockEntityManager.getRepository().createQueryBuilder();
      // First getOne call: returns lastClosedPeriod
      queryBuilder.getOne.mockResolvedValueOnce(lastClosedPeriod);

      // Subsequent getOne calls for each month in the rolling 12-month window (2026-05 to 2027-04)
      // We return mock periods for 2026 months, but return null for 2027 months to trigger pre-open
      let queryCallCount = 0;
      queryBuilder.getOne.mockImplementation(() => {
        queryCallCount++;
        // The first call was for lastClosedPeriod, so this is for the loop
        const months = [
          '2026-05',
          '2026-06',
          '2026-07',
          '2026-08',
          '2026-09',
          '2026-10',
          '2026-11',
          '2026-12',
          '2027-01',
          '2027-02',
          '2027-03',
          '2027-04',
        ];
        const currentMonthName = months[queryCallCount - 1];

        if (!currentMonthName) return Promise.resolve(null);

        if (currentMonthName.startsWith('2026')) {
          return Promise.resolve({
            id: `p-${currentMonthName.substring(5)}`,
            name: currentMonthName,
            startDate: `${currentMonthName}-01`,
            endDate: `${currentMonthName}-28`,
            status: currentMonthName === '2026-05' ? 'CLOSED' : 'OPEN',
          });
        }

        // Return null for 2027 to simulate missing periods (triggers pre-opening)
        return Promise.resolve(null);
      });

      // Mock findOne for pre-opening next year checks (returns null so it creates it)
      mockEntityManager.findOne.mockImplementation((_cls, _options) => {
        return Promise.resolve(null);
      });

      // Mock balances: initialCash = 10,000, and netFlow = 1,000 for each month
      mockBalanceRepo.find.mockResolvedValue([
        {
          openingBalance: 10000,
          totalDebits: 2000,
          totalCredits: 1000,
          account: { isCashOrBank: true },
        },
      ]);

      // Mock Budget: netFlow = 2,000 for each future month
      mockBudgetRepo.findOne.mockResolvedValue({
        id: 'b-mock',
        items: [
          { amount: 5000, account: { type: 'INCOME' } },
          { amount: 3000, account: { type: 'EXPENSE' } },
        ],
      });

      const currentDate = new Date('2026-06-15');
      const result = await cashFlowUseCase.execute(userId, fiscalYearId, true, currentDate);

      expect(result.fiscalYearName).toBe('Rolling 12M (2026-05)');
      expect(result.months).toHaveLength(12);
      expect(result.months[0].periodName).toBe('2026-05');
      expect(result.months[11].periodName).toBe('2027-04');

      // Cascading balances check: first is 10,000 + 1,000 = 11,000. Second is 11,000 + 1,000 = 12,000.
      expect(result.months[0].initialCash).toBe(10000);
      expect(result.months[0].finalCash).toBe(11000);
      expect(result.months[1].initialCash).toBe(11000);
    });

    it('should handle custom non-YYYY-MM period names (e.g., "Periodo 01/2026") without NaN parsing errors', async () => {
      const userId = 'user-123';
      const fiscalYearId = 'fy-uuid';

      const customNamedClosedPeriod = {
        id: 'p-custom',
        name: 'Periodo 01/2026',
        startDate: '2026-01-01',
        endDate: '2026-01-31',
        status: 'CLOSED',
      };

      const queryBuilder = mockEntityManager.getRepository().createQueryBuilder();
      queryBuilder.getOne.mockResolvedValueOnce(customNamedClosedPeriod);

      let queryCallCount = 0;
      queryBuilder.getOne.mockImplementation(() => {
        queryCallCount++;
        const months = [
          '2026-01',
          '2026-02',
          '2026-03',
          '2026-04',
          '2026-05',
          '2026-06',
          '2026-07',
          '2026-08',
          '2026-09',
          '2026-10',
          '2026-11',
          '2026-12',
        ];
        const currentMonthName = months[queryCallCount - 1];
        if (!currentMonthName) return Promise.resolve(null);

        return Promise.resolve({
          id: `p-${currentMonthName}`,
          name: currentMonthName === '2026-01' ? 'Periodo 01/2026' : currentMonthName,
          startDate: `${currentMonthName}-01`,
          endDate: `${currentMonthName}-28`,
          status: 'OPEN',
        });
      });

      mockBalanceRepo.find.mockResolvedValue([]);
      mockBudgetRepo.findOne.mockResolvedValue(null);

      const currentDate = new Date('2026-01-15');
      const result = await cashFlowUseCase.execute(userId, fiscalYearId, true, currentDate);

      expect(result.months).toHaveLength(12);
      expect(result.months[0].periodName).toBe('Periodo 01/2026');
      expect(result.months[11].periodName).toBe('2026-12');
    });
  });

  describe('Four-Quadrant Categorization & Rolling Cash Flow Mathematical Engine', () => {
    // Pure mathematical function mimicking the calculation engine in GetBudgetMatrixUseCase
    function calculateRollingCashFlow(
      periods: Array<{ id: string; name: string }>,
      items: Array<{
        periodId: string;
        accountType: 'INCOME' | 'EXPENSE' | 'ASSET' | 'LIABILITY' | 'EQUITY';
        amount: number;
        cashFlowDirection?: CashFlowDirection | null;
        flowIntention?: FlowIntention | null;
      }>,
      initialCashBalance: number,
    ) {
      const totalInflows: Record<string, number> & { total: number } = { total: 0 };
      const operatingExpenses: Record<string, number> & { total: number } = { total: 0 };
      const operatingSurplus: Record<string, number> & { total: number } = { total: 0 };
      const investmentsAndSavings: Record<string, number> & { total: number } = { total: 0 };
      const debtFinancing: Record<string, number> & { total: number } = { total: 0 };
      const netCashFlow: Record<string, number> & { total: number } = { total: 0 };
      const openingCash: Record<string, number> = {};
      const closingCash: Record<string, number> = {};
      const shortfallAlerts: Record<string, { isNegative: boolean; shortfall: number }> = {};

      let currentCash = initialCashBalance;

      for (let i = 0; i < periods.length; i++) {
        const p = periods[i];
        const periodItems = items.filter((it) => it.periodId === p.id);

        let inflows = 0;
        let expenses = 0;
        let savings = 0;
        let debt = 0;

        for (const item of periodItems) {
          const val = Number(item.amount) || 0;
          if (
            item.accountType === 'INCOME' ||
            item.cashFlowDirection === CashFlowDirection.INGRESO_EFECTIVO
          ) {
            inflows += val;
          } else if (item.accountType === 'EXPENSE') {
            expenses += val;
          } else if (
            item.accountType === 'ASSET' ||
            item.flowIntention === FlowIntention.INVEST ||
            item.flowIntention === FlowIntention.SAVE
          ) {
            savings += val;
          } else if (
            item.accountType === 'LIABILITY' ||
            item.accountType === 'EQUITY' ||
            item.flowIntention === FlowIntention.PAY
          ) {
            debt += val;
          }
        }

        totalInflows[p.id] = inflows;
        totalInflows.total += inflows;

        operatingExpenses[p.id] = expenses;
        operatingExpenses.total += expenses;

        const surplus = inflows - expenses;
        operatingSurplus[p.id] = surplus;
        operatingSurplus.total += surplus;

        investmentsAndSavings[p.id] = savings;
        investmentsAndSavings.total += savings;

        debtFinancing[p.id] = debt;
        debtFinancing.total += debt;

        const net = surplus - savings - debt;
        netCashFlow[p.id] = net;
        netCashFlow.total += net;

        openingCash[p.id] = currentCash;
        const closing = currentCash + net;
        closingCash[p.id] = closing;

        shortfallAlerts[p.id] = {
          isNegative: closing < 0,
          shortfall: closing < 0 ? Math.abs(closing) : 0,
        };

        currentCash = closing;
      }

      return {
        totalInflows,
        operatingExpenses,
        operatingSurplus,
        investmentsAndSavings,
        debtFinancing,
        netCashFlow,
        openingCash,
        closingCash,
        shortfallAlerts,
      };
    }

    it('should correctly classify all 4 quadrants and compute operating surplus vs net cash flow', () => {
      const periods = [
        { id: 'p-1', name: '2026-08' },
        { id: 'p-2', name: '2026-09' },
      ];

      const items = [
        // Month 1: Salary = 3500, Expenses = 1800, Investment = 500, Debt Payment = 400
        { periodId: 'p-1', accountType: 'INCOME' as const, amount: 3500 },
        { periodId: 'p-1', accountType: 'EXPENSE' as const, amount: 1800 },
        {
          periodId: 'p-1',
          accountType: 'ASSET' as const,
          amount: 500,
          flowIntention: FlowIntention.INVEST,
        },
        {
          periodId: 'p-1',
          accountType: 'LIABILITY' as const,
          amount: 400,
          flowIntention: FlowIntention.PAY,
        },

        // Month 2: Salary = 3500, Expenses = 2000, Investment = 800, Debt Payment = 400
        { periodId: 'p-2', accountType: 'INCOME' as const, amount: 3500 },
        { periodId: 'p-2', accountType: 'EXPENSE' as const, amount: 2000 },
        {
          periodId: 'p-2',
          accountType: 'ASSET' as const,
          amount: 800,
          flowIntention: FlowIntention.INVEST,
        },
        {
          periodId: 'p-2',
          accountType: 'LIABILITY' as const,
          amount: 400,
          flowIntention: FlowIntention.PAY,
        },
      ];

      const initialCash = 2500;
      const forecast = calculateRollingCashFlow(periods, items, initialCash);

      // Month 1 checks:
      // Operating Surplus = 3500 - 1800 = 1700
      expect(forecast.operatingSurplus['p-1']).toBe(1700);
      // Net Cash Flow = 1700 - 500 - 400 = 800
      expect(forecast.netCashFlow['p-1']).toBe(800);
      // Opening Cash = 2500, Closing Cash = 2500 + 800 = 3300
      expect(forecast.openingCash['p-1']).toBe(2500);
      expect(forecast.closingCash['p-1']).toBe(3300);
      expect(forecast.shortfallAlerts['p-1']).toEqual({ isNegative: false, shortfall: 0 });

      // Month 2 checks:
      // Operating Surplus = 3500 - 2000 = 1500
      expect(forecast.operatingSurplus['p-2']).toBe(1500);
      // Net Cash Flow = 1500 - 800 - 400 = 300
      expect(forecast.netCashFlow['p-2']).toBe(300);
      // Opening Cash = 3300, Closing Cash = 3300 + 300 = 3600
      expect(forecast.openingCash['p-2']).toBe(3300);
      expect(forecast.closingCash['p-2']).toBe(3600);
      expect(forecast.shortfallAlerts['p-2']).toEqual({ isNegative: false, shortfall: 0 });

      // Totals check
      expect(forecast.totalInflows.total).toBe(7000);
      expect(forecast.operatingExpenses.total).toBe(3800);
      expect(forecast.operatingSurplus.total).toBe(3200);
      expect(forecast.investmentsAndSavings.total).toBe(1300);
      expect(forecast.debtFinancing.total).toBe(800);
      expect(forecast.netCashFlow.total).toBe(1100);
    });

    it('should accurately trigger negative cash alerts and calculate shortfall when closing cash drops below zero', () => {
      const periods = [
        { id: 'p-1', name: '2026-08' },
        { id: 'p-2', name: '2026-09' },
        { id: 'p-3', name: '2026-10' },
      ];

      const items = [
        // Month 1: Inflow 1000, Outflow 2000 -> Net -1000
        { periodId: 'p-1', accountType: 'INCOME' as const, amount: 1000 },
        { periodId: 'p-1', accountType: 'EXPENSE' as const, amount: 2000 },
        // Month 2: Inflow 1000, Outflow 1500 -> Net -500
        { periodId: 'p-2', accountType: 'INCOME' as const, amount: 1000 },
        { periodId: 'p-2', accountType: 'EXPENSE' as const, amount: 1500 },
        // Month 3: Inflow 3000, Outflow 1000 -> Net +2000
        { periodId: 'p-3', accountType: 'INCOME' as const, amount: 3000 },
        { periodId: 'p-3', accountType: 'EXPENSE' as const, amount: 1000 },
      ];

      const initialCash = 800; // Starting with 800
      const forecast = calculateRollingCashFlow(periods, items, initialCash);

      // Month 1: 800 - 1000 = -200 -> Shortfall alert
      expect(forecast.openingCash['p-1']).toBe(800);
      expect(forecast.closingCash['p-1']).toBe(-200);
      expect(forecast.shortfallAlerts['p-1']).toEqual({ isNegative: true, shortfall: 200 });

      // Month 2: -200 - 500 = -700 -> Shortfall alert
      expect(forecast.openingCash['p-2']).toBe(-200);
      expect(forecast.closingCash['p-2']).toBe(-700);
      expect(forecast.shortfallAlerts['p-2']).toEqual({ isNegative: true, shortfall: 700 });

      // Month 3: -700 + 2000 = 1300 -> Recovered
      expect(forecast.openingCash['p-3']).toBe(-700);
      expect(forecast.closingCash['p-3']).toBe(1300);
      expect(forecast.shortfallAlerts['p-3']).toEqual({ isNegative: false, shortfall: 0 });
    });
  });
});
