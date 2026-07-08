import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JournalEntryEntity } from '../database/entities/journal-entry.entity';
import { TransactionEntity } from '../database/entities/transaction.entity';
import { AccountEntity } from '../database/entities/account.entity';
import { PeriodEntity } from '../database/entities/period.entity';
import { FiscalYearEntity } from '../database/entities/fiscal-year.entity';
import { AccountPeriodBalanceEntity } from '../database/entities/account-period-balance.entity';
import { BudgetEntity } from '../database/entities/budget.entity';
import { GetCategoryStatisticsUseCase } from '../../application/reports/get-category-statistics.use-case';
import { ExportExcelService } from '../../application/reports/export-excel.service';
import { ReconstructBalancesUseCase } from '../../application/periods/reconstruct-balances.use-case';
import { BalanceSheetUseCase } from '../../application/periods/balance-sheet.use-case';
import { IncomeStatementUseCase } from '../../application/periods/income-statement.use-case';
import { IncomeStatementForecastUseCase } from '../../application/reports/income-statement-forecast.use-case';
import { CashFlowStatementForecastUseCase } from '../../application/reports/cash-flow-statement.use-case';
import { ReportsController } from '../controllers/reports.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      JournalEntryEntity,
      TransactionEntity,
      AccountEntity,
      PeriodEntity,
      FiscalYearEntity,
      AccountPeriodBalanceEntity,
      BudgetEntity,
    ]),
    AuthModule,
  ],
  providers: [
    GetCategoryStatisticsUseCase,
    ExportExcelService,
    ReconstructBalancesUseCase,
    BalanceSheetUseCase,
    IncomeStatementUseCase,
    IncomeStatementForecastUseCase,
    CashFlowStatementForecastUseCase,
  ],
  controllers: [ReportsController],
  exports: [
    GetCategoryStatisticsUseCase,
    ExportExcelService,
    ReconstructBalancesUseCase,
    BalanceSheetUseCase,
    IncomeStatementUseCase,
    IncomeStatementForecastUseCase,
    CashFlowStatementForecastUseCase,
  ],
})
export class ReportsModule {}
