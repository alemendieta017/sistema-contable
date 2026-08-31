import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AccountEntity } from '../database/entities/account.entity';
import { CurrencyEntity } from '../database/entities/currency.entity';
import { TransactionEntity } from '../database/entities/transaction.entity';
import { JournalEntryEntity } from '../database/entities/journal-entry.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { UserEntity } from '../database/entities/user.entity';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { AdjustAccountBalanceDto } from './dto/adjust-account-balance.dto';
import { GetAccountsSummaryUseCase } from '../../application/accounts/get-accounts-summary.use-case';
import { DeleteAccountUseCase } from '../../application/accounts/delete-account.use-case';
import { UpdateAccountUseCase } from '../../application/accounts/update-account.use-case';
import { AdjustAccountBalanceUseCase } from '../../application/accounts/adjust-account-balance.use-case';
import { BalanceUpdateService } from '../../application/periods/balance-update.service';
import { EnsurePeriodService } from '../../application/periods/ensure-period.service';

@Controller('api/accounts')
@UseGuards(JwtAuthGuard)
export class AccountController {
  constructor(
    @InjectRepository(AccountEntity)
    private readonly accountRepository: Repository<AccountEntity>,
    private readonly getAccountsSummaryUseCase: GetAccountsSummaryUseCase,
    private readonly deleteAccountUseCase: DeleteAccountUseCase,
    private readonly updateAccountUseCase: UpdateAccountUseCase,
    private readonly adjustAccountBalanceUseCase: AdjustAccountBalanceUseCase,
    private readonly balanceUpdateService: BalanceUpdateService,
    private readonly ensurePeriodService: EnsurePeriodService,
  ) {}

  @Get()
  async list(@CurrentUser() user: UserEntity, @Query('status') status?: string) {
    const where: any = { userId: user.id };
    if (status === 'INACTIVE') {
      where.status = 'INACTIVE';
    } else if (status === 'ALL') {
      // no status filter
    } else {
      where.status = 'ACTIVE';
    }

    return this.accountRepository.find({
      where,
      relations: ['currency'],
      order: { name: 'ASC' },
    });
  }

  @Get('summary')
  async summary(@CurrentUser() user: UserEntity) {
    return this.getAccountsSummaryUseCase.execute(user.id);
  }

  @Post()
  async create(@CurrentUser() user: UserEntity, @Body() body: CreateAccountDto) {
    return this.accountRepository.manager.transaction('SERIALIZABLE', async (entityManager) => {
      let currencyId = body.currencyId;
      if (!currencyId || currencyId === '00000000-0000-0000-0000-000000000000') {
        const currency =
          (await entityManager.findOne(CurrencyEntity, { where: { isBase: true } })) ||
          (await entityManager.findOne(CurrencyEntity, { where: {} }));
        if (currency) {
          currencyId = currency.id;
        }
      }

      const account = entityManager.create(AccountEntity, {
        userId: user.id,
        name: body.name,
        type: body.type,
        currencyId,
        parentId: body.parentId,
        metadata: body.metadata,
        systemRole: body.systemRole || null,
        status: 'ACTIVE',
      });
      const savedAccount = await entityManager.save(AccountEntity, account);

      if (body.initialBalance && body.initialBalance !== 0) {
        const initialAmt = Number(body.initialBalance);
        const absAmt = Math.abs(initialAmt);
        const currency = await entityManager.findOne(CurrencyEntity, { where: { id: currencyId } });
        const rateAtDate = Number(currency?.rateToBase ?? 1.0);
        const amountBase = Number((absAmt * rateAtDate).toFixed(4));
        const today = new Date().toISOString().substring(0, 10);

        await this.ensurePeriodService.ensurePeriod(entityManager, user.id, today.substring(0, 7));

        let capitalAccount = await entityManager.findOne(AccountEntity, {
          where: { userId: user.id, systemRole: 'CAPITAL' },
          lock: { mode: 'pessimistic_write' },
        });
        if (!capitalAccount) {
          capitalAccount = await entityManager.findOne(AccountEntity, {
            where: { userId: user.id, name: 'Capital', type: 'EQUITY' },
            lock: { mode: 'pessimistic_write' },
          });
        }

        if (capitalAccount) {
          const isDebitNature = savedAccount.type === 'ASSET' || savedAccount.type === 'EXPENSE';
          let targetEntryType: 'DEBIT' | 'CREDIT';
          let counterpartEntryType: 'DEBIT' | 'CREDIT';

          if (isDebitNature) {
            if (initialAmt > 0) {
              targetEntryType = 'DEBIT';
              counterpartEntryType = 'CREDIT';
            } else {
              targetEntryType = 'CREDIT';
              counterpartEntryType = 'DEBIT';
            }
          } else {
            if (initialAmt > 0) {
              targetEntryType = 'CREDIT';
              counterpartEntryType = 'DEBIT';
            } else {
              targetEntryType = 'DEBIT';
              counterpartEntryType = 'CREDIT';
            }
          }

          const txEntity = entityManager.create(TransactionEntity, {
            userId: user.id,
            accountingDate: today,
            description: `Saldo inicial: ${savedAccount.name}`,
            status: 'POSTED',
          });
          const savedTx = await entityManager.save(TransactionEntity, txEntity);

          const targetEntry = entityManager.create(JournalEntryEntity, {
            transactionId: savedTx.id,
            accountId: savedAccount.id,
            entryType: targetEntryType,
            amount: absAmt,
            amountBase,
            rateAtDate,
          });

          const counterpartEntry = entityManager.create(JournalEntryEntity, {
            transactionId: savedTx.id,
            accountId: capitalAccount.id,
            entryType: counterpartEntryType,
            amount: absAmt,
            amountBase,
            rateAtDate,
          });

          await entityManager.save(JournalEntryEntity, [targetEntry, counterpartEntry]);

          const balanceChanges = [
            {
              accountId: savedAccount.id,
              debitDiff: targetEntryType === 'DEBIT' ? amountBase : 0,
              creditDiff: targetEntryType === 'CREDIT' ? amountBase : 0,
            },
            {
              accountId: capitalAccount.id,
              debitDiff: counterpartEntryType === 'DEBIT' ? amountBase : 0,
              creditDiff: counterpartEntryType === 'CREDIT' ? amountBase : 0,
            },
          ];

          await this.balanceUpdateService.updateBalances(
            entityManager,
            user.id,
            today,
            balanceChanges,
          );
        }
      }

      return savedAccount;
    });
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: UserEntity,
    @Param('id') id: string,
    @Body() body: UpdateAccountDto,
  ) {
    return this.updateAccountUseCase.execute(user.id, id, body);
  }

  @Post(':id/adjust-balance')
  async adjustBalance(
    @CurrentUser() user: UserEntity,
    @Param('id') id: string,
    @Body() body: AdjustAccountBalanceDto,
  ) {
    return this.adjustAccountBalanceUseCase.execute(user.id, id, body);
  }

  @Delete(':id')
  async delete(@CurrentUser() user: UserEntity, @Param('id') id: string) {
    return this.deleteAccountUseCase.execute(user.id, id);
  }
}
