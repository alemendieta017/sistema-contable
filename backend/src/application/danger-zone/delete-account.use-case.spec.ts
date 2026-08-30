import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { DangerZoneAction, DELETE_ACCOUNT_PHRASE } from '@sistema-contable/shared';
import { InvalidCurrentPasswordException } from '../../domain/exceptions/auth.exception';
import { DeleteUserAccountUseCase } from './delete-account.use-case';
import { UserEntity } from '../../infrastructure/database/entities/user.entity';
import { AccountEntity } from '../../infrastructure/database/entities/account.entity';
import { BudgetEntity } from '../../infrastructure/database/entities/budget.entity';
import { TransactionEntity } from '../../infrastructure/database/entities/transaction.entity';
import { PasswordResetTokenEntity } from '../../infrastructure/database/entities/password-reset-token.entity';

describe('DeleteUserAccountUseCase (US3)', () => {
  let useCase: DeleteUserAccountUseCase;
  let userRepositoryMock: any;
  let entityManagerMock: any;
  let queryBuilderMock: any;

  beforeEach(async () => {
    queryBuilderMock = {
      delete: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    entityManagerMock = {
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
      find: jest.fn(),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilderMock),
    };

    const dataSourceMock = {
      transaction: jest.fn().mockImplementation((isolationOrCb: any, maybeCb?: any) => {
        const cb = typeof isolationOrCb === 'function' ? isolationOrCb : maybeCb;
        return cb(entityManagerMock);
      }),
    };

    userRepositoryMock = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeleteUserAccountUseCase,
        {
          provide: getRepositoryToken(UserEntity),
          useValue: userRepositoryMock,
        },
        {
          provide: DataSource,
          useValue: dataSourceMock,
        },
      ],
    }).compile();

    useCase = module.get<DeleteUserAccountUseCase>(DeleteUserAccountUseCase);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should throw UnauthorizedException if password does not match', async () => {
    const user: Partial<UserEntity> = {
      id: 'user-1',
      email: 'user@example.com',
      passwordHash: '$2b$10$hashedpassword',
    };

    jest.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(false) as any);

    await expect(
      useCase.execute(user as UserEntity, {
        confirmationPhrase: DELETE_ACCOUNT_PHRASE,
        currentPassword: 'wrongPassword',
      }),
    ).rejects.toThrow(InvalidCurrentPasswordException);
  });

  it('should throw NotFoundException if user id is passed and user does not exist in DB', async () => {
    userRepositoryMock.findOne.mockResolvedValue(null);

    await expect(
      useCase.execute('non-existent-id', {
        confirmationPhrase: DELETE_ACCOUNT_PHRASE,
        currentPassword: 'anyPassword',
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('should atomically purge all user records, tokens, and the user entity upon valid password', async () => {
    const user: Partial<UserEntity> = {
      id: 'user-1',
      email: 'user@example.com',
      passwordHash: '$2b$10$hashedpassword',
    };

    jest.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(true) as any);

    entityManagerMock.find.mockImplementation((entityClass: any) => {
      if (entityClass === BudgetEntity) {
        return Promise.resolve([{ id: 'b-1' }]);
      }
      if (entityClass === AccountEntity) {
        return Promise.resolve([{ id: 'acc-1' }]);
      }
      if (entityClass === TransactionEntity) {
        return Promise.resolve([{ id: 'tx-1' }]);
      }
      return Promise.resolve([]);
    });

    const response = await useCase.execute(user as UserEntity, {
      confirmationPhrase: DELETE_ACCOUNT_PHRASE,
      currentPassword: 'correctPassword',
    });

    expect(response.success).toBe(true);
    expect(response.action).toBe(DangerZoneAction.DELETE_ACCOUNT);
    expect(response.message).toContain('eliminados permanentemente');

    // Verify user entity and tokens deletion
    expect(entityManagerMock.delete).toHaveBeenCalledWith(PasswordResetTokenEntity, {
      userId: 'user-1',
    });
    expect(entityManagerMock.delete).toHaveBeenCalledWith(UserEntity, { id: 'user-1' });
  });
});
