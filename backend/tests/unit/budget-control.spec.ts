import { GetBudgetControlUseCase } from '../../src/application/budgets/get-budget-control.use-case';
import { TransferBudgetFundsUseCase } from '../../src/application/budgets/transfer-budget-funds.use-case';
import { PeriodEntity } from '../../src/infrastructure/database/entities/period.entity';
import { BudgetEntity } from '../../src/infrastructure/database/entities/budget.entity';
import { BadRequestException } from '@nestjs/common';

describe('Budget Execution Control & Fund Transfers Unit Tests', () => {
  let getControlUseCase: GetBudgetControlUseCase;
  let transferFundsUseCase: TransferBudgetFundsUseCase;
  let mockEntityManager: any;

  const mockDataSource = {
    transaction: jest.fn().mockImplementation(async (isolation, cb) => {
      const callback = typeof isolation === 'function' ? isolation : cb;
      return callback(mockEntityManager);
    }),
  };

  const samplePeriod = {
    id: 'p-2026-08',
    name: '2026-08',
    startDate: '2026-08-01',
    endDate: '2026-08-31',
    status: 'OPEN',
  };

  const sampleAccounts = [
    {
      id: 'acc-1',
      name: 'Publicidad y Marketing',
      type: 'EXPENSE',
      isCashOrBank: false,
      status: 'ACTIVE',
    },
    {
      id: 'acc-2',
      name: 'Servicios Básicos',
      type: 'EXPENSE',
      isCashOrBank: false,
      status: 'ACTIVE',
    },
  ];

  beforeEach(() => {
    mockEntityManager = {
      findOne: jest.fn().mockImplementation((entityClass) => {
        if (entityClass === PeriodEntity || entityClass.name === 'PeriodEntity') {
          return Promise.resolve(samplePeriod);
        }
        if (entityClass === BudgetEntity || entityClass.name === 'BudgetEntity') {
          return Promise.resolve({
            id: 'b-1',
            userId: 'user-1',
            periodId: 'p-2026-08',
            items: [
              { accountId: 'acc-1', amount: 10000 },
              { accountId: 'acc-2', amount: 5000 },
            ],
          });
        }
        return Promise.resolve(null);
      }),
      find: jest.fn().mockResolvedValue([]),
      save: jest
        .fn()
        .mockImplementation((cls, entity) => Promise.resolve({ id: 'reassign-1', ...entity })),
      create: jest.fn().mockImplementation((cls, obj) => ({ id: 'mock-id', ...obj })),
      createQueryBuilder: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        innerJoinAndSelect: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockImplementation(() => Promise.resolve([])),
      }),
    };

    getControlUseCase = new GetBudgetControlUseCase(mockDataSource as any);
    transferFundsUseCase = new TransferBudgetFundsUseCase(mockDataSource as any);
  });

  describe('GetBudgetControlUseCase', () => {
    it('should compute available balance = budgeted - executed', async () => {
      mockEntityManager
        .createQueryBuilder()
        .getMany.mockResolvedValueOnce(sampleAccounts)
        .mockResolvedValueOnce([]);

      const result = await getControlUseCase.execute('user-1', 'p-2026-08');

      expect(result.summary.totalBudgeted).toBe(15000);
      expect(result.summary.totalExecuted).toBe(0);
      expect(result.summary.totalAvailable).toBe(15000);
      expect(result.summary.overallConsumptionPercentage).toBe(0);
    });
  });

  describe('TransferBudgetFundsUseCase', () => {
    it('should reject transfer if source account equals target account', async () => {
      await expect(
        transferFundsUseCase.execute('user-1', {
          periodId: 'p-2026-08',
          sourceAccountId: 'acc-1',
          targetAccountId: 'acc-1',
          amount: 1000,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject transfer if source available residual balance is insufficient', async () => {
      await expect(
        transferFundsUseCase.execute('user-1', {
          periodId: 'p-2026-08',
          sourceAccountId: 'acc-1',
          targetAccountId: 'acc-2',
          amount: 20000, // budgeted is only 10000
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should successfully transfer budget funds when residual balance is sufficient', async () => {
      const result = await transferFundsUseCase.execute('user-1', {
        periodId: 'p-2026-08',
        sourceAccountId: 'acc-1',
        targetAccountId: 'acc-2',
        amount: 2000,
        reason: 'Reasignación de fondos',
      });

      expect(result.success).toBe(true);
      expect(result.updatedSourceAvailable).toBe(8000);
    });
  });
});
