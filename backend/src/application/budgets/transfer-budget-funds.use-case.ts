import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { PeriodEntity } from '../../infrastructure/database/entities/period.entity';
import { BudgetEntity } from '../../infrastructure/database/entities/budget.entity';
import { BudgetItemEntity } from '../../infrastructure/database/entities/budget-item.entity';
import { BudgetReassignmentEntity } from '../../infrastructure/database/entities/budget-reassignment.entity';
import { AccountEntity } from '../../infrastructure/database/entities/account.entity';
import { JournalEntryEntity } from '../../infrastructure/database/entities/journal-entry.entity';
import {
  TransferBudgetFundsRequest,
  TransferBudgetFundsResponse,
  CashFlowDirection,
} from '@sistema-contable/shared';

@Injectable()
export class TransferBudgetFundsUseCase {
  constructor(private readonly dataSource: DataSource) {}

  async execute(
    userId: string,
    dto: TransferBudgetFundsRequest,
  ): Promise<TransferBudgetFundsResponse> {
    const { periodId, sourceAccountId, targetAccountId, amount, reason } = dto;

    if (sourceAccountId === targetAccountId) {
      throw new BadRequestException('La cuenta origen y la cuenta destino no pueden ser la misma.');
    }

    if (amount <= 0) {
      throw new BadRequestException('El monto a transferir debe ser mayor a cero.');
    }

    return this.dataSource.transaction(async (manager) => {
      const period = await manager.findOne(PeriodEntity, {
        where: { id: periodId },
      });

      if (!period) {
        throw new NotFoundException(`Period with ID '${periodId}' not found.`);
      }

      // Fetch source and target account entities
      const sourceAccount = await manager.findOne(AccountEntity, {
        where: { id: sourceAccountId, userId },
      });
      if (!sourceAccount) {
        throw new NotFoundException(
          `Source account with ID '${sourceAccountId}' not found or not owned by user.`,
        );
      }

      const targetAccount = await manager.findOne(AccountEntity, {
        where: { id: targetAccountId, userId },
      });
      if (!targetAccount) {
        throw new NotFoundException(
          `Target account with ID '${targetAccountId}' not found or not owned by user.`,
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

      // Determine flow directions for source and target
      const getAccountDirection = (
        acc: AccountEntity,
        item?: BudgetItemEntity,
      ): CashFlowDirection => {
        if (item?.cashFlowDirection) {
          return item.cashFlowDirection;
        }
        if (acc.type === 'INCOME') {
          return CashFlowDirection.INGRESO_EFECTIVO;
        }
        if (acc.type === 'EXPENSE') {
          return CashFlowDirection.EGRESO_EFECTIVO;
        }
        // Assets / Liabilities default to EGRESO_EFECTIVO (Salida: Aportes / Pagos)
        return CashFlowDirection.EGRESO_EFECTIVO;
      };

      const sourceDirection = getAccountDirection(sourceAccount, sourceItem);
      const targetDirection = getAccountDirection(targetAccount, targetItem);

      if (sourceDirection !== targetDirection) {
        throw new BadRequestException(
          'No se pueden transferir fondos entre cuentas con diferente dirección de flujo de caja (Salida vs Entrada)',
        );
      }

      const sourceBudgeted = sourceItem ? Number(sourceItem.amount) : 0;

      // Query executed amount for source account in this period
      const sourceEntries = await manager
        .createQueryBuilder(JournalEntryEntity, 'entry')
        .innerJoinAndSelect('entry.transaction', 'tx')
        .where('entry.account_id = :accountId', { accountId: sourceAccountId })
        .andWhere('tx.accounting_date >= :startDate', { startDate: period.startDate })
        .andWhere('tx.accounting_date <= :endDate', { endDate: period.endDate })
        .getMany();

      let sourceDebits = 0;
      let sourceCredits = 0;
      for (const entry of sourceEntries) {
        if (entry.entryType === 'DEBIT') {
          sourceDebits += Number(entry.amount);
        } else {
          sourceCredits += Number(entry.amount);
        }
      }

      let sourceExecuted = 0;
      if (sourceDirection === CashFlowDirection.EGRESO_EFECTIVO) {
        if (sourceAccount.type === 'EXPENSE') {
          sourceExecuted = Math.max(0, sourceDebits - sourceCredits);
        } else {
          sourceExecuted = Math.max(0, sourceDebits);
        }
      } else {
        if (sourceAccount.type === 'INCOME') {
          sourceExecuted = Math.max(0, sourceCredits - sourceDebits);
        } else {
          sourceExecuted = Math.max(0, sourceCredits);
        }
      }

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
          cashFlowDirection: sourceDirection,
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
          cashFlowDirection: targetDirection,
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
