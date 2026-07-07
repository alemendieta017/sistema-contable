import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { BudgetEntity } from '../../infrastructure/database/entities/budget.entity';
import { PeriodEntity } from '../../infrastructure/database/entities/period.entity';
import { AccountEntity } from '../../infrastructure/database/entities/account.entity';
import { BudgetItemEntity } from '../../infrastructure/database/entities/budget-item.entity';
import { IBudgetUpdateDto, IBudgetUpdateResponse } from '../../domain/budgets/budget.model';

@Injectable()
export class UpdateBudgetItemsUseCase {
  constructor(
    @InjectRepository(BudgetEntity)
    private readonly budgetRepository: Repository<BudgetEntity>,
    @InjectRepository(PeriodEntity)
    private readonly periodRepository: Repository<PeriodEntity>,
    @InjectRepository(AccountEntity)
    private readonly accountRepository: Repository<AccountEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async execute(userId: string, periodId: string, dto: IBudgetUpdateDto): Promise<IBudgetUpdateResponse> {
    return this.dataSource.transaction(async (entityManager) => {
      // 1. Fetch period and check if user owns it
      const period = await entityManager.findOne(PeriodEntity, {
        where: { id: periodId },
        relations: ['fiscalYear'],
      });

      if (!period || period.fiscalYear.userId !== userId) {
        throw new NotFoundException('Period not found');
      }

      // 2. Block updates if period is closed
      if (period.status === 'CLOSED') {
        throw new BadRequestException('Cannot update budget items for a closed period');
      }

      // 3. Find or create the budget for this period
      let budget = await entityManager.findOne(BudgetEntity, {
        where: { userId, periodId },
      });

      if (!budget) {
        const [yearStr, monthStr] = period.name.split('-');
        const monthIndex = parseInt(monthStr, 10) - 1;
        const friendlyMonthNames = [
          'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
          'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
        ];
        const budgetFriendlyName = `${friendlyMonthNames[monthIndex]} ${yearStr}`;

        budget = entityManager.create(BudgetEntity, {
          userId,
          periodId,
          name: budgetFriendlyName,
        });
        budget = await entityManager.save(BudgetEntity, budget);
      }

      // 4. Validate accounts eligibility
      const accountIds = dto.items.map((item) => item.accountId);
      if (accountIds.length === 0) {
        return { success: true, updatedCount: 0 };
      }

      const accounts = await entityManager.find(AccountEntity, {
        where: { id: In(accountIds), userId },
      });

      const accountMap = new Map<string, AccountEntity>();
      for (const acc of accounts) {
        accountMap.set(acc.id, acc);
      }

      for (const item of dto.items) {
        const acc = accountMap.get(item.accountId);
        if (!acc) {
          throw new BadRequestException(`Account ${item.accountId} not found`);
        }
        if (acc.status !== 'ACTIVE') {
          throw new BadRequestException(`Account ${acc.name} is inactive`);
        }
        if (acc.type === 'EQUITY') {
          throw new BadRequestException(`Cannot budget for EQUITY account ${acc.name}`);
        }
        if (acc.isCashOrBank) {
          throw new BadRequestException(`Cannot budget for Cash/Bank account ${acc.name}`);
        }
      }

      // 5. Fetch existing budget items for batch update
      const existingItems = await entityManager.find(BudgetItemEntity, {
        where: { budgetId: budget.id },
      });

      const existingItemMap = new Map<string, BudgetItemEntity>();
      for (const item of existingItems) {
        existingItemMap.set(item.accountId, item);
      }

      const itemsToSave: BudgetItemEntity[] = [];
      for (const item of dto.items) {
        const existing = existingItemMap.get(item.accountId);
        if (existing) {
          existing.amount = item.amount;
          itemsToSave.push(existing);
        } else {
          const newItem = entityManager.create(BudgetItemEntity, {
            budgetId: budget.id,
            accountId: item.accountId,
            amount: item.amount,
          });
          itemsToSave.push(newItem);
        }
      }

      await entityManager.save(BudgetItemEntity, itemsToSave);

      return {
        success: true,
        updatedCount: itemsToSave.length,
      };
    });
  }
}
