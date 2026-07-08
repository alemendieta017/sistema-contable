import { Test, TestingModule } from '@nestjs/testing';
import { ReplicateBudgetItemUseCase } from '../../src/application/budgets/replicate-budget-item.use-case';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BudgetEntity } from '../../src/infrastructure/database/entities/budget.entity';
import { PeriodEntity } from '../../src/infrastructure/database/entities/period.entity';
import { AccountEntity } from '../../src/infrastructure/database/entities/account.entity';
import { BudgetItemEntity } from '../../src/infrastructure/database/entities/budget-item.entity';
import { DataSource } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('Budget Replication Integration Tests', () => {
  let replicateUseCase: ReplicateBudgetItemUseCase;
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
      save: jest
        .fn()
        .mockImplementation((cls, entity) =>
          Promise.resolve({ ...entity, id: entity.id || 'mock-saved-id' }),
        ),
      create: jest.fn().mockImplementation((cls, obj) => ({ id: 'mock-id', ...obj })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReplicateBudgetItemUseCase,
        {
          provide: getRepositoryToken(BudgetEntity),
          useValue: {},
        },
        {
          provide: getRepositoryToken(PeriodEntity),
          useValue: {},
        },
        {
          provide: getRepositoryToken(AccountEntity),
          useValue: {},
        },
        {
          provide: getRepositoryToken(BudgetItemEntity),
          useValue: {},
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    replicateUseCase = module.get<ReplicateBudgetItemUseCase>(ReplicateBudgetItemUseCase);
  });

  it('should replicate the budgeted amount across all 12 periods of the fiscal year', async () => {
    const userId = 'user-1';
    const periodId = 'period-6'; // June
    const accountId = 'acc-1';
    const amount = 3000000.0;

    // 1. Period check: mock the June period belonging to a fiscal year
    mockEntityManager.findOne.mockResolvedValueOnce({
      id: periodId,
      name: '2026-06',
      fiscalYearId: 'fy-2026',
      fiscalYear: { id: 'fy-2026', userId },
    });

    // 2. Account check: mock a valid active expense account
    mockEntityManager.findOne.mockResolvedValueOnce({
      id: accountId,
      name: 'Alquileres',
      type: 'EXPENSE',
      isCashOrBank: false,
      status: 'ACTIVE',
      userId,
    });

    // 3. Find all 12 periods: mock returning the 12 periods of the fiscal year
    const periods = Array.from({ length: 12 }, (_, i) => ({
      id: `period-${i + 1}`,
      name: `2026-${String(i + 1).padStart(2, '0')}`,
      fiscalYearId: 'fy-2026',
    }));
    mockEntityManager.find.mockResolvedValueOnce(periods);

    // 4. Mock findOne for BudgetEntity and BudgetItemEntity inside the loop.
    // For each of the 12 iterations:
    // - first findOne: BudgetEntity (return an existing budget for period-1, null for others to test creation)
    // - second findOne: BudgetItemEntity (return an existing item for period-1, null for others to test creation)
    mockEntityManager.findOne
      // Period 1
      .mockResolvedValueOnce({ id: 'budget-1', userId, periodId: 'period-1' })
      .mockResolvedValueOnce({ id: 'item-1', budgetId: 'budget-1', accountId, amount: 2000000.0 })
      // Period 2
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      // Period 3
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      // Period 4
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      // Period 5
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      // Period 6
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      // Period 7
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      // Period 8
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      // Period 9
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      // Period 10
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      // Period 11
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      // Period 12
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);

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

    // Check that save was called to persist budgets and budget items
    expect(mockEntityManager.save).toHaveBeenCalled();
  });

  it('should throw NotFoundException if origin period is not found', async () => {
    const userId = 'user-1';
    mockEntityManager.findOne.mockResolvedValueOnce(null); // period not found

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
      fiscalYearId: 'fy-2026',
      fiscalYear: { id: 'fy-2026', userId },
    });

    // Mock account as inactive
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
