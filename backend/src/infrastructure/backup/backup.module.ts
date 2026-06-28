import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountEntity } from '../database/entities/account.entity';
import { TransactionEntity } from '../database/entities/transaction.entity';
import { JournalEntryEntity } from '../database/entities/journal-entry.entity';
import { BudgetEntity } from '../database/entities/budget.entity';
import { CurrencyEntity } from '../database/entities/currency.entity';
import { BackupService } from '../../application/backup/backup.service';
import { BackupController } from '../controllers/backup.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AccountEntity,
      TransactionEntity,
      JournalEntryEntity,
      BudgetEntity,
      CurrencyEntity,
    ]),
    AuthModule,
  ],
  providers: [BackupService],
  controllers: [BackupController],
  exports: [BackupService],
})
export class BackupModule {}
