import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CashFlowStatementForecastUseCase } from './cash-flow-statement.use-case';
import { PeriodEntity } from '../../infrastructure/database/entities/period.entity';
import { AccountPeriodBalanceEntity } from '../../infrastructure/database/entities/account-period-balance.entity';
import { BudgetEntity } from '../../infrastructure/database/entities/budget.entity';
import { AccountEntity } from '../../infrastructure/database/entities/account.entity';

describe('CashFlowStatementForecastUseCase (US4)', () => {
  let useCase: CashFlowStatementForecastUseCase;
  let entityManagerMock: any;

  beforeEach(async () => {
    entityManagerMock = {
      findOne: jest.fn(),
      find: jest.fn(),
      getRepository: jest.fn(),
    };

    const periodRepoMock = {
      manager: {
        transaction: jest.fn((cb) => cb(entityManagerMock)),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CashFlowStatementForecastUseCase,
        {
          provide: getRepositoryToken(PeriodEntity),
          useValue: periodRepoMock,
        },
        {
          provide: getRepositoryToken(AccountPeriodBalanceEntity),
          useValue: {},
        },
        {
          provide: getRepositoryToken(BudgetEntity),
          useValue: {},
        },
        {
          provide: getRepositoryToken(AccountEntity),
          useValue: {},
        },
      ],
    }).compile();

    useCase = module.get<CashFlowStatementForecastUseCase>(CashFlowStatementForecastUseCase);
  });

  it('should calculate initialCash, netFlow, and finalCash from AccountPeriodBalanceEntity for liquid accounts', async () => {
    const mockPeriod = {
      id: 'p-1',
      name: '2026-01',
      startDate: '2026-01-01',
      endDate: '2026-01-31',
      status: 'CLOSED',
    };

    const mockAccounts: Partial<AccountEntity>[] = [
      { id: 'cash-1', name: 'Efectivo', type: 'ASSET', isCashOrBank: true, userId: 'user-1' },
      { id: 'exp-1', name: 'Comida', type: 'EXPENSE', isCashOrBank: false, userId: 'user-1' },
    ];

    const mockBalances: Partial<AccountPeriodBalanceEntity>[] = [
      {
        id: 'bal-cash',
        periodId: 'p-1',
        openingBalance: 1000,
        totalDebits: 500,
        totalCredits: 100,
        account: {
          id: 'cash-1',
          name: 'Efectivo',
          type: 'ASSET',
          isCashOrBank: true,
        } as AccountEntity,
      },
      {
        id: 'bal-exp',
        periodId: 'p-1',
        openingBalance: 0,
        totalDebits: 100,
        totalCredits: 0,
        account: {
          id: 'exp-1',
          name: 'Comida',
          type: 'EXPENSE',
          isCashOrBank: false,
        } as AccountEntity,
      },
    ];

    entityManagerMock.findOne.mockImplementation((entity: any, _opts: any) => {
      if (entity === PeriodEntity) return Promise.resolve(mockPeriod);
      return Promise.resolve(null);
    });

    entityManagerMock.find.mockImplementation((entity: any, opts: any) => {
      if (entity === PeriodEntity) return Promise.resolve([mockPeriod]);
      if (entity === AccountEntity) return Promise.resolve(mockAccounts);
      if (entity === AccountPeriodBalanceEntity) {
        if (opts?.where?.account?.isCashOrBank) {
          return Promise.resolve([mockBalances[0]]);
        }
        return Promise.resolve(mockBalances);
      }
      return Promise.resolve([]);
    });

    const result = await useCase.execute('user-1', '2026-01', false, new Date('2026-06-01'));

    expect(result.months).toHaveLength(12);
    const month = result.months[0];
    expect(month.initialCash).toBe(1000);
    // debits (500) - credits (100) = 400 net cash flow
    expect(month.netFlow).toBe(400);
    expect(month.finalCash).toBe(1400);
    expect(month.egresosOperativos).toBe(100);
  });

  it('should support startPeriod as YYYY-MM without fiscalYearId and compute 12 rolling months', async () => {
    const mockPeriods: any[] = [];
    for (let i = 1; i <= 12; i++) {
      const monthStr = String(i).padStart(2, '0');
      mockPeriods.push({
        id: `p-${i}`,
        name: `2026-${monthStr}`,
        startDate: `2026-${monthStr}-01`,
        endDate: `2026-${monthStr}-28`,
        status: i <= 6 ? 'CLOSED' : 'OPEN',
      });
    }

    const mockCashAccount: Partial<AccountEntity> = {
      id: 'cash-1',
      name: 'Banco',
      type: 'ASSET',
      isCashOrBank: true,
      userId: 'user-1',
    };

    entityManagerMock.findOne.mockImplementation((entity: any, _opts: any) => {
      if (entity === PeriodEntity) return Promise.resolve(mockPeriods[0]);
      return Promise.resolve(null);
    });

    entityManagerMock.find.mockImplementation((entity: any, _opts?: any) => {
      if (entity === PeriodEntity) {
        return Promise.resolve(mockPeriods);
      }
      if (entity === AccountEntity) {
        return Promise.resolve([mockCashAccount]);
      }
      if (entity === AccountPeriodBalanceEntity) {
        return Promise.resolve([
          {
            id: 'bal-cash',
            periodId: 'p-1',
            openingBalance: 5000,
            totalDebits: 2000,
            totalCredits: 1000,
            account: mockCashAccount as AccountEntity,
          },
        ]);
      }
      return Promise.resolve([]);
    });

    const result = await useCase.execute('user-1', '2026-01', true, new Date('2026-06-15'));

    expect(result.months).toHaveLength(12);
    expect(result.months[0].initialCash).toBe(5000);
    expect(result.months[0].netFlow).toBe(1000); // 2000 debits - 1000 credits
    expect(result.months[0].finalCash).toBe(6000);
  });

  it('should categorize asset movements as investing and liability movements as financing in Real Cash Flow', async () => {
    const mockPeriod = {
      id: 'p-1',
      name: '2026-05',
      startDate: '2026-05-01',
      endDate: '2026-05-31',
      status: 'CLOSED',
    };

    const mockAccounts: Partial<AccountEntity>[] = [
      { id: 'cash-1', name: 'Banco', type: 'ASSET', isCashOrBank: true, userId: 'user-1' },
      { id: 'inv-1', name: 'Acciones', type: 'ASSET', isCashOrBank: false, userId: 'user-1' },
      { id: 'debt-1', name: 'Préstamo', type: 'LIABILITY', isCashOrBank: false, userId: 'user-1' },
    ];

    const mockBalances: Partial<AccountPeriodBalanceEntity>[] = [
      {
        id: 'bal-cash',
        periodId: 'p-1',
        openingBalance: 10000,
        totalDebits: 1000,
        totalCredits: 3000,
        account: mockAccounts[0] as AccountEntity,
      },
      {
        id: 'bal-inv',
        periodId: 'p-1',
        openingBalance: 5000,
        totalDebits: 2000, // bought 2000 in shares (outflow/investment)
        totalCredits: 0,
        account: mockAccounts[1] as AccountEntity,
      },
      {
        id: 'bal-debt',
        periodId: 'p-1',
        openingBalance: 8000,
        totalDebits: 1000, // repaid 1000 debt (outflow/financing)
        totalCredits: 0,
        account: mockAccounts[2] as AccountEntity,
      },
    ];

    entityManagerMock.findOne.mockImplementation((entity: any, _opts: any) => {
      if (entity === PeriodEntity) return Promise.resolve(mockPeriod);
      return Promise.resolve(null);
    });

    entityManagerMock.find.mockImplementation((entity: any, opts: any) => {
      if (entity === PeriodEntity) return Promise.resolve([mockPeriod]);
      if (entity === AccountEntity) return Promise.resolve(mockAccounts);
      if (entity === AccountPeriodBalanceEntity) {
        if (opts?.where?.account?.isCashOrBank) {
          return Promise.resolve([mockBalances[0]]);
        }
        return Promise.resolve(mockBalances);
      }
      return Promise.resolve([]);
    });

    const result = await useCase.execute('user-1', '2026-05', false, new Date('2026-06-01'));
    expect(result.months).toHaveLength(12);
    expect(result.months[0].initialCash).toBe(10000);
    expect(result.months[0].salidasActivoPasivo).toBe(3000); // 2000 inv + 1000 debt
  });
});
