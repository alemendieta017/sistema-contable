import { GetBudgetControlUseCase } from '../../src/application/budgets/get-budget-control.use-case';
import { TransferBudgetFundsUseCase } from '../../src/application/budgets/transfer-budget-funds.use-case';
import { PeriodEntity } from '../../src/infrastructure/database/entities/period.entity';
import { BudgetEntity } from '../../src/infrastructure/database/entities/budget.entity';
import { AccountEntity } from '../../src/infrastructure/database/entities/account.entity';
import { BadRequestException } from '@nestjs/common';
import { CashFlowDirection, BudgetMatrixSectionKey } from '@sistema-contable/shared';

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
      id: 'acc-inc-1',
      name: 'Honorarios Profesionales',
      type: 'INCOME',
      isCashOrBank: false,
      status: 'ACTIVE',
    },
    {
      id: 'acc-exp-1',
      name: 'Publicidad y Marketing',
      type: 'EXPENSE',
      isCashOrBank: false,
      status: 'ACTIVE',
    },
    {
      id: 'acc-exp-2',
      name: 'Servicios Básicos',
      type: 'EXPENSE',
      isCashOrBank: false,
      status: 'ACTIVE',
    },
    {
      id: 'acc-asset-1',
      name: 'Fondo Común FCI',
      type: 'ASSET',
      isCashOrBank: false,
      status: 'ACTIVE',
    },
    {
      id: 'acc-liab-1',
      name: 'Préstamo Banco',
      type: 'LIABILITY',
      isCashOrBank: false,
      status: 'ACTIVE',
    },
  ];

  beforeEach(() => {
    mockEntityManager = {
      findOne: jest.fn().mockImplementation((entityClass, options) => {
        if (entityClass === PeriodEntity || entityClass.name === 'PeriodEntity') {
          return Promise.resolve(samplePeriod);
        }
        if (entityClass === AccountEntity || entityClass.name === 'AccountEntity') {
          const accId = options?.where?.id;
          const found = sampleAccounts.find((a) => a.id === accId);
          return Promise.resolve(found || null);
        }
        if (entityClass === BudgetEntity || entityClass.name === 'BudgetEntity') {
          return Promise.resolve({
            id: 'b-1',
            userId: 'user-1',
            periodId: 'p-2026-08',
            items: [
              {
                accountId: 'acc-inc-1',
                amount: 50000,
                cashFlowDirection: CashFlowDirection.INGRESO_EFECTIVO,
              },
              {
                accountId: 'acc-exp-1',
                amount: 10000,
                cashFlowDirection: CashFlowDirection.EGRESO_EFECTIVO,
              },
              {
                accountId: 'acc-exp-2',
                amount: 5000,
                cashFlowDirection: CashFlowDirection.EGRESO_EFECTIVO,
              },
              {
                accountId: 'acc-asset-1',
                amount: 8000,
                subRowId: 'sub-fci-1',
                subRowLabel: 'Aporte FCI',
                cashFlowDirection: CashFlowDirection.EGRESO_EFECTIVO,
              },
              {
                accountId: 'acc-liab-1',
                amount: 4000,
                subRowId: 'sub-loan-1',
                subRowLabel: 'Pago Cuota',
                cashFlowDirection: CashFlowDirection.EGRESO_EFECTIVO,
              },
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
    it('should compute available balance = budgeted - executed - committed across 4 financial blocks', async () => {
      mockEntityManager
        .createQueryBuilder()
        .getMany.mockResolvedValueOnce(sampleAccounts)
        .mockResolvedValueOnce([]);

      const result = await getControlUseCase.execute('user-1', 'p-2026-08');

      expect(result.sections).toBeDefined();
      expect(result.sections).toHaveLength(4);

      const incomeSec = result.sections!.find(
        (s) => s.sectionKey === BudgetMatrixSectionKey.INGRESOS,
      );
      const expenseSec = result.sections!.find(
        (s) => s.sectionKey === BudgetMatrixSectionKey.GASTOS_VIDA,
      );
      const assetSec = result.sections!.find(
        (s) => s.sectionKey === BudgetMatrixSectionKey.AHORRO_INVERSIONES,
      );
      const liabSec = result.sections!.find(
        (s) => s.sectionKey === BudgetMatrixSectionKey.DEUDAS_FINANCIACION,
      );

      expect(incomeSec?.budgeted).toBe(50000);
      expect(incomeSec?.executed).toBe(0);
      expect(incomeSec?.available).toBe(50000);

      expect(expenseSec?.budgeted).toBe(15000);
      expect(expenseSec?.executed).toBe(0);
      expect(expenseSec?.available).toBe(15000);

      expect(assetSec?.budgeted).toBe(8000);
      expect(assetSec?.available).toBe(8000);

      expect(liabSec?.budgeted).toBe(4000);
      expect(liabSec?.available).toBe(4000);

      expect(result.summary.totalBudgeted).toBe(77000);
      expect(result.summary.totalExecuted).toBe(0);
      expect(result.summary.totalCommitted).toBe(0);
      expect(result.summary.totalAvailable).toBe(77000);
      expect(result.summary.overallConsumptionPercentage).toBe(0);
      expect(result.summary.overallGaugeStatus).toBe('NORMAL');
    });

    it('should assign gauge status NORMAL (<75%), WARNING (75-99%), and OVERBUDGET (>=100%) based on ledger debits and credits', async () => {
      const customAccounts = [
        {
          id: 'acc-normal',
          name: 'Normal Exp',
          type: 'EXPENSE',
          isCashOrBank: false,
          status: 'ACTIVE',
        },
        {
          id: 'acc-warning',
          name: 'Warning Exp',
          type: 'EXPENSE',
          isCashOrBank: false,
          status: 'ACTIVE',
        },
        {
          id: 'acc-over',
          name: 'Overbudget Exp',
          type: 'EXPENSE',
          isCashOrBank: false,
          status: 'ACTIVE',
        },
      ];

      mockEntityManager.findOne.mockImplementation((entityClass) => {
        if (entityClass === PeriodEntity || entityClass.name === 'PeriodEntity') {
          return Promise.resolve(samplePeriod);
        }
        if (entityClass === BudgetEntity || entityClass.name === 'BudgetEntity') {
          return Promise.resolve({
            id: 'b-1',
            userId: 'user-1',
            periodId: 'p-2026-08',
            items: [
              {
                accountId: 'acc-normal',
                amount: 10000,
                cashFlowDirection: CashFlowDirection.EGRESO_EFECTIVO,
              },
              {
                accountId: 'acc-warning',
                amount: 10000,
                cashFlowDirection: CashFlowDirection.EGRESO_EFECTIVO,
              },
              {
                accountId: 'acc-over',
                amount: 10000,
                cashFlowDirection: CashFlowDirection.EGRESO_EFECTIVO,
              },
            ],
          });
        }
        return Promise.resolve(null);
      });

      // Journal entries to yield 50% (5000), 80% (8000), and 110% (11000) execution
      const mockEntries = [
        { accountId: 'acc-normal', entryType: 'DEBIT', amount: 5000 },
        { accountId: 'acc-warning', entryType: 'DEBIT', amount: 8000 },
        { accountId: 'acc-over', entryType: 'DEBIT', amount: 11000 },
      ];

      mockEntityManager
        .createQueryBuilder()
        .getMany.mockResolvedValueOnce(customAccounts)
        .mockResolvedValueOnce(mockEntries);

      const result = await getControlUseCase.execute('user-1', 'p-2026-08');

      const expenseSec = result.sections!.find(
        (s) => s.sectionKey === BudgetMatrixSectionKey.GASTOS_VIDA,
      );
      expect(expenseSec).toBeDefined();

      const normalItem = expenseSec!.items.find((i) => i.accountId === 'acc-normal');
      const warningItem = expenseSec!.items.find((i) => i.accountId === 'acc-warning');
      const overItem = expenseSec!.items.find((i) => i.accountId === 'acc-over');

      expect(normalItem?.gaugeStatus).toBe('NORMAL');
      expect(normalItem?.consumptionPercentage).toBe(50);
      expect(normalItem?.available).toBe(5000);

      expect(warningItem?.gaugeStatus).toBe('WARNING');
      expect(warningItem?.consumptionPercentage).toBe(80);
      expect(warningItem?.available).toBe(2000);

      expect(overItem?.gaugeStatus).toBe('OVERBUDGET');
      expect(overItem?.consumptionPercentage).toBe(110);
      expect(overItem?.available).toBe(-1000);
    });
  });

  describe('TransferBudgetFundsUseCase', () => {
    it('should reject transfer if source account equals target account', async () => {
      await expect(
        transferFundsUseCase.execute('user-1', {
          periodId: 'p-2026-08',
          sourceAccountId: 'acc-exp-1',
          targetAccountId: 'acc-exp-1',
          amount: 1000,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject transfer if amount is zero or negative', async () => {
      await expect(
        transferFundsUseCase.execute('user-1', {
          periodId: 'p-2026-08',
          sourceAccountId: 'acc-exp-1',
          targetAccountId: 'acc-exp-2',
          amount: 0,
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        transferFundsUseCase.execute('user-1', {
          periodId: 'p-2026-08',
          sourceAccountId: 'acc-exp-1',
          targetAccountId: 'acc-exp-2',
          amount: -500,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject transfer if period is closed', async () => {
      mockEntityManager.findOne.mockImplementation((entityClass, options) => {
        if (entityClass === PeriodEntity || entityClass.name === 'PeriodEntity') {
          return Promise.resolve({ ...samplePeriod, status: 'CLOSED' });
        }
        if (entityClass === AccountEntity || entityClass.name === 'AccountEntity') {
          const accId = options?.where?.id;
          return Promise.resolve(sampleAccounts.find((a) => a.id === accId) || null);
        }
        return Promise.resolve(null);
      });

      await expect(
        transferFundsUseCase.execute('user-1', {
          periodId: 'p-2026-08',
          sourceAccountId: 'acc-exp-1',
          targetAccountId: 'acc-exp-2',
          amount: 1000,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject transfer between accounts with different cash flow directions (e.g. Expense to Income)', async () => {
      await expect(
        transferFundsUseCase.execute('user-1', {
          periodId: 'p-2026-08',
          sourceAccountId: 'acc-exp-1', // EGRESO_EFECTIVO
          targetAccountId: 'acc-inc-1', // INGRESO_EFECTIVO
          amount: 1000,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject transfer if source available residual balance is insufficient', async () => {
      await expect(
        transferFundsUseCase.execute('user-1', {
          periodId: 'p-2026-08',
          sourceAccountId: 'acc-exp-1',
          targetAccountId: 'acc-exp-2',
          amount: 20000, // budgeted is only 10000
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should successfully transfer budget funds between same-direction accounts (e.g. Expense to Asset Investment) and record audit log', async () => {
      const result = await transferFundsUseCase.execute('user-1', {
        periodId: 'p-2026-08',
        sourceAccountId: 'acc-exp-1',
        targetAccountId: 'acc-asset-1',
        amount: 2000,
        reason: 'Reasignación de sobrante de publicidad hacia aporte FCI',
      });

      expect(result.success).toBe(true);
      expect(result.updatedSourceAvailable).toBe(8000);
      expect(mockEntityManager.save).toHaveBeenCalled();
    });
  });
});
