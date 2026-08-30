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

    const result = await useCase.execute('user-1', 'fy-2026', false, new Date('2026-06-01'));

    expect(result.months).toHaveLength(1);
    const month = result.months[0];
    expect(month.initialCash).toBe(1000);
    // debits (500) - credits (100) = 400 net cash flow
    expect(month.netFlow).toBe(400);
    expect(month.finalCash).toBe(1400);
    expect(month.egresosOperativos).toBe(100);
  });
});
