import { Test, TestingModule } from '@nestjs/testing';
import { GetBudgetMatrixUseCase } from '../../src/application/budgets/get-budget-matrix.use-case';
import { UpdateBudgetMatrixUseCase } from '../../src/application/budgets/update-budget-matrix.use-case';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FiscalYearEntity } from '../../src/infrastructure/database/entities/fiscal-year.entity';
import { PeriodEntity } from '../../src/infrastructure/database/entities/period.entity';
import { AccountEntity } from '../../src/infrastructure/database/entities/account.entity';
import { BudgetEntity } from '../../src/infrastructure/database/entities/budget.entity';
import { BudgetItemEntity } from '../../src/infrastructure/database/entities/budget-item.entity';
import { DataSource } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';

import { DeleteBudgetMatrixRowUseCase } from '../../src/application/budgets/delete-budget-matrix-row.use-case';

describe('Budget Matrix Integration Tests', () => {
  let getMatrixUseCase: GetBudgetMatrixUseCase;
  let updateMatrixUseCase: UpdateBudgetMatrixUseCase;
  let deleteRowUseCase: DeleteBudgetMatrixRowUseCase;
  let mockEntityManager: any;

  const mockDataSource = {
    transaction: jest.fn().mockImplementation(async (isolation, cb) => {
      const callback = typeof isolation === 'function' ? isolation : cb;
      return callback(mockEntityManager);
    }),
  };

  const sampleFiscalYear = {
    id: 'fy-2026',
    name: '2026',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    status: 'OPEN',
    periods: [
      {
        id: 'p-1',
        name: '2026-01',
        status: 'CLOSED',
        startDate: '2026-01-01',
        endDate: '2026-01-31',
      },
      {
        id: 'p-2',
        name: '2026-02',
        status: 'OPEN',
        startDate: '2026-02-01',
        endDate: '2026-02-28',
      },
    ],
  };

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
  ];

  beforeEach(async () => {
    mockEntityManager = {
      findOne: jest.fn().mockImplementation((cls, options) => {
        if (cls === FiscalYearEntity || cls?.name === 'FiscalYearEntity') {
          return sampleFiscalYear;
        }
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
                  cashFlowDirection: 'INGRESO_EFECTIVO',
                },
              ],
            };
          }
        }
        return null;
      }),
      find: jest.fn(),
      save: jest
        .fn()
        .mockImplementation((cls, entity) =>
          Promise.resolve({ ...entity, id: entity.id || 'mock-id' }),
        ),
      remove: jest.fn().mockImplementation((cls, entity) => Promise.resolve(entity)),
      create: jest.fn().mockImplementation((cls, obj) => ({ id: 'mock-id', ...obj })),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
      createQueryBuilder: jest.fn().mockImplementation((entityClass) => {
        return {
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          leftJoinAndSelect: jest.fn().mockReturnThis(),
          delete: jest.fn().mockReturnThis(),
          from: jest.fn().mockReturnThis(),
          execute: jest.fn().mockResolvedValue({ affected: 2 }),
          getMany: jest.fn().mockImplementation(async () => {
            if (entityClass === AccountEntity || entityClass?.name === 'AccountEntity') {
              return sampleAccounts;
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
                    cashFlowDirection: 'INGRESO_EFECTIVO',
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
                    cashFlowDirection: 'INGRESO_EFECTIVO',
                  },
                ],
              },
            ];
          }),
        };
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetBudgetMatrixUseCase,
        UpdateBudgetMatrixUseCase,
        DeleteBudgetMatrixRowUseCase,
        { provide: getRepositoryToken(FiscalYearEntity), useValue: {} },
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

  describe('GetBudgetMatrixUseCase', () => {
    it('should throw NotFoundException if fiscal year does not exist', async () => {
      mockEntityManager.findOne.mockResolvedValueOnce(null);
      await expect(getMatrixUseCase.execute('user-1', 'invalid-fy')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should aggregate 12 periods, compute parent subtotals, 4 blocks, and summary totals', async () => {
      const result = await getMatrixUseCase.execute('user-1', 'fy-2026');

      expect(result.fiscalYearId).toBe('fy-2026');
      expect(result.periods).toHaveLength(2);
      expect(result.periods[0].friendlyName).toBe('Enero 2026');
      expect(result.periods[1].friendlyName).toBe('Febrero 2026');

      expect(result.sections).toBeDefined();
      expect(result.sections).toHaveLength(4);
      expect(result.sections![0].sectionKey).toBe('INGRESOS');
      expect(result.sections![1].sectionKey).toBe('GASTOS_VIDA');
      expect(result.sections![2].sectionKey).toBe('AHORRO_INVERSIONES');
      expect(result.sections![3].sectionKey).toBe('DEUDAS_FINANCIACION');

      // Check parent subtotal rollup
      const parentRow = result.rows?.find((r) => r.accountId === 'acc-parent-exp');
      expect(parentRow).toBeDefined();
      expect(parentRow?.isParent).toBe(true);
      expect(parentRow?.amounts['p-1']).toBe(10000);
      expect(parentRow?.amounts['p-2']).toBe(12000);
      expect(parentRow?.rowTotal).toBe(22000);

      const expenseRow = result.rows?.find((r) => r.accountId === 'acc-1');
      expect(expenseRow?.isParent).toBe(false);
      expect(expenseRow?.amounts['p-1']).toBe(10000);
      expect(expenseRow?.amounts['p-2']).toBe(12000);
      expect(expenseRow?.rowTotal).toBe(22000);

      // Section totals should not double count parent and child
      expect(result.sections![1].sectionTotals['p-1']).toBe(10000);
      expect(result.sections![1].sectionTotals['p-2']).toBe(12000);
      expect(result.sections![1].sectionTotals.total).toBe(22000);

      // Summary checks
      expect(result.summary).toBeDefined();
      expect(result.summary?.totalInflows['p-1']).toBe(55000); // 50000 income + 5000 liability inflow
      expect(result.summary?.totalOutflows['p-1']).toBe(10000); // 10000 expense
      expect(result.summary?.netMonthlyFlow['p-1']).toBe(45000);
      expect(result.summary?.cumulativeNetFlow['p-1']).toBe(45000);
      expect(result.summary?.cumulativeNetFlow['p-2']).toBe(88000); // 45000 + (55000 - 12000)
    });

    it('should filter by category when categoryId is passed', async () => {
      const result = await getMatrixUseCase.execute('user-1', 'fy-2026', 'GASTOS_VIDA');

      expect(result.fiscalYearId).toBe('fy-2026');
      expect(mockEntityManager.createQueryBuilder).toHaveBeenCalled();
    });
  });

  describe('UpdateBudgetMatrixUseCase', () => {
    it('should update amounts across multiple periods and sub-rows atomically', async () => {
      const updates = [
        { periodId: 'p-2', accountId: 'acc-1', amount: 15000 },
        {
          periodId: 'p-2',
          accountId: 'acc-3',
          subRowId: 'sub-1',
          subRowLabel: 'Compras Financiadas',
          amount: 6000,
          cashFlowDirection: 'INGRESO_EFECTIVO' as any,
        },
      ];

      const result = await updateMatrixUseCase.execute('user-1', 'fy-2026', updates);
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
        },
      ];

      const result = await updateMatrixUseCase.execute('user-1', 'fy-2026', updates);
      expect(result.success).toBe(true);
      expect(result.updatedCount).toBe(1);
    });

    it('should reject updates to closed periods', async () => {
      const updates = [
        { periodId: 'p-1', accountId: 'acc-1', amount: 15000 }, // p-1 is CLOSED
      ];

      await expect(updateMatrixUseCase.execute('user-1', 'fy-2026', updates)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('DeleteBudgetMatrixRowUseCase', () => {
    it('should delete all budget item records for an account sub-row across periods', async () => {
      const result = await deleteRowUseCase.execute('user-1', 'fy-2026', 'acc-3', 'sub-1');
      expect(result.success).toBe(true);
      expect(result.deletedCount).toBe(2);
    });
  });
});
