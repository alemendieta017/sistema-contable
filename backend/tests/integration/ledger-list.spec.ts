import { Test, TestingModule } from '@nestjs/testing';
import { LedgerController } from '../../src/infrastructure/controllers/ledger.controller';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TransactionEntity } from '../../src/infrastructure/database/entities/transaction.entity';
import { CreateTransactionUseCase } from '../../src/application/ledger/create-transaction.use-case';
import { UpdateTransactionUseCase } from '../../src/application/ledger/update-transaction.use-case';
import { DeleteTransactionUseCase } from '../../src/application/ledger/delete-transaction.use-case';
import { ReverseTransactionUseCase } from '../../src/application/ledger/reverse-transaction.use-case';
import { DataSource } from 'typeorm';

describe('LedgerController List Timezone Handling (pure date strings)', () => {
  let controller: LedgerController;
  let mockQueryBuilder: any;

  const mockTransactionRepo = {
    createQueryBuilder: jest.fn(),
  };
  const mockCreateTransactionUseCase = {};
  const mockUpdateTransactionUseCase = {};
  const mockDeleteTransactionUseCase = {};
  const mockReverseTransactionUseCase = {};
  const mockDataSource = {};

  beforeEach(async () => {
    mockQueryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
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
          provide: UpdateTransactionUseCase,
          useValue: mockUpdateTransactionUseCase,
        },
        {
          provide: DeleteTransactionUseCase,
          useValue: mockDeleteTransactionUseCase,
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

  it('should accept YYYY-MM-DD strings and query accountingDate directly', async () => {
    const user = { id: 'user-uuid', email: 'user@example.com' } as any;
    const startDate = '2026-06-01';
    const endDate = '2026-06-30';

    await controller.list(user, startDate, endDate);

    // Verify andWhere calls
    const startCall = mockQueryBuilder.andWhere.mock.calls.find((call: any) =>
      call[0].includes('tx.accountingDate >='),
    );
    const endCall = mockQueryBuilder.andWhere.mock.calls.find((call: any) =>
      call[0].includes('tx.accountingDate <='),
    );

    expect(startCall).toBeDefined();
    expect(endCall).toBeDefined();

    expect(startCall[1].startDate).toBe('2026-06-01');
    expect(endCall[1].endDate).toBe('2026-06-30');
  });

  it('should order transactions by accountingDate DESC, createdAt DESC, and id DESC', async () => {
    const user = { id: 'user-uuid', email: 'user@example.com' } as any;

    await controller.list(user);

    expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('tx.accountingDate', 'DESC');
    expect(mockQueryBuilder.addOrderBy).toHaveBeenCalledWith('tx.createdAt', 'DESC');
    expect(mockQueryBuilder.addOrderBy).toHaveBeenCalledWith('tx.id', 'DESC');
  });
});
