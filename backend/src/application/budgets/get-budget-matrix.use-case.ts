import { Injectable, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AccountEntity } from '../../infrastructure/database/entities/account.entity';
import { BudgetEntity } from '../../infrastructure/database/entities/budget.entity';
import { PeriodEntity } from '../../infrastructure/database/entities/period.entity';
import { AccountPeriodBalanceEntity } from '../../infrastructure/database/entities/account-period-balance.entity';
import { EnsurePeriodService } from '../periods/ensure-period.service';
import {
  RollingBudgetMatrixResponse,
  BudgetMatrixPeriod,
  BudgetMatrixRow,
  BudgetMatrixSection,
  BudgetMatrixSectionKey,
  CashFlowDirection,
  FlowIntention,
  RollingCashFlowSummary,
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
export class GetBudgetMatrixUseCase {
  constructor(
    private readonly dataSource: DataSource,
    private readonly ensurePeriodService: EnsurePeriodService,
  ) {}

  private normalizePeriod(periodInput?: string): string {
    if (!periodInput || typeof periodInput !== 'string') {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      return `${year}-${month}`;
    }
    const normalized = periodInput.length >= 7 ? periodInput.substring(0, 7) : periodInput;
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(normalized)) {
      throw new BadRequestException(`startPeriod '${periodInput}' must be in YYYY-MM format`);
    }
    return normalized;
  }

  private getNextMonth(year: number, month: number): { year: number; month: number } {
    if (month === 12) {
      return { year: year + 1, month: 1 };
    }
    return { year, month: month + 1 };
  }

  private generateRollingMonths(startMonthStr: string, count: number): string[] {
    const months: string[] = [];
    const [startYear, startMonth] = startMonthStr.split('-').map(Number);
    let y = startYear;
    let m = startMonth;

    for (let i = 0; i < count; i++) {
      months.push(`${y}-${String(m).padStart(2, '0')}`);
      const next = this.getNextMonth(y, m);
      y = next.year;
      m = next.month;
    }
    return months;
  }

  async execute(
    userId: string,
    startPeriodOrFiscalYear?: string,
    monthsOrCategoryId?: number | string,
    categoryIdParam?: string,
  ): Promise<
    RollingBudgetMatrixResponse & {
      fiscalYearId?: string;
      fiscalYearName?: string;
      rows?: BudgetMatrixRow[];
      summary?: any;
      categoryTotals?: any;
    }
  > {
    const startPeriod = startPeriodOrFiscalYear;
    let monthsCount = 12;
    let categoryId: string | undefined = undefined;

    // Handle flexible overload arguments
    if (typeof monthsOrCategoryId === 'number') {
      monthsCount = Math.max(1, Math.min(24, monthsOrCategoryId));
      categoryId = categoryIdParam;
    } else if (typeof monthsOrCategoryId === 'string') {
      const parsedNum = parseInt(monthsOrCategoryId, 10);
      if (!isNaN(parsedNum) && /^\d+$/.test(monthsOrCategoryId.trim())) {
        monthsCount = Math.max(1, Math.min(24, parsedNum));
        categoryId = categoryIdParam;
      } else {
        // monthsOrCategoryId was passed as categoryId
        categoryId = monthsOrCategoryId;
      }
    }

    const normalizedStartPeriod = this.normalizePeriod(startPeriod);
    const monthsSequence = this.generateRollingMonths(normalizedStartPeriod, monthsCount);

    return this.dataSource.transaction(async (manager) => {
      // 1. Ensure all months in the rolling window are provisioned
      for (const monthStr of monthsSequence) {
        await this.ensurePeriodService.ensurePeriod(manager, userId, monthStr);
      }

      // 2. Fetch periods in chronological order matching the sequence
      const periodsQuery = manager
        .createQueryBuilder(PeriodEntity, 'period')
        .where('period.userId = :userId', { userId })
        .andWhere('period.name IN (:...monthsSequence)', { monthsSequence })
        .orderBy('period.name', 'ASC');

      const periodsList = await periodsQuery.getMany();

      // Sort explicitly by monthsSequence order
      periodsList.sort((a, b) => monthsSequence.indexOf(a.name) - monthsSequence.indexOf(b.name));

      const periodIds = periodsList.map((p) => p.id);

      const formattedPeriods: BudgetMatrixPeriod[] = periodsList.map((p) => ({
        id: p.id,
        name: p.name,
        friendlyName: getSpanishFriendlyPeriodName(p.name),
        status: p.status,
      }));

      // 3. Fetch active accounts excluding cash/bank accounts
      const accountsQuery = manager
        .createQueryBuilder(AccountEntity, 'account')
        .where('account.user_id = :userId', { userId })
        .andWhere('account.status = :activeStatus', { activeStatus: 'ACTIVE' })
        .andWhere('account.is_cash_or_bank = :isCash', { isCash: false });

      if (categoryId) {
        if (categoryId === 'INGRESOS' || categoryId === 'INCOME') {
          accountsQuery.andWhere('account.type = :catType', { catType: 'INCOME' });
        } else if (
          categoryId === 'EGRESOS' ||
          categoryId === 'EXPENSE' ||
          categoryId === 'GASTOS_VIDA'
        ) {
          accountsQuery.andWhere('account.type = :catType', { catType: 'EXPENSE' });
        } else if (categoryId === 'AHORRO_INVERSIONES' || categoryId === 'ASSET') {
          accountsQuery.andWhere('account.type = :catType', { catType: 'ASSET' });
        } else if (
          categoryId === 'DEUDAS_FINANCIACION' ||
          categoryId === 'FINANCIAMIENTO_AHORRO' ||
          categoryId === 'LIABILITY'
        ) {
          accountsQuery.andWhere('account.type IN (:...catTypes)', {
            catTypes: ['LIABILITY', 'EQUITY'],
          });
        } else {
          accountsQuery.andWhere('account.type = :categoryId', { categoryId });
        }
      }

      const accounts = await accountsQuery.orderBy('account.name', 'ASC').getMany();

      // 4. Fetch existing budgets for these periods
      let budgets: BudgetEntity[] = [];
      if (periodIds.length > 0) {
        budgets = await manager
          .createQueryBuilder(BudgetEntity, 'budget')
          .leftJoinAndSelect('budget.items', 'items')
          .where('budget.user_id = :userId', { userId })
          .andWhere('budget.period_id IN (:...periodIds)', { periodIds })
          .getMany();
      }

      // Collect all items indexed by periodId, accountId, and subRowId
      const itemMap = new Map<string, any>();
      const accountSubRowsMap = new Map<
        string,
        Map<
          string,
          {
            subRowLabel: string | null;
            cashFlowDirection: CashFlowDirection | null;
            flowIntention: FlowIntention | null;
          }
        >
      >();

      for (const budget of budgets) {
        if (budget.items) {
          for (const item of budget.items) {
            const subRowIdKey = item.subRowId || '__default__';
            const itemKey = `${budget.periodId}_${item.accountId}_${subRowIdKey}`;
            itemMap.set(itemKey, item);

            if (item.subRowId) {
              if (!accountSubRowsMap.has(item.accountId)) {
                accountSubRowsMap.set(item.accountId, new Map());
              }
              const subRowsMap = accountSubRowsMap.get(item.accountId)!;
              if (!subRowsMap.has(item.subRowId)) {
                subRowsMap.set(item.subRowId, {
                  subRowLabel: item.subRowLabel || null,
                  cashFlowDirection: item.cashFlowDirection || null,
                  flowIntention: item.flowIntention || null,
                });
              }
            }
          }
        }
      }

      const rows: BudgetMatrixRow[] = [];
      const categoryTotals: Record<string, Record<string, number> & { total: number }> = {};

      // Determine parent accounts
      const parentAccountIdSet = new Set<string>();
      for (const account of accounts) {
        if (account.parentId) {
          parentAccountIdSet.add(account.parentId);
        }
      }

      const accountRowsMap = new Map<string, BudgetMatrixRow[]>();

      for (const account of accounts) {
        const isParent = parentAccountIdSet.has(account.id);
        const subRowsMap = accountSubRowsMap.get(account.id);

        if (subRowsMap && subRowsMap.size > 0) {
          const accountSubRows: BudgetMatrixRow[] = [];
          for (const [subRowId, subRowMeta] of subRowsMap.entries()) {
            const amounts: Record<string, number> = {};
            const flowIntentions: Record<string, any> = {};
            let rowTotal = 0;

            for (const period of formattedPeriods) {
              const itemKey = `${period.id}_${account.id}_${subRowId}`;
              const item = itemMap.get(itemKey);
              const val = item ? Number(item.amount) : 0;
              const intention = item?.flowIntention || subRowMeta.flowIntention || null;

              amounts[period.id] = val;
              flowIntentions[period.id] = intention;
              rowTotal += val;

              if (!isParent) {
                if (!categoryTotals[account.type]) {
                  categoryTotals[account.type] = { total: 0 };
                }
                if (!categoryTotals[account.type][period.id]) {
                  categoryTotals[account.type][period.id] = 0;
                }
                categoryTotals[account.type][period.id] += val;
                categoryTotals[account.type].total += val;
              }
            }

            const rowObj: BudgetMatrixRow = {
              accountId: account.id,
              accountCode: account.name.substring(0, 10),
              accountName: account.name,
              accountType: account.type,
              parentId: account.parentId || null,
              isParent,
              subRowId,
              subRowLabel: subRowMeta.subRowLabel,
              cashFlowDirection: subRowMeta.cashFlowDirection,
              amounts,
              flowIntentions,
              rowTotal,
            };
            accountSubRows.push(rowObj);
          }
          accountRowsMap.set(account.id, accountSubRows);
        } else {
          // Standard single row for account
          const amounts: Record<string, number> = {};
          const flowIntentions: Record<string, any> = {};
          let rowTotal = 0;
          let rowCashFlowDirection: CashFlowDirection | null = null;

          for (const period of formattedPeriods) {
            const itemKey = `${period.id}_${account.id}___default__`;
            const item = itemMap.get(itemKey);
            const val = item ? Number(item.amount) : 0;
            const intention = item?.flowIntention || null;
            if (item?.cashFlowDirection && !rowCashFlowDirection) {
              rowCashFlowDirection = item.cashFlowDirection;
            }

            amounts[period.id] = val;
            flowIntentions[period.id] = intention;
            rowTotal += val;

            if (!isParent) {
              if (!categoryTotals[account.type]) {
                categoryTotals[account.type] = { total: 0 };
              }
              if (!categoryTotals[account.type][period.id]) {
                categoryTotals[account.type][period.id] = 0;
              }
              categoryTotals[account.type][period.id] += val;
              categoryTotals[account.type].total += val;
            }
          }

          if (!rowCashFlowDirection) {
            if (account.type === 'INCOME') {
              rowCashFlowDirection = CashFlowDirection.INGRESO_EFECTIVO;
            } else if (account.type === 'EXPENSE') {
              rowCashFlowDirection = CashFlowDirection.EGRESO_EFECTIVO;
            } else if (account.type === 'ASSET') {
              rowCashFlowDirection = CashFlowDirection.EGRESO_EFECTIVO;
            } else if (account.type === 'LIABILITY' || account.type === 'EQUITY') {
              rowCashFlowDirection = CashFlowDirection.EGRESO_EFECTIVO;
            }
          }

          const rowObj: BudgetMatrixRow = {
            accountId: account.id,
            accountCode: account.name.substring(0, 10),
            accountName: account.name,
            accountType: account.type,
            parentId: account.parentId || null,
            isParent,
            subRowId: null,
            subRowLabel: null,
            cashFlowDirection: rowCashFlowDirection,
            amounts,
            flowIntentions,
            rowTotal,
          };
          accountRowsMap.set(account.id, [rowObj]);
        }
      }

      // Roll up parent account amounts dynamically from child accounts
      const childAccountsMap = new Map<string, string[]>();
      for (const account of accounts) {
        if (account.parentId) {
          if (!childAccountsMap.has(account.parentId)) {
            childAccountsMap.set(account.parentId, []);
          }
          childAccountsMap.get(account.parentId)!.push(account.id);
        }
      }

      const getDescendantLeafRows = (parentId: string): BudgetMatrixRow[] => {
        const directChildIds = childAccountsMap.get(parentId) || [];
        const leafRows: BudgetMatrixRow[] = [];
        for (const childId of directChildIds) {
          const isChildParent = parentAccountIdSet.has(childId);
          if (isChildParent) {
            leafRows.push(...getDescendantLeafRows(childId));
          } else {
            const childRows = accountRowsMap.get(childId) || [];
            leafRows.push(...childRows);
          }
        }
        return leafRows;
      };

      for (const account of accounts) {
        if (parentAccountIdSet.has(account.id)) {
          const parentRows = accountRowsMap.get(account.id) || [];
          const descendantLeaves = getDescendantLeafRows(account.id);

          for (const parentRow of parentRows) {
            const parentAmounts: Record<string, number> = {};
            let parentRowTotal = 0;

            for (const period of formattedPeriods) {
              let periodSum = 0;
              for (const leaf of descendantLeaves) {
                periodSum += leaf.amounts[period.id] || 0;
              }
              parentAmounts[period.id] = periodSum;
              parentRowTotal += periodSum;
            }

            parentRow.amounts = parentAmounts;
            parentRow.rowTotal = parentRowTotal;
          }
        }
      }

      // Build hierarchical rows for each type
      const buildHierarchicalRowsForType = (
        typeFilter: (t: string) => boolean,
      ): BudgetMatrixRow[] => {
        const typeAccounts = accounts.filter((a) => typeFilter(a.type));
        const rootAccounts = typeAccounts.filter((a) => !a.parentId);
        const addedAccountIds = new Set<string>();
        const result: BudgetMatrixRow[] = [];

        const addAccountAndChildren = (accId: string) => {
          if (addedAccountIds.has(accId)) return;
          addedAccountIds.add(accId);
          const accRows = accountRowsMap.get(accId) || [];
          result.push(...accRows);

          const childIds = childAccountsMap.get(accId) || [];
          for (const cId of childIds) {
            addAccountAndChildren(cId);
          }
        };

        for (const root of rootAccounts) {
          addAccountAndChildren(root.id);
        }

        for (const acc of typeAccounts) {
          if (!addedAccountIds.has(acc.id)) {
            addAccountAndChildren(acc.id);
          }
        }

        return result;
      };

      const ingresosRows = buildHierarchicalRowsForType((t) => t === 'INCOME');
      const egresosRows = buildHierarchicalRowsForType((t) => t === 'EXPENSE');
      const ahorroInversionesRows = buildHierarchicalRowsForType((t) => t === 'ASSET');
      const deudasFinanciacionRows = buildHierarchicalRowsForType((t) =>
        ['LIABILITY', 'EQUITY'].includes(t),
      );

      rows.push(
        ...ingresosRows,
        ...egresosRows,
        ...ahorroInversionesRows,
        ...deudasFinanciacionRows,
      );

      const buildSectionTotals = (
        sectionRows: BudgetMatrixRow[],
      ): Record<string, number> & { total: number } => {
        const totals: Record<string, number> & { total: number } = { total: 0 };
        const leafRows = sectionRows.filter((r) => !r.isParent);

        for (const period of formattedPeriods) {
          let periodTotal = 0;
          for (const r of leafRows) {
            periodTotal += r.amounts[period.id] || 0;
          }
          totals[period.id] = periodTotal;
          totals.total += periodTotal;
        }
        return totals;
      };

      // 4 Distinct Financial Quadrants
      const sections: BudgetMatrixSection[] = [
        {
          sectionKey: BudgetMatrixSectionKey.INGRESOS,
          sectionTitle: 'Ingresos',
          rows: ingresosRows,
          sectionTotals: buildSectionTotals(ingresosRows),
        },
        {
          sectionKey: BudgetMatrixSectionKey.EGRESOS,
          sectionTitle: 'Egresos',
          rows: egresosRows,
          sectionTotals: buildSectionTotals(egresosRows),
        },
        {
          sectionKey: BudgetMatrixSectionKey.AHORRO_INVERSIONES,
          sectionTitle: 'Ahorro e Inversiones',
          rows: ahorroInversionesRows,
          sectionTotals: buildSectionTotals(ahorroInversionesRows),
        },
        {
          sectionKey: BudgetMatrixSectionKey.DEUDAS_FINANCIACION,
          sectionTitle: 'Deudas y Financiación',
          rows: deudasFinanciacionRows,
          sectionTotals: buildSectionTotals(deudasFinanciacionRows),
        },
      ];

      // 5. Build Comprehensive Rolling Cash Flow Forecast Summary
      const allLeafRows = rows.filter((r) => !r.isParent);
      const totalInflows: Record<string, number> & { total: number } = { total: 0 };
      const operatingExpenses: Record<string, number> & { total: number } = { total: 0 };
      const operatingSurplus: Record<string, number> & { total: number } = { total: 0 };
      const investmentsAndSavings: Record<string, number> & { total: number } = { total: 0 };
      const debtFinancing: Record<string, number> & { total: number } = { total: 0 };
      const netCashFlow: Record<string, number> & { total: number } = { total: 0 };
      const openingCash: Record<string, number> = {};
      const closingCash: Record<string, number> = {};
      const shortfallAlerts: Record<string, { isNegative: boolean; shortfall: number }> = {};

      // Initial cash balance at start of rolling horizon
      let initialCash = 0;
      if (formattedPeriods.length > 0) {
        const firstPeriodId = formattedPeriods[0].id;
        const cashBalances = await manager
          .createQueryBuilder(AccountPeriodBalanceEntity, 'apb')
          .innerJoin('apb.account', 'account')
          .where('account.user_id = :userId', { userId })
          .andWhere('account.is_cash_or_bank = :isCash', { isCash: true })
          .andWhere('apb.period_id = :periodId', { periodId: firstPeriodId })
          .getMany();

        initialCash = cashBalances.reduce(
          (sum, b) => sum + Number(b.openingBalance ?? b.closingBalance ?? 0),
          0,
        );
      }

      let runningCash = initialCash;

      for (const period of formattedPeriods) {
        let periodInflows = 0;
        let periodExpenses = 0;
        let periodSavings = 0;
        let periodDebt = 0;

        for (const r of allLeafRows) {
          const val = r.amounts[period.id] || 0;
          if (
            r.accountType === 'INCOME' ||
            r.cashFlowDirection === CashFlowDirection.INGRESO_EFECTIVO
          ) {
            periodInflows += val;
          } else if (r.accountType === 'EXPENSE') {
            periodExpenses += val;
          } else if (
            r.accountType === 'ASSET' ||
            r.flowIntentions?.[period.id] === FlowIntention.INVEST ||
            r.flowIntentions?.[period.id] === FlowIntention.SAVE
          ) {
            periodSavings += val;
          } else if (
            r.accountType === 'LIABILITY' ||
            r.accountType === 'EQUITY' ||
            r.flowIntentions?.[period.id] === FlowIntention.PAY
          ) {
            periodDebt += val;
          }
        }

        totalInflows[period.id] = periodInflows;
        totalInflows.total += periodInflows;

        operatingExpenses[period.id] = periodExpenses;
        operatingExpenses.total += periodExpenses;

        const surplus = periodInflows - periodExpenses;
        operatingSurplus[period.id] = surplus;
        operatingSurplus.total += surplus;

        investmentsAndSavings[period.id] = periodSavings;
        investmentsAndSavings.total += periodSavings;

        debtFinancing[period.id] = periodDebt;
        debtFinancing.total += periodDebt;

        const net = surplus - periodSavings - periodDebt;
        netCashFlow[period.id] = net;
        netCashFlow.total += net;

        openingCash[period.id] = runningCash;
        const closing = runningCash + net;
        closingCash[period.id] = closing;

        shortfallAlerts[period.id] = {
          isNegative: closing < 0,
          shortfall: closing < 0 ? Math.abs(closing) : 0,
        };

        runningCash = closing;
      }

      const cashFlowForecast: RollingCashFlowSummary = {
        totalInflows,
        operatingExpenses,
        operatingSurplus,
        investmentsAndSavings,
        debtFinancing,
        netCashFlow,
        openingCash,
        closingCash,
        shortfallAlerts,
      };

      // Summary for legacy compatibility
      const totalOutflows: Record<string, number> & { total: number } = { total: 0 };
      const netMonthlyFlow: Record<string, number> & { total: number } = { total: 0 };
      const cumulativeNetFlow: Record<string, number> & { total: number } = { total: 0 };

      for (const p of formattedPeriods) {
        const out = operatingExpenses[p.id] + investmentsAndSavings[p.id] + debtFinancing[p.id];
        totalOutflows[p.id] = out;
        totalOutflows.total += out;
        netMonthlyFlow[p.id] = netCashFlow[p.id];
        cumulativeNetFlow[p.id] = closingCash[p.id];
      }
      netMonthlyFlow.total = netCashFlow.total;
      cumulativeNetFlow.total = runningCash;

      const summary = {
        totalInflows,
        totalOutflows,
        netMonthlyFlow,
        cumulativeNetFlow,
      };

      return {
        startPeriod: normalizedStartPeriod,
        monthsCount: formattedPeriods.length,
        fiscalYearId: 'rolling',
        fiscalYearName: `Presupuesto Continuo (${normalizedStartPeriod})`,
        periods: formattedPeriods,
        sections,
        cashFlowForecast,
        summary,
        rows,
        categoryTotals,
      };
    });
  }
}
