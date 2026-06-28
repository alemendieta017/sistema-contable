import { Module } from '@nestjs/common';
import { DatabaseModule } from './infrastructure/database/database.module';
import { AuthModule } from './infrastructure/auth/auth.module';
import { LedgerModule } from './infrastructure/ledger/ledger.module';
import { BudgetModule } from './infrastructure/budgets/budget.module';
import { ReportsModule } from './infrastructure/reports/reports.module';
import { BackupModule } from './infrastructure/backup/backup.module';

@Module({
  imports: [DatabaseModule, AuthModule, LedgerModule, BudgetModule, ReportsModule, BackupModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
