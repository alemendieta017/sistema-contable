import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { AdjustAccountBalanceUseCase } from './adjust-account-balance.use-case';
import { BalanceUpdateService } from '../periods/balance-update.service';
import { EnsurePeriodService } from '../periods/ensure-period.service';

describe('AdjustAccountBalanceUseCase', () => {
  let useCase: AdjustAccountBalanceUseCase;
  let entityManagerMock: any;
  let balanceUpdateServiceMock: any;
  let ensurePeriodServiceMock: any;

  beforeEach(async () => {
    const qbMock: any = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([
        { entryType: 'DEBIT', sum: 1000 },
        { entryType: 'CREDIT', sum: 0 },
      ]),
    };

    entityManagerMock = {
      findOne: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(qbMock),
      create: jest.fn((entity, data) => ({ ...data, id: 'mock-id' })),
      save: jest.fn((entity, data) => Promise.resolve(data)),
    };

    const dataSourceMock = {
      transaction: jest.fn((isolationOrCb, maybeCb) => {
        const cb = typeof isolationOrCb === 'function' ? isolationOrCb : maybeCb;
        return cb(entityManagerMock);
      }),
    };

    balanceUpdateServiceMock = {
      updateBalances: jest.fn().mockResolvedValue(undefined),
    };

    ensurePeriodServiceMock = {
      ensurePeriod: jest.fn().mockResolvedValue({ id: 'p-1' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdjustAccountBalanceUseCase,
        { provide: DataSource, useValue: dataSourceMock },
        { provide: BalanceUpdateService, useValue: balanceUpdateServiceMock },
        { provide: EnsurePeriodService, useValue: ensurePeriodServiceMock },
      ],
    }).compile();

    useCase = module.get<AdjustAccountBalanceUseCase>(AdjustAccountBalanceUseCase);
  });

  it('should adjust ASSET balance upwards against CAPITAL successfully', async () => {
    const account = {
      id: 'acc-bank',
      userId: 'user-1',
      name: 'Banco Test',
      type: 'ASSET',
      currencyId: 'curr-1',
      status: 'ACTIVE',
      currency: { rateToBase: 1.0 },
    };

    const capitalAccount = {
      id: 'acc-capital',
      userId: 'user-1',
      name: 'Capital',
      type: 'EQUITY',
      systemRole: 'CAPITAL',
    };

    entityManagerMock.findOne.mockImplementation((entity: any, opts: any) => {
      if (opts?.where?.id === 'acc-bank') return Promise.resolve(account);
      if (opts?.where?.id === 'curr-1') return Promise.resolve({ id: 'curr-1', rateToBase: 1.0 });
      if (opts?.where?.systemRole === 'CAPITAL') return Promise.resolve(capitalAccount);
      return Promise.resolve(null);
    });

    const result = await useCase.execute('user-1', 'acc-bank', {
      targetBalance: 1500,
      adjustmentType: 'CAPITAL',
    });

    expect(result.success).toBe(true);
    expect(result.delta).toBe(500);
    expect(result.currentBalance).toBe(1000);
    expect(result.targetBalance).toBe(1500);
    expect(balanceUpdateServiceMock.updateBalances).toHaveBeenCalled();
  });

  it('should adjust ASSET balance downwards against CAPITAL successfully', async () => {
    const account = {
      id: 'acc-bank',
      userId: 'user-1',
      name: 'Banco Test',
      type: 'ASSET',
      currencyId: 'curr-1',
      status: 'ACTIVE',
      currency: { rateToBase: 1.0 },
    };

    const capitalAccount = {
      id: 'acc-capital',
      userId: 'user-1',
      name: 'Capital',
      type: 'EQUITY',
      systemRole: 'CAPITAL',
    };

    entityManagerMock.findOne.mockImplementation((entity: any, opts: any) => {
      if (opts?.where?.id === 'acc-bank') return Promise.resolve(account);
      if (opts?.where?.id === 'curr-1') return Promise.resolve({ id: 'curr-1', rateToBase: 1.0 });
      if (opts?.where?.systemRole === 'CAPITAL') return Promise.resolve(capitalAccount);
      return Promise.resolve(null);
    });

    const result = await useCase.execute('user-1', 'acc-bank', {
      targetBalance: 800,
      adjustmentType: 'CAPITAL',
    });

    expect(result.success).toBe(true);
    expect(result.delta).toBe(-200);
    expect(result.currentBalance).toBe(1000);
    expect(result.targetBalance).toBe(800);
    expect(balanceUpdateServiceMock.updateBalances).toHaveBeenCalled();
  });

  it('should return without creating transaction when targetBalance equals currentBalance', async () => {
    const account = {
      id: 'acc-bank',
      userId: 'user-1',
      name: 'Banco Test',
      type: 'ASSET',
      currencyId: 'curr-1',
      status: 'ACTIVE',
    };

    entityManagerMock.findOne.mockResolvedValue(account);

    const result = await useCase.execute('user-1', 'acc-bank', {
      targetBalance: 1000,
      adjustmentType: 'CAPITAL',
    });

    expect(result.success).toBe(true);
    expect(result.delta).toBe(0);
    expect(result.transactionId).toBeNull();
    expect(entityManagerMock.save).not.toHaveBeenCalled();
  });

  it('should adjust ASSET balance upwards against INCOME category successfully', async () => {
    const account = {
      id: 'acc-bank',
      userId: 'user-1',
      name: 'Banco Test',
      type: 'ASSET',
      currencyId: 'curr-1',
      status: 'ACTIVE',
      currency: { rateToBase: 1.0 },
    };

    const incomeAccount = {
      id: 'acc-inc-1',
      userId: 'user-1',
      name: 'Ingresos Varios',
      type: 'INCOME',
    };

    entityManagerMock.findOne.mockImplementation((entity: any, opts: any) => {
      if (opts?.where?.id === 'acc-bank') return Promise.resolve(account);
      if (opts?.where?.id === 'acc-inc-1') return Promise.resolve(incomeAccount);
      if (opts?.where?.id === 'curr-1') return Promise.resolve({ id: 'curr-1', rateToBase: 1.0 });
      return Promise.resolve(null);
    });

    const result = await useCase.execute('user-1', 'acc-bank', {
      targetBalance: 1500,
      adjustmentType: 'CATEGORY',
      categoryId: 'acc-inc-1',
    });

    expect(result.success).toBe(true);
    expect(result.delta).toBe(500);
    expect(balanceUpdateServiceMock.updateBalances).toHaveBeenCalled();
  });

  it('should throw BadRequestException when trying to adjust ASSET upwards against EXPENSE category', async () => {
    const account = {
      id: 'acc-bank',
      userId: 'user-1',
      name: 'Banco Test',
      type: 'ASSET',
      currencyId: 'curr-1',
      status: 'ACTIVE',
      currency: { rateToBase: 1.0 },
    };

    const expenseAccount = {
      id: 'acc-exp-1',
      userId: 'user-1',
      name: 'Alquiler',
      type: 'EXPENSE',
    };

    entityManagerMock.findOne.mockImplementation((entity: any, opts: any) => {
      if (opts?.where?.id === 'acc-bank') return Promise.resolve(account);
      if (opts?.where?.id === 'acc-exp-1') return Promise.resolve(expenseAccount);
      if (opts?.where?.id === 'curr-1') return Promise.resolve({ id: 'curr-1', rateToBase: 1.0 });
      return Promise.resolve(null);
    });

    await expect(
      useCase.execute('user-1', 'acc-bank', {
        targetBalance: 1500,
        adjustmentType: 'CATEGORY',
        categoryId: 'acc-exp-1',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw NotFoundException when account does not exist', async () => {
    entityManagerMock.findOne.mockResolvedValue(null);

    await expect(
      useCase.execute('user-1', 'acc-none', {
        targetBalance: 500,
        adjustmentType: 'CAPITAL',
      }),
    ).rejects.toThrow(NotFoundException);
  });
});
