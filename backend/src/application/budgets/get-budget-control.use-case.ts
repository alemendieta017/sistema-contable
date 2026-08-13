import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { PeriodEntity } from '../../infrastructure/database/entities/period.entity';
import { BudgetEntity } from '../../infrastructure/database/entities/budget.entity';
import { AccountEntity } from '../../infrastructure/database/entities/account.entity';
import { JournalEntryEntity } from '../../infrastructure/database/entities/journal-entry.entity';
import {
  BudgetControlResponse,
  BudgetControlSummary,
  BudgetControlSection,
  BudgetControlCategory,
  BudgetControlItem,
  BudgetGaugeStatus,
  BudgetMatrixSectionKey,
  CashFlowDirection,
} from '@sistema-contable/shared';

const SPANISH_MONTHS = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

function getSpanishFriendlyPeriodName(name: string): string {
  const match = name.match(/^(\d{4})-(\d{2})/);
  if (match) {
    const year = match[1];
    const monthIndex = parseInt(match[2], 10) - 1;
    if (monthIndex >= 0 && monthIndex < 12) {
      return `${SPANISH_MONTHS[monthIndex]} ${year}`;
    }
  }
  return name;
}

@Injectable()
export class GetBudgetControlUseCase {
  constructor(private readonly dataSource: DataSource) {}

