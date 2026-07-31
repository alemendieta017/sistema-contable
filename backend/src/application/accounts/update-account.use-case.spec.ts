import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UpdateAccountUseCase } from './update-account.use-case';
import { AccountEntity } from '../../infrastructure/database/entities/account.entity';
import { JournalEntryEntity } from '../../infrastructure/database/entities/journal-entry.entity';

describe('UpdateAccountUseCase (US3)', () => {
  let useCase: UpdateAccountUseCase;
  let entityManagerMock: any;

  beforeEach(async () => {
    entityManagerMock = {
      findOne: jest.fn(),
      count: jest.fn(),
      save: jest.fn(),
    };

    const dataSourceMock = {
      transaction: jest.fn((cb) => cb(entityManagerMock)),
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
          useValue: dataSourceMock,
        },
      ],
    }).compile();

    useCase = module.get<UpdateAccountUseCase>(UpdateAccountUseCase);
  });

  it('should update name when account has no transactions', async () => {
    const account = { id: 'acc-1', userId: 'user-1', name: 'Old Name', isCashOrBank: false };
    entityManagerMock.findOne.mockResolvedValue(account);
    entityManagerMock.save.mockResolvedValue({ ...account, name: 'New Name' });

    const result = await useCase.execute('user-1', 'acc-1', { name: 'New Name' });
    expect(result.success).toBe(true);
    expect(entityManagerMock.save).toHaveBeenCalledWith(
      AccountEntity,
      expect.objectContaining({ name: 'New Name' }),
    );
  });

  it('should allow changing isCashOrBank if account has 0 journal entries', async () => {
    const account = { id: 'acc-1', userId: 'user-1', name: 'Caja', isCashOrBank: false };
    entityManagerMock.findOne.mockResolvedValue(account);
    entityManagerMock.count.mockResolvedValue(0);
    entityManagerMock.save.mockResolvedValue({ ...account, isCashOrBank: true });

    const result = await useCase.execute('user-1', 'acc-1', { isCashOrBank: true });
    expect(result.success).toBe(true);
    expect(entityManagerMock.save).toHaveBeenCalledWith(
      AccountEntity,
      expect.objectContaining({ isCashOrBank: true }),
    );
  });

  it('should throw BadRequestException if altering isCashOrBank on account with journal entries', async () => {
    const account = { id: 'acc-1', userId: 'user-1', name: 'Caja', isCashOrBank: false };
    entityManagerMock.findOne.mockResolvedValue(account);
    entityManagerMock.count.mockResolvedValue(5);

    await expect(useCase.execute('user-1', 'acc-1', { isCashOrBank: true })).rejects.toThrow(
      BadRequestException,
    );
    expect(entityManagerMock.save).not.toHaveBeenCalled();
  });

  it('should throw NotFoundException if account does not exist', async () => {
    entityManagerMock.findOne.mockResolvedValue(null);

    await expect(useCase.execute('user-1', 'non-existent', { name: 'Test' })).rejects.toThrow(
      NotFoundException,
    );
  });
});
