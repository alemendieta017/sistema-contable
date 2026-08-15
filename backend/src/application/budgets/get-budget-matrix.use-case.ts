import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { FiscalYearEntity } from '../../infrastructure/database/entities/fiscal-year.entity';
import { AccountEntity } from '../../infrastructure/database/entities/account.entity';
import { BudgetEntity } from '../../infrastructure/database/entities/budget.entity';
import {
  BudgetMatrixResponse,
  BudgetMatrixPeriod,
  BudgetMatrixRow,
  BudgetMatrixSection,
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
export class GetBudgetMatrixUseCase {
  constructor(private readonly dataSource: DataSource) {}

  async execute(
    userId: string,
    fiscalYearId: string,
    categoryId?: string,
  ): Promise<BudgetMatrixResponse> {
    return this.dataSource.transaction(async (manager) => {
      const fiscalYear = await manager.findOne(FiscalYearEntity, {
        where: { id: fiscalYearId },
        relations: ['periods'],
      });

      if (!fiscalYear) {
        throw new NotFoundException(`Fiscal year with ID '${fiscalYearId}' not found.`);
      }

      // Sort periods chronologically
      const periodsList = (fiscalYear.periods || []).sort((a, b) =>
        a.startDate.localeCompare(b.startDate),
      );

      const periodIds = periodsList.map((p) => p.id);

      const formattedPeriods: BudgetMatrixPeriod[] = periodsList.map((p) => ({
        id: p.id,
        name: p.name,
        friendlyName: getSpanishFriendlyPeriodName(p.name),
        status: p.status,
      }));

      // Fetch accounts (excluding EQUITY if requested or cash/bank liquid asset accounts)
      const accountsQuery = manager
        .createQueryBuilder(AccountEntity, 'account')
        .where('account.user_id = :userId', { userId })
        .andWhere('account.status = :activeStatus', { activeStatus: 'ACTIVE' })
        .andWhere('account.is_cash_or_bank = :isCash', { isCash: false });

      if (categoryId) {
        if (categoryId === 'INGRESOS' || categoryId === 'INCOME') {
          accountsQuery.andWhere('account.type = :catType', { catType: 'INCOME' });
        } else if (categoryId === 'EGRESOS' || categoryId === 'EXPENSE') {
          accountsQuery.andWhere('account.type = :catType', { catType: 'EXPENSE' });
        } else if (categoryId === 'FINANCIAMIENTO_AHORRO' || categoryId === 'ASSET_LIABILITY') {
          accountsQuery.andWhere('account.type IN (:...catTypes)', {
            catTypes: ['ASSET', 'LIABILITY', 'EQUITY'],
          });
        } else {
          accountsQuery.andWhere('account.type = :categoryId', { categoryId });
        }
      }

      const accounts = await accountsQuery.orderBy('account.name', 'ASC').getMany();

      // Fetch existing budgets for these periods
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
      // Keep track of sub-row definitions per account: accountId -> Map<subRowId, { subRowLabel, cashFlowDirection }>
      const accountSubRowsMap = new Map<
        string,
        Map<string, { subRowLabel: string | null; cashFlowDirection: CashFlowDirection | null }>
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
                });
              }
            }
          }
        }
      }

      const rows: BudgetMatrixRow[] = [];
      const categoryTotals: Record<string, Record<string, number> & { total: number }> = {};

      // Determine parent accounts (accounts that have at least one child account)
      const parentAccountIdSet = new Set<string>();
      for (const account of accounts) {
        if (account.parentId) {
          parentAccountIdSet.add(account.parentId);
        }
      }

      // First, build leaf and direct rows
      const accountRowsMap = new Map<string, BudgetMatrixRow[]>();

      for (const account of accounts) {
        const isParent = parentAccountIdSet.has(account.id);
        const subRowsMap = accountSubRowsMap.get(account.id);

        if (subRowsMap && subRowsMap.size > 0) {
          // Process each sub-row under this account
          const accountSubRows: BudgetMatrixRow[] = [];
          for (const [subRowId, subRowMeta] of subRowsMap.entries()) {
            const amounts: Record<string, number> = {};
            const flowIntentions: Record<string, any> = {};
            let rowTotal = 0;

            for (const period of formattedPeriods) {
              const itemKey = `${period.id}_${account.id}_${subRowId}`;
              const item = itemMap.get(itemKey);
              const val = item ? Number(item.amount) : 0;
              const intention = item?.flowIntention || null;

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
          // Check if this account has default budget items
          let hasDefaultItems = false;
          for (const period of formattedPeriods) {
            const itemKey = `${period.id}_${account.id}___default__`;
            if (itemMap.has(itemKey)) {
              hasDefaultItems = true;
              break;
            }
          }

          const isPL = account.type === 'INCOME' || account.type === 'EXPENSE';
          if (!isPL && !hasDefaultItems && !categoryId) {
            continue;
          }

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

          // Default cash flow direction by account type if not set
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
      // Build child map: parentId -> array of child accountIds
      const childAccountsMap = new Map<string, string[]>();
      for (const account of accounts) {
        if (account.parentId) {
          if (!childAccountsMap.has(account.parentId)) {
            childAccountsMap.set(account.parentId, []);
          }
          childAccountsMap.get(account.parentId)!.push(account.id);
        }
      }

      // Recursive function to get all leaf descendant amounts for a parent
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

      // Update parent rows with aggregated dynamic subtotals
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

      // Flatten rows in hierarchical order (parents before their children)
      // Group by account type
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

        // Add any remaining orphan accounts of this type
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

      // Collect all rows
      rows.push(
        ...ingresosRows,
        ...egresosRows,
        ...ahorroInversionesRows,
        ...deudasFinanciacionRows,
      );

      // Helper to compute section totals (only summing leaf rows to avoid double counting parent subtotals)
      const buildSectionTotals = (
        sectionRows: BudgetMatrixRow[],
        isBalanceSection = false,
      ): Record<string, number> & { total: number } => {
        const totals: Record<string, number> & { total: number } = { total: 0 };
        const leafRows = sectionRows.filter((r) => !r.isParent);

        for (const period of formattedPeriods) {
          let periodTotal = 0;
          for (const r of leafRows) {
            const val = r.amounts[period.id] || 0;
            if (isBalanceSection && r.cashFlowDirection === CashFlowDirection.EGRESO_EFECTIVO) {
              periodTotal -= val;
            } else {
              periodTotal += val;
            }
          }
          totals[period.id] = periodTotal;
          totals.total += periodTotal;
        }
        return totals;
      };

      // 4 Executive Financial Blocks
      const sections: BudgetMatrixSection[] = [
        {
          sectionKey: BudgetMatrixSectionKey.INGRESOS,
          sectionTitle: 'Ingresos',
          rows: ingresosRows,
          sectionTotals: buildSectionTotals(ingresosRows),
        },
        {
          sectionKey: BudgetMatrixSectionKey.GASTOS_VIDA,
          sectionTitle: 'Egresos',
          rows: egresosRows,
          sectionTotals: buildSectionTotals(egresosRows),
        },
        {
          sectionKey: BudgetMatrixSectionKey.AHORRO_INVERSIONES,
          sectionTitle: 'Ahorro e Inversiones',
          rows: ahorroInversionesRows,
          sectionTotals: buildSectionTotals(ahorroInversionesRows, true),
        },
        {
          sectionKey: BudgetMatrixSectionKey.DEUDAS_FINANCIACION,
          sectionTitle: 'Deudas y Financiación',
          rows: deudasFinanciacionRows,
          sectionTotals: buildSectionTotals(deudasFinanciacionRows, true),
        },
      ];

      // Compute Sticky Footer Summary Metrics (Total Entradas, Total Salidas, Flujo Neto, Flujo Neto Acumulado)
      const allLeafRows = rows.filter((r) => !r.isParent);
      const totalInflows: Record<string, number> & { total: number } = { total: 0 };
      const totalOutflows: Record<string, number> & { total: number } = { total: 0 };
      const netMonthlyFlow: Record<string, number> & { total: number } = { total: 0 };
      const cumulativeNetFlow: Record<string, number> & { total: number } = { total: 0 };

      let runningCumulative = 0;

      for (const period of formattedPeriods) {
        let periodInflows = 0;
        let periodOutflows = 0;

        for (const r of allLeafRows) {
          const val = r.amounts[period.id] || 0;
          if (
            r.cashFlowDirection === CashFlowDirection.INGRESO_EFECTIVO ||
            (r.accountType === 'INCOME' && !r.cashFlowDirection)
          ) {
            periodInflows += val;
          } else if (
            r.cashFlowDirection === CashFlowDirection.EGRESO_EFECTIVO ||
            (r.accountType === 'EXPENSE' && !r.cashFlowDirection)
          ) {
            periodOutflows += val;
          }
        }

        totalInflows[period.id] = periodInflows;
        totalInflows.total += periodInflows;

        totalOutflows[period.id] = periodOutflows;
        totalOutflows.total += periodOutflows;

        const periodNet = periodInflows - periodOutflows;
        netMonthlyFlow[period.id] = periodNet;
        netMonthlyFlow.total += periodNet;

        runningCumulative += periodNet;
        cumulativeNetFlow[period.id] = runningCumulative;
      }
      cumulativeNetFlow.total = runningCumulative;

      const summary = {
        totalInflows,
        totalOutflows,
        netMonthlyFlow,
        cumulativeNetFlow,
      };

      return {
        fiscalYearId: fiscalYear.id,
        fiscalYearName: fiscalYear.name,
        periods: formattedPeriods,
        sections,
        summary,
        rows,
        categoryTotals,
      };
    });
  }
}
