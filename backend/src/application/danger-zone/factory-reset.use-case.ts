import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import {
  DangerZoneAction,
  DangerZoneResponse,
  DEFAULT_STARTER_ACCOUNTS,
} from '@sistema-contable/shared';
import { InvalidCurrentPasswordException } from '../../domain/exceptions/auth.exception';
import { UserEntity } from '../../infrastructure/database/entities/user.entity';
import { AccountEntity } from '../../infrastructure/database/entities/account.entity';
import { TransactionEntity } from '../../infrastructure/database/entities/transaction.entity';
import { JournalEntryEntity } from '../../infrastructure/database/entities/journal-entry.entity';
import { PeriodEntity } from '../../infrastructure/database/entities/period.entity';
import { AccountPeriodBalanceEntity } from '../../infrastructure/database/entities/account-period-balance.entity';
import { BudgetEntity } from '../../infrastructure/database/entities/budget.entity';
import { BudgetItemEntity } from '../../infrastructure/database/entities/budget-item.entity';
import { BudgetReassignmentEntity } from '../../infrastructure/database/entities/budget-reassignment.entity';
import { CurrencyEntity } from '../../infrastructure/database/entities/currency.entity';
import { FactoryResetDto } from '../../infrastructure/controllers/dto/danger-zone.dto';

@Injectable()
export class FactoryResetUseCase {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async execute(userOrId: UserEntity | string, dto: FactoryResetDto): Promise<DangerZoneResponse> {
    const userId = typeof userOrId === 'string' ? userOrId : userOrId.id;
    let passwordHash =
      typeof userOrId === 'object' && userOrId.passwordHash ? userOrId.passwordHash : null;

    if (!passwordHash) {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) {
        throw new NotFoundException('Usuario no encontrado');
      }
      passwordHash = user.passwordHash;
    }

    const isMatch = await bcrypt.compare(dto.currentPassword, passwordHash);
    if (!isMatch) {
      throw new InvalidCurrentPasswordException();
    }

    await this.dataSource.transaction('SERIALIZABLE', async (manager) => {
      // 1. Delete user's budget reassignments
      await manager.delete(BudgetReassignmentEntity, { userId });

      // 2. Cascade delete user's budgets and budget items
      const userBudgets = await manager.find(BudgetEntity, { where: { userId } });
      const budgetIds = userBudgets.map((b) => b.id);
      if (budgetIds.length > 0) {
        await manager
          .createQueryBuilder()
          .delete()
          .from(BudgetItemEntity)
          .where('budget_id IN (:...budgetIds)', { budgetIds })
          .execute();
        await manager.delete(BudgetEntity, { userId });
      }

      // 3. Delete user's account period balances
      const userAccounts = await manager.find(AccountEntity, { where: { userId } });
      const accountIds = userAccounts.map((a) => a.id);
      if (accountIds.length > 0) {
        await manager
          .createQueryBuilder()
          .delete()
          .from(AccountPeriodBalanceEntity)
          .where('account_id IN (:...accountIds)', { accountIds })
          .execute();
      }

      // 4. Delete user's journal entries and transactions
      const userTransactions = await manager.find(TransactionEntity, { where: { userId } });
      const txIds = userTransactions.map((t) => t.id);
      if (txIds.length > 0) {
        await manager
          .createQueryBuilder()
          .delete()
          .from(JournalEntryEntity)
          .where('transaction_id IN (:...txIds)', { txIds })
          .execute();
        await manager
          .createQueryBuilder()
          .update(TransactionEntity)
          .set({ reversalOfId: null as any })
          .where('user_id = :userId', { userId })
          .execute();
        await manager.delete(TransactionEntity, { userId });
      }

      // 5. Delete user's periods
      await manager.delete(PeriodEntity, { userId });

      // 6. Delete user's accounts (clear parent_id first to prevent FK cycles)
      if (accountIds.length > 0) {
        await manager
          .createQueryBuilder()
          .update(AccountEntity)
          .set({ parentId: null as any })
          .where('user_id = :userId', { userId })
          .execute();
        await manager.delete(AccountEntity, { userId });
      }

      // 7. Re-seed default starter accounts in batch
      const baseCurrency =
        (await manager.findOne(CurrencyEntity, { where: { isBase: true } })) ||
        (await manager.findOne(CurrencyEntity, { where: {} }));

      const currencyId = baseCurrency ? baseCurrency.id : undefined;

      const starterAccounts = DEFAULT_STARTER_ACCOUNTS.map((item) =>
        manager.create(AccountEntity, {
          userId,
          name: item.name,
          type: item.type,
          currencyId,
          status: 'ACTIVE',
          isCashOrBank: !!item.isCashOrBank,
          systemRole: item.systemRole || null,
          metadata: null,
          parentId: null,
        }),
      );
      await manager.save(AccountEntity, starterAccounts);

      // 8. Re-seed current Fiscal Year, 12 monthly periods, and 12 empty budgets in batch
      const currentYear = new Date().getFullYear();
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

      const periodsToCreate = [];
      for (let m = 0; m < 12; m++) {
        const pStart = `${currentYear}-${String(m + 1).padStart(2, '0')}-01`;
        const pEnd = new Date(Date.UTC(currentYear, m + 1, 0)).toISOString().split('T')[0];
        const periodName = `${currentYear}-${String(m + 1).padStart(2, '0')}`;

        periodsToCreate.push(
          manager.create(PeriodEntity, {
            userId,
            name: periodName,
            startDate: pStart,
            endDate: pEnd,
            status: 'OPEN',
          }),
        );
      }
      const savedPeriods = await manager.save(PeriodEntity, periodsToCreate);

      const budgetsToCreate = (Array.isArray(savedPeriods) ? savedPeriods : []).map(
        (savedPeriod, m) => {
          const budgetFriendlyName = `${friendlyMonthNames[m]} ${currentYear}`;
          return manager.create(BudgetEntity, {
            userId,
            periodId: savedPeriod.id,
            name: budgetFriendlyName,
          });
        },
      );
      await manager.save(BudgetEntity, budgetsToCreate);
    });

    return {
      success: true,
      message: 'Todos los datos contables han sido restablecidos de fábrica con éxito.',
      action: DangerZoneAction.FACTORY_RESET,
      timestamp: new Date().toISOString(),
    };
  }
}
