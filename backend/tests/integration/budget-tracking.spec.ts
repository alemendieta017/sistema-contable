import { Test, TestingModule } from '@nestjs/testing';
import { GetBudgetsSummaryUseCase } from '../../src/application/budgets/get-budgets-summary.use-case';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BudgetEntity } from '../../src/infrastructure/database/entities/budget.entity';
import { JournalEntryEntity } from '../../src/infrastructure/database/entities/journal-entry.entity';
import { DataSource } from 'typeorm';

describe('Budget Tracking and Spending Aggregation Tests', () => {
  let useCase: GetBudgetsSummaryUseCase;
  let mockEntityManager: any;

  const mockDataSource = {
    transaction: jest.fn().mockImplementation(async (isolation, cb) => {
      const callback = typeof isolation === 'function' ? isolation : cb;
      return callback(mockEntityManager);
    }),
  };

  beforeEach(async () => {
    mockEntityManager = {
      find: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn(),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetBudgetsSummaryUseCase,
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

    useCase = module.get<GetBudgetsSummaryUseCase>(GetBudgetsSummaryUseCase);
  });

  it('should calculate budget spent percentage correctly (e.g. 40% consumption)', async () => {
    // Arrange
    const userId = 'user-uuid';
    const period = '2026-06';

    // Mock configured budget for category "comida" (acc-food) with limit $500,000
    mockEntityManager.find.mockResolvedValue([
      {
        id: 'budget-123',
        userId,
        accountId: 'acc-food',
        limit: 500000.0,
        period,
        account: { id: 'acc-food', name: 'Comida' },
      },
    ]);

    // Mock spent journal entries for "comida" (acc-food) in June: sum is $200,000
    mockEntityManager.createQueryBuilder().getRawMany.mockResolvedValue([
      { accountId: 'acc-food', sum: '200000.0000' },
    ]);

    // Act
    const result = await useCase.execute(userId, period);

    // Assert
    expect(result).toBeDefined();
    expect(result).toHaveLength(1);
    expect(result[0].accountId).toBe('acc-food');
    expect(result[0].limit).toBe(500000);
    expect(result[0].spent).toBe(200000);
    expect(result[0].percentage).toBe(40); // 200,000 / 500,000 * 100 = 40%
    expect(result[0].isExceeded).toBe(false);
  });

  it('should fall back to general budget (period 0000-00) if no explicit budget is set for the month', async () => {
    // Arrange
    const userId = 'user-uuid';
    const period = '2026-06';

    // Mock finding: no specific budget for June, but default budget for comida (period '0000-00')
    mockEntityManager.find.mockResolvedValue([
      {
        id: 'budget-default',
        userId,
        accountId: 'acc-food',
        limit: 100000.0,
        period: '0000-00',
        account: { id: 'acc-food', name: 'Comida' },
      },
    ]);

    // Mock spent journal entries for "comida" in June: sum is $30,000
    mockEntityManager.createQueryBuilder().getRawMany.mockResolvedValue([
      { accountId: 'acc-food', sum: '30000.0000' },
    ]);

    // Act
    const result = await useCase.execute(userId, period);

    // Assert
    expect(result).toBeDefined();
    expect(result).toHaveLength(1);
    expect(result[0].accountId).toBe('acc-food');
    expect(result[0].limit).toBe(100000);
    expect(result[0].spent).toBe(30000);
    expect(result[0].percentage).toBe(30);
    expect(result[0].period).toBe(period); // Replaced for UI consistency
  });
});
