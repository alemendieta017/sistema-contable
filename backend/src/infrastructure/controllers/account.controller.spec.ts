import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AccountStatus } from '@sistema-contable/shared';
import { AccountController } from './account.controller';
import { AccountEntity } from '../database/entities/account.entity';
import { GetAccountsSummaryUseCase } from '../../application/accounts/get-accounts-summary.use-case';
import { DeleteAccountUseCase } from '../../application/accounts/delete-account.use-case';
import { UpdateAccountUseCase } from '../../application/accounts/update-account.use-case';
import { AdjustAccountBalanceUseCase } from '../../application/accounts/adjust-account-balance.use-case';
import { BalanceUpdateService } from '../../application/periods/balance-update.service';
import { EnsurePeriodService } from '../../application/periods/ensure-period.service';
import { UserEntity } from '../database/entities/user.entity';

describe('AccountController (US3)', () => {
  let controller: AccountController;
  let accountRepoMock: any;
  let getSummaryUseCaseMock: any;
  let deleteUseCaseMock: any;
  let updateUseCaseMock: any;
  let adjustBalanceUseCaseMock: any;

  const mockUser: UserEntity = {
    id: 'user-ctrl-1',
    email: 'test@example.com',
    passwordHash: 'hash',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as UserEntity;

  beforeEach(async () => {
    accountRepoMock = {
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      manager: {
        getRepository: jest.fn(),
        transaction: jest.fn((isolationOrCb, maybeCb) => {
          const cb = typeof isolationOrCb === 'function' ? isolationOrCb : maybeCb;
          return cb({
            findOne: jest.fn(),
            create: jest.fn((entity, data) => ({ ...data, id: 'saved-id' })),
            save: jest.fn((entity, data) => Promise.resolve(data)),
          });
        }),
      },
    };

    getSummaryUseCaseMock = {
      execute: jest.fn(),
    };

    deleteUseCaseMock = {
      execute: jest.fn(),
    };

    updateUseCaseMock = {
      execute: jest.fn(),
    };

    adjustBalanceUseCaseMock = {
      execute: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AccountController],
      providers: [
        {
          provide: getRepositoryToken(AccountEntity),
          useValue: accountRepoMock,
        },
        {
          provide: GetAccountsSummaryUseCase,
          useValue: getSummaryUseCaseMock,
        },
        {
          provide: DeleteAccountUseCase,
          useValue: deleteUseCaseMock,
        },
        {
          provide: UpdateAccountUseCase,
          useValue: updateUseCaseMock,
        },
        {
          provide: AdjustAccountBalanceUseCase,
          useValue: adjustBalanceUseCaseMock,
        },
        {
          provide: BalanceUpdateService,
          useValue: { updateBalances: jest.fn() },
        },
        {
          provide: EnsurePeriodService,
          useValue: { ensurePeriod: jest.fn() },
        },
      ],
    }).compile();

    controller = module.get<AccountController>(AccountController);
  });

  describe('list', () => {
    it('should query only ACTIVE accounts by default when status is omitted', async () => {
      const activeAccounts = [{ id: '1', name: 'Active Account', status: 'ACTIVE' }];
      accountRepoMock.find.mockResolvedValue(activeAccounts);

      const result = await controller.list(mockUser);

      expect(accountRepoMock.find).toHaveBeenCalledWith({
        where: { userId: 'user-ctrl-1', status: 'ACTIVE' },
        relations: ['currency'],
        order: { name: 'ASC' },
      });
      expect(result).toEqual(activeAccounts);
    });

    it('should query only ACTIVE accounts when status is explicitly "ACTIVE"', async () => {
      const activeAccounts = [{ id: '1', name: 'Active Account', status: 'ACTIVE' }];
      accountRepoMock.find.mockResolvedValue(activeAccounts);

      const result = await controller.list(mockUser, 'ACTIVE');

      expect(accountRepoMock.find).toHaveBeenCalledWith({
        where: { userId: 'user-ctrl-1', status: 'ACTIVE' },
        relations: ['currency'],
        order: { name: 'ASC' },
      });
      expect(result).toEqual(activeAccounts);
    });

    it('should query only INACTIVE accounts when status is "INACTIVE"', async () => {
      const inactiveAccounts = [{ id: '2', name: 'Inactive Account', status: 'INACTIVE' }];
      accountRepoMock.find.mockResolvedValue(inactiveAccounts);

      const result = await controller.list(mockUser, 'INACTIVE');

      expect(accountRepoMock.find).toHaveBeenCalledWith({
        where: { userId: 'user-ctrl-1', status: 'INACTIVE' },
        relations: ['currency'],
        order: { name: 'ASC' },
      });
      expect(result).toEqual(inactiveAccounts);
    });

    it('should query ALL accounts without status filter when status is "ALL"', async () => {
      const allAccounts = [
        { id: '1', name: 'Active Account', status: 'ACTIVE' },
        { id: '2', name: 'Inactive Account', status: 'INACTIVE' },
      ];
      accountRepoMock.find.mockResolvedValue(allAccounts);

      const result = await controller.list(mockUser, 'ALL');

      expect(accountRepoMock.find).toHaveBeenCalledWith({
        where: { userId: 'user-ctrl-1' },
        relations: ['currency'],
        order: { name: 'ASC' },
      });
      expect(result).toEqual(allAccounts);
    });
  });

  describe('update', () => {
    it('should delegate status and details updates to UpdateAccountUseCase', async () => {
      updateUseCaseMock.execute.mockResolvedValue({ success: true });

      const dto = { name: 'Updated Name', status: AccountStatus.ACTIVE, isCashOrBank: false };
      const result = await controller.update(mockUser, 'acc-123', dto);

      expect(updateUseCaseMock.execute).toHaveBeenCalledWith('user-ctrl-1', 'acc-123', dto);
      expect(result).toEqual({ success: true });
    });
  });

  describe('adjustBalance', () => {
    it('should delegate balance adjustment to AdjustAccountBalanceUseCase', async () => {
      adjustBalanceUseCaseMock.execute.mockResolvedValue({
        success: true,
        message: 'Saldo ajustado exitosamente.',
      });

      const dto = { targetBalance: 5000, adjustmentType: 'CAPITAL' as const };
      const result = await controller.adjustBalance(mockUser, 'acc-123', dto);

      expect(adjustBalanceUseCaseMock.execute).toHaveBeenCalledWith('user-ctrl-1', 'acc-123', dto);
      expect(result).toEqual({ success: true, message: 'Saldo ajustado exitosamente.' });
    });
  });
});
