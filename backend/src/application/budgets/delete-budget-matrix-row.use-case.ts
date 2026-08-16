import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { FiscalYearEntity } from '../../infrastructure/database/entities/fiscal-year.entity';
import { BudgetEntity } from '../../infrastructure/database/entities/budget.entity';
import { BudgetItemEntity } from '../../infrastructure/database/entities/budget-item.entity';

@Injectable()
export class DeleteBudgetMatrixRowUseCase {
  constructor(private readonly dataSource: DataSource) {}

  async execute(
    userId: string,
    fiscalYearId: string,
    accountId: string,
    subRowId?: string | null,
  ): Promise<{ success: boolean; deletedCount: number }> {
    return this.dataSource.transaction(async (manager) => {
      const fiscalYear = await manager.findOne(FiscalYearEntity, {
        where: { id: fiscalYearId },
        relations: ['periods'],
      });

      if (!fiscalYear) {
        throw new NotFoundException(`Fiscal year with ID '${fiscalYearId}' not found.`);
      }

      const periodIds = (fiscalYear.periods || []).map((p) => p.id);
      if (periodIds.length === 0) {
        return { success: true, deletedCount: 0 };
      }

      const budgets = await manager
        .createQueryBuilder(BudgetEntity, 'budget')
        .where('budget.user_id = :userId', { userId })
        .andWhere('budget.period_id IN (:...periodIds)', { periodIds })
        .getMany();

      const budgetIds = budgets.map((b) => b.id);
      if (budgetIds.length === 0) {
        return { success: true, deletedCount: 0 };
      }

      const query = manager
        .createQueryBuilder()
        .delete()
        .from(BudgetItemEntity)
        .where('budget_id IN (:...budgetIds)', { budgetIds })
        .andWhere('account_id = :accountId', { accountId });

      if (subRowId) {
        query.andWhere('sub_row_id = :subRowId', { subRowId });
      } else {
        query.andWhere('sub_row_id IS NULL');
      }

      const result = await query.execute();

      return {
        success: true,
        deletedCount: result.affected || 0,
      };
    });
  }
}
