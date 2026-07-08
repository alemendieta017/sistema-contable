import { Test, TestingModule } from '@nestjs/testing';
import { CreateFiscalYearUseCase } from '../../src/application/periods/create-fiscal-year.use-case';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FiscalYearEntity } from '../../src/infrastructure/database/entities/fiscal-year.entity';
import { PeriodEntity } from '../../src/infrastructure/database/entities/period.entity';
import { BudgetEntity } from '../../src/infrastructure/database/entities/budget.entity';
import { BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';

describe('Fiscal Year and Period Creation Integration Tests', () => {
  let useCase: CreateFiscalYearUseCase;
  let mockEntityManager: any;
  let mockFiscalYearRepo: any;
  let mockPeriodRepo: any;

  const mockDataSource = {
    transaction: jest.fn().mockImplementation(async (cb) => {
      return cb(mockEntityManager);
    }),
  };

  beforeEach(async () => {
    mockEntityManager = {
      create: jest.fn().mockImplementation((entityClass, plainObject) => {
        // Return dummy ID for saved entities if needed
        return {
          id: `mock-${entityClass.name.toLowerCase()}-uuid`,
          ...plainObject,
        };
      }),
      save: jest.fn().mockImplementation(async (entityClass, entity) => {
        return { id: entity.id || `mock-${entityClass.name.toLowerCase()}-uuid`, ...entity };
      }),
    };

    mockFiscalYearRepo = {
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    mockPeriodRepo = {};

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateFiscalYearUseCase,
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

    const mockQueryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(null),
    };
    mockFiscalYearRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

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
    expect(budgetCreateCalls[0][1]).toEqual({
      userId,
      periodId: 'mock-periodentity-uuid',
      name: 'Enero 2026',
    });
    expect(budgetCreateCalls[11][1]).toEqual({
      userId,
      periodId: 'mock-periodentity-uuid',
      name: 'Diciembre 2026',
    });
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

    const mockQueryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue({ id: 'existing-fy-id', name: 'Ejercicio 2026' }),
    };
    mockFiscalYearRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

    await expect(useCase.execute(userId, dto)).rejects.toThrow(
      new BadRequestException(
        'Fiscal year dates overlap with existing fiscal year "Ejercicio 2026"',
      ),
    );
  });
});
