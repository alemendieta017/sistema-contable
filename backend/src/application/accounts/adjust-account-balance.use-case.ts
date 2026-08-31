import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AccountEntity } from '../../infrastructure/database/entities/account.entity';
import { CurrencyEntity } from '../../infrastructure/database/entities/currency.entity';
import { TransactionEntity } from '../../infrastructure/database/entities/transaction.entity';
import { JournalEntryEntity } from '../../infrastructure/database/entities/journal-entry.entity';
import { BalanceUpdateService } from '../periods/balance-update.service';
import { EnsurePeriodService } from '../periods/ensure-period.service';
import { AdjustAccountBalanceDto } from '../../infrastructure/controllers/dto/adjust-account-balance.dto';

@Injectable()
export class AdjustAccountBalanceUseCase {
  constructor(
    private readonly dataSource: DataSource,
    private readonly balanceUpdateService: BalanceUpdateService,
    private readonly ensurePeriodService: EnsurePeriodService,
  ) {}

  async execute(userId: string, accountId: string, dto: AdjustAccountBalanceDto) {
    return this.dataSource.transaction('SERIALIZABLE', async (entityManager) => {
      // 1. Fetch account with pessimistic lock
      const account = await entityManager.findOne(AccountEntity, {
        where: { id: accountId, userId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!account) {
        throw new NotFoundException(`Account with ID ${accountId} not found`);
      }

      if (account.status === 'INACTIVE') {
        throw new BadRequestException(`Account ${account.name} is inactive and cannot be adjusted`);
      }

      // 2. Compute current balance from journal entries
      const rawSums = await entityManager
        .createQueryBuilder(JournalEntryEntity, 'entry')
        .select('entry.entryType', 'entryType')
        .addSelect('SUM(entry.amount)', 'sum')
        .innerJoin('entry.transaction', 'tx', 'tx.userId = :userId AND tx.status = :status', {
          userId,
          status: 'POSTED',
        })
        .where('entry.accountId = :accountId', { accountId })
        .groupBy('entry.entryType')
        .getRawMany();

      let debits = 0;
      let credits = 0;
      for (const row of rawSums) {
        if (row.entryType === 'DEBIT') {
          debits = Number(row.sum || 0);
        } else if (row.entryType === 'CREDIT') {
          credits = Number(row.sum || 0);
        }
      }

      const isDebitNature = account.type === 'ASSET' || account.type === 'EXPENSE';
      const currentBalance = Number(
        (isDebitNature ? debits - credits : credits - debits).toFixed(4),
      );

      const delta = Number((dto.targetBalance - currentBalance).toFixed(4));
      if (Math.abs(delta) < 0.0001) {
        return {
          success: true,
          message: 'El saldo ya es igual al saldo deseado.',
          delta: 0,
          currentBalance,
          targetBalance: dto.targetBalance,
          transactionId: null,
        };
      }

      const absDelta = Math.abs(delta);
      const currency =
        account.currency ||
        (await entityManager.findOne(CurrencyEntity, { where: { id: account.currencyId } }));
      const rateAtDate = Number(currency?.rateToBase ?? 1.0);
      const amountBase = Number((absDelta * rateAtDate).toFixed(4));

      const today = new Date().toISOString().substring(0, 10);
      await this.ensurePeriodService.ensurePeriod(entityManager, userId, today.substring(0, 7));

      let targetEntryType: 'DEBIT' | 'CREDIT';
      let counterpartEntryType: 'DEBIT' | 'CREDIT';
      let counterpartAccount: AccountEntity;

      if (dto.adjustmentType === 'CAPITAL') {
        let capitalAccount = await entityManager.findOne(AccountEntity, {
          where: { userId, systemRole: 'CAPITAL' },
          lock: { mode: 'pessimistic_write' },
        });

        if (!capitalAccount) {
          capitalAccount = await entityManager.findOne(AccountEntity, {
            where: { userId, name: 'Capital', type: 'EQUITY' },
            lock: { mode: 'pessimistic_write' },
          });
        }

        if (!capitalAccount) {
          throw new BadRequestException('No se encontró la cuenta de sistema Capital.');
        }

        counterpartAccount = capitalAccount;

        if (isDebitNature) {
          if (delta > 0) {
            targetEntryType = 'DEBIT';
            counterpartEntryType = 'CREDIT';
          } else {
            targetEntryType = 'CREDIT';
            counterpartEntryType = 'DEBIT';
          }
        } else {
          if (delta > 0) {
            targetEntryType = 'CREDIT';
            counterpartEntryType = 'DEBIT';
          } else {
            targetEntryType = 'DEBIT';
            counterpartEntryType = 'CREDIT';
          }
        }
      } else {
        if (!dto.categoryId) {
          throw new BadRequestException('Se requiere categoryId para ajustes por categoría.');
        }

        const categoryAccount = await entityManager.findOne(AccountEntity, {
          where: { id: dto.categoryId, userId },
          lock: { mode: 'pessimistic_write' },
        });

        if (!categoryAccount) {
          throw new NotFoundException(`Categoría con ID ${dto.categoryId} no encontrada`);
        }

        const isAsset = account.type === 'ASSET';
        const expectedCategoryType: 'INCOME' | 'EXPENSE' = isAsset
          ? delta > 0
            ? 'INCOME'
            : 'EXPENSE'
          : delta > 0
            ? 'EXPENSE'
            : 'INCOME';

        if (categoryAccount.type !== expectedCategoryType) {
          const actionWord = delta > 0 ? 'incrementar' : 'disminuir';
          const accountTypeName = isAsset ? 'activo' : 'pasivo';
          const expectedName = expectedCategoryType === 'INCOME' ? 'INGRESO' : 'EGRESO';
          throw new BadRequestException(
            `Al ${actionWord} una cuenta de ${accountTypeName}, la contrapartida de resultados debe ser de tipo ${expectedName}.`,
          );
        }

        counterpartAccount = categoryAccount;

        if (isDebitNature) {
          if (delta > 0) {
            targetEntryType = 'DEBIT';
            counterpartEntryType = 'CREDIT';
          } else {
            targetEntryType = 'CREDIT';
            counterpartEntryType = 'DEBIT';
          }
        } else {
          if (delta > 0) {
            targetEntryType = 'CREDIT';
            counterpartEntryType = 'DEBIT';
          } else {
            targetEntryType = 'DEBIT';
            counterpartEntryType = 'CREDIT';
          }
        }
      }

      const description = dto.description?.trim() || `Ajuste de saldo: ${account.name}`;

      const txEntity = entityManager.create(TransactionEntity, {
        userId,
        accountingDate: today,
        description,
        status: 'POSTED',
      });
      const savedTx = await entityManager.save(TransactionEntity, txEntity);

      const targetEntry = entityManager.create(JournalEntryEntity, {
        transactionId: savedTx.id,
        accountId: account.id,
        entryType: targetEntryType,
        amount: absDelta,
        amountBase,
        rateAtDate,
      });

      const counterpartEntry = entityManager.create(JournalEntryEntity, {
        transactionId: savedTx.id,
        accountId: counterpartAccount.id,
        entryType: counterpartEntryType,
        amount: absDelta,
        amountBase,
        rateAtDate,
      });

      await entityManager.save(JournalEntryEntity, [targetEntry, counterpartEntry]);

      const balanceChanges = [
        {
          accountId: account.id,
          debitDiff: targetEntryType === 'DEBIT' ? amountBase : 0,
          creditDiff: targetEntryType === 'CREDIT' ? amountBase : 0,
        },
        {
          accountId: counterpartAccount.id,
          debitDiff: counterpartEntryType === 'DEBIT' ? amountBase : 0,
          creditDiff: counterpartEntryType === 'CREDIT' ? amountBase : 0,
        },
      ];

      await this.balanceUpdateService.updateBalances(entityManager, userId, today, balanceChanges);

      return {
        success: true,
        message: 'Saldo ajustado exitosamente.',
        delta,
        currentBalance,
        targetBalance: dto.targetBalance,
        transactionId: savedTx.id,
      };
    });
  }
}
