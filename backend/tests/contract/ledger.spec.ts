import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TransactionEntity } from '../../src/infrastructure/database/entities/transaction.entity';
import { AccountEntity } from '../../src/infrastructure/database/entities/account.entity';
import { CreateTransactionUseCase } from '../../src/application/ledger/create-transaction.use-case';
import { UpdateTransactionUseCase } from '../../src/application/ledger/update-transaction.use-case';
import { DeleteTransactionUseCase } from '../../src/application/ledger/delete-transaction.use-case';
import { ReverseTransactionUseCase } from '../../src/application/ledger/reverse-transaction.use-case';
import { GetAccountsSummaryUseCase } from '../../src/application/accounts/get-accounts-summary.use-case';
import { DeleteAccountUseCase } from '../../src/application/accounts/delete-account.use-case';
import { LedgerController } from '../../src/infrastructure/controllers/ledger.controller';
import { AccountController } from '../../src/infrastructure/controllers/account.controller';
import { JwtAuthGuard } from '../../src/infrastructure/auth/jwt-auth.guard';

describe('Ledger Endpoints Contract Tests', () => {
  let app: INestApplication;

  const mockTransactionRepo = {
    createQueryBuilder: jest.fn().mockReturnValue({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    }),
    findOne: jest.fn().mockResolvedValue({ id: 'tx-123', description: 'Test transaction', entries: [] }),
  };
  const mockAccountRepo = {
    find: jest.fn().mockResolvedValue([]),
    create: jest.fn().mockImplementation((obj) => obj),
    save: jest.fn().mockImplementation((obj) => Promise.resolve({ id: 'saved-acc-id', ...obj })),
  };

  const mockCreateTransactionUseCase = {
    execute: jest.fn().mockResolvedValue({ id: 'tx-123', entries: [] }),
  };

  const mockUpdateTransactionUseCase = {
    execute: jest.fn().mockResolvedValue({ id: 'tx-123', entries: [] }),
  };

  const mockDeleteTransactionUseCase = {
    execute: jest.fn().mockResolvedValue({ id: 'tx-123', success: true }),
  };

  const mockReverseTransactionUseCase = {
    execute: jest.fn().mockResolvedValue({ id: 'tx-reversal-123', reversalOfId: 'tx-123', entries: [] }),
  };

  const mockGetAccountsSummaryUseCase = {
    execute: jest.fn().mockResolvedValue({ netWorth: 0, totalAssets: 0, totalLiabilities: 0, accounts: [] }),
  };

  const mockDeleteAccountUseCase = {
    execute: jest.fn().mockResolvedValue({ success: true, action: 'DEACTIVATED' }),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [LedgerController, AccountController],
      providers: [
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
          provide: GetAccountsSummaryUseCase,
          useValue: mockGetAccountsSummaryUseCase,
        },
        {
          provide: DeleteAccountUseCase,
          useValue: mockDeleteAccountUseCase,
        },
        {
          provide: getRepositoryToken(TransactionEntity),
          useValue: mockTransactionRepo,
        },
        {
          provide: getRepositoryToken(AccountEntity),
          useValue: mockAccountRepo,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true }) // Auto-authorize
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    
    // Inject mock user to req.user for @CurrentUser() decorator
    app.use((req: any, res: any, next: any) => {
      req.user = { id: 'user-uuid', email: 'user@example.com' };
      next();
    });

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/transactions', () => {
    it('should return 400 Bad Request if entries schema is invalid (empty or malformed)', async () => {
      await request(app.getHttpServer())
        .post('/api/transactions')
        .send({
          date: 'invalid-date',
          description: '',
          entries: [],
        })
        .expect(400);
    });

    it('should create balanced transactions successfully', async () => {
      await request(app.getHttpServer())
        .post('/api/transactions')
        .send({
          date: new Date().toISOString(),
          description: 'Valid transaction',
          entries: [
            { accountId: 'acc-1', entryType: 'DEBIT', amount: 100 },
            { accountId: 'acc-2', entryType: 'CREDIT', amount: 100 },
          ],
        })
        .expect(201);
    });
  });

  describe('POST /api/accounts', () => {
    it('should validate account creation payload contract', async () => {
      await request(app.getHttpServer())
        .post('/api/accounts')
        .send({
          name: '',
          type: 'INVALID_TYPE',
        })
        .expect(400);
    });
  });

  describe('GET /api/accounts/summary', () => {
    it('should return the accounts summary for the user', async () => {
      await request(app.getHttpServer())
        .get('/api/accounts/summary')
        .expect(200);
    });
  });

  describe('POST /api/transactions/:id/reverse', () => {
    it('should successfully call reverse usecase and return 201', async () => {
      await request(app.getHttpServer())
        .post('/api/transactions/tx-123/reverse')
        .expect(201);
      expect(mockReverseTransactionUseCase.execute).toHaveBeenCalledWith('user-uuid', 'tx-123');
    });
  });

  describe('DELETE /api/accounts/:id', () => {
    it('should call delete account usecase and return 200', async () => {
      await request(app.getHttpServer())
        .delete('/api/accounts/acc-123')
        .expect(200);
      expect(mockDeleteAccountUseCase.execute).toHaveBeenCalledWith('user-uuid', 'acc-123');
    });
  });
});
