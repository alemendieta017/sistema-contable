import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { PeriodEntity } from '../../infrastructure/database/entities/period.entity';
import { BudgetEntity } from '../../infrastructure/database/entities/budget.entity';
import { BudgetItemEntity } from '../../infrastructure/database/entities/budget-item.entity';
import { BudgetReassignmentEntity } from '../../infrastructure/database/entities/budget-reassignment.entity';
import { JournalEntryEntity } from '../../infrastructure/database/entities/journal-entry.entity';
import { TransferBudgetFundsRequest } from '@sistema-contable/shared';

@Injectable()
export class TransferBudgetFundsUseCase {
  constructor(private readonly dataSource: DataSource) {}

  async execute(
    userId: string,
    dto: TransferBudgetFundsRequest,
  ): Promise<{
    success: boolean;
    reassignmentId: string;
    updatedSourceAvailable: number;
    updatedTargetAvailable: number;
  }> {
    const { periodId, sourceAccountId, targetAccountId, amount, reason } = dto;

    if (sourceAccountId === targetAccountId) {
      throw new BadRequestException('Source account and target account cannot be the same.');
    }

    if (amount <= 0) {
      throw new BadRequestException('Transfer amount must be positive.');
    }

    return this.dataSource.transaction(async (manager) => {
      const period = await manager.findOne(PeriodEntity, {
        where: { id: periodId },
      });

      if (!period) {
        throw new NotFoundException(`Period with ID '${periodId}' not found.`);
      }

      if (period.status === 'CLOSED') {
        throw new BadRequestException(
          `Cannot transfer budget funds in a closed period '${period.name}'.`,
        );
      }

      // Fetch or create budget header
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

      const items = budget.items || [];
      let sourceItem = items.find((i) => i.accountId === sourceAccountId);
      let targetItem = items.find((i) => i.accountId === targetAccountId);

      const sourceBudgeted = sourceItem ? Number(sourceItem.amount) : 0;

      // Query executed amount for source account in period
      const sourceEntries = await manager
        .createQueryBuilder(JournalEntryEntity, 'entry')
        .innerJoinAndSelect('entry.transaction', 'tx')
        .where('entry.account_id = :accountId', { accountId: sourceAccountId })
        .andWhere('tx.accounting_date >= :startDate', { startDate: period.startDate })
        .andWhere('tx.accounting_date <= :endDate', { endDate: period.endDate })
        .getMany();

      let sourceExecuted = 0;
      for (const entry of sourceEntries) {
        const amt = entry.entryType === 'DEBIT' ? Number(entry.amount) : -Number(entry.amount);
        sourceExecuted += amt;
      }
      sourceExecuted = Math.max(0, sourceExecuted);

      const sourceAvailable = sourceBudgeted - sourceExecuted;

      if (sourceAvailable < amount) {
        throw new BadRequestException(
          `Insufficient available residual budget in source account. Available: ${sourceAvailable}, Requested: ${amount}.`,
        );
      }

      // Perform transfer
      if (sourceItem) {
        sourceItem.amount = sourceBudgeted - amount;
      } else {
        sourceItem = manager.create(BudgetItemEntity, {
          budgetId: budget.id,
          accountId: sourceAccountId,
          amount: Math.max(0, sourceBudgeted - amount),
        });
      }
      await manager.save(BudgetItemEntity, sourceItem);

      const targetBudgeted = targetItem ? Number(targetItem.amount) : 0;
      if (targetItem) {
        targetItem.amount = targetBudgeted + amount;
      } else {
        targetItem = manager.create(BudgetItemEntity, {
          budgetId: budget.id,
          accountId: targetAccountId,
          amount: targetBudgeted + amount,
        });
      }
      await manager.save(BudgetItemEntity, targetItem);

      // Create audit log
      const reassignment = manager.create(BudgetReassignmentEntity, {
        userId,
        periodId,
        sourceAccountId,
        targetAccountId,
        amount,
        reason: reason || null,
      });

      const savedReassignment = await manager.save(BudgetReassignmentEntity, reassignment);

      return {
        success: true,
        reassignmentId: savedReassignment.id,
        updatedSourceAvailable: sourceAvailable - amount,
        updatedTargetAvailable: targetItem.amount || 0,
      };
    });
  }
}
