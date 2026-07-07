import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Not } from 'typeorm';
import { BudgetEntity } from '../../infrastructure/database/entities/budget.entity';
import { PeriodEntity } from '../../infrastructure/database/entities/period.entity';
import { AccountEntity } from '../../infrastructure/database/entities/account.entity';
import { BudgetItemEntity } from '../../infrastructure/database/entities/budget-item.entity';
import { IBudgetDetail, IBudgetItem } from '../../domain/budgets/budget.model';

@Injectable()
export class GetBudgetDetailUseCase {
  constructor(
    @InjectRepository(BudgetEntity)
    private readonly budgetRepository: Repository<BudgetEntity>,
    @InjectRepository(PeriodEntity)
    private readonly periodRepository: Repository<PeriodEntity>,
    @InjectRepository(AccountEntity)
    private readonly accountRepository: Repository<AccountEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async execute(userId: string, periodId: string): Promise<IBudgetDetail> {
    return this.dataSource.transaction(async (entityManager) => {
      // 1. Fetch budget for user and periodId
      let budget = await entityManager.findOne(BudgetEntity, {
        where: { userId, periodId },
        relations: ['periodEntity'],
      });

      // 2. If budget does not exist, check if the period exists and belongs to the user
      if (!budget) {
        const period = await entityManager.findOne(PeriodEntity, {
          where: { id: periodId },
          relations: ['fiscalYear'],
        });

        if (!period || period.fiscalYear.userId !== userId) {
          throw new NotFoundException('Period not found');
        }

        // Create the BudgetEntity dynamically
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
        budget.periodEntity = period;
      }

      // 3. Get all eligible accounts: ACTIVE, not EQUITY, and not cash/bank
      const accounts = await entityManager.find(AccountEntity, {
        where: {
          userId,
          status: 'ACTIVE',
          isCashOrBank: false,
          type: Not('EQUITY'),
        },
      });

      // 4. Fetch budget items saved for this budget
      const budgetItems = await entityManager.find(BudgetItemEntity, {
        where: { budgetId: budget.id },
      });

      const amountMap = new Map<string, number>();
      for (const item of budgetItems) {
        amountMap.set(item.accountId, Number(item.amount));
      }

      // 5. Map accounts to IBudgetItem
      const items: IBudgetItem[] = accounts.map((acc) => ({
        accountId: acc.id,
        accountName: acc.name,
        accountType: acc.type,
        parentId: acc.parentId || null,
        isCashOrBank: acc.isCashOrBank,
        amount: amountMap.get(acc.id) || 0,
      }));

      // Calculate friendly name dynamically based on period name
      const [yearStr, monthStr] = budget.periodEntity.name.split('-');
      const monthIndex = parseInt(monthStr, 10) - 1;
      const friendlyMonthNames = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
      ];
      const friendlyName = `${friendlyMonthNames[monthIndex]} ${yearStr}`;

      return {
        id: budget.id,
        periodId: budget.periodId,
        periodName: budget.periodEntity.name,
        friendlyName,
        startDate: budget.periodEntity.startDate,
        endDate: budget.periodEntity.endDate,
        isLocked: budget.periodEntity.status === 'CLOSED',
        items,
      };
    });
  }
}
