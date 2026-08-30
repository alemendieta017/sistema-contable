import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { BudgetEntity } from '../../infrastructure/database/entities/budget.entity';
import { PeriodEntity } from '../../infrastructure/database/entities/period.entity';
import { AccountEntity } from '../../infrastructure/database/entities/account.entity';
import { BudgetItemEntity } from '../../infrastructure/database/entities/budget-item.entity';
import { IBudgetReplicateDto, IBudgetReplicateResponse } from '../../domain/budgets/budget.model';
import { getFriendlyPeriodName } from '../../domain/common/date.utils';

@Injectable()
export class ReplicateBudgetItemUseCase {
  constructor(
    @InjectRepository(BudgetEntity)
    private readonly budgetRepository: Repository<BudgetEntity>,
    @InjectRepository(PeriodEntity)
    private readonly periodRepository: Repository<PeriodEntity>,
    @InjectRepository(AccountEntity)
    private readonly accountRepository: Repository<AccountEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async execute(userId: string, dto: IBudgetReplicateDto): Promise<IBudgetReplicateResponse> {
    return this.dataSource.transaction(async (entityManager) => {
      // 1. Fetch period and check if user owns it
      const period = await entityManager.findOne(PeriodEntity, {
        where: { id: dto.periodId, userId },
      });

      if (!period) {
        throw new NotFoundException('Period not found');
      }

      // 2. Validate account exists, belongs to the user, and is eligible
      const account = await entityManager.findOne(AccountEntity, {
        where: { id: dto.accountId, userId },
      });

      if (!account) {
        throw new BadRequestException('Account not found');
      }
      if (account.status !== 'ACTIVE') {
        throw new BadRequestException(`Account ${account.name} is inactive`);
      }
      if (account.type === 'EQUITY') {
        throw new BadRequestException(`Cannot budget for EQUITY account ${account.name}`);
      }
      if (account.isCashOrBank) {
        throw new BadRequestException(`Cannot budget for Cash/Bank account ${account.name}`);
      }

      // 3. Find all periods of that calendar year
      const yearStr = period.name.substring(0, 4);
      const userPeriods = await entityManager.find(PeriodEntity, {
        where: { userId },
        order: { name: 'ASC' },
      });
      const allPeriods = userPeriods.filter((p) => p.name.startsWith(`${yearStr}-`));

      const periodIds = allPeriods.map((p) => p.id);

      // Fetch all existing budgets for these periods in batch
      const existingBudgets = await entityManager.find(BudgetEntity, {
        where: { userId, periodId: In(periodIds) },
      });

      const budgetMap = new Map<string, BudgetEntity>();
      for (const b of existingBudgets) {
        budgetMap.set(b.periodId, b);
      }

      // Create missing budgets in batch
      const budgetsToSave: BudgetEntity[] = [];
      for (const p of allPeriods) {
        if (!budgetMap.has(p.id)) {
          const budget = entityManager.create(BudgetEntity, {
            userId,
            periodId: p.id,
            name: getFriendlyPeriodName(p.name),
          });
          budgetsToSave.push(budget);
        }
      }

      if (budgetsToSave.length > 0) {
        const savedBudgets = await entityManager.save(BudgetEntity, budgetsToSave);
        const savedArray = Array.isArray(savedBudgets) ? savedBudgets : [savedBudgets];
        for (const b of savedArray) {
          budgetMap.set(b.periodId, b);
        }
      }

      const budgetIds = Array.from(budgetMap.values()).map((b) => b.id);

      // Fetch existing budget items for target account in batch
      const existingItems = await entityManager.find(BudgetItemEntity, {
        where: { budgetId: In(budgetIds), accountId: dto.accountId },
      });

      const itemMap = new Map<string, BudgetItemEntity>();
      for (const item of existingItems) {
        itemMap.set(item.budgetId, item);
      }

      const itemsToSave: BudgetItemEntity[] = [];
      const replicatedPeriods: string[] = [];

      for (const p of allPeriods) {
        const budget = budgetMap.get(p.id)!;
        let budgetItem = itemMap.get(budget.id);

        if (budgetItem) {
          budgetItem.amount = dto.amount;
        } else {
          budgetItem = entityManager.create(BudgetItemEntity, {
            budgetId: budget.id,
            accountId: dto.accountId,
            amount: dto.amount,
          });
        }
        itemsToSave.push(budgetItem);
        replicatedPeriods.push(p.name);
      }

      await entityManager.save(BudgetItemEntity, itemsToSave);

      return {
        success: true,
        replicatedPeriods,
      };
    });
  }
}
