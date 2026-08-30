import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BadRequestException } from '@nestjs/common';
import { NetWorthEvolutionUseCase } from '../../src/application/reports/net-worth-evolution.use-case';
import { PeriodEntity } from '../../src/infrastructure/database/entities/period.entity';

describe('Net Worth Evolution Integration Tests (US4 / SC-001)', () => {
  let useCase: NetWorthEvolutionUseCase;
  let mockPeriodRepo: jest.Mocked<Partial<Repository<PeriodEntity>>>;

  const userId = 'user-test-uuid-1234';

  beforeEach(async () => {
    mockPeriodRepo = {
      createQueryBuilder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NetWorthEvolutionUseCase,
        {
          provide: getRepositoryToken(PeriodEntity),
          useValue: mockPeriodRepo,
        },
      ],
    }).compile();

    useCase = module.get<NetWorthEvolutionUseCase>(NetWorthEvolutionUseCase);
  });

  it('should return empty history and zeroes when user has no periods', async () => {
    const mockQueryBuilder: any = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      addGroupBy: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([]),
    };
    (mockPeriodRepo.createQueryBuilder as jest.Mock).mockReturnValue(mockQueryBuilder);

    const result = await useCase.execute(userId, {});

    expect(result).toEqual({
      history: [],
      latest: {
        assets: 0,
        liabilities: 0,
        netWorth: 0,
      },
      change12Months: 0,
      changePercentage: 0,
    });
  });

  it('should compute multi-month Net Worth time-series accurately from balance snapshots', async () => {
    const rawRows = [
      {
        period: '2025-08',
        date: '2025-08-31',
        assets: '125000.0000',
        liabilities: '45000.0000',
      },
      {
        period: '2025-09',
        date: '2025-09-30',
        assets: '128000.0000',
        liabilities: '44000.0000',
      },
      {
        period: '2026-08',
        date: '2026-08-31',
        assets: '148000.0000',
        liabilities: '38000.0000',
      },
    ];

    const mockQueryBuilder: any = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      addGroupBy: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue(rawRows),
    };
    (mockPeriodRepo.createQueryBuilder as jest.Mock).mockReturnValue(mockQueryBuilder);

    const result = await useCase.execute(userId, {});

    expect(result.history).toHaveLength(3);
    expect(result.history[0]).toEqual({
      period: '2025-08',
      date: '2025-08-31',
      assets: 125000.0,
      liabilities: 45000.0,
      netWorth: 80000.0,
    });
    expect(result.history[1]).toEqual({
      period: '2025-09',
      date: '2025-09-30',
      assets: 128000.0,
      liabilities: 44000.0,
      netWorth: 84000.0,
    });
    expect(result.history[2]).toEqual({
      period: '2026-08',
      date: '2026-08-31',
      assets: 148000.0,
      liabilities: 38000.0,
      netWorth: 110000.0,
    });

    expect(result.latest).toEqual({
      assets: 148000.0,
      liabilities: 38000.0,
      netWorth: 110000.0,
    });

    // 12 months change: 2026-08 (110000) vs 2025-08 (80000) = +30000 (+37.5%)
    expect(result.change12Months).toBe(30000.0);
    expect(result.changePercentage).toBe(37.5);
  });

  it('should support startPeriod and endPeriod filtering', async () => {
    const mockQueryBuilder: any = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      addGroupBy: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([
        {
          period: '2026-01',
          date: '2026-01-31',
          assets: '50000',
          liabilities: '10000',
        },
      ]),
    };
    (mockPeriodRepo.createQueryBuilder as jest.Mock).mockReturnValue(mockQueryBuilder);

    const result = await useCase.execute(userId, {
      startPeriod: '2026-01',
      endPeriod: '2026-06',
    });

    expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('period.name >= :startPeriod', {
      startPeriod: '2026-01',
    });
    expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('period.name <= :endPeriod', {
      endPeriod: '2026-06',
    });
    expect(result.history).toHaveLength(1);
    expect(result.latest.netWorth).toBe(40000);
  });

  it('should reject invalid startPeriod or endPeriod format', async () => {
    await expect(useCase.execute(userId, { startPeriod: 'invalid-date' })).rejects.toThrow(
      BadRequestException,
    );

    await expect(useCase.execute(userId, { endPeriod: '2026-13' })).rejects.toThrow(
      BadRequestException,
    );

    await expect(
      useCase.execute(userId, { startPeriod: '2026-08', endPeriod: '2026-01' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should execute in under 50ms for 36 simulated monthly periods (SC-001 Performance Benchmark)', async () => {
    const rawRows = Array.from({ length: 36 }, (_, i) => {
      const year = 2024 + Math.floor(i / 12);
      const month = String((i % 12) + 1).padStart(2, '0');
      const period = `${year}-${month}`;
      return {
        period,
        date: `${period}-28`,
        assets: String(100000 + i * 2000),
        liabilities: String(30000 - i * 500),
      };
    });

    const mockQueryBuilder: any = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      addGroupBy: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue(rawRows),
    };
    (mockPeriodRepo.createQueryBuilder as jest.Mock).mockReturnValue(mockQueryBuilder);

    const startTime = performance.now();
    const result = await useCase.execute(userId, {});
    const duration = performance.now() - startTime;

    expect(duration).toBeLessThan(50);
    expect(result.history).toHaveLength(36);
    expect(result.latest.netWorth).toBe(100000 + 35 * 2000 - (30000 - 35 * 500));
  });
});
