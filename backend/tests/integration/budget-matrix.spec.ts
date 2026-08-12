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

describe('Budget Matrix Integration Tests', () => {
  let getMatrixUseCase: GetBudgetMatrixUseCase;
  let updateMatrixUseCase: UpdateBudgetMatrixUseCase;
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
      id: 'acc-1',
      name: 'Sueldos y Salarios',
      type: 'EXPENSE',
      parentId: null,
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
  ];

  beforeEach(async () => {
    mockEntityManager = {
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest
        .fn()
        .mockImplementation((cls, entity) =>
          Promise.resolve({ ...entity, id: entity.id || 'mock-id' }),
        ),
      create: jest.fn().mockImplementation((cls, obj) => ({ id: 'mock-id', ...obj })),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
      createQueryBuilder: jest.fn().mockImplementation((entityClass) => {
        if (entityClass === AccountEntity || entityClass.name === 'AccountEntity') {
          return {
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            leftJoinAndSelect: jest.fn().mockReturnThis(),
            getMany: jest.fn().mockResolvedValue(sampleAccounts),
          };
        }
        return {
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          leftJoinAndSelect: jest.fn().mockReturnThis(),
          getMany: jest.fn().mockResolvedValue([
            {
              id: 'b-1',
              userId: 'user-1',
              periodId: 'p-1',
              items: [{ id: 'bi-1', accountId: 'acc-1', amount: 10000 }],
            },
            {
              id: 'b-2',
              userId: 'user-1',
              periodId: 'p-2',
              items: [{ id: 'bi-2', accountId: 'acc-1', amount: 12000 }],
            },
          ]),
        };
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetBudgetMatrixUseCase,
        UpdateBudgetMatrixUseCase,
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
  });

  describe('GetBudgetMatrixUseCase', () => {
    it('should throw NotFoundException if fiscal year does not exist', async () => {
      mockEntityManager.findOne.mockResolvedValue(null);
      await expect(getMatrixUseCase.execute('user-1', 'invalid-fy')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should aggregate 12 periods and compute row/category totals', async () => {
      mockEntityManager.findOne.mockResolvedValue(sampleFiscalYear);
      mockEntityManager.find
        .mockResolvedValueOnce(sampleAccounts) // accounts query
        .mockResolvedValueOnce([
          {
            id: 'b-1',
            userId: 'user-1',
            periodId: 'p-1',
            items: [{ id: 'bi-1', accountId: 'acc-1', amount: 10000 }],
          },
          {
            id: 'b-2',
            userId: 'user-1',
            periodId: 'p-2',
            items: [{ id: 'bi-2', accountId: 'acc-1', amount: 12000 }],
          },
        ]); // budgets query

      const result = await getMatrixUseCase.execute('user-1', 'fy-2026');

      expect(result.fiscalYearId).toBe('fy-2026');
      expect(result.periods).toHaveLength(2);
      expect(result.rows).toHaveLength(2);

      const row1 = result.rows.find((r) => r.accountId === 'acc-1');
      expect(row1?.amounts['p-1']).toBe(10000);
      expect(row1?.amounts['p-2']).toBe(12000);
      expect(row1?.rowTotal).toBe(22000);

      expect(result.categoryTotals['EXPENSE']['total']).toBe(22000);
    });
  });

  describe('UpdateBudgetMatrixUseCase', () => {
    it('should update amounts across multiple periods', async () => {
      mockEntityManager.findOne.mockResolvedValue(sampleFiscalYear);
      mockEntityManager.find.mockResolvedValue(sampleAccounts);

      const updates = [{ periodId: 'p-2', accountId: 'acc-1', amount: 15000 }];

      const result = await updateMatrixUseCase.execute('user-1', 'fy-2026', updates);
      expect(result.success).toBe(true);
      expect(result.updatedCount).toBe(1);
    });

    it('should reject updates to closed periods', async () => {
      mockEntityManager.findOne.mockResolvedValue(sampleFiscalYear);

      const updates = [
        { periodId: 'p-1', accountId: 'acc-1', amount: 15000 }, // p-1 is CLOSED
      ];

      await expect(updateMatrixUseCase.execute('user-1', 'fy-2026', updates)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
