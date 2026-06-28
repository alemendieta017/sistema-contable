import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransactionEntity } from '../database/entities/transaction.entity';
import { AccountEntity } from '../database/entities/account.entity';
import { JournalEntryEntity } from '../database/entities/journal-entry.entity';
import { CurrencyEntity } from '../database/entities/currency.entity';
import { CreateTransactionUseCase } from '../../application/ledger/create-transaction.use-case';
import { ReverseTransactionUseCase } from '../../application/ledger/reverse-transaction.use-case';
import { GetAccountsSummaryUseCase } from '../../application/accounts/get-accounts-summary.use-case';
import { DeleteAccountUseCase } from '../../application/accounts/delete-account.use-case';
import { LedgerController } from '../controllers/ledger.controller';
import { AccountController } from '../controllers/account.controller';
import { CurrencyController } from '../controllers/currency.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TransactionEntity,
      AccountEntity,
      JournalEntryEntity,
      CurrencyEntity,
    ]),
    AuthModule,
  ],
  providers: [
    CreateTransactionUseCase,
    ReverseTransactionUseCase,
    GetAccountsSummaryUseCase,
    DeleteAccountUseCase,
  ],
  controllers: [LedgerController, AccountController, CurrencyController],
  exports: [
    CreateTransactionUseCase,
    ReverseTransactionUseCase,
    GetAccountsSummaryUseCase,
    DeleteAccountUseCase,
  ],
})
export class LedgerModule {}
