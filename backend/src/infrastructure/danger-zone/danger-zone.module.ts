import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from '../database/entities/user.entity';
import { AccountEntity } from '../database/entities/account.entity';
import { TransactionEntity } from '../database/entities/transaction.entity';
import { JournalEntryEntity } from '../database/entities/journal-entry.entity';
import { PeriodEntity } from '../database/entities/period.entity';
import { AccountPeriodBalanceEntity } from '../database/entities/account-period-balance.entity';
import { BudgetEntity } from '../database/entities/budget.entity';
import { BudgetItemEntity } from '../database/entities/budget-item.entity';
import { BudgetReassignmentEntity } from '../database/entities/budget-reassignment.entity';
import { PasswordResetTokenEntity } from '../database/entities/password-reset-token.entity';
import { CurrencyEntity } from '../database/entities/currency.entity';
import { AuthModule } from '../auth/auth.module';
import { DangerZoneController } from '../controllers/danger-zone.controller';
import { FactoryResetUseCase } from '../../application/danger-zone/factory-reset.use-case';
import { DeleteUserAccountUseCase } from '../../application/danger-zone/delete-account.use-case';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserEntity,
      AccountEntity,
      TransactionEntity,
      JournalEntryEntity,
      PeriodEntity,
      AccountPeriodBalanceEntity,
      BudgetEntity,
      BudgetItemEntity,
      BudgetReassignmentEntity,
      PasswordResetTokenEntity,
      CurrencyEntity,
    ]),
    AuthModule,
  ],
  controllers: [DangerZoneController],
  providers: [FactoryResetUseCase, DeleteUserAccountUseCase],
  exports: [FactoryResetUseCase, DeleteUserAccountUseCase],
})
export class DangerZoneModule {}
