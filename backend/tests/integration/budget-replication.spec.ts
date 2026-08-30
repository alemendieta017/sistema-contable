import { Test, TestingModule } from '@nestjs/testing';
import { ReplicateBudgetItemUseCase } from '../../src/application/budgets/replicate-budget-item.use-case';
import { ExtendBudgetMatrixUseCase } from '../../src/application/budgets/extend-budget-matrix.use-case';
import { EnsurePeriodService } from '../../src/application/periods/ensure-period.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BudgetEntity } from '../../src/infrastructure/database/entities/budget.entity';
import { PeriodEntity } from '../../src/infrastructure/database/entities/period.entity';
import { AccountEntity } from '../../src/infrastructure/database/entities/account.entity';
import { BudgetItemEntity } from '../../src/infrastructure/database/entities/budget-item.entity';
import { DataSource } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('Budget Replication & Timeline Extension Integration Tests', () => {
  let replicateUseCase: ReplicateBudgetItemUseCase;
  let extendUseCase: ExtendBudgetMatrixUseCase;
  let mockEnsurePeriodService: any;
  let mockEntityManager: any;

  const mockDataSource = {
    transaction: jest.fn().mockImplementation(async (isolation, cb) => {
      const callback = typeof isolation === 'function' ? isolation : cb;
      return callback(mockEntityManager);
    }),
  };

  beforeEach(async () => {
    mockEnsurePeriodService = {
      ensurePeriod: jest.fn().mockImplementation((em, userId, targetPeriod) => {
        return Promise.resolve({
          id: `p-${targetPeriod}`,
          name: targetPeriod,
          startDate: `${targetPeriod}-01`,
          endDate: `${targetPeriod}-28`,
          status: 'OPEN',
          userId,
        });
      }),
    };

    mockEntityManager = {
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn().mockImplementation((cls, entity) => {
        const target = entity || cls;
        if (Array.isArray(target)) {
          return Promise.resolve(
            target.map((item) => ({ id: item.id || 'mock-saved-id', ...item })),
          );
        }
        return Promise.resolve({ ...target, id: target.id || 'mock-saved-id' });
      }),
      create: jest.fn().mockImplementation((cls, obj) => ({ id: 'mock-id', ...obj })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReplicateBudgetItemUseCase,
        ExtendBudgetMatrixUseCase,
        { provide: EnsurePeriodService, useValue: mockEnsurePeriodService },
        { provide: getRepositoryToken(BudgetEntity), useValue: {} },
        { provide: getRepositoryToken(PeriodEntity), useValue: {} },
        { provide: getRepositoryToken(AccountEntity), useValue: {} },
        { provide: getRepositoryToken(BudgetItemEntity), useValue: {} },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    replicateUseCase = module.get<ReplicateBudgetItemUseCase>(ReplicateBudgetItemUseCase);
    extendUseCase = module.get<ExtendBudgetMatrixUseCase>(ExtendBudgetMatrixUseCase);
  });

  describe('ReplicateBudgetItemUseCase', () => {
    it('should replicate the budgeted amount across all 12 periods of the calendar year', async () => {
      const userId = 'user-1';
      const periodId = 'period-6'; // June
      const accountId = 'acc-1';
      const amount = 3000000.0;

      mockEntityManager.findOne.mockResolvedValueOnce({
        id: periodId,
        name: '2026-06',
        userId,
      });

      mockEntityManager.findOne.mockResolvedValueOnce({
        id: accountId,
        name: 'Alquileres',
        type: 'EXPENSE',
        isCashOrBank: false,
        status: 'ACTIVE',
        userId,
      });

      const periods = Array.from({ length: 12 }, (_, i) => ({
        id: `period-${i + 1}`,
        name: `2026-${String(i + 1).padStart(2, '0')}`,
        userId,
      }));
      mockEntityManager.find
        .mockResolvedValueOnce(periods)
        .mockResolvedValueOnce([{ id: 'budget-1', userId, periodId: 'period-1' }])
        .mockResolvedValueOnce([
          { id: 'item-1', budgetId: 'budget-1', accountId, amount: 2000000.0 },
        ]);

      const result = await replicateUseCase.execute(userId, { periodId, accountId, amount });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.replicatedPeriods).toHaveLength(12);
      expect(result.replicatedPeriods).toEqual([
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
      ]);
      expect(mockEntityManager.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if origin period is not found', async () => {
      const userId = 'user-1';
      mockEntityManager.findOne.mockResolvedValueOnce(null);

      await expect(
        replicateUseCase.execute(userId, {
          periodId: 'invalid-period',
          accountId: 'acc-1',
          amount: 100,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if account is inactive or ineligible', async () => {
      const userId = 'user-1';
      const periodId = 'period-6';

      mockEntityManager.findOne.mockResolvedValueOnce({
        id: periodId,
        name: '2026-06',
        userId,
      });

      mockEntityManager.findOne.mockResolvedValueOnce({
        id: 'acc-1',
        name: 'Inactive Acc',
        type: 'EXPENSE',
        isCashOrBank: false,
        status: 'INACTIVE',
        userId,
      });

      await expect(
        replicateUseCase.execute(userId, { periodId, accountId: 'acc-1', amount: 100 }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('ExtendBudgetMatrixUseCase', () => {
    it('should dynamically provision target month and copy items from previous month', async () => {
      const userId = 'user-1';
      const targetPeriod = '2027-08';

      // 1. Previous period exists: 2027-07
      mockEntityManager.findOne
        .mockResolvedValueOnce({
          id: 'p-prev',
          name: '2027-07',
          userId,
        })
        // 2. Previous budget with 2 items
        .mockResolvedValueOnce({
          id: 'b-prev',
          userId,
          periodId: 'p-prev',
          items: [
            { id: 'bi-1', accountId: 'acc-1', amount: 3500, subRowId: null },
            {
              id: 'bi-2',
              accountId: 'acc-2',
              amount: 1200,
              subRowId: 'sub-1',
              subRowLabel: 'Internet',
            },
          ],
        })
        // 3. Target budget lookup (returns null, so created)
        .mockResolvedValueOnce(null);

      const result = await extendUseCase.execute(userId, {
        targetPeriod,
        copyFromPrevious: true,
      });

      expect(result.success).toBe(true);
      expect(result.provisionedPeriod.name).toBe('2027-08');
      expect(result.itemsCopied).toBe(2);
      expect(mockEnsurePeriodService.ensurePeriod).toHaveBeenCalledWith(
        mockEntityManager,
        userId,
        targetPeriod,
      );
      expect(mockEntityManager.save).toHaveBeenCalled();
    });

    it('should provision target month without copying items when copyFromPrevious is false', async () => {
      const userId = 'user-1';
      const targetPeriod = '2027-09';

      const result = await extendUseCase.execute(userId, {
        targetPeriod,
        copyFromPrevious: false,
      });

      expect(result.success).toBe(true);
      expect(result.provisionedPeriod.name).toBe('2027-09');
      expect(result.itemsCopied).toBe(0);
      expect(mockEnsurePeriodService.ensurePeriod).toHaveBeenCalledWith(
        mockEntityManager,
        userId,
        targetPeriod,
      );
    });
  });
});