  async execute(userId: string, periodId: string): Promise<BudgetControlResponse> {
    return this.dataSource.transaction(async (manager) => {
      const period = await manager.findOne(PeriodEntity, {
        where: { id: periodId },
      });

      if (!period) {
        throw new NotFoundException(`Period with ID '${periodId}' not found.`);
      }

      // Fetch all active accounts of user (excluding cash/bank liquid accounts)
      const accounts = await manager
        .createQueryBuilder(AccountEntity, 'account')
        .where('account.user_id = :userId', { userId })
        .andWhere('account.status = :status', { status: 'ACTIVE' })
        .andWhere('account.is_cash_or_bank = :isCash', { isCash: false })
        .orderBy('account.name', 'ASC')
        .getMany();

      const accountMap = new Map<string, AccountEntity>();
      for (const acc of accounts) {
        accountMap.set(acc.id, acc);
      }

      // Fetch budget header and items for this period
      const budget = await manager.findOne(BudgetEntity, {
        where: { userId, periodId },
        relations: ['items'],
      });

      const budgetItems = budget?.items || [];

      // Query posted journal entries for this period date range
      const entries = await manager
        .createQueryBuilder(JournalEntryEntity, 'entry')
        .innerJoinAndSelect('entry.transaction', 'tx')
        .innerJoin('entry.account', 'account')
        .where('account.user_id = :userId', { userId })
        .andWhere('tx.accounting_date >= :startDate', { startDate: period.startDate })
        .andWhere('tx.accounting_date <= :endDate', { endDate: period.endDate })
        .getMany();

      // Aggregate debits and credits per accountId
      const accountDebitsMap = new Map<string, number>();
      const accountCreditsMap = new Map<string, number>();

      for (const entry of entries) {
        const accId = entry.accountId;
        const debit = entry.entryType === 'DEBIT' ? Number(entry.amount) : 0;
        const credit = entry.entryType === 'CREDIT' ? Number(entry.amount) : 0;

        accountDebitsMap.set(accId, (accountDebitsMap.get(accId) || 0) + debit);
        accountCreditsMap.set(accId, (accountCreditsMap.get(accId) || 0) + credit);
      }

      // Helper to compute gauge status from consumption percentage & section
      const evaluateGaugeStatus = (
        consumption: number,
        isIncome: boolean = false,
      ): BudgetGaugeStatus => {
        if (isIncome) {
          return consumption >= 75 ? BudgetGaugeStatus.NORMAL : BudgetGaugeStatus.WARNING;
        }
        if (consumption >= 100) {
          return BudgetGaugeStatus.OVERBUDGET;
        }
        if (consumption >= 75) {
          return BudgetGaugeStatus.WARNING;
        }
        return BudgetGaugeStatus.NORMAL;
      };

      // Helper to build a BudgetControlItem
      const createControlItem = (
        accountId: string,
        accountName: string,
        accountCode: string | undefined,
        subRowId: string | null,
        subRowLabel: string | null,
        cashFlowDirection: CashFlowDirection,
        budgeted: number,
        executed: number,
        committed: number = 0,
        isIncome: boolean = false,
      ): BudgetControlItem => {
        const available = budgeted - executed - committed;
        const consumptionPercentage =
          budgeted > 0 ? Number(((executed / budgeted) * 100).toFixed(1)) : executed > 0 ? 100 : 0;

        const gaugeStatus = evaluateGaugeStatus(consumptionPercentage, isIncome);

        return {
          accountId,
          accountName: subRowLabel ? `${accountName} - ${subRowLabel}` : accountName,
          accountCode,
          subRowId: subRowId || null,
          subRowLabel: subRowLabel || null,
          cashFlowDirection,
          budgeted,
          executed,
          committed,
          available,
          consumptionPercentage,
          gaugeStatus,
        };
      };

      // 1. INGRESOS (P&L Income accounts auto-loaded + on-demand balance inflow items)
      const incomeItems: BudgetControlItem[] = [];
      const incomeAccounts = accounts.filter((a) => a.type === 'INCOME');

      for (const acc of incomeAccounts) {
        const matchingBudgetItem = budgetItems.find((b) => b.accountId === acc.id && !b.subRowId);
        const budgeted = matchingBudgetItem ? Number(matchingBudgetItem.amount) : 0;
        const debits = accountDebitsMap.get(acc.id) || 0;
        const credits = accountCreditsMap.get(acc.id) || 0;
        // P&L Income executed = Credits - Debits
        const executed = Math.max(0, credits - debits);

        incomeItems.push(
          createControlItem(
            acc.id,
            acc.name,
            acc.name.substring(0, 10),
            null,
            null,
            CashFlowDirection.INGRESO_EFECTIVO,
            budgeted,
            executed,
            0,
            true,
          ),
        );
      }

      // 2. GASTOS_VIDA (P&L Expense accounts auto-loaded)
      const expenseItems: BudgetControlItem[] = [];
      const expenseAccounts = accounts.filter((a) => a.type === 'EXPENSE');

      for (const acc of expenseAccounts) {
        const matchingBudgetItem = budgetItems.find((b) => b.accountId === acc.id && !b.subRowId);
        const budgeted = matchingBudgetItem ? Number(matchingBudgetItem.amount) : 0;
        const debits = accountDebitsMap.get(acc.id) || 0;
        const credits = accountCreditsMap.get(acc.id) || 0;
        // P&L Expense executed = Debits - Credits
        const executed = Math.max(0, debits - credits);

        expenseItems.push(
          createControlItem(
            acc.id,
            acc.name,
            acc.name.substring(0, 10),
            null,
            null,
            CashFlowDirection.EGRESO_EFECTIVO,
            budgeted,
            executed,
            0,
            false,
          ),
        );
      }

      // 3. AHORRO_INVERSIONES (Balance Asset accounts budgeted on-demand or with ledger activity)
      const investmentItems: BudgetControlItem[] = [];
      const assetBudgets = budgetItems.filter((b) => {
        const acc = accountMap.get(b.accountId);
        return acc?.type === 'ASSET';
      });

      const processedAssetItemKeys = new Set<string>();

      for (const b of assetBudgets) {
        const acc = accountMap.get(b.accountId);
        if (!acc) continue;

        const subRowKey = `${b.accountId}_${b.subRowId || 'default'}`;
        processedAssetItemKeys.add(subRowKey);

        const budgeted = Number(b.amount);
        const debits = accountDebitsMap.get(acc.id) || 0;
        const credits = accountCreditsMap.get(acc.id) || 0;
        const direction =
          b.cashFlowDirection === CashFlowDirection.INGRESO_EFECTIVO
            ? CashFlowDirection.INGRESO_EFECTIVO
            : CashFlowDirection.EGRESO_EFECTIVO;

        // Inversión / Aporte (Salida): debits. Rescate / Desinversión (Entrada): credits.
        const executed =
          direction === CashFlowDirection.INGRESO_EFECTIVO
            ? Math.max(0, credits)
            : Math.max(0, debits);

        investmentItems.push(
          createControlItem(
            acc.id,
            acc.name,
            acc.name.substring(0, 10),
            b.subRowId || null,
            b.subRowLabel || null,
            direction,
            budgeted,
            executed,
            0,
            direction === CashFlowDirection.INGRESO_EFECTIVO,
          ),
        );
      }

      // 4. DEUDAS_FINANCIACION (Balance Liability/Equity accounts budgeted on-demand or with ledger activity)
      const debtItems: BudgetControlItem[] = [];
      const debtBudgets = budgetItems.filter((b) => {
        const acc = accountMap.get(b.accountId);
        return acc?.type === 'LIABILITY' || acc?.type === 'EQUITY';
      });

      for (const b of debtBudgets) {
        const acc = accountMap.get(b.accountId);
        if (!acc) continue;

        const budgeted = Number(b.amount);
        const debits = accountDebitsMap.get(acc.id) || 0;
        const credits = accountCreditsMap.get(acc.id) || 0;
        const direction =
          b.cashFlowDirection === CashFlowDirection.INGRESO_EFECTIVO
            ? CashFlowDirection.INGRESO_EFECTIVO
            : CashFlowDirection.EGRESO_EFECTIVO;

        // Pago / Amortización (Salida): debits. Préstamo / Financiación (Entrada): credits.
        const executed =
          direction === CashFlowDirection.INGRESO_EFECTIVO
            ? Math.max(0, credits)
            : Math.max(0, debits);

        debtItems.push(
          createControlItem(
            acc.id,
            acc.name,
            acc.name.substring(0, 10),
            b.subRowId || null,
            b.subRowLabel || null,
            direction,
            budgeted,
            executed,
            0,
            direction === CashFlowDirection.INGRESO_EFECTIVO,
          ),
        );
      }

      // Helper to build section object
      const buildSection = (
        sectionKey: BudgetMatrixSectionKey,
        sectionTitle: string,
        items: BudgetControlItem[],
        isIncome: boolean = false,
      ): BudgetControlSection => {
        const budgeted = items.reduce((sum, i) => sum + i.budgeted, 0);
        const executed = items.reduce((sum, i) => sum + i.executed, 0);
        const committed = items.reduce((sum, i) => sum + i.committed, 0);
        const available = budgeted - executed - committed;
        const consumptionPercentage =
          budgeted > 0 ? Number(((executed / budgeted) * 100).toFixed(1)) : executed > 0 ? 100 : 0;

        const gaugeStatus = evaluateGaugeStatus(consumptionPercentage, isIncome);

        return {
          sectionKey,
          sectionTitle,
          budgeted,
          executed,
          committed,
          available,
          consumptionPercentage,
          gaugeStatus,
          items,
        };
      };

      const sections: BudgetControlSection[] = [
        buildSection(BudgetMatrixSectionKey.INGRESOS, 'Ingresos', incomeItems, true),
        buildSection(BudgetMatrixSectionKey.GASTOS_VIDA, 'Gastos de Vida', expenseItems, false),
        buildSection(
          BudgetMatrixSectionKey.AHORRO_INVERSIONES,
          'Ahorro e Inversiones',
          investmentItems,
          false,
        ),
        buildSection(
          BudgetMatrixSectionKey.DEUDAS_FINANCIACION,
          'Deudas y Financiación',
          debtItems,
          false,
        ),
      ];

      // Build categories for backward compatibility
      const categories: BudgetControlCategory[] = sections.map((s) => ({
        categoryName: s.sectionTitle,
        accountType:
          s.sectionKey === BudgetMatrixSectionKey.INGRESOS
            ? 'INCOME'
            : s.sectionKey === BudgetMatrixSectionKey.GASTOS_VIDA
              ? 'EXPENSE'
              : s.sectionKey === BudgetMatrixSectionKey.AHORRO_INVERSIONES
                ? 'ASSET'
                : 'LIABILITY',
        budgeted: s.budgeted,
        executed: s.executed,
        committed: s.committed,
        available: s.available,
        consumptionPercentage: s.consumptionPercentage,
        gaugeStatus: s.gaugeStatus,
        items: s.items,
      }));

      // Calculate Grand Totals across all sections
      const totalBudgeted = sections.reduce((sum, s) => sum + s.budgeted, 0);
      const totalExecuted = sections.reduce((sum, s) => sum + s.executed, 0);
      const totalCommitted = sections.reduce((sum, s) => sum + s.committed, 0);
      const totalAvailable = totalBudgeted - totalExecuted - totalCommitted;
      const overallConsumptionPercentage =
        totalBudgeted > 0
          ? Number(((totalExecuted / totalBudgeted) * 100).toFixed(1))
          : totalExecuted > 0
            ? 100
            : 0;

      const overallGaugeStatus = evaluateGaugeStatus(overallConsumptionPercentage, false);

      const summary: BudgetControlSummary = {
        totalBudgeted,
        totalExecuted,
        totalCommitted,
        totalAvailable,
        overallConsumptionPercentage,
        overallGaugeStatus,
      };

      return {
        periodId: period.id,
        periodName: period.name,
        friendlyName: getSpanishFriendlyPeriodName(period.name),
        isLocked: period.status === 'CLOSED',
        summary,
        sections,
        categories,
      };
    });
  }
}
