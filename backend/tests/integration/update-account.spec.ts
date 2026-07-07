import { Test, TestingModule } from '@nestjs/testing';
import { UpdateAccountUseCase } from '../../src/application/accounts/update-account.use-case';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AccountEntity } from '../../src/infrastructure/database/entities/account.entity';
import { JournalEntryEntity } from '../../src/infrastructure/database/entities/journal-entry.entity';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';

describe('Update Account Details Integration Tests', () => {
  let useCase: UpdateAccountUseCase;
  let mockEntityManager: any;

  const mockDataSource = {
    transaction: jest.fn().mockImplementation(async (isolation, cb) => {
      const callback = typeof isolation === 'function' ? isolation : cb;
      return callback(mockEntityManager);
    }),
  };

  beforeEach(async () => {
    mockEntityManager = {
      findOne: jest.fn(),
      count: jest.fn(),
      save: jest.fn().mockImplementation((cls, entity) => Promise.resolve(entity)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateAccountUseCase,
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

    useCase = module.get<UpdateAccountUseCase>(UpdateAccountUseCase);
  });

  it('should successfully toggle isCashOrBank flag from false to true if there are no journal entries associated', async () => {
    const userId = 'user-123';
    const accountId = 'acc-123';
    const account = {
      id: accountId,
      userId,
      isCashOrBank: false,
      name: 'General Savings',
      status: 'ACTIVE',
    };

    mockEntityManager.findOne.mockResolvedValue(account);
    mockEntityManager.count.mockResolvedValue(0);

    const result = await useCase.execute(userId, accountId, { isCashOrBank: true });

    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(account.isCashOrBank).toBe(true);
    expect(mockEntityManager.save).toHaveBeenCalledWith(AccountEntity, account);
  });

  it('should successfully toggle isCashOrBank flag from true to false if there are no journal entries associated', async () => {
    const userId = 'user-123';
    const accountId = 'acc-123';
    const account = {
      id: accountId,
      userId,
      isCashOrBank: true,
      name: 'Petty Cash',
      status: 'ACTIVE',
    };

    mockEntityManager.findOne.mockResolvedValue(account);
    mockEntityManager.count.mockResolvedValue(0);

    const result = await useCase.execute(userId, accountId, { isCashOrBank: false });

    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(account.isCashOrBank).toBe(false);
    expect(mockEntityManager.save).toHaveBeenCalledWith(AccountEntity, account);
  });

  it('should throw BadRequestException when trying to toggle isCashOrBank flag if journal entries exist', async () => {
    const userId = 'user-123';
    const accountId = 'acc-123';
    const account = {
      id: accountId,
      userId,
      isCashOrBank: false,
      name: 'Credit Card Account',
      status: 'ACTIVE',
    };

    mockEntityManager.findOne.mockResolvedValue(account);
    mockEntityManager.count.mockResolvedValue(5); // Has transactions

    await expect(
      useCase.execute(userId, accountId, { isCashOrBank: true })
    ).rejects.toThrow(
      new BadRequestException('Cannot change the Cash/Bank flag of an account that already has transactions associated')
    );

    expect(mockEntityManager.save).not.toHaveBeenCalled();
  });

  it('should successfully save other account details (like name) and NOT throw an exception if the isCashOrBank flag is not changed, even if journal entries exist', async () => {
    const userId = 'user-123';
    const accountId = 'acc-123';
    const account = {
      id: accountId,
      userId,
      isCashOrBank: true,
      name: 'Main Cash Account',
      status: 'ACTIVE',
    };

    mockEntityManager.findOne.mockResolvedValue(account);
    mockEntityManager.count.mockResolvedValue(10); // Has transactions

    const result = await useCase.execute(userId, accountId, { name: 'Updated Main Cash Account', isCashOrBank: true });

    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(account.name).toBe('Updated Main Cash Account');
    expect(account.isCashOrBank).toBe(true); // Remained the same
    expect(mockEntityManager.save).toHaveBeenCalledWith(AccountEntity, account);
  });

  it('should throw NotFoundException if trying to update an account that does not exist', async () => {
    const userId = 'user-123';
    const accountId = 'non-existent';

    mockEntityManager.findOne.mockResolvedValue(null);

    await expect(
      useCase.execute(userId, accountId, { isCashOrBank: true })
    ).rejects.toThrow(
      new NotFoundException(`Account with ID ${accountId} not found`)
    );

    expect(mockEntityManager.count).not.toHaveBeenCalled();
    expect(mockEntityManager.save).not.toHaveBeenCalled();
  });
});
