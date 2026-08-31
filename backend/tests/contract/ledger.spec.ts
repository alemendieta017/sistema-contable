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
import { UpdateAccountUseCase } from '../../src/application/accounts/update-account.use-case';
import { AdjustAccountBalanceUseCase } from '../../src/application/accounts/adjust-account-balance.use-case';
import { BalanceUpdateService } from '../../src/application/periods/balance-update.service';
import { EnsurePeriodService } from '../../src/application/periods/ensure-period.service';
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
    findOne: jest
      .fn()
      .mockResolvedValue({ id: 'tx-123', description: 'Test transaction', entries: [] }),
  };
  const mockAccountRepo = {
    find: jest.fn().mockResolvedValue([{ id: 'acc-1', name: 'Test Account' }]),
    create: jest.fn().mockImplementation((data) => data),
    save: jest.fn().mockImplementation((data) => Promise.resolve({ id: 'acc-new', ...data })),
    manager: {
      transaction: jest.fn().mockImplementation((isolationOrCb, maybeCb) => {
        const cb = typeof isolationOrCb === 'function' ? isolationOrCb : maybeCb;
        return cb({
          findOne: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockImplementation((entity, data) => data),
          save: jest
            .fn()
            .mockImplementation((entity, data) => Promise.resolve({ id: 'acc-new', ...data })),
        });
      }),
      getRepository: jest.fn().mockReturnValue({
        findOne: jest.fn().mockResolvedValue({ id: 'curr-1' }),
      }),
    },
  };

  const mockCreateTransactionUseCase = {
    execute: jest.fn().mockResolvedValue({ id: 'tx-new', description: 'Created' }),
  };

  const mockUpdateTransactionUseCase = {
    execute: jest.fn().mockResolvedValue({ id: 'tx-123', description: 'Updated' }),
  };

  const mockDeleteTransactionUseCase = {
    execute: jest.fn().mockResolvedValue(undefined),
  };

  const mockReverseTransactionUseCase = {
    execute: jest.fn().mockResolvedValue({ id: 'tx-rev', description: 'Reversed' }),
  };

  const mockGetAccountsSummaryUseCase = {
    execute: jest.fn().mockResolvedValue({ totalBalance: 1000 }),
  };

  const mockDeleteAccountUseCase = {
    execute: jest.fn().mockResolvedValue({ success: true, action: 'DELETED' }),
  };

  const mockUpdateAccountUseCase = {
    execute: jest.fn().mockResolvedValue({ success: true }),
  };

  const mockAdjustAccountBalanceUseCase = {
    execute: jest
      .fn()
      .mockResolvedValue({ success: true, message: 'Saldo ajustado exitosamente.' }),
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
          provide: UpdateAccountUseCase,
          useValue: mockUpdateAccountUseCase,
        },
        {
          provide: AdjustAccountBalanceUseCase,
          useValue: mockAdjustAccountBalanceUseCase,
        },
        {
          provide: BalanceUpdateService,
          useValue: { updateBalances: jest.fn() },
        },
        {
          provide: EnsurePeriodService,
          useValue: { ensurePeriod: jest.fn() },
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
          accountingDate: 'invalid-date',
          description: '',
          entries: [],
        })
        .expect(400);
    });

    it('should create balanced transactions successfully', async () => {
      await request(app.getHttpServer())
        .post('/api/transactions')
        .send({
          accountingDate: '2026-07-03',
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
      await request(app.getHttpServer()).get('/api/accounts/summary').expect(200);
    });
  });

  describe('POST /api/transactions/:id/reverse', () => {
    it('should successfully call reverse usecase and return 201', async () => {
      await request(app.getHttpServer()).post('/api/transactions/tx-123/reverse').expect(201);
      expect(mockReverseTransactionUseCase.execute).toHaveBeenCalledWith('user-uuid', 'tx-123');
    });
  });

  describe('DELETE /api/accounts/:id', () => {
    it('should call delete account usecase and return 200', async () => {
      await request(app.getHttpServer()).delete('/api/accounts/acc-123').expect(200);
      expect(mockDeleteAccountUseCase.execute).toHaveBeenCalledWith('user-uuid', 'acc-123');
    });
  });
});
