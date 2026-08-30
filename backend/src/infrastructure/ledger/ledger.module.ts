import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransactionEntity } from '../database/entities/transaction.entity';
import { AccountEntity } from '../database/entities/account.entity';
import { JournalEntryEntity } from '../database/entities/journal-entry.entity';
import { CurrencyEntity } from '../database/entities/currency.entity';
import { PeriodEntity } from '../database/entities/period.entity';
import { AccountPeriodBalanceEntity } from '../database/entities/account-period-balance.entity';
import { BudgetEntity } from '../database/entities/budget.entity';
import { CreateTransactionUseCase } from '../../application/ledger/create-transaction.use-case';
import { UpdateTransactionUseCase } from '../../application/ledger/update-transaction.use-case';
import { DeleteTransactionUseCase } from '../../application/ledger/delete-transaction.use-case';
import { ReverseTransactionUseCase } from '../../application/ledger/reverse-transaction.use-case';
import { GetAccountsSummaryUseCase } from '../../application/accounts/get-accounts-summary.use-case';
import { DeleteAccountUseCase } from '../../application/accounts/delete-account.use-case';
import { UpdateAccountUseCase } from '../../application/accounts/update-account.use-case';
import { UpdatePeriodUseCase } from '../../application/periods/update-period.use-case';
import { BalanceUpdateService } from '../../application/periods/balance-update.service';
import { EnsurePeriodService } from '../../application/periods/ensure-period.service';
import { LedgerController } from '../controllers/ledger.controller';
import { AccountController } from '../controllers/account.controller';
import { CurrencyController } from '../controllers/currency.controller';
import { PeriodController } from '../controllers/period.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TransactionEntity,
      AccountEntity,
      JournalEntryEntity,
      CurrencyEntity,
      PeriodEntity,
      AccountPeriodBalanceEntity,
      BudgetEntity,
    ]),
    AuthModule,
  ],
  providers: [
    CreateTransactionUseCase,
    UpdateTransactionUseCase,
    DeleteTransactionUseCase,
    ReverseTransactionUseCase,
    GetAccountsSummaryUseCase,
    DeleteAccountUseCase,
    UpdateAccountUseCase,
    UpdatePeriodUseCase,
    BalanceUpdateService,
    EnsurePeriodService,
  ],
  controllers: [LedgerController, AccountController, CurrencyController, PeriodController],
  exports: [
    CreateTransactionUseCase,
    UpdateTransactionUseCase,
    DeleteTransactionUseCase,
    ReverseTransactionUseCase,
    GetAccountsSummaryUseCase,
    DeleteAccountUseCase,
    UpdateAccountUseCase,
    UpdatePeriodUseCase,
    BalanceUpdateService,
    EnsurePeriodService,
  ],
})
export class LedgerModule {}
