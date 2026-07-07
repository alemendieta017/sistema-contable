import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { IncomeStatementForecastUseCase } from '../../src/application/reports/income-statement-forecast.use-case';
import { CashFlowStatementForecastUseCase } from '../../src/application/reports/cash-flow-statement.use-case';
import { FiscalYearEntity } from '../../src/infrastructure/database/entities/fiscal-year.entity';
import { AccountPeriodBalanceEntity } from '../../src/infrastructure/database/entities/account-period-balance.entity';
import { BudgetEntity } from '../../src/infrastructure/database/entities/budget.entity';

describe('Financial Forecast Reports (Income Statement & Cash Flow)', () => {
  let incomeUseCase: IncomeStatementForecastUseCase;
  let cashFlowUseCase: CashFlowStatementForecastUseCase;

  let mockFiscalYearRepo: any;
  let mockBalanceRepo: any;
  let mockBudgetRepo: any;

  beforeEach(async () => {
    mockFiscalYearRepo = {
      findOne: jest.fn(),
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
          provide: getRepositoryToken(FiscalYearEntity),
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
    cashFlowUseCase = module.get<CashFlowStatementForecastUseCase>(CashFlowStatementForecastUseCase);
  });

  describe('IncomeStatementForecastUseCase', () => {
    it('should throw NotFoundException if fiscal year is not found', async () => {
      mockFiscalYearRepo.findOne.mockResolvedValue(null);

      await expect(
        incomeUseCase.execute('user-123', 'fy-uuid'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should calculate monthly real and projected income statement correctly', async () => {
      // Mock Fiscal Year with 3 periods (Jan - CLOSED, Feb - OPEN/past, Mar - OPEN/future)
      // Current date is set to 2026-02-15
      const mockFiscalYear = {
        id: 'fy-uuid',
        name: 'Ejercicio 2026',
        periods: [
          { id: 'p-jan', name: '2026-01', startDate: '2026-01-01', endDate: '2026-01-31', status: 'CLOSED' },
          { id: 'p-feb', name: '2026-02', startDate: '2026-02-01', endDate: '2026-02-28', status: 'OPEN' },
          { id: 'p-mar', name: '2026-03', startDate: '2026-03-01', endDate: '2026-03-31', status: 'OPEN' },
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
      const result = await incomeUseCase.execute('user-123', 'fy-uuid', currentDate);

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

      await expect(
        cashFlowUseCase.execute('user-123', 'fy-uuid'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should calculate monthly real and projected cash flows correctly', async () => {
      // Mock Fiscal Year with 3 periods (Jan - CLOSED, Feb - OPEN/past, Mar - OPEN/future)
      const mockFiscalYear = {
        id: 'fy-uuid',
        name: 'Ejercicio 2026',
        periods: [
          { id: 'p-jan', name: '2026-01', startDate: '2026-01-01', endDate: '2026-01-31', status: 'CLOSED' },
          { id: 'p-feb', name: '2026-02', startDate: '2026-02-01', endDate: '2026-02-28', status: 'OPEN' },
          { id: 'p-mar', name: '2026-03', startDate: '2026-03-01', endDate: '2026-03-31', status: 'OPEN' },
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
              { amount: 15000, account: { type: 'INCOME', name: 'Salario' } },
              { amount: 4000, account: { type: 'EXPENSE', name: 'Alquiler' } },
              { amount: -1500, account: { type: 'ASSET', name: 'Ahorro Bolsa' } },
              { amount: -500, account: { type: 'LIABILITY', name: 'Deuda Vehículo' } },
            ],
          };
        }
        return null;
      });

      const currentDate = new Date('2026-02-15');
      const result = await cashFlowUseCase.execute('user-123', 'fy-uuid', currentDate);

      expect(result.fiscalYearName).toBe('Ejercicio 2026');
      expect(result.months).toHaveLength(3);

      // Jan: Real
      expect(result.months[0]).toEqual({
        periodId: 'p-jan',
        periodName: '2026-01',
        status: 'CLOSED',
        initialCash: 5000,
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
        netFlow: 9000,
        finalCash: 25000,
        isReal: false,
      });
    });
  });
});
