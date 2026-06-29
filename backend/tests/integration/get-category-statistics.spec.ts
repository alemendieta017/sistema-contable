import { Test, TestingModule } from '@nestjs/testing';
import { GetCategoryStatisticsUseCase } from '../../src/application/reports/get-category-statistics.use-case';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JournalEntryEntity } from '../../src/infrastructure/database/entities/journal-entry.entity';
import { DataSource } from 'typeorm';

describe('GetCategoryStatisticsUseCase Timezone handling tests', () => {
  let useCase: GetCategoryStatisticsUseCase;
  let mockEntityManager: any;
  let mockQueryBuilder: any;

  const mockJournalEntryRepo = {};
  const mockDataSource = {
    transaction: jest.fn().mockImplementation(async (isolation, cb) => {
      const callback = typeof isolation === 'function' ? isolation : cb;
      return callback(mockEntityManager);
    }),
  };

  beforeEach(async () => {
    mockQueryBuilder = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      addGroupBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([]),
    };

    mockEntityManager = {
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetCategoryStatisticsUseCase,
        {
          provide: getRepositoryToken(JournalEntryEntity),
          useValue: mockJournalEntryRepo,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    useCase = module.get<GetCategoryStatisticsUseCase>(GetCategoryStatisticsUseCase);
  });

  it('should use default UTC limits when no timezoneOffset is provided', async () => {
    const userId = 'user-uuid';
    const period = '2026-06';
    const type = 'EXPENSE' as const;

    await useCase.execute(userId, period, type);

    // Verify startDate and endDate were constructed in UTC for 2026-06-01 to 2026-06-30
    const startCall = mockQueryBuilder.andWhere.mock.calls.find((call: any) =>
      call[0].includes('tx.date >='),
    );
    const endCall = mockQueryBuilder.andWhere.mock.calls.find((call: any) =>
      call[0].includes('tx.date <='),
    );

    expect(startCall).toBeDefined();
    expect(endCall).toBeDefined();

    const startDateVal = startCall[1].startDate;
    const endDateVal = endCall[1].endDate;

    expect(startDateVal.toISOString()).toBe('2026-06-01T00:00:00.000Z');
    expect(endDateVal.toISOString()).toBe('2026-06-30T23:59:59.999Z');
  });

  it('should shift UTC limits forward for positive timezoneOffset (e.g. UTC-4 / America/Asuncion)', async () => {
    const userId = 'user-uuid';
    const period = '2026-06';
    const type = 'EXPENSE' as const;
    const timezoneOffset = 240; // 240 minutes = 4 hours behind UTC

    await useCase.execute(userId, period, type, timezoneOffset);

    const startCall = mockQueryBuilder.andWhere.mock.calls.find((call: any) =>
      call[0].includes('tx.date >='),
    );
    const endCall = mockQueryBuilder.andWhere.mock.calls.find((call: any) =>
      call[0].includes('tx.date <='),
    );

    const startDateVal = startCall[1].startDate;
    const endDateVal = endCall[1].endDate;

    // 2026-06-01T00:00:00.000 in UTC-4 is 2026-06-01T04:00:00.000Z
    expect(startDateVal.toISOString()).toBe('2026-06-01T04:00:00.000Z');
    // 2026-06-30T23:59:59.999 in UTC-4 is 2026-07-01T03:59:59.999Z
    expect(endDateVal.toISOString()).toBe('2026-07-01T03:59:59.999Z');
  });

  it('should shift UTC limits backward for negative timezoneOffset (e.g. UTC+2 / Europe/Paris)', async () => {
    const userId = 'user-uuid';
    const period = '2026-06';
    const type = 'EXPENSE' as const;
    const timezoneOffset = -120; // -120 minutes = 2 hours ahead of UTC

    await useCase.execute(userId, period, type, timezoneOffset);

    const startCall = mockQueryBuilder.andWhere.mock.calls.find((call: any) =>
      call[0].includes('tx.date >='),
    );
    const endCall = mockQueryBuilder.andWhere.mock.calls.find((call: any) =>
      call[0].includes('tx.date <='),
    );

    const startDateVal = startCall[1].startDate;
    const endDateVal = endCall[1].endDate;

    // 2026-06-01T00:00:00.000 in UTC+2 is 2026-05-31T22:00:00.000Z
    expect(startDateVal.toISOString()).toBe('2026-05-31T22:00:00.000Z');
    // 2026-06-30T23:59:59.999 in UTC+2 is 2026-06-30T21:59:59.999Z
    expect(endDateVal.toISOString()).toBe('2026-06-30T21:59:59.999Z');
  });
});
