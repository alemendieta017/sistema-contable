import { ApplyBudgetDriverUseCase } from '../../src/application/budgets/apply-budget-driver.use-case';
import { GetPriorYearActualsUseCase } from '../../src/application/budgets/get-prior-year-actuals.use-case';
import { FiscalYearEntity } from '../../src/infrastructure/database/entities/fiscal-year.entity';
import { BudgetEntity } from '../../src/infrastructure/database/entities/budget.entity';
import { AccountEntity } from '../../src/infrastructure/database/entities/account.entity';

describe('Budget Distribution Drivers & Prior Year Actuals Unit Tests', () => {
  let applyDriverUseCase: ApplyBudgetDriverUseCase;
  let getPriorYearActualsUseCase: GetPriorYearActualsUseCase;
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
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    periods: samplePeriods,
  };

  beforeEach(() => {
    mockEntityManager = {
      findOne: jest.fn().mockImplementation((entityClass) => {
        if (entityClass === FiscalYearEntity || entityClass.name === 'FiscalYearEntity') {
          return Promise.resolve(sampleFiscalYear);
        }
        if (entityClass === AccountEntity || entityClass.name === 'AccountEntity') {
          return Promise.resolve({ id: 'acc-1', name: 'Ventas', type: 'INCOME' });
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
      createQueryBuilder: jest.fn().mockImplementation((entityClass) => {
        const isAccount = entityClass === AccountEntity || entityClass?.name === 'AccountEntity';
        return {
          innerJoin: jest.fn().mockReturnThis(),
          innerJoinAndSelect: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          addSelect: jest.fn().mockReturnThis(),
          groupBy: jest.fn().mockReturnThis(),
          getRawMany: jest.fn(),
          getMany: jest.fn().mockResolvedValue(
            isAccount
              ? [{ id: 'acc-1', name: 'Ventas', type: 'INCOME' }]
              : [
                  {
                    entryType: 'CREDIT',
                    amount: 1000,
                    transaction: { accountingDate: '2025-01-15' },
                  },
                  {
                    entryType: 'CREDIT',
                    amount: 3000,
                    transaction: { accountingDate: '2025-02-15' },
                  },
                ],
          ),
        };
      }),
    };

    applyDriverUseCase = new ApplyBudgetDriverUseCase(mockDataSource as any);
    getPriorYearActualsUseCase = new GetPriorYearActualsUseCase(mockDataSource as any);
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

    it('should allocate remainder to the last period when non-divisible', async () => {
      const result = await applyDriverUseCase.execute('user-1', {
        fiscalYearId: 'fy-2026',
        accountId: 'acc-1',
        driverType: 'FLAT_PRORATE',
        annualTotal: 100, // 100 / 4 = 25 per period
      });

      expect(
        result.monthlyAmounts['p-1'] +
          result.monthlyAmounts['p-2'] +
          result.monthlyAmounts['p-3'] +
          result.monthlyAmounts['p-4'],
      ).toBe(100);
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

  describe('WEIGHTED_HISTORICAL & PRIOR_YEAR_ACTUAL Drivers', () => {
    it('should compute weighted historical allocation based on prior year entries', async () => {
      const result = await applyDriverUseCase.execute('user-1', {
        fiscalYearId: 'fy-2026',
        accountId: 'acc-1',
        driverType: 'WEIGHTED_HISTORICAL',
        annualTotal: 20000,
      });

      expect(result.success).toBe(true);
      // p-1 has 1000, p-2 has 3000, total = 4000
      // p-1 weight = 1000/4000 = 0.25 -> 5000
      // p-2 weight = 3000/4000 = 0.75 -> 15000
      expect(result.monthlyAmounts['p-1']).toBe(5000);
      expect(result.monthlyAmounts['p-2']).toBe(15000);
    });

    it('should apply percentage adjustment to prior year actuals for PRIOR_YEAR_ACTUAL driver', async () => {
      const result = await applyDriverUseCase.execute('user-1', {
        fiscalYearId: 'fy-2026',
        accountId: 'acc-1',
        driverType: 'PRIOR_YEAR_ACTUAL',
        growthPercentage: 10, // +10%
      });

      expect(result.success).toBe(true);
      // p-1 prior actual = 1000 * 1.1 = 1100
      // p-2 prior actual = 3000 * 1.1 = 3300
      expect(result.monthlyAmounts['p-1']).toBe(1100);
      expect(result.monthlyAmounts['p-2']).toBe(3300);
    });
  });

  describe('GetPriorYearActualsUseCase', () => {
    it('should calculate baseline pre-population with percentage adjustment', async () => {
      const result = await getPriorYearActualsUseCase.execute('user-1', {
        fiscalYearId: 'fy-2026',
        adjustmentPercentage: 5, // +5%
        accountIds: ['acc-1'],
      });

      expect(result.success).toBe(true);
      expect(result.matrix).toHaveLength(1);
      expect(result.matrix[0].accountId).toBe('acc-1');
      // p-1 actual 1000 * 1.05 = 1050
      // p-2 actual 3000 * 1.05 = 3150
      expect(result.matrix[0].amounts['p-1']).toBe(1050);
      expect(result.matrix[0].amounts['p-2']).toBe(3150);
    });
  });
});
