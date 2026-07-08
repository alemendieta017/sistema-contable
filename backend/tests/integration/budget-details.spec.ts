import { Test, TestingModule } from '@nestjs/testing';
import { GetBudgetDetailUseCase } from '../../src/application/budgets/get-budget-detail.use-case';
import { UpdateBudgetItemsUseCase } from '../../src/application/budgets/update-budget-items.use-case';
import { CopyPreviousBudgetUseCase } from '../../src/application/budgets/copy-previous-budget.use-case';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BudgetEntity } from '../../src/infrastructure/database/entities/budget.entity';
import { PeriodEntity } from '../../src/infrastructure/database/entities/period.entity';
import { AccountEntity } from '../../src/infrastructure/database/entities/account.entity';
import { BudgetItemEntity } from '../../src/infrastructure/database/entities/budget-item.entity';
import { DataSource } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('Budget Details and Items Update Integration Tests', () => {
  let getDetailUseCase: GetBudgetDetailUseCase;
  let updateItemsUseCase: UpdateBudgetItemsUseCase;
  let copyPreviousUseCase: CopyPreviousBudgetUseCase;
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
      find: jest.fn(),
      save: jest
        .fn()
        .mockImplementation((cls, entity) =>
          Promise.resolve({ ...entity, id: entity.id || 'mock-saved-id' }),
        ),
      create: jest.fn().mockImplementation((cls, obj) => ({ id: 'mock-id', ...obj })),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
      remove: jest.fn().mockResolvedValue([]),
      getRepository: jest.fn().mockReturnValue({
        createQueryBuilder: jest.fn().mockReturnValue({
          innerJoin: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          getOne: jest.fn(),
        }),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetBudgetDetailUseCase,
        UpdateBudgetItemsUseCase,
        CopyPreviousBudgetUseCase,
        {
          provide: getRepositoryToken(BudgetEntity),
          useValue: {},
        },
        {
          provide: getRepositoryToken(PeriodEntity),
          useValue: {},
        },
        {
          provide: getRepositoryToken(AccountEntity),
          useValue: {},
        },
        {
          provide: getRepositoryToken(BudgetItemEntity),
          useValue: {},
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    getDetailUseCase = module.get<GetBudgetDetailUseCase>(GetBudgetDetailUseCase);
    updateItemsUseCase = module.get<UpdateBudgetItemsUseCase>(UpdateBudgetItemsUseCase);
    copyPreviousUseCase = module.get<CopyPreviousBudgetUseCase>(CopyPreviousBudgetUseCase);
  });

  describe('GetBudgetDetailUseCase', () => {
    it('should return budget details and eligible accounts with saved amounts', async () => {
      const userId = 'user-1';
      const periodId = 'period-1';

      // Mock Budget and Period exist
      mockEntityManager.findOne.mockResolvedValueOnce({
        id: 'budget-1',
        userId,
        periodId,
        name: 'Junio 2026',
        periodEntity: {
          id: periodId,
          name: '2026-06',
          startDate: '2026-06-01',
          endDate: '2026-06-30',
          status: 'OPEN',
        },
      });

      // Mock active accounts: 1 Asset (non-cash), 1 Expense, 1 Cash/Bank (ineligible), 1 Equity (ineligible)
      const accounts = [
        {
          id: 'acc-1',
          name: 'Inversión',
          type: 'ASSET',
          isCashOrBank: false,
          parentId: 'parent-1',
          status: 'ACTIVE',
        },
        {
          id: 'acc-2',
          name: 'Comida',
          type: 'EXPENSE',
          isCashOrBank: false,
          parentId: null,
          status: 'ACTIVE',
        },
      ];
      mockEntityManager.find.mockResolvedValueOnce(accounts); // for AccountEntity

      // Mock existing BudgetItems
      mockEntityManager.find.mockResolvedValueOnce([
        { id: 'item-1', budgetId: 'budget-1', accountId: 'acc-1', amount: -500000.0 },
      ]); // for BudgetItemEntity

      const result = await getDetailUseCase.execute(userId, periodId);

      expect(result).toBeDefined();
      expect(result.id).toBe('budget-1');
      expect(result.periodName).toBe('2026-06');
      expect(result.friendlyName).toBe('Junio 2026');
      expect(result.isLocked).toBe(false);
      expect(result.items).toHaveLength(2);
      expect(result.items).toEqual(
        expect.arrayContaining([
          {
            accountId: 'acc-1',
            accountName: 'Inversión',
            accountType: 'ASSET',
            parentId: 'parent-1',
            isCashOrBank: false,
            amount: -500000.0,
          },
          {
            accountId: 'acc-2',
            accountName: 'Comida',
            accountType: 'EXPENSE',
            parentId: null,
            isCashOrBank: false,
            amount: 0,
          },
        ]),
      );
    });

    it('should dynamically create a budget if it does not exist but the period exists and belongs to the user', async () => {
      const userId = 'user-1';
      const periodId = 'period-1';

      // First findOne returns null for BudgetEntity
      mockEntityManager.findOne.mockResolvedValueOnce(null);

      // Second findOne returns the PeriodEntity
      mockEntityManager.findOne.mockResolvedValueOnce({
        id: periodId,
        name: '2026-06',
        startDate: '2026-06-01',
        endDate: '2026-06-30',
        status: 'OPEN',
        fiscalYear: {
          id: 'fy-1',
          userId,
        },
      });

      mockEntityManager.find
        .mockResolvedValueOnce([]) // accounts
        .mockResolvedValueOnce([]); // budgetItems

      const result = await getDetailUseCase.execute(userId, periodId);

      expect(result).toBeDefined();
      expect(mockEntityManager.create).toHaveBeenCalledWith(
        BudgetEntity,
        expect.objectContaining({
          userId,
          periodId,
          name: 'Junio 2026',
        }),
      );
      expect(mockEntityManager.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if period does not exist or does not belong to user', async () => {
      const userId = 'user-1';
      const periodId = 'period-1';

      // First findOne returns null for BudgetEntity
      mockEntityManager.findOne.mockResolvedValueOnce(null);
      // Second findOne returns null for PeriodEntity (not found)
      mockEntityManager.findOne.mockResolvedValueOnce(null);

      await expect(getDetailUseCase.execute(userId, periodId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('UpdateBudgetItemsUseCase', () => {
    it('should batch insert/update budget items for an open period', async () => {
      const userId = 'user-1';
      const periodId = 'period-1';
      const dto = {
        items: [
          { accountId: 'acc-1', amount: 3000000 },
          { accountId: 'acc-2', amount: -500000 },
        ],
      };

      // Mock Period check
      mockEntityManager.findOne.mockResolvedValueOnce({
        id: periodId,
        status: 'OPEN',
        fiscalYear: { userId },
      });

      // Mock Budget check
      mockEntityManager.findOne.mockResolvedValueOnce({
        id: 'budget-1',
        userId,
        periodId,
      });

      // Mock Account validation
      mockEntityManager.find.mockResolvedValueOnce([
        {
          id: 'acc-1',
          name: 'Alquiler',
          type: 'EXPENSE',
          isCashOrBank: false,
          status: 'ACTIVE',
          userId,
        },
        {
          id: 'acc-2',
          name: 'Ahorro',
          type: 'ASSET',
          isCashOrBank: false,
          status: 'ACTIVE',
          userId,
        },
      ]);

      // Mock Existing BudgetItems
      mockEntityManager.find.mockResolvedValueOnce([
        { id: 'item-1', budgetId: 'budget-1', accountId: 'acc-1', amount: 2500000 },
      ]);

      const result = await updateItemsUseCase.execute(userId, periodId, dto);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.updatedCount).toBe(2);
      expect(mockEntityManager.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException if trying to update budget items in a CLOSED period', async () => {
      const userId = 'user-1';
      const periodId = 'period-1';
      const dto = { items: [{ accountId: 'acc-1', amount: 1000 }] };

      // Mock Period check -> status CLOSED
      mockEntityManager.findOne.mockResolvedValueOnce({
        id: periodId,
        status: 'CLOSED',
        fiscalYear: { userId },
      });

      await expect(updateItemsUseCase.execute(userId, periodId, dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if any account is ineligible (e.g. cash/bank or EQUITY)', async () => {
      const userId = 'user-1';
      const periodId = 'period-1';
      const dto = {
        items: [{ accountId: 'acc-equity', amount: 1000 }],
      };

      // Mock Period check
      mockEntityManager.findOne.mockResolvedValueOnce({
        id: periodId,
        status: 'OPEN',
        fiscalYear: { userId },
      });

      // Mock Budget check
      mockEntityManager.findOne.mockResolvedValueOnce({
        id: 'budget-1',
        userId,
      });

      // Mock Account validation (returns an EQUITY account)
      mockEntityManager.find.mockResolvedValueOnce([
        {
          id: 'acc-equity',
          name: 'Patrimonio',
          type: 'EQUITY',
          isCashOrBank: false,
          status: 'ACTIVE',
          userId,
        },
      ]);

      await expect(updateItemsUseCase.execute(userId, periodId, dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should delete existing items that are omitted from the update payload', async () => {
      const userId = 'user-1';
      const periodId = 'period-1';
      const dto = {
        items: [{ accountId: 'acc-1', amount: 3000000 }],
      };

      // Mock Period check
      mockEntityManager.findOne.mockResolvedValueOnce({
        id: periodId,
        status: 'OPEN',
        fiscalYear: { userId },
      });

      // Mock Budget check
      mockEntityManager.findOne.mockResolvedValueOnce({
        id: 'budget-1',
        userId,
        periodId,
      });

      // Mock Account validation
      mockEntityManager.find.mockResolvedValueOnce([
        {
          id: 'acc-1',
          name: 'Alquiler',
          type: 'EXPENSE',
          isCashOrBank: false,
          status: 'ACTIVE',
          userId,
        },
      ]);

      // Mock Existing BudgetItems: acc-1 (retained) and acc-2 (omitted, should be deleted)
      const existingItems = [
        { id: 'item-1', budgetId: 'budget-1', accountId: 'acc-1', amount: 2500000 },
        { id: 'item-2', budgetId: 'budget-1', accountId: 'acc-2', amount: 1200000 },
      ];
      mockEntityManager.find.mockResolvedValueOnce(existingItems);

      const result = await updateItemsUseCase.execute(userId, periodId, dto);

      expect(result.success).toBe(true);
      // Verify remove was called with the omitted item (item-2)
      expect(mockEntityManager.remove).toHaveBeenCalledWith(
        expect.any(Function),
        expect.arrayContaining([expect.objectContaining({ accountId: 'acc-2' })]),
      );
    });
  });

  describe('CopyPreviousBudgetUseCase', () => {
    it('should successfully copy budget items from previous period', async () => {
      const userId = 'user-1';
      const periodId = 'period-2'; // Current period is June (2026-06)

      // Mock current period
      const currentPeriod = {
        id: periodId,
        name: '2026-06',
        startDate: '2026-06-01',
        endDate: '2026-06-30',
        status: 'OPEN',
        fiscalYear: { userId },
      };
      mockEntityManager.findOne.mockResolvedValueOnce(currentPeriod); // for currentPeriod

      // Mock previous period query
      const previousPeriod = {
        id: 'period-1',
        name: '2026-05',
        startDate: '2026-05-01',
        endDate: '2026-05-31',
        status: 'OPEN',
      };
      const queryBuilder = mockEntityManager.getRepository().createQueryBuilder();
      queryBuilder.getOne.mockResolvedValueOnce(previousPeriod); // previousPeriod

      // Mock previous budget
      const previousBudget = {
        id: 'budget-1',
        userId,
        periodId: 'period-1',
      };
      mockEntityManager.findOne.mockResolvedValueOnce(previousBudget); // previousBudget

      // Mock previous items
      const previousItems = [
        { id: 'item-1', budgetId: 'budget-1', accountId: 'acc-1', amount: 3000000.0 },
      ];
      mockEntityManager.find.mockResolvedValueOnce(previousItems); // previousItems

      // Mock current budget (null, will be created dynamically)
      mockEntityManager.findOne.mockResolvedValueOnce(null); // currentBudget

      const result = await copyPreviousUseCase.execute(userId, periodId);

      expect(result.success).toBe(true);
      expect(result.copiedCount).toBe(1);
      // Verify delete was called to clear existing
      expect(mockEntityManager.delete).toHaveBeenCalledWith(expect.any(Function), {
        budgetId: 'mock-id',
      });
      // Verify new items were saved
      expect(mockEntityManager.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException if current period is closed', async () => {
      const userId = 'user-1';
      const periodId = 'period-1';

      mockEntityManager.findOne.mockResolvedValueOnce({
        id: periodId,
        status: 'CLOSED',
        fiscalYear: { userId },
      });

      await expect(copyPreviousUseCase.execute(userId, periodId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
