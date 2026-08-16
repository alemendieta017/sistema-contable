import { Injectable, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import {
  AuthErrorCode,
  DangerZoneAction,
  DangerZoneResponse,
  DEFAULT_STARTER_ACCOUNTS,
} from '@sistema-contable/shared';
import { UserEntity } from '../../infrastructure/database/entities/user.entity';
import { AccountEntity } from '../../infrastructure/database/entities/account.entity';
import { TransactionEntity } from '../../infrastructure/database/entities/transaction.entity';
import { JournalEntryEntity } from '../../infrastructure/database/entities/journal-entry.entity';
import { FiscalYearEntity } from '../../infrastructure/database/entities/fiscal-year.entity';
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
      throw new UnauthorizedException({
        code: AuthErrorCode.INVALID_CURRENT_PASSWORD,
        message: 'Contraseña actual incorrecta',
      });
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

      // 5. Delete user's periods and fiscal years
      const userFiscalYears = await manager.find(FiscalYearEntity, { where: { userId } });
      const fyIds = userFiscalYears.map((fy) => fy.id);
      if (fyIds.length > 0) {
        await manager
          .createQueryBuilder()
          .delete()
          .from(PeriodEntity)
          .where('fiscal_year_id IN (:...fyIds)', { fyIds })
          .execute();
        await manager.delete(FiscalYearEntity, { userId });
      }

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

      // 7. Re-seed default starter accounts
      const baseCurrency =
        (await manager.findOne(CurrencyEntity, { where: { isBase: true } })) ||
        (await manager.findOne(CurrencyEntity, { where: {} }));

      const currencyId = baseCurrency ? baseCurrency.id : undefined;

      for (const item of DEFAULT_STARTER_ACCOUNTS) {
        const account = manager.create(AccountEntity, {
          userId,
          name: item.name,
          type: item.type,
          currencyId,
          status: 'ACTIVE',
          isCashOrBank: !!item.isCashOrBank,
          systemRole: item.systemRole || null,
          metadata: null,
          parentId: null,
        });
        await manager.save(AccountEntity, account);
      }

      // 8. Re-seed current Fiscal Year, 12 monthly periods, and 12 empty budgets
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

      const fyEntity = manager.create(FiscalYearEntity, {
        userId,
        name: `Ejercicio ${currentYear}`,
        startDate: `${currentYear}-01-01`,
        endDate: `${currentYear}-12-31`,
        status: 'OPEN',
      });
      const savedFy = await manager.save(FiscalYearEntity, fyEntity);

      for (let m = 0; m < 12; m++) {
        const pStart = `${currentYear}-${String(m + 1).padStart(2, '0')}-01`;
        const pEnd = new Date(Date.UTC(currentYear, m + 1, 0)).toISOString().split('T')[0];
        const periodName = `${currentYear}-${String(m + 1).padStart(2, '0')}`;

        const periodEntity = manager.create(PeriodEntity, {
          fiscalYearId: savedFy.id,
          name: periodName,
          startDate: pStart,
          endDate: pEnd,
          status: 'OPEN',
        });
        const savedPeriod = await manager.save(PeriodEntity, periodEntity);

        const budgetFriendlyName = `${friendlyMonthNames[m]} ${currentYear}`;
        const budgetEntity = manager.create(BudgetEntity, {
          userId,
          periodId: savedPeriod.id,
          name: budgetFriendlyName,
        });
        await manager.save(BudgetEntity, budgetEntity);
      }
    });

    return {
      success: true,
      message: 'Todos los datos contables han sido restablecidos de fábrica con éxito.',
      action: DangerZoneAction.FACTORY_RESET,
      timestamp: new Date().toISOString(),
    };
  }
}
