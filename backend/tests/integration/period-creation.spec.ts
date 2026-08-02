import { Test, TestingModule } from '@nestjs/testing';
import { CreateFiscalYearUseCase } from '../../src/application/periods/create-fiscal-year.use-case';
import { BalanceUpdateService } from '../../src/application/periods/balance-update.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FiscalYearEntity } from '../../src/infrastructure/database/entities/fiscal-year.entity';
import { PeriodEntity } from '../../src/infrastructure/database/entities/period.entity';
import { BudgetEntity } from '../../src/infrastructure/database/entities/budget.entity';
import { AccountEntity } from '../../src/infrastructure/database/entities/account.entity';
import { AccountPeriodBalanceEntity } from '../../src/infrastructure/database/entities/account-period-balance.entity';
import { BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';

describe('Fiscal Year and Period Creation Integration Tests', () => {
  let useCase: CreateFiscalYearUseCase;
  let mockEntityManager: any;
  let mockFiscalYearRepo: any;
  let mockPeriodRepo: any;
  let mockBalanceUpdateService: any;

  const createMockQueryBuilder = (getOneValue: any = null) => ({
    innerJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getOne: jest.fn().mockResolvedValue(getOneValue),
  });

  const mockDataSource = {
    transaction: jest.fn().mockImplementation(async (cb) => {
      return cb(mockEntityManager);
    }),
  };

  beforeEach(async () => {
    mockEntityManager = {
      create: jest.fn().mockImplementation((entityClass, plainObject) => {
        return {
          id: `mock-${entityClass.name ? entityClass.name.toLowerCase() : 'entity'}-uuid`,
          ...plainObject,
        };
      }),
      save: jest.fn().mockImplementation(async (entityClass, entity) => {
        return {
          id:
            entity.id ||
            `mock-${entityClass.name ? entityClass.name.toLowerCase() : 'entity'}-uuid`,
          ...entity,
        };
      }),
      getRepository: jest.fn().mockReturnValue({
        createQueryBuilder: jest.fn().mockReturnValue(createMockQueryBuilder()),
      }),
    };

    mockFiscalYearRepo = {
      findOne: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(createMockQueryBuilder()),
    };

    mockPeriodRepo = {};

    mockBalanceUpdateService = {
      propagateBalancesFromPeriod: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateFiscalYearUseCase,
        {
          provide: BalanceUpdateService,
          useValue: mockBalanceUpdateService,
        },
        {
          provide: getRepositoryToken(FiscalYearEntity),
          useValue: mockFiscalYearRepo,
        },
        {
          provide: getRepositoryToken(PeriodEntity),
          useValue: mockPeriodRepo,
        },
        {
          provide: getRepositoryToken(BudgetEntity),
          useValue: {},
        },
        {
          provide: getRepositoryToken(AccountEntity),
          useValue: {},
        },
        {
          provide: getRepositoryToken(AccountPeriodBalanceEntity),
          useValue: {},
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    useCase = module.get<CreateFiscalYearUseCase>(CreateFiscalYearUseCase);
  });

  it('should successfully create a fiscal year, 12 monthly periods, and 12 empty budgets', async () => {
    const userId = 'user-123';
    const dto = {
      year: 2026,
      startDate: '2026-01-01',
      endDate: '2026-12-31',
    };

    mockFiscalYearRepo.findOne.mockResolvedValue(null);

    const result = await useCase.execute(userId, dto);

    expect(result.name).toBe('Ejercicio 2026');
    expect(result.status).toBe('OPEN');
    expect(result.periods).toHaveLength(12);
    expect(result.periods[0].name).toBe('2026-01');
    expect(result.periods[11].name).toBe('2026-12');

    // 1 fiscal year + 12 periods + 12 budgets = 25 saves
    expect(mockEntityManager.save).toHaveBeenCalledTimes(25);

    // Verify budget creation calls
    const budgetCreateCalls = mockEntityManager.create.mock.calls.filter(
      (args: any[]) => args[0] === BudgetEntity,
    );
    expect(budgetCreateCalls).toHaveLength(12);
  });

  it('should trigger balance propagation when creating a subsequent fiscal year if a previous period exists', async () => {
    const userId = 'user-123';
    const dto = {
      year: 2027,
      startDate: '2027-01-01',
      endDate: '2027-12-31',
    };

    mockFiscalYearRepo.findOne.mockResolvedValue(null);

    const previousPeriod = {
      id: 'prev-period-2026-12',
      name: '2026-12',
      startDate: '2026-12-01',
      endDate: '2026-12-31',
    };

    mockEntityManager.getRepository.mockReturnValue({
      createQueryBuilder: jest.fn().mockReturnValue(createMockQueryBuilder(previousPeriod)),
    });

    await useCase.execute(userId, dto);

    expect(mockBalanceUpdateService.propagateBalancesFromPeriod).toHaveBeenCalledWith(
      mockEntityManager,
      userId,
      'prev-period-2026-12',
    );
  });

  it('should throw BadRequestException if startDate is after or equal to endDate', async () => {
    const userId = 'user-123';
    const dto = {
      year: 2026,
      startDate: '2026-12-31',
      endDate: '2026-01-01',
    };

    await expect(useCase.execute(userId, dto)).rejects.toThrow(BadRequestException);
  });

  it('should throw BadRequestException if fiscal year name already exists', async () => {
    const userId = 'user-123';
    const dto = {
      year: 2026,
      startDate: '2026-01-01',
      endDate: '2026-12-31',
    };

    mockFiscalYearRepo.findOne.mockResolvedValue({ id: 'existing-fy-id', name: 'Ejercicio 2026' });

    await expect(useCase.execute(userId, dto)).rejects.toThrow(
      new BadRequestException('Fiscal year with name "Ejercicio 2026" already exists'),
    );
  });

  it('should throw BadRequestException if dates overlap with an existing fiscal year', async () => {
    const userId = 'user-123';
    const dto = {
      year: 2026,
      startDate: '2026-06-01',
      endDate: '2027-05-31',
    };

    mockFiscalYearRepo.findOne.mockResolvedValue(null);

    mockFiscalYearRepo.createQueryBuilder.mockReturnValue(
      createMockQueryBuilder({ id: 'existing-fy-id', name: 'Ejercicio 2026' }),
    );

    await expect(useCase.execute(userId, dto)).rejects.toThrow(
      new BadRequestException(
        'Fiscal year dates overlap with existing fiscal year "Ejercicio 2026"',
      ),
    );
  });
});
