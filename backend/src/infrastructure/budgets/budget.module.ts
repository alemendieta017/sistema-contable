import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BudgetEntity } from '../database/entities/budget.entity';
import { JournalEntryEntity } from '../database/entities/journal-entry.entity';
import { GetBudgetsSummaryUseCase } from '../../application/budgets/get-budgets-summary.use-case';
import { BudgetController } from '../controllers/budget.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([BudgetEntity, JournalEntryEntity]),
    AuthModule,
  ],
  providers: [GetBudgetsSummaryUseCase],
  controllers: [BudgetController],
  exports: [GetBudgetsSummaryUseCase],
})
export class BudgetModule {}
