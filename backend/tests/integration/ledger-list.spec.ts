import { Test, TestingModule } from '@nestjs/testing';
import { LedgerController } from '../../src/infrastructure/controllers/ledger.controller';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TransactionEntity } from '../../src/infrastructure/database/entities/transaction.entity';
import { CreateTransactionUseCase } from '../../src/application/ledger/create-transaction.use-case';
import { ReverseTransactionUseCase } from '../../src/application/ledger/reverse-transaction.use-case';
import { DataSource } from 'typeorm';

describe('LedgerController List Timezone Handling (ISO date strings)', () => {
  let controller: LedgerController;
  let mockQueryBuilder: any;

  const mockTransactionRepo = {
    createQueryBuilder: jest.fn(),
  };
  const mockCreateTransactionUseCase = {};
  const mockReverseTransactionUseCase = {};
  const mockDataSource = {};

  beforeEach(async () => {
    mockQueryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    };

    mockTransactionRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

    const module: TestingModule = await Test.createTestingModule({
      controllers: [LedgerController],
      providers: [
        {
          provide: getRepositoryToken(TransactionEntity),
          useValue: mockTransactionRepo,
        },
        {
          provide: CreateTransactionUseCase,
          useValue: mockCreateTransactionUseCase,
        },
        {
          provide: ReverseTransactionUseCase,
          useValue: mockReverseTransactionUseCase,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    controller = module.get<LedgerController>(LedgerController);
  });

  it('should accept ISO strings with positive offset and parse them correctly as Date objects (e.g. UTC-4)', async () => {
    const user = { id: 'user-uuid', email: 'user@example.com' } as any;
    const startDate = '2026-06-01T00:00:00.000-04:00';
    const endDate = '2026-06-30T23:59:59.999-04:00';

    await controller.list(user, startDate, endDate);

    // Verify andWhere calls
    const startCall = mockQueryBuilder.andWhere.mock.calls.find((call: any) =>
      call[0].includes('tx.date >='),
    );
    const endCall = mockQueryBuilder.andWhere.mock.calls.find((call: any) =>
      call[0].includes('tx.date <='),
    );

    expect(startCall).toBeDefined();
    expect(endCall).toBeDefined();

    const startVal = startCall[1].startDate;
    const endVal = endCall[1].endDate;

    // 2026-06-01T00:00:00.000-04:00 is 2026-06-01T04:00:00.000Z
    expect(startVal.toISOString()).toBe('2026-06-01T04:00:00.000Z');
    // 2026-06-30T23:59:59.999-04:00 is 2026-07-01T03:59:59.999Z
    expect(endVal.toISOString()).toBe('2026-07-01T03:59:59.999Z');
  });

  it('should accept ISO strings with negative offset and parse them correctly as Date objects (e.g. UTC+2)', async () => {
    const user = { id: 'user-uuid', email: 'user@example.com' } as any;
    const startDate = '2026-06-01T00:00:00.000+02:00';
    const endDate = '2026-06-30T23:59:59.999+02:00';

    await controller.list(user, startDate, endDate);

    const startCall = mockQueryBuilder.andWhere.mock.calls.find((call: any) =>
      call[0].includes('tx.date >='),
    );
    const endCall = mockQueryBuilder.andWhere.mock.calls.find((call: any) =>
      call[0].includes('tx.date <='),
    );

    const startVal = startCall[1].startDate;
    const endVal = endCall[1].endDate;

    // 2026-06-01T00:00:00.000+02:00 is 2026-05-31T22:00:00.000Z
    expect(startVal.toISOString()).toBe('2026-05-31T22:00:00.000Z');
    // 2026-06-30T23:59:59.999+02:00 is 2026-06-30T21:59:59.999Z
    expect(endVal.toISOString()).toBe('2026-06-30T21:59:59.999Z');
  });
});
