import { Test, TestingModule } from '@nestjs/testing';
import { GetAccountsSummaryUseCase } from '../../src/application/accounts/get-accounts-summary.use-case';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AccountEntity } from '../../src/infrastructure/database/entities/account.entity';
import { JournalEntryEntity } from '../../src/infrastructure/database/entities/journal-entry.entity';
import { DataSource } from 'typeorm';

describe('Balance Calculation and Net Worth Integration Tests', () => {
  let useCase: GetAccountsSummaryUseCase;
  let mockEntityManager: any;

  const mockDataSource = {
    transaction: jest.fn().mockImplementation(async (isolation, cb) => {
      const callback = typeof isolation === 'function' ? isolation : cb;
      return callback(mockEntityManager);
    }),
  };

  beforeEach(async () => {
    mockEntityManager = {
      find: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        addGroupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn(),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetAccountsSummaryUseCase,
        {
          provide: getRepositoryToken(AccountEntity),
          useValue: {},
        },
        {
          provide: getRepositoryToken(JournalEntryEntity),
          useValue: {},
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    useCase = module.get<GetAccountsSummaryUseCase>(GetAccountsSummaryUseCase);
  });

  it('should correctly aggregate balances and compute net worth (Assets - Liabilities)', async () => {
    // Arrange
    const userId = 'user-uuid';
    
    // Mock user accounts list
    mockEntityManager.find.mockResolvedValue([
      { id: 'acc-cash', name: 'Cash', type: 'ASSET' },
      { id: 'acc-bank', name: 'Bank', type: 'ASSET' },
      { id: 'acc-debt', name: 'Loan', type: 'LIABILITY' },
      { id: 'acc-food', name: 'Food', type: 'EXPENSE' },
    ]);

    // Mock raw entry sums:
    // Cash: DEBIT 100k, CREDIT 30k -> balance = 70k
    // Bank: DEBIT 50k, CREDIT 10k -> balance = 40k
    // Loan: DEBIT 0, CREDIT 20k -> balance = 20k
    // Food: DEBIT 15k, CREDIT 0 -> balance = 15k
    mockEntityManager.createQueryBuilder().getRawMany.mockResolvedValue([
      { accountId: 'acc-cash', entryType: 'DEBIT', sum: '100000.0000' },
      { accountId: 'acc-cash', entryType: 'CREDIT', sum: '30000.0000' },
      { accountId: 'acc-bank', entryType: 'DEBIT', sum: '50000.0000' },
      { accountId: 'acc-bank', entryType: 'CREDIT', sum: '10000.0000' },
      { accountId: 'acc-debt', entryType: 'CREDIT', sum: '20000.0000' },
      { accountId: 'acc-food', entryType: 'DEBIT', sum: '15000.0000' },
    ]);

    // Act
    const result = await useCase.execute(userId);

    // Assert
    expect(result).toBeDefined();
    
    // Assets: Cash (70k) + Bank (40k) = 110k
    // Liabilities: Loan = 20k
    // Net Worth = Assets (110k) - Liabilities (20k) = 90k
    expect(result.netWorth).toBe(90000);
    expect(result.totalAssets).toBe(110000);
    expect(result.totalLiabilities).toBe(20000);

    const cashSummary = result.accounts.find((a: any) => a.id === 'acc-cash');
    expect(cashSummary).toBeDefined();
    expect(cashSummary.balance).toBe(70000);

    const loanSummary = result.accounts.find((a: any) => a.id === 'acc-debt');
    expect(loanSummary).toBeDefined();
    expect(loanSummary.balance).toBe(20000);
  });
});
