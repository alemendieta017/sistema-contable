import { Test, TestingModule } from '@nestjs/testing';
import { EnsurePeriodService } from '../../src/application/periods/ensure-period.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PeriodEntity } from '../../src/infrastructure/database/entities/period.entity';
import { BudgetEntity } from '../../src/infrastructure/database/entities/budget.entity';
import { AccountEntity } from '../../src/infrastructure/database/entities/account.entity';
import { AccountPeriodBalanceEntity } from '../../src/infrastructure/database/entities/account-period-balance.entity';
import { BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';

describe('EnsurePeriodService Auto-Provisioning & Continuous Gap Filling Tests (US1)', () => {
  let ensurePeriodService: EnsurePeriodService;
  let mockEntityManager: any;
  let storedPeriods: PeriodEntity[] = [];
  let storedBudgets: BudgetEntity[] = [];
  let storedBalances: AccountPeriodBalanceEntity[] = [];

  const mockAccounts: Partial<AccountEntity>[] = [
    {
      id: 'acc-asset',
      userId: 'user-1',
      name: 'Banco',
      type: 'ASSET',
      isCashOrBank: true,
      status: 'ACTIVE',
      currencyId: 'curr-1',
      systemRole: null,
      parentId: null,
    },
    {
      id: 'acc-income',
      userId: 'user-1',
      name: 'Salario',
      type: 'INCOME',
      isCashOrBank: false,
      status: 'ACTIVE',
      currencyId: 'curr-1',
      systemRole: null,
      parentId: null,
    },
  ];

  beforeEach(async () => {
    storedPeriods = [];
    storedBudgets = [];
    storedBalances = [];

    mockEntityManager = {
      findOne: jest.fn().mockImplementation((entityClass, options) => {
        if (entityClass === PeriodEntity) {
          if (options?.where?.name) {
            return Promise.resolve(
              storedPeriods.find(
                (p) => p.name === options.where.name && p.userId === options.where.userId,
              ) || null,
            );
          }
          if (options?.where?.endDate) {
            const threshold =
              options.where.endDate?._value || options.where.endDate?.value || '9999-12-31';
            const matching = storedPeriods.filter(
              (p) => p.userId === options.where.userId && p.endDate < threshold,
            );
            matching.sort((a, b) => b.endDate.localeCompare(a.endDate));
            return Promise.resolve(matching[0] || null);
          }
        }
        if (entityClass === BudgetEntity) {
          return Promise.resolve(
            storedBudgets.find((b) => b.periodId === options?.where?.periodId) || null,
          );
        }
        if (entityClass === AccountPeriodBalanceEntity) {
          return Promise.resolve(
            storedBalances.find(
              (b) =>
                b.accountId === options?.where?.accountId &&
                b.periodId === options?.where?.periodId,
            ) || null,
          );
        }
        return Promise.resolve(null);
      }),
      find: jest.fn().mockImplementation((entityClass, options) => {
        if (entityClass === AccountEntity) {
          return Promise.resolve(mockAccounts);
        }
        if (entityClass === PeriodEntity) {
          return Promise.resolve(storedPeriods);
        }
        if (entityClass === AccountPeriodBalanceEntity) {
          if (options?.where?.periodId) {
            return Promise.resolve(
              storedBalances.filter((b) => b.periodId === options.where.periodId),
            );
          }
          return Promise.resolve(storedBalances);
        }
        return Promise.resolve([]);
      }),
      create: jest.fn().mockImplementation((entityClass, plain) => {
        return { id: `id-${Math.random().toString(36).substr(2, 9)}`, ...plain };
      }),
      save: jest.fn().mockImplementation((entityClass, entity) => {
        if (Array.isArray(entity)) {
          const savedList = entity.map((e) => ({
            ...e,
            id: e.id || `id-${Math.random().toString(36).substr(2, 9)}`,
          }));
          if (entityClass === PeriodEntity) {
            storedPeriods.push(...savedList);
          } else if (entityClass === BudgetEntity) {
            storedBudgets.push(...savedList);
          } else if (entityClass === AccountPeriodBalanceEntity) {
            storedBalances.push(...savedList);
          }
          return Promise.resolve(savedList);
        }
        const saved = {
          ...entity,
          id: entity.id || `id-${Math.random().toString(36).substr(2, 9)}`,
        };
        if (entityClass === PeriodEntity) {
          storedPeriods.push(saved);
        } else if (entityClass === BudgetEntity) {
          storedBudgets.push(saved);
        } else if (entityClass === AccountPeriodBalanceEntity) {
          storedBalances.push(saved);
        }
        return Promise.resolve(saved);
      }),
      createQueryBuilder: jest.fn().mockImplementation((entityClass) => ({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockImplementation(async () => {
          if (entityClass === PeriodEntity) {
            if (storedPeriods.length === 0) return null;
            const sorted = [...storedPeriods].sort((a, b) => b.name.localeCompare(a.name));
            return sorted[0];
          }
          return null;
        }),
      })),
    };

    const mockDataSource = {
      manager: mockEntityManager,
      transaction: jest.fn().mockImplementation(async (cb) => cb(mockEntityManager)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EnsurePeriodService,
        { provide: getRepositoryToken(PeriodEntity), useValue: {} },
        { provide: getRepositoryToken(AccountEntity), useValue: {} },
        { provide: getRepositoryToken(BudgetEntity), useValue: {} },
        { provide: getRepositoryToken(AccountPeriodBalanceEntity), useValue: {} },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    ensurePeriodService = module.get<EnsurePeriodService>(EnsurePeriodService);
  });

  it('should auto-provision a single monthly period when no prior periods exist', async () => {
    const userId = 'user-1';
    const period = await ensurePeriodService.ensurePeriod(userId, '2026-01');

    expect(period.name).toBe('2026-01');
    expect(period.startDate).toBe('2026-01-01');
    expect(period.endDate).toBe('2026-01-31');
    expect(period.status).toBe('OPEN');
    expect(period.userId).toBe(userId);

    // Should create a budget envelope
    expect(storedBudgets).toHaveLength(1);
    expect(storedBudgets[0].periodId).toBe(period.id);
    expect(storedBudgets[0].name).toBe('Enero 2026');

    // Should create initial balances for user accounts
    expect(storedBalances).toHaveLength(2);
    const assetBalance = storedBalances.find((b) => b.accountId === 'acc-asset');
    expect(assetBalance?.openingBalance).toBe(0);
    expect(assetBalance?.closingBalance).toBe(0);
  });

  it('should throw BadRequestException if period format is invalid', async () => {
    await expect(ensurePeriodService.ensurePeriod('user-1', 'invalid-date')).rejects.toThrow(
      BadRequestException,
    );
    await expect(ensurePeriodService.ensurePeriod('user-1', '2026-13')).rejects.toThrow(
      BadRequestException,
    );
    await expect(ensurePeriodService.ensurePeriod('user-1', '')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should automatically fill gaps when ensuring a future period', async () => {
    const userId = 'user-1';
    // First, establish period 2025-10
    await ensurePeriodService.ensurePeriod(userId, '2025-10');
    expect(storedPeriods).toHaveLength(1);

    // Now request 2026-02 (gap: 2025-11, 2025-12, 2026-01, 2026-02)
    const targetPeriod = await ensurePeriodService.ensurePeriod(userId, '2026-02');

    expect(targetPeriod.name).toBe('2026-02');
    expect(storedPeriods).toHaveLength(5);
    const periodNames = storedPeriods.map((p) => p.name).sort();
    expect(periodNames).toEqual(['2025-10', '2025-11', '2025-12', '2026-01', '2026-02']);

    // Check that each gap period got a budget envelope
    expect(storedBudgets).toHaveLength(5);
  });

  it('should reuse existing period without creating duplicates', async () => {
    const userId = 'user-1';
    const firstCall = await ensurePeriodService.ensurePeriod(userId, '2026-05');
    const secondCall = await ensurePeriodService.ensurePeriod(userId, '2026-05');

    expect(firstCall.id).toBe(secondCall.id);
    expect(storedPeriods).toHaveLength(1);
  });

  it('should carry forward closing balances from immediately preceding period for real accounts and 0 for P&L', async () => {
    const userId = 'user-1';
    // Create initial period 2026-01
    const p1 = await ensurePeriodService.ensurePeriod(userId, '2026-01');

    // Simulate journal activity closing balance in 2026-01
    const balAsset = storedBalances.find(
      (b) => b.accountId === 'acc-asset' && b.periodId === p1.id,
    )!;
    balAsset.closingBalance = 5000;
    const balIncome = storedBalances.find(
      (b) => b.accountId === 'acc-income' && b.periodId === p1.id,
    )!;
    balIncome.closingBalance = 3000;

    // Now ensure next month 2026-02
    const p2 = await ensurePeriodService.ensurePeriod(userId, '2026-02');

    const p2AssetBal = storedBalances.find(
      (b) => b.accountId === 'acc-asset' && b.periodId === p2.id,
    )!;
    const p2IncomeBal = storedBalances.find(
      (b) => b.accountId === 'acc-income' && b.periodId === p2.id,
    )!;

    // Real account carries forward closing balance (5000)
    expect(p2AssetBal.openingBalance).toBe(5000);
    expect(p2AssetBal.closingBalance).toBe(5000);

    // Temporary/P&L account resets opening balance to 0
    expect(p2IncomeBal.openingBalance).toBe(0);
    expect(p2IncomeBal.closingBalance).toBe(0);
  });

  it('should support execute() returning EnsurePeriodResponse for API controller', async () => {
    const response = await ensurePeriodService.execute('user-1', { period: '2026-08' });
    expect(response.created).toBe(true);
    expect(response.name).toBe('2026-08');
    expect(response.startDate).toBe('2026-08-01');
    expect(response.endDate).toBe('2026-08-31');
    expect(response.status).toBe('OPEN');
  });
});
