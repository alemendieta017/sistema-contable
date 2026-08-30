import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { EnsurePeriodService } from '../periods/ensure-period.service';
import { PeriodEntity } from '../../infrastructure/database/entities/period.entity';
import { BudgetEntity } from '../../infrastructure/database/entities/budget.entity';
import { BudgetItemEntity } from '../../infrastructure/database/entities/budget-item.entity';
import {
  ExtendBudgetMatrixRequest,
  ExtendBudgetMatrixResponse,
  ExtendBudgetMatrixRequestSchema,
} from '@sistema-contable/shared';

@Injectable()
export class ExtendBudgetMatrixUseCase {
  constructor(
    private readonly dataSource: DataSource,
    private readonly ensurePeriodService: EnsurePeriodService,
  ) {}

  private getPreviousMonth(period: string): string {
    const [year, month] = period.split('-').map(Number);
    if (month === 1) {
      return `${year - 1}-12`;
    }
    return `${year}-${String(month - 1).padStart(2, '0')}`;
  }

  async execute(
    userId: string,
    dto: ExtendBudgetMatrixRequest,
  ): Promise<ExtendBudgetMatrixResponse> {
    const parsed = ExtendBudgetMatrixRequestSchema.parse(dto);
    const { targetPeriod, copyFromPrevious = true } = parsed;

    return this.dataSource.transaction(async (manager) => {
      // 1. Ensure target period and any intervening gaps are provisioned atomically
      const periodEntity = await this.ensurePeriodService.ensurePeriod(
        manager,
        userId,
        targetPeriod,
      );

      let itemsCopied = 0;

      // 2. If copyFromPrevious is enabled, copy budget items from targetPeriod - 1 month
      if (copyFromPrevious) {
        const prevMonthStr = this.getPreviousMonth(targetPeriod);
        const prevPeriod = await manager.findOne(PeriodEntity, {
          where: { userId, name: prevMonthStr },
        });

        if (prevPeriod) {
          const prevBudget = await manager.findOne(BudgetEntity, {
            where: { userId, periodId: prevPeriod.id },
            relations: ['items'],
          });

          if (prevBudget && prevBudget.items && prevBudget.items.length > 0) {
            let targetBudget = await manager.findOne(BudgetEntity, {
              where: { userId, periodId: periodEntity.id },
              relations: ['items'],
            });

            if (!targetBudget) {
              targetBudget = manager.create(BudgetEntity, {
                userId,
                periodId: periodEntity.id,
                name: periodEntity.name,
                items: [],
              });
              targetBudget = await manager.save(BudgetEntity, targetBudget);
            }

            const existingItems = targetBudget.items || [];
            const existingKeys = new Set(
              existingItems.map((item) => `${item.accountId}_${item.subRowId || '__default__'}`),
            );

            const itemsToSave: BudgetItemEntity[] = [];

            for (const prevItem of prevBudget.items) {
              const itemKey = `${prevItem.accountId}_${prevItem.subRowId || '__default__'}`;
              if (!existingKeys.has(itemKey)) {
                const newItem = manager.create(BudgetItemEntity, {
                  budgetId: targetBudget.id,
                  accountId: prevItem.accountId,
                  subRowId: prevItem.subRowId,
                  subRowLabel: prevItem.subRowLabel,
                  amount: prevItem.amount,
                  cashFlowDirection: prevItem.cashFlowDirection,
                  flowIntention: prevItem.flowIntention,
                });
                itemsToSave.push(newItem);
                existingKeys.add(itemKey);
              }
            }

            if (itemsToSave.length > 0) {
              await manager.save(BudgetItemEntity, itemsToSave);
              itemsCopied = itemsToSave.length;
            }
          }
        }
      }

      return {
        success: true,
        provisionedPeriod: {
          id: periodEntity.id,
          name: periodEntity.name,
          startDate: periodEntity.startDate,
          endDate: periodEntity.endDate,
          status: periodEntity.status,
        },
        itemsCopied,
      };
    });
  }
}
