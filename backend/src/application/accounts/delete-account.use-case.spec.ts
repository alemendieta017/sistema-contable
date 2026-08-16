import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DeleteAccountUseCase } from './delete-account.use-case';
import { AccountEntity } from '../../infrastructure/database/entities/account.entity';
import { JournalEntryEntity } from '../../infrastructure/database/entities/journal-entry.entity';

describe('DeleteAccountUseCase (US2)', () => {
  let useCase: DeleteAccountUseCase;
  let entityManagerMock: any;

  beforeEach(async () => {
    entityManagerMock = {
      findOne: jest.fn(),
      count: jest.fn(),
      delete: jest.fn(),
      save: jest.fn(),
    };

    const dataSourceMock = {
      transaction: jest.fn((isolationOrCb, maybeCb) => {
        const cb = typeof isolationOrCb === 'function' ? isolationOrCb : maybeCb;
        return cb(entityManagerMock);
      }),
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
          useValue: dataSourceMock,
        },
      ],
    }).compile();

    useCase = module.get<DeleteAccountUseCase>(DeleteAccountUseCase);
  });

  it('should physically delete the account and return DELETED when entriesCount === 0', async () => {
    const account = { id: 'acc-1', userId: 'user-1', name: 'Unused Account' };
    entityManagerMock.findOne.mockResolvedValue(account);
    entityManagerMock.count.mockResolvedValue(0);
    entityManagerMock.delete.mockResolvedValue({ affected: 1 });

    const result = await useCase.execute('user-1', 'acc-1');

    expect(result).toEqual({ success: true, action: 'DELETED' });
    expect(entityManagerMock.count).toHaveBeenCalledWith(JournalEntryEntity, {
      where: { accountId: 'acc-1' },
    });
    expect(entityManagerMock.delete).toHaveBeenCalledWith(AccountEntity, { id: 'acc-1' });
    expect(entityManagerMock.save).not.toHaveBeenCalled();
  });

  it('should throw BadRequestException when entriesCount > 0 without deactivating', async () => {
    const account = {
      id: 'acc-1',
      userId: 'user-1',
      name: 'Account With History',
      status: 'ACTIVE',
    };
    entityManagerMock.findOne.mockResolvedValue(account);
    entityManagerMock.count.mockResolvedValue(3);

    await expect(useCase.execute('user-1', 'acc-1')).rejects.toThrow(
      new BadRequestException(
        'Cannot delete account with existing transactions. Deactivate the account instead.',
      ),
    );

    expect(entityManagerMock.count).toHaveBeenCalledWith(JournalEntryEntity, {
      where: { accountId: 'acc-1' },
    });
    expect(entityManagerMock.delete).not.toHaveBeenCalled();
    expect(entityManagerMock.save).not.toHaveBeenCalled();
  });

  it('should throw NotFoundException when account does not exist', async () => {
    entityManagerMock.findOne.mockResolvedValue(null);

    await expect(useCase.execute('user-1', 'non-existent')).rejects.toThrow(
      new NotFoundException('Account with ID non-existent not found'),
    );

    expect(entityManagerMock.count).not.toHaveBeenCalled();
    expect(entityManagerMock.delete).not.toHaveBeenCalled();
  });
});
