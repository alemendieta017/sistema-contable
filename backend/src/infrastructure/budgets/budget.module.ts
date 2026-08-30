import { Module, forwardRef } from '@nestjs/common';
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
import { CopyPreviousBudgetUseCase } from '../../application/budgets/copy-previous-budget.use-case';
import { GetBudgetMatrixUseCase } from '../../application/budgets/get-budget-matrix.use-case';
import { UpdateBudgetMatrixUseCase } from '../../application/budgets/update-budget-matrix.use-case';
import { ExtendBudgetMatrixUseCase } from '../../application/budgets/extend-budget-matrix.use-case';
import { DeleteBudgetMatrixRowUseCase } from '../../application/budgets/delete-budget-matrix-row.use-case';
import { ApplyBudgetDriverUseCase } from '../../application/budgets/apply-budget-driver.use-case';
import { GetPriorYearActualsUseCase } from '../../application/budgets/get-prior-year-actuals.use-case';
import { GetBudgetControlUseCase } from '../../application/budgets/get-budget-control.use-case';
import { TransferBudgetFundsUseCase } from '../../application/budgets/transfer-budget-funds.use-case';
import { BudgetReassignmentEntity } from '../database/entities/budget-reassignment.entity';
import { BudgetController } from '../controllers/budget.controller';
import { AuthModule } from '../auth/auth.module';
import { LedgerModule } from '../ledger/ledger.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BudgetEntity,
      JournalEntryEntity,
      BudgetItemEntity,
      PeriodEntity,
      AccountEntity,
      BudgetReassignmentEntity,
    ]),
    AuthModule,
    forwardRef(() => LedgerModule),
  ],
  providers: [
    GetBudgetsSummaryUseCase,
    GetBudgetDetailUseCase,
    UpdateBudgetItemsUseCase,
    ReplicateBudgetItemUseCase,
    GetBudgetExecutionUseCase,
    CopyPreviousBudgetUseCase,
    GetBudgetMatrixUseCase,
    UpdateBudgetMatrixUseCase,
    ExtendBudgetMatrixUseCase,
    DeleteBudgetMatrixRowUseCase,
    ApplyBudgetDriverUseCase,
    GetPriorYearActualsUseCase,
    GetBudgetControlUseCase,
    TransferBudgetFundsUseCase,
  ],
  controllers: [BudgetController],
  exports: [
    GetBudgetsSummaryUseCase,
    GetBudgetDetailUseCase,
    UpdateBudgetItemsUseCase,
    ReplicateBudgetItemUseCase,
    GetBudgetExecutionUseCase,
    CopyPreviousBudgetUseCase,
    GetBudgetMatrixUseCase,
    UpdateBudgetMatrixUseCase,
    ExtendBudgetMatrixUseCase,
    DeleteBudgetMatrixRowUseCase,
    ApplyBudgetDriverUseCase,
    GetPriorYearActualsUseCase,
    GetBudgetControlUseCase,
    TransferBudgetFundsUseCase,
  ],
})
export class BudgetModule {}
