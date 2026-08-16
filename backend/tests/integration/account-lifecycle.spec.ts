import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UpdateAccountUseCase } from '../../src/application/accounts/update-account.use-case';
import { DeleteAccountUseCase } from '../../src/application/accounts/delete-account.use-case';
import { AccountEntity } from '../../src/infrastructure/database/entities/account.entity';
import { JournalEntryEntity } from '../../src/infrastructure/database/entities/journal-entry.entity';

describe('Account Lifecycle Integration Tests (US1 & US2)', () => {
  let updateUseCase: UpdateAccountUseCase;
  let deleteUseCase: DeleteAccountUseCase;
  let mockEntityManager: any;

  const mockDataSource = {
    transaction: jest.fn().mockImplementation(async (isolationOrCb, maybeCb) => {
      const cb = typeof isolationOrCb === 'function' ? isolationOrCb : maybeCb;
      return cb(mockEntityManager);
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
        UpdateAccountUseCase,
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

    updateUseCase = module.get<UpdateAccountUseCase>(UpdateAccountUseCase);
    deleteUseCase = module.get<DeleteAccountUseCase>(DeleteAccountUseCase);
  });

  it('should execute complete lifecycle: deactivate, reactivate, block deletion with movements, and delete without movements', async () => {
    const userId = 'user-lifecycle-1';
    const accountId = 'acc-lifecycle-1';
    const account = {
      id: accountId,
      userId,
      name: 'Operations Account',
      status: 'ACTIVE',
      isCashOrBank: false,
    };

    // 1. Deactivate account
    mockEntityManager.findOne.mockResolvedValue(account);
    const deactResult = await updateUseCase.execute(userId, accountId, { status: 'INACTIVE' });
    expect(deactResult.success).toBe(true);
    expect(account.status).toBe('INACTIVE');
    expect(mockEntityManager.save).toHaveBeenCalledWith(
      AccountEntity,
      expect.objectContaining({ status: 'INACTIVE' }),
    );

    // 2. Reactivate account
    const reactResult = await updateUseCase.execute(userId, accountId, { status: 'ACTIVE' });
    expect(reactResult.success).toBe(true);
    expect(account.status).toBe('ACTIVE');
    expect(mockEntityManager.save).toHaveBeenCalledWith(
      AccountEntity,
      expect.objectContaining({ status: 'ACTIVE' }),
    );

    // 3. Attempt delete when journal entries exist -> blocked with 400
    mockEntityManager.count.mockResolvedValue(3);
    await expect(deleteUseCase.execute(userId, accountId)).rejects.toThrow(
      new BadRequestException(
        'Cannot delete account with existing transactions. Deactivate the account instead.',
      ),
    );
    expect(mockEntityManager.delete).not.toHaveBeenCalled();

    // 4. Delete when 0 journal entries exist -> physically deleted
    mockEntityManager.count.mockResolvedValue(0);
    const deleteResult = await deleteUseCase.execute(userId, accountId);
    expect(deleteResult).toEqual({ success: true, action: 'DELETED' });
    expect(mockEntityManager.delete).toHaveBeenCalledWith(AccountEntity, { id: accountId });
  });

  it('should throw NotFoundException on non-existent account update or delete', async () => {
    mockEntityManager.findOne.mockResolvedValue(null);

    await expect(
      updateUseCase.execute('user-1', 'non-existent', { status: 'ACTIVE' }),
    ).rejects.toThrow(NotFoundException);

    await expect(deleteUseCase.execute('user-1', 'non-existent')).rejects.toThrow(
      NotFoundException,
    );
  });
});
