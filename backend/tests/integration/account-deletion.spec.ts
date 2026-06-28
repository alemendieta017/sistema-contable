import { Test, TestingModule } from '@nestjs/testing';
import { DeleteAccountUseCase } from '../../src/application/accounts/delete-account.use-case';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AccountEntity } from '../../src/infrastructure/database/entities/account.entity';
import { JournalEntryEntity } from '../../src/infrastructure/database/entities/journal-entry.entity';
import { NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';

describe('Account Deletion/Deactivation Integration Tests', () => {
  let useCase: DeleteAccountUseCase;
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
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeleteAccountUseCase,
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

    useCase = module.get<DeleteAccountUseCase>(DeleteAccountUseCase);
  });

  it('should physically delete the account if it has no journal entries associated', async () => {
    const userId = 'user-123';
    const accountId = 'acc-123';

    mockEntityManager.findOne.mockResolvedValue({ id: accountId, userId, status: 'ACTIVE' });
    mockEntityManager.count.mockResolvedValue(0); // No journal entries

    const result = await useCase.execute(userId, accountId);

    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.action).toBe('DELETED');
    expect(mockEntityManager.delete).toHaveBeenCalledWith(AccountEntity, { id: accountId });
  });

  it('should soft-delete (deactivate) the account if it has journal entries associated', async () => {
    const userId = 'user-123';
    const accountId = 'acc-123';
    const account = { id: accountId, userId, status: 'ACTIVE' };

    mockEntityManager.findOne.mockResolvedValue(account);
    mockEntityManager.count.mockResolvedValue(5); // 5 journal entries exist

    const result = await useCase.execute(userId, accountId);

    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.action).toBe('DEACTIVATED');
    expect(account.status).toBe('INACTIVE');
    expect(mockEntityManager.save).toHaveBeenCalled();
  });

  it('should throw NotFoundException if account does not exist', async () => {
    mockEntityManager.findOne.mockResolvedValue(null);

    await expect(useCase.execute('user-123', 'non-existent')).rejects.toThrow(NotFoundException);
  });
});
