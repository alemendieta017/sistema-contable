import { Test, TestingModule } from '@nestjs/testing';
import { GetBudgetMatrixUseCase } from '../../src/application/budgets/get-budget-matrix.use-case';
import { UpdateBudgetMatrixUseCase } from '../../src/application/budgets/update-budget-matrix.use-case';
import { DeleteBudgetMatrixRowUseCase } from '../../src/application/budgets/delete-budget-matrix-row.use-case';
import { EnsurePeriodService } from '../../src/application/periods/ensure-period.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PeriodEntity } from '../../src/infrastructure/database/entities/period.entity';
import { AccountEntity } from '../../src/infrastructure/database/entities/account.entity';
import { BudgetEntity } from '../../src/infrastructure/database/entities/budget.entity';
import { BudgetItemEntity } from '../../src/infrastructure/database/entities/budget-item.entity';
import { AccountPeriodBalanceEntity } from '../../src/infrastructure/database/entities/account-period-balance.entity';
import { DataSource } from 'typeorm';
import { BudgetMatrixSectionKey, CashFlowDirection, FlowIntention } from '@sistema-contable/shared';

describe('Budget Matrix Integration Tests', () => {
  let getMatrixUseCase: GetBudgetMatrixUseCase;
  let updateMatrixUseCase: UpdateBudgetMatrixUseCase;
  let deleteRowUseCase: DeleteBudgetMatrixRowUseCase;
  let mockEnsurePeriodService: any;
  let mockEntityManager: any;

  const mockDataSource = {
    transaction: jest.fn().mockImplementation(async (isolation, cb) => {
      const callback = typeof isolation === 'function' ? isolation : cb;
      return callback(mockEntityManager);
    }),
  };

  const samplePeriods = [
    {
      id: 'p-1',
      name: '2026-10',
      status: 'OPEN',
      startDate: '2026-10-01',
      endDate: '2026-10-31',
      userId: 'user-1',
    },
    {
      id: 'p-2',
      name: '2026-11',
      status: 'OPEN',
      startDate: '2026-11-01',
      endDate: '2026-11-30',
      userId: 'user-1',
    },
    {
      id: 'p-3',
      name: '2026-12',
      status: 'OPEN',
      startDate: '2026-12-01',
      endDate: '2026-12-31',
      userId: 'user-1',
    },
    {
      id: 'p-4',
      name: '2027-01',
      status: 'OPEN',
      startDate: '2027-01-01',
      endDate: '2027-01-31',
      userId: 'user-1',
    },
  ];

  const sampleAccounts = [
    {
      id: 'acc-parent-exp',
      name: 'Gastos Operativos',
      type: 'EXPENSE',
      parentId: null,
      isCashOrBank: false,
      status: 'ACTIVE',
      userId: 'user-1',
    },
    {
      id: 'acc-1',
      name: 'Sueldos y Salarios',
      type: 'EXPENSE',
      parentId: 'acc-parent-exp',
      isCashOrBank: false,
      status: 'ACTIVE',
      userId: 'user-1',
    },
    {
      id: 'acc-2',
      name: 'Ventas de Servicios',
      type: 'INCOME',
      parentId: null,
      isCashOrBank: false,
      status: 'ACTIVE',
      userId: 'user-1',
    },
    {
      id: 'acc-3',
      name: 'Tarjeta de Crédito Corporativa',
      type: 'LIABILITY',
      parentId: null,
      isCashOrBank: false,
      status: 'ACTIVE',
      userId: 'user-1',
    },
    {
      id: 'acc-4',
      name: 'Portafolio Inversiones',
      type: 'ASSET',
      parentId: null,
      isCashOrBank: false,
      status: 'ACTIVE',
      userId: 'user-1',
    },
  ];

  beforeEach(async () => {
    mockEnsurePeriodService = {
      ensurePeriod: jest.fn().mockImplementation((em, userId, monthStr) => {
        const found = samplePeriods.find((p) => p.name === monthStr);
        if (found) return Promise.resolve(found);
        return Promise.resolve({
          id: `p-${monthStr}`,
          name: monthStr,
          startDate: `${monthStr}-01`,
          endDate: `${monthStr}-28`,
          status: 'OPEN',
          userId,
        });
      }),
    };

    mockEntityManager = {
      findOne: jest.fn().mockImplementation((cls, options) => {
        if (cls === BudgetEntity || cls?.name === 'BudgetEntity') {
          const periodId = options?.where?.periodId;
          if (periodId === 'p-2') {
            return {
              id: 'b-2',
              userId: 'user-1',
              periodId: 'p-2',
              items: [
                { id: 'bi-4', accountId: 'acc-1', amount: 12000, subRowId: null },
                { id: 'bi-5', accountId: 'acc-2', amount: 50000, subRowId: null },
                {
                  id: 'bi-6',
                  accountId: 'acc-3',
                  subRowId: 'sub-1',
                  subRowLabel: 'Compras Financiadas',
                  amount: 5000,
                  cashFlowDirection: CashFlowDirection.INGRESO_EFECTIVO,
                },
              ],
            };
          }
        }
        return null;
      }),
      find: jest.fn().mockImplementation((cls) => {
        if (cls === PeriodEntity || cls?.name === 'PeriodEntity') {
          return Promise.resolve(samplePeriods);
        }
        return Promise.resolve([]);
      }),
      save: jest
        .fn()
        .mockImplementation((cls, entity) =>
          Promise.resolve({ ...entity, id: entity.id || 'mock-id' }),
        ),
      remove: jest.fn().mockImplementation((cls, entity) => Promise.resolve(entity)),
      create: jest.fn().mockImplementation((cls, obj) => ({ id: 'mock-id', ...obj })),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
      createQueryBuilder: jest.fn().mockImplementation((entityClass) => {
        const qb: any = {
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          leftJoinAndSelect: jest.fn().mockReturnThis(),
          innerJoin: jest.fn().mockReturnThis(),
          delete: jest.fn().mockReturnThis(),
          from: jest.fn().mockReturnThis(),
          execute: jest.fn().mockResolvedValue({ affected: 2 }),
          getMany: jest.fn().mockImplementation(async () => {
            if (entityClass === PeriodEntity || entityClass?.name === 'PeriodEntity') {
              return samplePeriods;
            }
            if (entityClass === AccountEntity || entityClass?.name === 'AccountEntity') {
              return sampleAccounts;
            }
            if (
              entityClass === AccountPeriodBalanceEntity ||
              entityClass?.name === 'AccountPeriodBalanceEntity'
            ) {
              return [
                {
                  accountId: 'acc-cash',
                  openingBalance: 10000,
                  closingBalance: 10000,
                  account: { isCashOrBank: true },
                },
              ];
            }
            return [
              {
                id: 'b-1',
                userId: 'user-1',
                periodId: 'p-1',
                items: [
                  { id: 'bi-1', accountId: 'acc-1', amount: 10000 },
                  { id: 'bi-2', accountId: 'acc-2', amount: 50000 },
                  {
                    id: 'bi-3',
                    accountId: 'acc-3',
                    subRowId: 'sub-1',
                    subRowLabel: 'Compras Financiadas',
                    amount: 5000,
                    cashFlowDirection: CashFlowDirection.INGRESO_EFECTIVO,
                  },
                  {
                    id: 'bi-invest',
                    accountId: 'acc-4',
                    amount: 8000,
                    flowIntention: FlowIntention.INVEST,
                  },
                ],
              },
              {
                id: 'b-2',
                userId: 'user-1',
                periodId: 'p-2',
                items: [
                  { id: 'bi-4', accountId: 'acc-1', amount: 12000 },
                  { id: 'bi-5', accountId: 'acc-2', amount: 50000 },
                  {
                    id: 'bi-6',
                    accountId: 'acc-3',
                    subRowId: 'sub-1',
                    subRowLabel: 'Compras Financiadas',
                    amount: 5000,
                    cashFlowDirection: CashFlowDirection.INGRESO_EFECTIVO,
                  },
                ],
              },
            ];
          }),
        };
        return qb;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetBudgetMatrixUseCase,
        UpdateBudgetMatrixUseCase,
        DeleteBudgetMatrixRowUseCase,
        { provide: EnsurePeriodService, useValue: mockEnsurePeriodService },
        { provide: getRepositoryToken(PeriodEntity), useValue: {} },
        { provide: getRepositoryToken(AccountEntity), useValue: {} },
        { provide: getRepositoryToken(BudgetEntity), useValue: {} },
        { provide: getRepositoryToken(BudgetItemEntity), useValue: {} },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    getMatrixUseCase = module.get<GetBudgetMatrixUseCase>(GetBudgetMatrixUseCase);
    updateMatrixUseCase = module.get<UpdateBudgetMatrixUseCase>(UpdateBudgetMatrixUseCase);
    deleteRowUseCase = module.get<DeleteBudgetMatrixRowUseCase>(DeleteBudgetMatrixRowUseCase);
  });

  describe('GetBudgetMatrixUseCase (Rolling Window & 4-Quadrant Engine)', () => {
    it('should retrieve rolling matrix across calendar year boundary (e.g. 2026-10 to 2027-01) with auto-provisioning', async () => {
      const result = await getMatrixUseCase.execute('user-1', '2026-10', 4);

      expect(mockEnsurePeriodService.ensurePeriod).toHaveBeenCalledTimes(4);
      expect(result.startPeriod).toBe('2026-10');
      expect(result.periods).toHaveLength(4);
      expect(result.periods[0].name).toBe('2026-10');
      expect(result.periods[0].friendlyName).toBe('Octubre 2026');
      expect(result.periods[3].name).toBe('2027-01');
      expect(result.periods[3].friendlyName).toBe('Enero 2027');

      // Verify 4 distinct sections
      expect(result.sections).toHaveLength(4);
      expect(result.sections[0].sectionKey).toBe(BudgetMatrixSectionKey.INGRESOS);
      expect(result.sections[1].sectionKey).toBe(BudgetMatrixSectionKey.EGRESOS);
      expect(result.sections[2].sectionKey).toBe(BudgetMatrixSectionKey.AHORRO_INVERSIONES);
      expect(result.sections[3].sectionKey).toBe(BudgetMatrixSectionKey.DEUDAS_FINANCIACION);

      // Verify parent subtotal rollup
      const parentRow = result.rows?.find((r) => r.accountId === 'acc-parent-exp');
      expect(parentRow).toBeDefined();
      expect(parentRow?.isParent).toBe(true);
      expect(parentRow?.amounts['p-1']).toBe(10000);
      expect(parentRow?.amounts['p-2']).toBe(12000);

      // Verify section totals do not double count parent and child
      expect(result.sections[1].sectionTotals['p-1']).toBe(10000);
      expect(result.sections[1].sectionTotals['p-2']).toBe(12000);

      // Verify cashFlowForecast engine
      expect(result.cashFlowForecast).toBeDefined();
      expect(result.cashFlowForecast.totalInflows['p-1']).toBe(55000); // 50000 income + 5000 liability cash inflow
      expect(result.cashFlowForecast.operatingExpenses['p-1']).toBe(10000);
      expect(result.cashFlowForecast.operatingSurplus['p-1']).toBe(45000); // 55000 - 10000
      expect(result.cashFlowForecast.investmentsAndSavings['p-1']).toBe(8000);
      expect(result.cashFlowForecast.netCashFlow['p-1']).toBe(37000); // 45000 - 8000
      expect(result.cashFlowForecast.openingCash['p-1']).toBe(10000); // from cash opening snapshot
      expect(result.cashFlowForecast.closingCash['p-1']).toBe(47000); // 10000 + 37000
      expect(result.cashFlowForecast.shortfallAlerts['p-1']).toEqual({
        isNegative: false,
        shortfall: 0,
      });
    });

    it('should filter by category when categoryId is passed', async () => {
      const result = await getMatrixUseCase.execute('user-1', '2026-10', 4, 'INGRESOS');

      expect(result.startPeriod).toBe('2026-10');
      expect(mockEntityManager.createQueryBuilder).toHaveBeenCalled();
    });
  });

  describe('UpdateBudgetMatrixUseCase', () => {
    it('should update amounts across multiple periods and sub-rows atomically without fiscalYearId', async () => {
      const updates = [
        { periodId: 'p-2', accountId: 'acc-1', amount: 15000, flowIntention: FlowIntention.PAY },
        {
          periodId: 'p-2',
          accountId: 'acc-3',
          subRowId: 'sub-1',
          subRowLabel: 'Compras Financiadas',
          amount: 6000,
          cashFlowDirection: CashFlowDirection.INGRESO_EFECTIVO,
          flowIntention: FlowIntention.PAY,
        },
      ];

      const result = await updateMatrixUseCase.execute('user-1', { updates });
      expect(result.success).toBe(true);
      expect(result.updatedCount).toBe(2);
    });

    it('should handle isDeleted cell updates by removing budget items', async () => {
      const updates = [
        {
          periodId: 'p-2',
          accountId: 'acc-3',
          subRowId: 'sub-1',
          amount: 0,
          isDeleted: true,
          flowIntention: FlowIntention.PAY,
        },
      ];

      const result = await updateMatrixUseCase.execute('user-1', updates);
      expect(result.success).toBe(true);
      expect(result.updatedCount).toBe(1);
    });
  });

  describe('DeleteBudgetMatrixRowUseCase', () => {
    it('should delete all budget item records for an account sub-row across periods', async () => {
      const result = await deleteRowUseCase.execute('user-1', 'rolling', 'acc-3', 'sub-1');
      expect(result.success).toBe(true);
      expect(result.deletedCount).toBe(2);
    });
  });
});
