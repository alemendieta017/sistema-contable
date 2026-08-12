import { ApplyBudgetDriverUseCase } from '../../src/application/budgets/apply-budget-driver.use-case';
import { FiscalYearEntity } from '../../src/infrastructure/database/entities/fiscal-year.entity';
import { BudgetEntity } from '../../src/infrastructure/database/entities/budget.entity';

describe('Budget Distribution Drivers & Prior Year Actuals Unit Tests', () => {
  let applyDriverUseCase: ApplyBudgetDriverUseCase;
  let mockEntityManager: any;

  const mockDataSource = {
    transaction: jest.fn().mockImplementation(async (isolation, cb) => {
      const callback = typeof isolation === 'function' ? isolation : cb;
      return callback(mockEntityManager);
    }),
  };

  const samplePeriods = [
    { id: 'p-1', name: '2026-01', startDate: '2026-01-01', endDate: '2026-01-31', status: 'OPEN' },
    { id: 'p-2', name: '2026-02', startDate: '2026-02-01', endDate: '2026-02-28', status: 'OPEN' },
    { id: 'p-3', name: '2026-03', startDate: '2026-03-01', endDate: '2026-03-31', status: 'OPEN' },
    { id: 'p-4', name: '2026-04', startDate: '2026-04-01', endDate: '2026-04-30', status: 'OPEN' },
  ];

  const sampleFiscalYear = {
    id: 'fy-2026',
    name: '2026',
    periods: samplePeriods,
  };

  beforeEach(() => {
    mockEntityManager = {
      findOne: jest.fn().mockImplementation((entityClass) => {
        if (entityClass === FiscalYearEntity || entityClass.name === 'FiscalYearEntity') {
          return Promise.resolve(sampleFiscalYear);
        }
        if (entityClass === BudgetEntity || entityClass.name === 'BudgetEntity') {
          return Promise.resolve({
            id: 'b-1',
            userId: 'user-1',
            periodId: 'p-1',
            items: [{ accountId: 'acc-1', amount: 5000 }],
          });
        }
        return Promise.resolve(null);
      }),
      find: jest.fn().mockResolvedValue([]),
      save: jest
        .fn()
        .mockImplementation((cls, entity) =>
          Promise.resolve({ ...entity, id: entity.id || 'mock-id' }),
        ),
      create: jest.fn().mockImplementation((cls, obj) => ({ id: 'mock-id', ...obj })),
      createQueryBuilder: jest.fn().mockReturnValue({
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn(),
        getMany: jest.fn(),
      }),
    };

    applyDriverUseCase = new ApplyBudgetDriverUseCase(mockDataSource as any);
  });

  describe('FLAT_PRORATE Driver', () => {
    it('should divide annual total evenly across 4 open periods', async () => {
      mockEntityManager.findOne.mockResolvedValue(sampleFiscalYear);
      mockEntityManager.find.mockResolvedValue([]);

      const result = await applyDriverUseCase.execute('user-1', {
        fiscalYearId: 'fy-2026',
        accountId: 'acc-1',
        driverType: 'FLAT_PRORATE',
        annualTotal: 10000,
      });

      expect(result.success).toBe(true);
      expect(result.monthlyAmounts['p-1']).toBe(2500);
      expect(result.monthlyAmounts['p-2']).toBe(2500);
      expect(result.monthlyAmounts['p-3']).toBe(2500);
      expect(result.monthlyAmounts['p-4']).toBe(2500);
    });
  });

  describe('FORWARD_FILL Driver', () => {
    it('should copy source period amount to all subsequent open periods', async () => {
      const result = await applyDriverUseCase.execute('user-1', {
        fiscalYearId: 'fy-2026',
        accountId: 'acc-1',
        driverType: 'FORWARD_FILL',
        sourcePeriodId: 'p-1',
      });

      expect(result.success).toBe(true);
      expect(result.monthlyAmounts['p-1']).toBe(5000);
      expect(result.monthlyAmounts['p-2']).toBe(5000);
      expect(result.monthlyAmounts['p-3']).toBe(5000);
      expect(result.monthlyAmounts['p-4']).toBe(5000);
    });
  });

  describe('PERCENTAGE_GROWTH Driver', () => {
    it('should grow amounts month over month based on growth percentage', async () => {
      const result = await applyDriverUseCase.execute('user-1', {
        fiscalYearId: 'fy-2026',
        accountId: 'acc-1',
        driverType: 'PERCENTAGE_GROWTH',
        sourcePeriodId: 'p-1',
        growthPercentage: 10, // 10% MoM
      });

      expect(result.success).toBe(true);
      expect(result.monthlyAmounts['p-1']).toBe(5000);
      expect(result.monthlyAmounts['p-2']).toBe(5500);
      expect(result.monthlyAmounts['p-3']).toBe(6050);
    });
  });
});
