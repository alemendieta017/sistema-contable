import { Test, TestingModule } from '@nestjs/testing';
import { CloseFiscalYearUseCase } from '../../src/application/periods/close-fiscal-year.use-case';
import { BalanceUpdateService } from '../../src/application/periods/balance-update.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FiscalYearEntity } from '../../src/infrastructure/database/entities/fiscal-year.entity';
import { PeriodEntity } from '../../src/infrastructure/database/entities/period.entity';
import { AccountEntity } from '../../src/infrastructure/database/entities/account.entity';
import { TransactionEntity } from '../../src/infrastructure/database/entities/transaction.entity';
import { JournalEntryEntity } from '../../src/infrastructure/database/entities/journal-entry.entity';
import { AccountPeriodBalanceEntity } from '../../src/infrastructure/database/entities/account-period-balance.entity';
import { DataSource } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('Annual Closing Integration Tests', () => {
  let closeUseCase: CloseFiscalYearUseCase;
  let balanceUpdateService: BalanceUpdateService;

  let mockEntityManager: any;
  let mockDataSource: any;

  beforeEach(async () => {
    mockEntityManager = {
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest
        .fn()
        .mockImplementation((cls, entity) =>
          Promise.resolve({ ...entity, id: entity.id || 'mock-saved-id' }),
        ),
      create: jest.fn().mockImplementation((cls, obj) => ({ id: 'mock-id', ...obj })),
      createQueryBuilder: jest.fn(),
    };

    mockDataSource = {
      transaction: jest.fn().mockImplementation(async (isolation, cb) => {
        const callback = typeof isolation === 'function' ? isolation : cb;
        return callback(mockEntityManager);
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CloseFiscalYearUseCase,
        {
          provide: BalanceUpdateService,
          useValue: {
            updateBalances: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: getRepositoryToken(FiscalYearEntity),
          useValue: {},
        },
        {
          provide: getRepositoryToken(PeriodEntity),
          useValue: {},
        },
        {
          provide: getRepositoryToken(AccountEntity),
          useValue: {},
        },
        {
          provide: getRepositoryToken(TransactionEntity),
          useValue: {},
        },
        {
          provide: getRepositoryToken(JournalEntryEntity),
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

    closeUseCase = module.get<CloseFiscalYearUseCase>(CloseFiscalYearUseCase);
    balanceUpdateService = module.get<BalanceUpdateService>(BalanceUpdateService);
  });

  it('should throw NotFoundException if fiscal year does not exist', async () => {
    mockEntityManager.findOne.mockResolvedValue(null);

    await expect(
      closeUseCase.execute('user-1', 'fy-1', { retainedEarningsAccountId: 'acc-re' }),
    ).rejects.toThrow(new NotFoundException('Fiscal year with ID fy-1 not found'));
  });

  it('should throw BadRequestException if fiscal year is already closed', async () => {
    mockEntityManager.findOne.mockResolvedValue({
      id: 'fy-1',
      userId: 'user-1',
      status: 'CLOSED',
      periods: [],
    });

    await expect(
      closeUseCase.execute('user-1', 'fy-1', { retainedEarningsAccountId: 'acc-re' }),
    ).rejects.toThrow(new BadRequestException('Fiscal year is already closed'));
  });

  it('should automatically close all open periods when closing the fiscal year', async () => {
    const periodStartDate = '2026-12-01';
    const periodEndDate = '2026-12-31';

    const mockPeriods = [
      {
        id: 'p-1',
        name: '2026-11',
        status: 'CLOSED',
        startDate: '2026-11-01',
        endDate: '2026-11-30',
      },
      {
        id: 'p-2',
        name: '2026-12',
        status: 'OPEN',
        startDate: periodStartDate,
        endDate: periodEndDate,
      },
    ];

    mockEntityManager.findOne.mockImplementation((cls, options) => {
      if (cls === FiscalYearEntity) {
        return {
          id: 'fy-1',
          userId: 'user-1',
          name: '2026',
          status: 'OPEN',
          endDate: periodEndDate,
          periods: mockPeriods,
        };
      }
      if (cls === AccountEntity) {
        return { id: 'acc-re', type: 'EQUITY', userId: 'user-1' };
      }
      return null;
    });

    mockEntityManager.find.mockReturnValue([]);

    await closeUseCase.execute('user-1', 'fy-1', { retainedEarningsAccountId: 'acc-re' });

    expect(mockPeriods[0].status).toBe('CLOSED');
    expect(mockPeriods[1].status).toBe('CLOSED');
    expect(mockEntityManager.save).toHaveBeenCalledWith(PeriodEntity, mockPeriods);
  });

  it('should throw BadRequestException if retained earnings account is not an EQUITY account', async () => {
    mockEntityManager.findOne.mockImplementation((cls, options) => {
      if (cls === FiscalYearEntity) {
        return {
          id: 'fy-1',
          userId: 'user-1',
          status: 'OPEN',
          periods: [{ id: 'p-1', status: 'CLOSED' }],
        };
      }
      if (cls === AccountEntity) {
        // Return a liability account instead of equity
        return { id: 'acc-re', type: 'LIABILITY', userId: 'user-1' };
      }
      return null;
    });

    await expect(
      closeUseCase.execute('user-1', 'fy-1', { retainedEarningsAccountId: 'acc-re' }),
    ).rejects.toThrow(
      new BadRequestException('Retained earnings account not found or is not an EQUITY account'),
    );
  });

  it('should successfully execute closing entry and close the fiscal year', async () => {
    const periodStartDate = '2026-12-01';
    const periodEndDate = '2026-12-31';

    mockEntityManager.findOne.mockImplementation((cls, options) => {
      if (cls === FiscalYearEntity) {
        return {
          id: 'fy-1',
          userId: 'user-1',
          name: '2026',
          status: 'OPEN',
          endDate: periodEndDate,
          periods: [
            {
              id: 'p-1',
              name: '2026-12',
              startDate: periodStartDate,
              endDate: periodEndDate,
              status: 'CLOSED',
            },
          ],
        };
      }
      if (cls === AccountEntity) {
        return { id: 'acc-re', type: 'EQUITY', userId: 'user-1' };
      }
      return null;
    });

    // Mock accounts (temporary accounts)
    const mockAccounts = [
      { id: 'acc-sales', type: 'INCOME', userId: 'user-1' },
      { id: 'acc-rent', type: 'EXPENSE', userId: 'user-1' },
    ];

    mockEntityManager.find.mockImplementation((cls, options) => {
      if (cls === AccountEntity) {
        return mockAccounts;
      }
      if (cls === AccountPeriodBalanceEntity) {
        // Return positive balances
        return [
          { accountId: 'acc-sales', closingBalance: 2000 }, // Sales (INCOME - Credit nature) has credit closing balance of 2000
          { accountId: 'acc-rent', closingBalance: 1200 }, // Rent (EXPENSE - Debit nature) has debit closing balance of 1200
        ];
      }
      return [];
    });

    const savedEntities: any[] = [];
    mockEntityManager.save.mockImplementation((cls, entity) => {
      savedEntities.push({ cls, entity });
      return Promise.resolve({ ...entity, id: entity.id || 'mock-saved-id' });
    });

    const result = await closeUseCase.execute('user-1', 'fy-1', {
      retainedEarningsAccountId: 'acc-re',
    });

    expect(result.message).toBe('Fiscal year closed successfully');
    expect(result.closingTransactionId).toBeDefined();

    // Check saved transaction and journal entries
    const txSave = savedEntities.find((e) => e.cls === TransactionEntity);
    expect(txSave).toBeDefined();
    expect(txSave.entity.description).toContain('cierre anual');

    const journalEntriesSaves = savedEntities
      .filter((e) => e.cls === JournalEntryEntity)
      .map((e) => e.entity);
    expect(journalEntriesSaves).toHaveLength(3); // Sales, Rent, Retained Earnings

    // Sales (INCOME): positive closing balance (credit) should be DEBITED
    const salesEntry = journalEntriesSaves.find((je) => je.accountId === 'acc-sales');
    expect(salesEntry).toBeDefined();
    expect(salesEntry.entryType).toBe('DEBIT');
    expect(salesEntry.amount).toBe(2000);

    // Rent (EXPENSE): positive closing balance (debit) should be CREDITED
    const rentEntry = journalEntriesSaves.find((je) => je.accountId === 'acc-rent');
    expect(rentEntry).toBeDefined();
    expect(rentEntry.entryType).toBe('CREDIT');
    expect(rentEntry.amount).toBe(1200);

    // Retained Earnings (EQUITY): should balance with CREDIT of 800
    const reEntry = journalEntriesSaves.find((je) => je.accountId === 'acc-re');
    expect(reEntry).toBeDefined();
    expect(reEntry.entryType).toBe('CREDIT');
    expect(reEntry.amount).toBe(800);

    // Verify balance update service is called with bypassLock = true
    expect(balanceUpdateService.updateBalances).toHaveBeenCalledWith(
      mockEntityManager,
      'user-1',
      periodEndDate,
      expect.any(Array),
      true, // bypassLock
    );

    // Verify fiscal year is updated to CLOSED
    const fySave = savedEntities.find((e) => e.cls === FiscalYearEntity);
    expect(fySave).toBeDefined();
    expect(fySave.entity.status).toBe('CLOSED');
  });
});
