import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CashFlowStatementForecastUseCase } from '../../src/application/reports/cash-flow-statement.use-case';
import { PeriodEntity } from '../../src/infrastructure/database/entities/period.entity';
import { AccountPeriodBalanceEntity } from '../../src/infrastructure/database/entities/account-period-balance.entity';
import { BudgetEntity } from '../../src/infrastructure/database/entities/budget.entity';
import { AccountEntity } from '../../src/infrastructure/database/entities/account.entity';
import { CashFlowDirection } from '@sistema-contable/shared';

describe('CashFlowDirection Net Calculations (US4)', () => {
  let cashFlowUseCase: CashFlowStatementForecastUseCase;

  let mockFiscalYearRepo: any;
  let mockBalanceRepo: any;
  let mockBudgetRepo: any;
  let mockEntityManager: any;

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
      find: jest.fn().mockImplementation((cls, _options) => {
        if (cls === AccountPeriodBalanceEntity) {
          return mockBalanceRepo.find(_options);
        }
        if (cls === AccountEntity) {
          return [
            {
              id: 'acc-cash',
              name: 'Caja General',
              type: 'ASSET',
              parentId: null,
              isCashOrBank: true,
            },
            {
              id: 'acc-inc',
              name: 'Ventas',
              type: 'INCOME',
              parentId: null,
              isCashOrBank: false,
            },
            {
              id: 'acc-exp',
              name: 'Alquiler',
              type: 'EXPENSE',
              parentId: null,
              isCashOrBank: false,
            },
            {
              id: 'acc-liab-cc',
              name: 'Tarjeta de Crédito Corporativa',
              type: 'LIABILITY',
              parentId: null,
              isCashOrBank: false,
            },
            {
              id: 'acc-ast-inv',
              name: 'Fondo Mutuo Inversión',
              type: 'ASSET',
              parentId: null,
              isCashOrBank: false,
            },
          ];
        }
        return [];
      }),
      save: jest.fn().mockImplementation((_cls, entity) => Promise.resolve(entity)),
      create: jest.fn().mockImplementation((_cls, obj) => obj),
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

    const mockManager = {
      transaction: jest.fn().mockImplementation(async (cb) => cb(mockEntityManager)),
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

    cashFlowUseCase = module.get<CashFlowStatementForecastUseCase>(
      CashFlowStatementForecastUseCase,
    );
  });

  it('should correctly process INGRESO_EFECTIVO flow direction for Liability items (+ Cash)', async () => {
    const mockFiscalYear = {
      id: 'fy-2026',
      name: 'Ejercicio 2026',
      periods: [
        {
          id: 'p-jan',
          name: '2026-01',
          startDate: '2026-01-01',
          endDate: '2026-01-31',
          status: 'OPEN',
        },
      ],
    };
    mockFiscalYearRepo.findOne.mockResolvedValue(mockFiscalYear);
    mockBalanceRepo.find.mockResolvedValue([]);

    // Budget has 1 Liability item with INGRESO_EFECTIVO of $50,000 (credit purchase inflow)
    mockBudgetRepo.findOne.mockResolvedValue({
      id: 'b-jan',
      items: [
        {
          accountId: 'acc-liab-cc',
          amount: 50000,
          subRowId: 'sub-1',
          subRowLabel: 'Compras Financiadas',
          cashFlowDirection: CashFlowDirection.INGRESO_EFECTIVO,
          account: { id: 'acc-liab-cc', type: 'LIABILITY', name: 'Tarjeta de Crédito Corporativa' },
        },
      ],
    });

    const currentDate = new Date('2025-12-01'); // Force period to be projected
    const result = await cashFlowUseCase.execute('user-1', 'fy-2026', false, currentDate);

    expect(result.months).toHaveLength(1);
    const month = result.months[0];
    expect(month.entradasActivoPasivo).toBe(50000);
    expect(month.salidasActivoPasivo).toBe(0);
    expect(month.totalEntradas).toBe(50000);
    expect(month.netFlow).toBe(50000);
  });

  it('should correctly process EGRESO_EFECTIVO flow direction for Liability items (- Cash)', async () => {
    const mockFiscalYear = {
      id: 'fy-2026',
      name: 'Ejercicio 2026',
      periods: [
        {
          id: 'p-jan',
          name: '2026-01',
          startDate: '2026-01-01',
          endDate: '2026-01-31',
          status: 'OPEN',
        },
      ],
    };
    mockFiscalYearRepo.findOne.mockResolvedValue(mockFiscalYear);
    mockBalanceRepo.find.mockResolvedValue([]);

    // Budget has 1 Liability item with EGRESO_EFECTIVO of $20,000 (credit card payment outflow)
    mockBudgetRepo.findOne.mockResolvedValue({
      id: 'b-jan',
      items: [
        {
          accountId: 'acc-liab-cc',
          amount: 20000,
          subRowId: 'sub-2',
          subRowLabel: 'Pago Mensual Tarjeta',
          cashFlowDirection: CashFlowDirection.EGRESO_EFECTIVO,
          account: { id: 'acc-liab-cc', type: 'LIABILITY', name: 'Tarjeta de Crédito Corporativa' },
        },
      ],
    });

    const currentDate = new Date('2025-12-01');
    const result = await cashFlowUseCase.execute('user-1', 'fy-2026', false, currentDate);

    expect(result.months).toHaveLength(1);
    const month = result.months[0];
    expect(month.entradasActivoPasivo).toBe(0);
    expect(month.salidasActivoPasivo).toBe(20000);
    expect(month.totalSalidas).toBe(20000);
    expect(month.netFlow).toBe(-20000);
  });

  it('should calculate net cash flow incorporating dynamic sub-rows under the same account', async () => {
    const mockFiscalYear = {
      id: 'fy-2026',
      name: 'Ejercicio 2026',
      periods: [
        {
          id: 'p-jan',
          name: '2026-01',
          startDate: '2026-01-01',
          endDate: '2026-01-31',
          status: 'OPEN',
        },
      ],
    };
    mockFiscalYearRepo.findOne.mockResolvedValue(mockFiscalYear);
    mockBalanceRepo.find.mockResolvedValue([]);

    // Budget has 2 sub-rows under the same Credit Card account:
    // Sub-row 1: INGRESO_EFECTIVO $50,000 (purchases)
    // Sub-row 2: EGRESO_EFECTIVO $20,000 (payments)
    // plus Operating Income = $100,000 and Operating Expense = $30,000
    mockBudgetRepo.findOne.mockResolvedValue({
      id: 'b-jan',
      items: [
        {
          accountId: 'acc-inc',
          amount: 100000,
          account: { id: 'acc-inc', type: 'INCOME', name: 'Ventas' },
        },
        {
          accountId: 'acc-exp',
          amount: 30000,
          account: { id: 'acc-exp', type: 'EXPENSE', name: 'Alquiler' },
        },
        {
          accountId: 'acc-liab-cc',
          amount: 50000,
          subRowId: 'sub-1',
          subRowLabel: 'Compras Financiadas',
          cashFlowDirection: CashFlowDirection.INGRESO_EFECTIVO,
          account: { id: 'acc-liab-cc', type: 'LIABILITY', name: 'Tarjeta de Crédito Corporativa' },
        },
        {
          accountId: 'acc-liab-cc',
          amount: 20000,
          subRowId: 'sub-2',
          subRowLabel: 'Pago de Tarjeta',
          cashFlowDirection: CashFlowDirection.EGRESO_EFECTIVO,
          account: { id: 'acc-liab-cc', type: 'LIABILITY', name: 'Tarjeta de Crédito Corporativa' },
        },
      ],
    });

    const currentDate = new Date('2025-12-01');
    const result = await cashFlowUseCase.execute('user-1', 'fy-2026', false, currentDate);

    expect(result.months).toHaveLength(1);
    const month = result.months[0];
    expect(month.ingresosOperativos).toBe(100000);
    expect(month.egresosOperativos).toBe(30000);
    expect(month.entradasActivoPasivo).toBe(50000);
    expect(month.salidasActivoPasivo).toBe(20000);
    expect(month.totalEntradas).toBe(150000); // 100k + 50k
    expect(month.totalSalidas).toBe(50000); // 30k + 20k
    expect(month.netFlow).toBe(100000); // 150k - 50k
  });

  it('should correctly process all 4 executive blocks simultaneously with Asset and Liability dual flows', async () => {
    const mockFiscalYear = {
      id: 'fy-2026',
      name: 'Ejercicio 2026',
      periods: [
        {
          id: 'p-jan',
          name: '2026-01',
          startDate: '2026-01-01',
          endDate: '2026-01-31',
          status: 'OPEN',
        },
      ],
    };
    mockFiscalYearRepo.findOne.mockResolvedValue(mockFiscalYear);
    mockBalanceRepo.find.mockResolvedValue([]);

    // 1. Ingresos: $200,000
    // 2. Gastos de Vida: $80,000
    // 3. Ahorro e Inversiones:
    //    - Aporte FCI (EGRESO_EFECTIVO): $30,000
    //    - Rescate FCI (INGRESO_EFECTIVO): $10,000
    // 4. Deudas y Financiación:
    //    - Pago Préstamo (EGRESO_EFECTIVO): $15,000
    //    - Nuevo Préstamo (INGRESO_EFECTIVO): $50,000
    mockBudgetRepo.findOne.mockResolvedValue({
      id: 'b-jan',
      items: [
        {
          accountId: 'acc-inc',
          amount: 200000,
          account: { id: 'acc-inc', type: 'INCOME', name: 'Ventas' },
        },
        {
          accountId: 'acc-exp',
          amount: 80000,
          account: { id: 'acc-exp', type: 'EXPENSE', name: 'Alquiler' },
        },
        {
          accountId: 'acc-ast-inv',
          amount: 30000,
          subRowId: 'sub-ast-1',
          subRowLabel: 'Aporte FCI',
          cashFlowDirection: CashFlowDirection.EGRESO_EFECTIVO,
          account: { id: 'acc-ast-inv', type: 'ASSET', name: 'Fondo Mutuo Inversión' },
        },
        {
          accountId: 'acc-ast-inv',
          amount: 10000,
          subRowId: 'sub-ast-2',
          subRowLabel: 'Rescate FCI',
          cashFlowDirection: CashFlowDirection.INGRESO_EFECTIVO,
          account: { id: 'acc-ast-inv', type: 'ASSET', name: 'Fondo Mutuo Inversión' },
        },
        {
          accountId: 'acc-liab-cc',
          amount: 15000,
          subRowId: 'sub-liab-1',
          subRowLabel: 'Pago Préstamo',
          cashFlowDirection: CashFlowDirection.EGRESO_EFECTIVO,
          account: { id: 'acc-liab-cc', type: 'LIABILITY', name: 'Tarjeta de Crédito Corporativa' },
        },
        {
          accountId: 'acc-liab-cc',
          amount: 50000,
          subRowId: 'sub-liab-2',
          subRowLabel: 'Nuevo Préstamo',
          cashFlowDirection: CashFlowDirection.INGRESO_EFECTIVO,
          account: { id: 'acc-liab-cc', type: 'LIABILITY', name: 'Tarjeta de Crédito Corporativa' },
        },
      ],
    });

    const currentDate = new Date('2025-12-01');
    const result = await cashFlowUseCase.execute('user-1', 'fy-2026', false, currentDate);

    expect(result.months).toHaveLength(1);
    const month = result.months[0];
    expect(month.ingresosOperativos).toBe(200000);
    expect(month.egresosOperativos).toBe(80000);
    expect(month.entradasActivoPasivo).toBe(60000); // 10k (rescate) + 50k (nuevo préstamo)
    expect(month.salidasActivoPasivo).toBe(45000); // 30k (aporte) + 15k (pago)
    expect(month.totalEntradas).toBe(260000); // 200k + 60k
    expect(month.totalSalidas).toBe(125000); // 80k + 45k
    expect(month.netFlow).toBe(135000); // 260k - 125k
  });

  it('should correctly calculate multi-period net flows and cumulative cash flow progression', async () => {
    const mockFiscalYear = {
      id: 'fy-2026',
      name: 'Ejercicio 2026',
      periods: [
        {
          id: 'p-jan',
          name: '2026-01',
          startDate: '2026-01-01',
          endDate: '2026-01-31',
          status: 'OPEN',
        },
        {
          id: 'p-feb',
          name: '2026-02',
          startDate: '2026-02-01',
          endDate: '2026-02-28',
          status: 'OPEN',
        },
      ],
    };
    mockFiscalYearRepo.findOne.mockResolvedValue(mockFiscalYear);
    mockBalanceRepo.find.mockResolvedValue([
      {
        periodId: 'p-jan',
        openingBalance: 10000,
        account: { id: 'acc-cash', isCashOrBank: true },
      },
    ]);

    mockBudgetRepo.findOne.mockImplementation((options) => {
      if (options.where.periodId === 'p-jan') {
        return Promise.resolve({
          id: 'b-jan',
          items: [
            {
              accountId: 'acc-inc',
              amount: 100000,
              account: { id: 'acc-inc', type: 'INCOME', name: 'Ventas' },
            },
            {
              accountId: 'acc-exp',
              amount: 60000,
              account: { id: 'acc-exp', type: 'EXPENSE', name: 'Alquiler' },
            },
          ],
        });
      }
      if (options.where.periodId === 'p-feb') {
        return Promise.resolve({
          id: 'b-feb',
          items: [
            {
              accountId: 'acc-inc',
              amount: 120000,
              account: { id: 'acc-inc', type: 'INCOME', name: 'Ventas' },
            },
            {
              accountId: 'acc-exp',
              amount: 70000,
              account: { id: 'acc-exp', type: 'EXPENSE', name: 'Alquiler' },
            },
            {
              accountId: 'acc-ast-inv',
              amount: 20000,
              subRowId: 'sub-ast-1',
              subRowLabel: 'Aporte FCI',
              cashFlowDirection: CashFlowDirection.EGRESO_EFECTIVO,
              account: { id: 'acc-ast-inv', type: 'ASSET', name: 'Fondo Mutuo Inversión' },
            },
          ],
        });
      }
      return Promise.resolve(null);
    });

    const currentDate = new Date('2025-12-01');
    const result = await cashFlowUseCase.execute('user-1', 'fy-2026', false, currentDate);

    expect(result.months).toHaveLength(2);

    // Month 1 (Jan)
    const m1 = result.months[0];
    expect(m1.initialCash).toBe(10000);
    expect(m1.totalEntradas).toBe(100000);
    expect(m1.totalSalidas).toBe(60000);
    expect(m1.netFlow).toBe(40000);
    expect(m1.finalCash).toBe(50000); // 10000 + 40000

    // Month 2 (Feb)
    const m2 = result.months[1];
    expect(m2.initialCash).toBe(50000);
    expect(m2.totalEntradas).toBe(120000);
    expect(m2.totalSalidas).toBe(90000); // 70k + 20k
    expect(m2.netFlow).toBe(30000);
    expect(m2.finalCash).toBe(80000); // 50000 + 30000
  });
});
