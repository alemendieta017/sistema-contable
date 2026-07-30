import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { BudgetEntity } from '../../infrastructure/database/entities/budget.entity';
import { PeriodEntity } from '../../infrastructure/database/entities/period.entity';
import { BudgetItemEntity } from '../../infrastructure/database/entities/budget-item.entity';

@Injectable()
export class CopyPreviousBudgetUseCase {
  constructor(
    @InjectRepository(BudgetEntity)
    private readonly budgetRepository: Repository<BudgetEntity>,
    @InjectRepository(PeriodEntity)
    private readonly periodRepository: Repository<PeriodEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async execute(
    userId: string,
    periodId: string,
  ): Promise<{ success: boolean; copiedCount: number }> {
    return this.dataSource.transaction(async (entityManager) => {
      // 1. Fetch current period and verify ownership
      const currentPeriod = await entityManager.findOne(PeriodEntity, {
        where: { id: periodId },
        relations: ['fiscalYear'],
      });

      if (!currentPeriod || currentPeriod.fiscalYear.userId !== userId) {
        throw new NotFoundException('Period not found');
      }

      // 2. Block if period is closed
      if (currentPeriod.status === 'CLOSED') {
        throw new BadRequestException('Cannot copy budget to a closed period');
      }

      // 3. Find the previous period
      const previousPeriod = await entityManager
        .getRepository(PeriodEntity)
        .createQueryBuilder('period')
        .innerJoin('period.fiscalYear', 'fiscalYear')
        .where('fiscalYear.userId = :userId', { userId })
        .andWhere('period.endDate < :currentStartDate', {
          currentStartDate: currentPeriod.startDate,
        })
        .orderBy('period.endDate', 'DESC')
        .getOne();

      if (!previousPeriod) {
        return { success: true, copiedCount: 0 };
      }

      // 4. Find the previous budget and its items
      const previousBudget = await entityManager.findOne(BudgetEntity, {
        where: { userId, periodId: previousPeriod.id },
      });

      if (!previousBudget) {
        return { success: true, copiedCount: 0 };
      }

      const previousItems = await entityManager.find(BudgetItemEntity, {
        where: { budgetId: previousBudget.id },
      });

      if (previousItems.length === 0) {
        return { success: true, copiedCount: 0 };
      }

      // 5. Find or create current budget
      let currentBudget = await entityManager.findOne(BudgetEntity, {
        where: { userId, periodId },
      });

      if (!currentBudget) {
        const [yearStr, monthStr] = currentPeriod.startDate.split('-');
        const monthIndex = parseInt(monthStr, 10) - 1;
        const friendlyMonthNames = [
          'Enero',
          'Febrero',
          'Marzo',
          'Abril',
          'Mayo',
          'Junio',
          'Julio',
          'Agosto',
          'Septiembre',
          'Octubre',
          'Noviembre',
          'Diciembre',
        ];
        const budgetFriendlyName = `${friendlyMonthNames[monthIndex]} ${yearStr}`;

        currentBudget = entityManager.create(BudgetEntity, {
          userId,
          periodId,
          name: budgetFriendlyName,
        });
        currentBudget = await entityManager.save(BudgetEntity, currentBudget);
      }

      // 6. Delete existing items in current budget
      await entityManager.delete(BudgetItemEntity, { budgetId: currentBudget.id });

      // 7. Clone previous items into current budget
      const newItems = previousItems.map((item) => {
        return entityManager.create(BudgetItemEntity, {
          budgetId: currentBudget.id,
          accountId: item.accountId,
          amount: item.amount,
        });
      });

      await entityManager.save(BudgetItemEntity, newItems);

      return {
        success: true,
        copiedCount: newItems.length,
      };
    });
  }
}
