import { Injectable, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { PeriodEntity } from '../../infrastructure/database/entities/period.entity';
import { BudgetEntity } from '../../infrastructure/database/entities/budget.entity';
import { BudgetItemEntity } from '../../infrastructure/database/entities/budget-item.entity';
import { AccountEntity } from '../../infrastructure/database/entities/account.entity';
import { MatrixCellUpdate, BatchUpdateBudgetMatrixRequest } from '@sistema-contable/shared';

@Injectable()
export class UpdateBudgetMatrixUseCase {
  constructor(private readonly dataSource: DataSource) {}

  async execute(
    userId: string,
    updatesOrBodyOrFiscalYear: string | MatrixCellUpdate[] | BatchUpdateBudgetMatrixRequest,
    maybeUpdates?: MatrixCellUpdate[],
  ): Promise<{ success: boolean; updatedCount: number }> {
    let updates: MatrixCellUpdate[] = [];

    if (Array.isArray(updatesOrBodyOrFiscalYear)) {
      updates = updatesOrBodyOrFiscalYear;
    } else if (
      typeof updatesOrBodyOrFiscalYear === 'object' &&
      updatesOrBodyOrFiscalYear !== null &&
      'updates' in updatesOrBodyOrFiscalYear
    ) {
      updates = updatesOrBodyOrFiscalYear.updates || [];
    } else if (typeof updatesOrBodyOrFiscalYear === 'string') {
      updates = maybeUpdates || [];
    }

    if (!updates || updates.length === 0) {
      return { success: true, updatedCount: 0 };
    }

    return this.dataSource.transaction(async (manager) => {
      const periods = await manager.find(PeriodEntity, {
        where: { userId },
      });

      const periodMap = new Map<string, PeriodEntity>();
      for (const p of periods) {
        periodMap.set(p.id, p);
      }

      // Validate all periods in updates belong to this user
      for (const update of updates) {
        const period = periodMap.get(update.periodId);
        if (!period) {
          throw new BadRequestException(
            `Period '${update.periodId}' does not exist for this user.`,
          );
        }
      }

      // Validate that all accountIds in updates belong to this user
      const accountIds = Array.from(new Set(updates.map((u) => u.accountId)));
      if (accountIds.length > 0) {
        const userAccounts = await manager
          .createQueryBuilder(AccountEntity, 'account')
          .where('account.user_id = :userId', { userId })
          .andWhere('account.id IN (:...accountIds)', { accountIds })
          .getMany();

        const userAccountIdSet = new Set(userAccounts.map((a) => a.id));
        for (const accountId of accountIds) {
          if (!userAccountIdSet.has(accountId)) {
            throw new BadRequestException(
              `Account '${accountId}' not found or does not belong to user.`,
            );
          }
        }
      }

      // Group updates by periodId
      const updatesByPeriod = new Map<string, MatrixCellUpdate[]>();
      for (const update of updates) {
        if (!updatesByPeriod.has(update.periodId)) {
          updatesByPeriod.set(update.periodId, []);
        }
        updatesByPeriod.get(update.periodId)!.push(update);
      }

      let updatedCount = 0;

      for (const [periodId, periodUpdates] of updatesByPeriod.entries()) {
        const period = periodMap.get(periodId)!;

        // Find or create budget header
        let budget = await manager.findOne(BudgetEntity, {
          where: { userId, periodId },
          relations: ['items'],
        });

        if (!budget) {
          budget = manager.create(BudgetEntity, {
            userId,
            periodId,
            name: period.name,
            items: [],
          });
          budget = await manager.save(BudgetEntity, budget);
        }

        const existingItems = budget.items || [];
        const itemMap = new Map<string, BudgetItemEntity>();
        for (const item of existingItems) {
          const subKey = item.subRowId || '__default__';
          itemMap.set(`${item.accountId}_${subKey}`, item);
        }

        for (const cell of periodUpdates) {
          const subKey = cell.subRowId || '__default__';
          let item = itemMap.get(`${cell.accountId}_${subKey}`);
          if (cell.isDeleted) {
            if (item) {
              await manager.remove(BudgetItemEntity, item);
              itemMap.delete(`${cell.accountId}_${subKey}`);
              updatedCount++;
            }
            continue;
          }

          if (item) {
            item.amount = cell.amount;
            if (cell.subRowLabel !== undefined) {
              item.subRowLabel = cell.subRowLabel;
            }
            if (cell.cashFlowDirection !== undefined) {
              item.cashFlowDirection = cell.cashFlowDirection;
            }
            if (cell.flowIntention !== undefined) {
              item.flowIntention = cell.flowIntention;
            }
          } else {
            item = manager.create(BudgetItemEntity, {
              budgetId: budget.id,
              accountId: cell.accountId,
              subRowId: cell.subRowId ?? null,
              subRowLabel: cell.subRowLabel ?? null,
              amount: cell.amount,
              cashFlowDirection: cell.cashFlowDirection ?? null,
              flowIntention: cell.flowIntention ?? null,
            });
          }
          await manager.save(BudgetItemEntity, item);
          itemMap.set(`${cell.accountId}_${subKey}`, item);
          updatedCount++;
        }
      }

      return {
        success: true,
        updatedCount,
      };
    });
  }
}
