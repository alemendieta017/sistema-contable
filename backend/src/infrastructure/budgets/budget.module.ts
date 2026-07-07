import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BudgetEntity } from '../database/entities/budget.entity';
import { JournalEntryEntity } from '../database/entities/journal-entry.entity';
import { BudgetItemEntity } from '../database/entities/budget-item.entity';
import { PeriodEntity } from '../database/entities/period.entity';
import { AccountEntity } from '../database/entities/account.entity';
import { GetBudgetsSummaryUseCase } from '../../application/budgets/get-budgets-summary.use-case';
import { GetBudgetDetailUseCase } from '../../application/budgets/get-budget-detail.use-case';
import { UpdateBudgetItemsUseCase } from '../../application/budgets/update-budget-items.use-case';
import { ReplicateBudgetItemUseCase } from '../../application/budgets/replicate-budget-item.use-case';
import { GetBudgetExecutionUseCase } from '../../application/budgets/get-budget-execution.use-case';
import { BudgetController } from '../controllers/budget.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BudgetEntity,
      JournalEntryEntity,
      BudgetItemEntity,
      PeriodEntity,
      AccountEntity,
    ]),
    AuthModule,
  ],
  providers: [
    GetBudgetsSummaryUseCase,
    GetBudgetDetailUseCase,
    UpdateBudgetItemsUseCase,
    ReplicateBudgetItemUseCase,
    GetBudgetExecutionUseCase,
  ],
  controllers: [BudgetController],
  exports: [
    GetBudgetsSummaryUseCase,
    GetBudgetDetailUseCase,
    UpdateBudgetItemsUseCase,
    ReplicateBudgetItemUseCase,
    GetBudgetExecutionUseCase,
  ],
})
export class BudgetModule {}

