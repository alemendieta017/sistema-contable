import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { GetBudgetExecutionUseCase } from '../../src/application/budgets/get-budget-execution.use-case';
import { BudgetEntity } from '../../src/infrastructure/database/entities/budget.entity';
import { JournalEntryEntity } from '../../src/infrastructure/database/entities/journal-entry.entity';

describe('GetBudgetExecutionUseCase Unit Tests', () => {
  let useCase: GetBudgetExecutionUseCase;
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
      find: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        addGroupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn(),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetBudgetExecutionUseCase,
        {
          provide: getRepositoryToken(BudgetEntity),
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

    useCase = module.get<GetBudgetExecutionUseCase>(GetBudgetExecutionUseCase);
  });

  it('should calculate budget execution, available amounts, and deviation rules correctly for INCOME and EXPENSE', async () => {
    const userId = 'user-123';
    const periodId = 'period-123';

    // Mock period entity lookup
    mockEntityManager.findOne.mockImplementation(async (entity, _options) => {
      if (entity.name === 'PeriodEntity') {
        return {
          id: periodId,
          name: '2026-06',
          startDate: '2026-06-01',
          endDate: '2026-06-30',
          fiscalYear: { userId },
        };
      }
      if (entity.name === 'BudgetEntity') {
        return {
          id: 'budget-123',
          name: 'Junio 2026',
          periodId,
          userId,
          items: [
            { accountId: 'inc-salary', amount: 10000000.0 }, // Salary budget: 10,000,000
            { accountId: 'inc-bonus', amount: 1000000.0 }, // Bonus budget: 1,000,000
            { accountId: 'exp-rent', amount: 3000000.0 }, // Rent budget: 3,000,000
            { accountId: 'exp-food', amount: 1500000.0 }, // Food budget: 1,500,000
          ],
        };
      }
      return null;
    });

    // Mock real amounts (CREDIT / DEBIT entries)
    mockEntityManager.createQueryBuilder().getRawMany.mockResolvedValue([
      // Income: Salary -> real = CREDIT - DEBIT = 10000000 - 0 = 10000000.00
      { accountId: 'inc-salary', entryType: 'CREDIT', sum: '10000000.00' },
      // Income: Bonus -> real = CREDIT - DEBIT = 800000 - 0 = 800000.00 (under budget)
      { accountId: 'inc-bonus', entryType: 'CREDIT', sum: '800000.00' },
      // Expense: Rent -> real = DEBIT - CREDIT = 3000000 - 0 = 3000000.00 (on budget)
      { accountId: 'exp-rent', entryType: 'DEBIT', sum: '3000000.00' },
      // Expense: Food -> real = DEBIT - CREDIT = 1800000 - 0 = 1800000.00 (over budget)
      { accountId: 'exp-food', entryType: 'DEBIT', sum: '1800000.00' },
    ]);

    // Mock accounts list
    mockEntityManager.find.mockImplementation(async (entity) => {
      if (entity.name === 'AccountEntity') {
        return [
          {
            id: 'inc-salary',
            name: 'Salario',
            type: 'INCOME',
            status: 'ACTIVE',
            isCashOrBank: false,
          },
          {
            id: 'inc-bonus',
            name: 'Aguinaldo',
            type: 'INCOME',
            status: 'ACTIVE',
            isCashOrBank: false,
          },
          {
            id: 'exp-rent',
            name: 'Alquiler',
            type: 'EXPENSE',
            status: 'ACTIVE',
            isCashOrBank: false,
          },
          {
            id: 'exp-food',
            name: 'Comida',
            type: 'EXPENSE',
            status: 'ACTIVE',
            isCashOrBank: false,
          },
        ];
      }
      if (entity.name === 'AccountPeriodBalanceEntity') {
        return []; // zero initial cash
      }
      return [];
    });

    const result = await useCase.execute(userId, periodId);

    // Verify metadata
    expect(result.periodName).toBe('2026-06');
    expect(result.friendlyName).toBe('Junio 2026');
    expect(result.startDate).toBe('2026-06-01');
    expect(result.endDate).toBe('2026-06-30');

    // Verify Income
    const salary = result.consumos.income.find((i) => i.accountId === 'inc-salary');
    expect(salary).toBeDefined();
    expect(salary.budgeted).toBe(10000000.0);
    expect(salary.real).toBe(10000000.0);
    expect(salary.deviation).toBe(0.0);
    expect(salary.isNegativeDeviation).toBe(false);

    const bonus = result.consumos.income.find((i) => i.accountId === 'inc-bonus');
    expect(bonus).toBeDefined();
    expect(bonus.budgeted).toBe(1000000.0);
    expect(bonus.real).toBe(800000.0);
    expect(bonus.deviation).toBe(-200000.0); // deviation = real - budgeted = 800k - 1M = -200k
    expect(bonus.isNegativeDeviation).toBe(true); // negative deviation since real < budgeted

    // Verify Expense
    const rent = result.consumos.expense.find((e) => e.accountId === 'exp-rent');
    expect(rent).toBeDefined();
    expect(rent.budgeted).toBe(3000000.0);
    expect(rent.real).toBe(3000000.0);
    expect(rent.available).toBe(0.0); // available = budgeted - real
    expect(rent.isNegativeDeviation).toBe(false);

    const food = result.consumos.expense.find((e) => e.accountId === 'exp-food');
    expect(food).toBeDefined();
    expect(food.budgeted).toBe(1500000.0);
    expect(food.real).toBe(1800000.0);
    expect(food.available).toBe(-300000.0); // available = budgeted - real = 1.5M - 1.8M = -300k
    expect(food.isNegativeDeviation).toBe(true); // negative deviation since real > budgeted

    // Verify Consumos Totals
    expect(result.consumos.totalBudgetedIncome).toBe(11000000.0);
    expect(result.consumos.totalRealIncome).toBe(10800000.0);
    expect(result.consumos.totalBudgetedExpense).toBe(4500000.0);
    expect(result.consumos.totalRealExpense).toBe(4800000.0);
  });

  it('should calculate budget execution, cash deviations, and negative deviation rules for ASSETS and LIABILITIES', async () => {
    const userId = 'user-123';
    const periodId = 'period-123';

    // Mock period and budget
    mockEntityManager.findOne.mockImplementation(async (entity, _options) => {
      if (entity.name === 'PeriodEntity') {
        return {
          id: periodId,
          name: '2026-06',
          startDate: '2026-06-01',
          endDate: '2026-06-30',
          fiscalYear: { userId },
        };
      }
      if (entity.name === 'BudgetEntity') {
        return {
          id: 'budget-123',
          name: 'Junio 2026',
          periodId,
          userId,
          items: [
            { accountId: 'ast-inv', amount: -500000.0 }, // Plan to save: -500,000 (outflow)
            { accountId: 'ast-inv2', amount: -1000000.0 }, // Plan to save: -1,000,000 (outflow)
            { accountId: 'lbl-debt', amount: -2000000.0 }, // Plan to pay debt: -2,000,000 (outflow)
            { accountId: 'lbl-loan', amount: 5000000.0 }, // Plan to receive loan: 5,000,000 (inflow)
          ],
        };
      }
      return null;
    });

    // Mock transaction sums (CREDIT / DEBIT entries)
    mockEntityManager.createQueryBuilder().getRawMany.mockResolvedValue([
      // Asset: Savings (ast-inv) -> DEBIT = 600,000 (outflow), CREDIT = 0.
      // real = CREDIT - DEBIT = -600,000
      { accountId: 'ast-inv', entryType: 'DEBIT', sum: '600000.00' },
      // Asset: Savings (ast-inv2) -> DEBIT = 800,000 (outflow), CREDIT = 0.
      // real = CREDIT - DEBIT = -800,000 (we saved less, so outflow is less)
      { accountId: 'ast-inv2', entryType: 'DEBIT', sum: '800000.00' },
      // Liability: Debt (lbl-debt) -> DEBIT = 2000000 (outflow), CREDIT = 0.
      // real = CREDIT - DEBIT = -2000000
      { accountId: 'lbl-debt', entryType: 'DEBIT', sum: '2000000.00' },
      // Liability: Loan (lbl-loan) -> CREDIT = 4000000 (inflow), DEBIT = 0.
      // real = CREDIT - DEBIT = 4000000 (we got less loan than planned)
      { accountId: 'lbl-loan', entryType: 'CREDIT', sum: '4000000.00' },
    ]);

    // Mock accounts list
    mockEntityManager.find.mockImplementation(async (entity) => {
      if (entity.name === 'AccountEntity') {
        return [
          {
            id: 'ast-inv',
            name: 'Ahorro Mutual',
            type: 'ASSET',
            status: 'ACTIVE',
            isCashOrBank: false,
          },
          {
            id: 'ast-inv2',
            name: 'Fondo Plazo',
            type: 'ASSET',
            status: 'ACTIVE',
            isCashOrBank: false,
          },
          {
            id: 'lbl-debt',
            name: 'Préstamo Auto',
            type: 'LIABILITY',
            status: 'ACTIVE',
            isCashOrBank: false,
          },
          {
            id: 'lbl-loan',
            name: 'Crédito Personal',
            type: 'LIABILITY',
            status: 'ACTIVE',
            isCashOrBank: false,
          },
        ];
      }
      if (entity.name === 'AccountPeriodBalanceEntity') {
        return [];
      }
      return [];
    });

    const result = await useCase.execute(userId, periodId);

    // Verify Asset Execution (ahorrosInversiones)
    const inv = result.ahorrosInversiones.find((a) => a.accountId === 'ast-inv');
    expect(inv).toBeDefined();
    expect(inv.budgeted).toBe(-500000.0);
    expect(inv.real).toBe(-600000.0);
    expect(inv.deviation).toBe(-100000.0); // real - budgeted = -600k - (-500k) = -100k
    expect(inv.isNegativeDeviation).toBe(true); // saved more than planned (more cash outflow, deviation < 0)

    const inv2 = result.ahorrosInversiones.find((a) => a.accountId === 'ast-inv2');
    expect(inv2).toBeDefined();
    expect(inv2.budgeted).toBe(-1000000.0);
    expect(inv2.real).toBe(-800000.0);
    expect(inv2.deviation).toBe(200000.0); // real - budgeted = -800k - (-1M) = +200k
    expect(inv2.isNegativeDeviation).toBe(false); // saved less than planned (less cash outflow, deviation > 0)

    // Verify Liability Execution (deudasTarjetas)
    const debt = result.deudasTarjetas.find((l) => l.accountId === 'lbl-debt');
    expect(debt).toBeDefined();
    expect(debt.budgeted).toBe(-2000000.0);
    expect(debt.real).toBe(-2000000.0);
    expect(debt.deviation).toBe(0.0);
    expect(debt.isNegativeDeviation).toBe(false);

    const loan = result.deudasTarjetas.find((l) => l.accountId === 'lbl-loan');
    expect(loan).toBeDefined();
    expect(loan.budgeted).toBe(5000000.0);
    expect(loan.real).toBe(4000000.0);
    expect(loan.deviation).toBe(-1000000.0); // real - budgeted = 4M - 5M = -1M
    expect(loan.isNegativeDeviation).toBe(true); // received less loan than planned (less cash inflow, deviation < 0)
  });

  it('should calculate Resumen de Liquidez correctly including initial cash, net flows, and final cash', async () => {
    const userId = 'user-123';
    const periodId = 'period-123';

    // Mock period and budget
    mockEntityManager.findOne.mockImplementation(async (entity, _options) => {
      if (entity.name === 'PeriodEntity') {
        return {
          id: periodId,
          name: '2026-06',
          startDate: '2026-06-01',
          endDate: '2026-06-30',
          fiscalYear: { userId },
        };
      }
      if (entity.name === 'BudgetEntity') {
        return {
          id: 'budget-123',
          name: 'Junio 2026',
          periodId,
          userId,
          items: [
            { accountId: 'inc-salary', amount: 10000000.0 },
            { accountId: 'exp-rent', amount: 3000000.0 },
            { accountId: 'ast-inv', amount: -500000.0 },
            { accountId: 'lbl-debt', amount: -1000000.0 },
          ],
        };
      }
      return null;
    });

    // Mock transaction sums (CREDIT / DEBIT entries)
    mockEntityManager.createQueryBuilder().getRawMany.mockResolvedValue([
      { accountId: 'inc-salary', entryType: 'CREDIT', sum: '10000000.00' },
      { accountId: 'exp-rent', entryType: 'DEBIT', sum: '3200000.00' },
      { accountId: 'ast-inv', entryType: 'DEBIT', sum: '600000.00' },
      { accountId: 'lbl-debt', entryType: 'DEBIT', sum: '1000000.00' },
    ]);

    // Mock accounts list
    mockEntityManager.find.mockImplementation(async (entity) => {
      if (entity.name === 'AccountEntity') {
        return [
          {
            id: 'inc-salary',
            name: 'Salario',
            type: 'INCOME',
            status: 'ACTIVE',
            isCashOrBank: false,
          },
          {
            id: 'exp-rent',
            name: 'Alquiler',
            type: 'EXPENSE',
            status: 'ACTIVE',
            isCashOrBank: false,
          },
          {
            id: 'ast-inv',
            name: 'Ahorro Mutual',
            type: 'ASSET',
            status: 'ACTIVE',
            isCashOrBank: false,
          },
          {
            id: 'lbl-debt',
            name: 'Préstamo Auto',
            type: 'LIABILITY',
            status: 'ACTIVE',
            isCashOrBank: false,
          },
        ];
      }
      if (entity.name === 'AccountPeriodBalanceEntity') {
        // Mock cash & bank accounts for initial cash balance
        return [
          {
            accountId: 'cash-1',
            openingBalance: 4000000.0,
            account: { isCashOrBank: true, userId },
          },
          {
            accountId: 'cash-2',
            openingBalance: 1000000.0,
            account: { isCashOrBank: true, userId },
          },
        ];
      }
      return [];
    });

    const result = await useCase.execute(userId, periodId);

    // Verify Resumen de Liquidez
    // Initial cash = 4,000,000 + 1,000,000 = 5,000,000
    expect(result.resumenLiquidez.saldoCajaInicialReal).toBe(5000000.0);

    // Flujo neto consumos:
    // budgeted = 10,000,000 (inc) - 3,000,000 (exp) = 7,000,000
    // real = 10,000,000 (inc) - 3,200,000 (exp) = 6,800,000
    expect(result.resumenLiquidez.flujoNetoConsumos.budgeted).toBe(7000000.0);
    expect(result.resumenLiquidez.flujoNetoConsumos.real).toBe(6800000.0);

    // Flujo neto financiero:
    // budgeted = -500,000 (ast) + -1,000,000 (lbl) = -1,500,000
    // real = -600,000 (ast) + -1,000,000 (lbl) = -1,600,000
    expect(result.resumenLiquidez.flujoNetoFinanciero.budgeted).toBe(-1500000.0);
    expect(result.resumenLiquidez.flujoNetoFinanciero.real).toBe(-1600000.0);

    // Flujo de caja neto del mes:
    // budgeted = 7,000,000 - 1,500,000 = 5,500,000
    // real = 6,800,000 - 1,600,000 = 5,200,000
    expect(result.resumenLiquidez.flujoCajaNetoMes.budgeted).toBe(5500000.0);
    expect(result.resumenLiquidez.flujoCajaNetoMes.real).toBe(5200000.0);

    // Saldo de caja final:
    // projected = 5,000,000 + 5,500,000 = 10,500,000
    // real = 5,000,000 + 5,200,000 = 10,200,000
    expect(result.resumenLiquidez.saldoCajaFinal.projected).toBe(10500000.0);
    expect(result.resumenLiquidez.saldoCajaFinal.real).toBe(10200000.0);
  });
});
