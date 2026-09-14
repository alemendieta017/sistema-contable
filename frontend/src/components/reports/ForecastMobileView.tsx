'use client';

import React, { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  File,
  Wallet,
  Building2,
  ShieldCheck,
  Percent,
} from 'lucide-react';
import { formatCurrency } from '../../lib/utils';
import { AccountForecastItem, MonthForecastItem } from './ForecastMatrixGrid';

export interface ForecastMobileViewProps {
  type: 'CASH_FLOW' | 'INCOME_STATEMENT';
  months: MonthForecastItem[];
  accounts: AccountForecastItem[];
  activePeriodName: string;
  baseCurrency?: any;
}

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

function getSpanishMonthName(yearMonth: string): string {
  const match = yearMonth.match(/^(\d{4})-(\d{2})/);
  if (!match) return yearMonth;
  const year = match[1];
  const monthIdx = parseInt(match[2], 10) - 1;
  return `${SPANISH_MONTHS[monthIdx] || ''} ${year}`;
}

export const ForecastMobileView: React.FC<ForecastMobileViewProps> = ({
  type,
  months,
  accounts,
  activePeriodName,
  baseCurrency,
}) => {
  // Find active month or default to first
  const activeMonth = months.find((m) => m.periodName === activePeriodName) || months[0];
  const activePeriodId = activeMonth?.periodId || '';

  // Accordion expanded sections
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    () => new Set(['income', 'expenses', 'assetInflow', 'assetOutflow']),
  );

  // Account tree node expansion state
  const [expandedAccounts, setExpandedAccounts] = useState<Record<string, boolean>>({});

  const toggleSection = (sectionKey: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionKey)) {
        next.delete(sectionKey);
      } else {
        next.add(sectionKey);
      }
      return next;
    });
  };

  const toggleAccount = (accId: string) => {
    setExpandedAccounts((prev) => ({
      ...prev,
      [accId]: !prev[accId],
    }));
  };

  const hasChildren = (accId: string) => {
    return accounts.some((a) => a.parentId === accId);
  };

  const getAccountDepth = (acc: AccountForecastItem) => {
    let depth = 0;
    let parentId = acc.parentId;
    while (parentId) {
      depth++;
      const parent = accounts.find((a) => a.accountId === parentId);
      parentId = parent ? parent.parentId : null;
    }
    return depth;
  };

  // Roll-up values recursively for trees
  const getSubtreeValue = (
    accId: string,
    periodId: string,
    flowFilter: 'CASH_IN' | 'CASH_OUT' | 'DEFAULT',
  ): number => {
    const acc = accounts.find((a) => a.accountId === accId);
    if (!acc) return 0;

    let val = acc.values[periodId] || 0;

    if (flowFilter === 'CASH_IN') {
      if (acc.accountType === 'ASSET' || acc.accountType === 'LIABILITY') {
        val = val > 0 ? val : 0;
      }
    } else if (flowFilter === 'CASH_OUT') {
      if (acc.accountType === 'ASSET' || acc.accountType === 'LIABILITY') {
        val = val < 0 ? Math.abs(val) : 0;
      }
    }

    const children = accounts.filter((a) => a.parentId === accId);
    let childrenSum = 0;
    children.forEach((child) => {
      childrenSum += getSubtreeValue(child.accountId, periodId, flowFilter);
    });

    return val + childrenSum;
  };

  // Render individual account row
  const renderAccountNode = (
    acc: AccountForecastItem,
    flowFilter: 'CASH_IN' | 'CASH_OUT' | 'DEFAULT',
  ) => {
    const depth = getAccountDepth(acc);
    const childrenPresent = hasChildren(acc.accountId);
    const isExpanded = expandedAccounts[acc.accountId];
    const rawVal = getSubtreeValue(acc.accountId, activePeriodId, flowFilter);
    // Egresos, Gastos y Salidas se presentan como importes positivos
    const val =
      acc.accountType === 'EXPENSE' || flowFilter === 'CASH_OUT' ? Math.abs(rawVal) : rawVal;
    const directChildren = accounts.filter((a) => a.parentId === acc.accountId);

    return (
      <React.Fragment key={acc.accountId}>
        <div
          className="flex items-center justify-between p-3 active:bg-slate-100 dark:active:bg-slate-800 transition-colors min-h-11 border-b border-slate-100 dark:border-slate-800/60 last:border-b-0"
          style={{ paddingLeft: `${Math.max(12, depth * 16 + 12)}px` }}
        >
          <div className="flex items-center space-x-1.5 flex-1 pr-2 min-w-0">
            {childrenPresent ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleAccount(acc.accountId);
                }}
                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors cursor-pointer shrink-0 text-slate-500 dark:text-slate-400"
                title={isExpanded ? 'Colapsar' : 'Expandir'}
              >
                {isExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5" />
                )}
              </button>
            ) : (
              <span className="w-4 h-4 shrink-0 flex items-center justify-center text-slate-400">
                <File className="w-3 h-3" />
              </span>
            )}

            <span
              className={`text-xs block truncate ${
                childrenPresent
                  ? 'font-bold text-slate-900 dark:text-slate-100'
                  : 'font-medium text-slate-700 dark:text-slate-300'
              }`}
            >
              {acc.accountName}
            </span>

            {type === 'CASH_FLOW' &&
              (acc.accountType === 'ASSET' || acc.accountType === 'LIABILITY') && (
                <span
                  className="shrink-0 select-none ml-1"
                  title={flowFilter === 'CASH_IN' ? 'Entrada de caja' : 'Salida de caja'}
                >
                  {flowFilter === 'CASH_IN' ? (
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <TrendingDown className="w-3.5 h-3.5 text-rose-500" />
                  )}
                </span>
              )}
          </div>

          <div className="flex items-center space-x-2 shrink-0 tabular-nums">
            <span
              className={`text-xs px-2.5 py-1 rounded-lg font-bold ${
                val === 0
                  ? 'text-slate-400 bg-slate-100/60 dark:bg-slate-800/60'
                  : 'text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800'
              }`}
            >
              {val === 0 ? '—' : formatCurrency(val, baseCurrency)}
            </span>
          </div>
        </div>

        {isExpanded && directChildren.map((child) => renderAccountNode(child, flowFilter))}
      </React.Fragment>
    );
  };

  const monthLabel = activeMonth ? getSpanishMonthName(activeMonth.periodName) : '';

  // KPI calculations for Income Statement (valores de gastos siempre positivos)
  const incomeVal = activeMonth?.income || 0;
  const expenseVal = Math.abs(activeMonth?.expense || 0);
  const netProfitVal = activeMonth?.netProfit || incomeVal - expenseVal;
  const marginPct = incomeVal > 0 ? (netProfitVal / incomeVal) * 100 : 0;

  // Root account lists
  const rootIncomeAccounts = accounts.filter(
    (a) => a.accountType === 'INCOME' && a.parentId === null,
  );
  const rootExpenseAccounts = accounts.filter(
    (a) => a.accountType === 'EXPENSE' && a.parentId === null,
  );
  const rootAssetLiabilityInflow = accounts.filter(
    (a) => (a.accountType === 'ASSET' || a.accountType === 'LIABILITY') && a.parentId === null,
  );
  const rootAssetLiabilityOutflow = accounts.filter(
    (a) => (a.accountType === 'ASSET' || a.accountType === 'LIABILITY') && a.parentId === null,
  );

  return (
    <div className="flex flex-col h-full w-full bg-slate-50 dark:bg-slate-950 overflow-y-auto font-sans">
      {/* 1. Top Summary Card with Month Header and Key KPIs */}
      <div className="p-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 shadow-xs space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-baseline space-x-1.5 min-w-0">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 shrink-0">
                {type === 'INCOME_STATEMENT' ? 'Resultados Proyectados' : 'Caja Proyectada'}
              </span>
              <span className="text-xs font-medium text-slate-400 dark:text-slate-500 truncate">
                • {monthLabel}
              </span>
            </div>

            <span
              className={`text-xs px-2 py-0.5 rounded-md font-semibold shrink-0 border ${
                activeMonth?.isReal
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                  : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30'
              }`}
            >
              {activeMonth?.isReal ? 'Real' : 'Proyectado'}
            </span>
          </div>

          {/* Key Metrics Grid */}
          {type === 'INCOME_STATEMENT' ? (
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 dark:border-slate-800 text-xs">
              {/* Ingresos */}
              <div className="p-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-xs">Ingresos</span>
                  <TrendingUp className="w-3 h-3 text-emerald-500" />
                </div>
                <p className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums text-xs sm:text-sm truncate mt-0.5">
                  {formatCurrency(incomeVal, baseCurrency)}
                </p>
              </div>

              {/* Gastos */}
              <div className="p-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-xs">Gastos</span>
                  <TrendingDown className="w-3 h-3 text-rose-500" />
                </div>
                <p className="font-bold text-rose-600 dark:text-rose-400 tabular-nums text-xs sm:text-sm truncate mt-0.5">
                  {formatCurrency(expenseVal, baseCurrency)}
                </p>
              </div>

              {/* Resultado Neto */}
              <div className="p-2 bg-indigo-50/60 dark:bg-indigo-950/30 rounded-xl">
                <div className="flex items-center justify-between text-indigo-700 dark:text-indigo-300">
                  <span className="text-xs font-semibold">Resultado</span>
                  <Wallet className="w-3 h-3" />
                </div>
                <p
                  className={`font-bold tabular-nums text-xs sm:text-sm truncate mt-0.5 ${
                    netProfitVal >= 0
                      ? 'text-indigo-700 dark:text-indigo-300'
                      : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {formatCurrency(netProfitVal, baseCurrency)}
                </p>
              </div>

              {/* Margen Neto % */}
              <div className="p-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-xs">Margen</span>
                  <Percent className="w-3 h-3 text-slate-400" />
                </div>
                <p
                  className={`font-bold tabular-nums text-xs sm:text-sm truncate mt-0.5 ${
                    marginPct >= 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {marginPct.toFixed(1)}%
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 dark:border-slate-800 text-xs">
              {/* Saldo Inicial */}
              <div className="p-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-xs">Saldo Inicial</span>
                  <Building2 className="w-3 h-3 text-slate-400" />
                </div>
                <p className="font-bold text-slate-800 dark:text-slate-200 tabular-nums text-xs sm:text-sm truncate mt-0.5">
                  {formatCurrency(activeMonth?.initialCash || 0, baseCurrency)}
                </p>
              </div>

              {/* Entradas */}
              <div className="p-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-xs">Entradas</span>
                  <TrendingUp className="w-3 h-3 text-emerald-500" />
                </div>
                <p className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums text-xs sm:text-sm truncate mt-0.5">
                  {formatCurrency(activeMonth?.totalEntradas || 0, baseCurrency)}
                </p>
              </div>

              {/* Salidas (siempre positivo) */}
              <div className="p-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-xs">Salidas</span>
                  <TrendingDown className="w-3 h-3 text-rose-500" />
                </div>
                <p className="font-bold text-rose-600 dark:text-rose-400 tabular-nums text-xs sm:text-sm truncate mt-0.5">
                  {formatCurrency(Math.abs(activeMonth?.totalSalidas || 0), baseCurrency)}
                </p>
              </div>

              {/* Flujo Neto */}
              <div className="p-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-xs">Flujo Neto</span>
                  <Wallet className="w-3 h-3 text-indigo-500" />
                </div>
                <p
                  className={`font-bold tabular-nums text-xs sm:text-sm truncate mt-0.5 ${
                    (activeMonth?.netFlow || 0) >= 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {(activeMonth?.netFlow || 0) > 0 ? '+' : ''}
                  {formatCurrency(activeMonth?.netFlow || 0, baseCurrency)}
                </p>
              </div>

              {/* Saldo Final de Caja */}
              <div className="col-span-2 p-2.5 bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-900/60 rounded-xl flex items-center justify-between">
                <div className="flex items-center space-x-1.5 text-indigo-700 dark:text-indigo-300 font-semibold">
                  <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span className="text-xs">Saldo Final de Caja</span>
                </div>
                <p
                  className={`font-extrabold tabular-nums text-xs sm:text-sm truncate ${
                    (activeMonth?.finalCash || 0) >= 0
                      ? 'text-indigo-950 dark:text-indigo-100'
                      : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {formatCurrency(activeMonth?.finalCash || 0, baseCurrency)}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. Collapsible Sections Accordions */}
      <div className="px-3 space-y-3">
        {type === 'INCOME_STATEMENT' ? (
          <>
            {/* Seccion 1: Ingresos */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
              <div
                onClick={() => toggleSection('income')}
                className="flex items-center justify-between p-3.5 cursor-pointer select-none bg-slate-50/60 dark:bg-slate-800/30"
              >
                <div className="flex items-center space-x-2.5">
                  <span className="px-2.5 py-1 rounded-lg text-xs font-bold border bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                    Ingresos
                  </span>
                  <span className="text-xs text-slate-400">({rootIncomeAccounts.length})</span>
                </div>

                <div className="flex items-center space-x-2 tabular-nums">
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    {formatCurrency(incomeVal, baseCurrency)}
                  </span>
                  {expandedSections.has('income') ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </div>
              </div>

              {expandedSections.has('income') && (
                <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
                  {rootIncomeAccounts.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400">
                      No hay cuentas de ingresos.
                    </div>
                  ) : (
                    rootIncomeAccounts.map((acc) => renderAccountNode(acc, 'DEFAULT'))
                  )}
                </div>
              )}
            </div>

            {/* Seccion 2: Gastos */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
              <div
                onClick={() => toggleSection('expenses')}
                className="flex items-center justify-between p-3.5 cursor-pointer select-none bg-slate-50/60 dark:bg-slate-800/30"
              >
                <div className="flex items-center space-x-2.5">
                  <span className="px-2.5 py-1 rounded-lg text-xs font-bold border bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20">
                    Gastos
                  </span>
                  <span className="text-xs text-slate-400">({rootExpenseAccounts.length})</span>
                </div>

                <div className="flex items-center space-x-2 tabular-nums">
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    {formatCurrency(expenseVal, baseCurrency)}
                  </span>
                  {expandedSections.has('expenses') ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </div>
              </div>

              {expandedSections.has('expenses') && (
                <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
                  {rootExpenseAccounts.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400">
                      No hay cuentas de gastos.
                    </div>
                  ) : (
                    rootExpenseAccounts.map((acc) => renderAccountNode(acc, 'DEFAULT'))
                  )}
                </div>
              )}
            </div>

            {/* Tarjeta Subtotal: Resultado Neto (P&L) */}
            <div className="bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 rounded-2xl p-4 shadow-xs flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Wallet className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span className="text-xs font-extrabold text-indigo-950 dark:text-indigo-200">
                  Resultado Neto (P&L)
                </span>
              </div>
              <span
                className={`text-xs sm:text-sm font-extrabold tabular-nums ${
                  netProfitVal >= 0
                    ? 'text-indigo-950 dark:text-indigo-100'
                    : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {formatCurrency(netProfitVal, baseCurrency)}
              </span>
            </div>
          </>
        ) : (
          <>
            {/* Caja Proyectada Seccion 1: Ingresos */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
              <div
                onClick={() => toggleSection('income')}
                className="flex items-center justify-between p-3.5 cursor-pointer select-none bg-slate-50/60 dark:bg-slate-800/30"
              >
                <div className="flex items-center space-x-2.5">
                  <span className="px-2.5 py-1 rounded-lg text-xs font-bold border bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                    Ingresos
                  </span>
                  <span className="text-xs text-slate-400">({rootIncomeAccounts.length})</span>
                </div>

                <div className="flex items-center space-x-2 tabular-nums">
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    {formatCurrency(activeMonth?.ingresosOperativos || 0, baseCurrency)}
                  </span>
                  {expandedSections.has('income') ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </div>
              </div>

              {expandedSections.has('income') && (
                <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
                  {rootIncomeAccounts.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400">No hay ingresos.</div>
                  ) : (
                    rootIncomeAccounts.map((acc) => renderAccountNode(acc, 'DEFAULT'))
                  )}
                </div>
              )}
            </div>

            {/* Caja Proyectada Seccion 2: Entradas Activo / Pasivo */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
              <div
                onClick={() => toggleSection('assetInflow')}
                className="flex items-center justify-between p-3.5 cursor-pointer select-none bg-slate-50/60 dark:bg-slate-800/30"
              >
                <div className="flex items-center space-x-2.5">
                  <span className="px-2.5 py-1 rounded-lg text-xs font-bold border bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20">
                    Entradas Activo / Pasivo
                  </span>
                  <span className="text-xs text-slate-400">
                    ({rootAssetLiabilityInflow.length})
                  </span>
                </div>

                <div className="flex items-center space-x-2 tabular-nums">
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    {formatCurrency(activeMonth?.entradasActivoPasivo || 0, baseCurrency)}
                  </span>
                  {expandedSections.has('assetInflow') ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </div>
              </div>

              {expandedSections.has('assetInflow') && (
                <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
                  {rootAssetLiabilityInflow.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400">
                      No hay entradas de balance.
                    </div>
                  ) : (
                    rootAssetLiabilityInflow.map((acc) => renderAccountNode(acc, 'CASH_IN'))
                  )}
                </div>
              )}
            </div>

            {/* Subtotal: Total Entradas */}
            <div className="bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/60 rounded-2xl p-3.5 shadow-xs flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                  Total Entradas
                </span>
              </div>
              <span className="text-xs font-extrabold text-emerald-700 dark:text-emerald-300 tabular-nums">
                {formatCurrency(activeMonth?.totalEntradas || 0, baseCurrency)}
              </span>
            </div>

            {/* Caja Proyectada Seccion 3: Egresos */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
              <div
                onClick={() => toggleSection('expenses')}
                className="flex items-center justify-between p-3.5 cursor-pointer select-none bg-slate-50/60 dark:bg-slate-800/30"
              >
                <div className="flex items-center space-x-2.5">
                  <span className="px-2.5 py-1 rounded-lg text-xs font-bold border bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20">
                    Egresos
                  </span>
                  <span className="text-xs text-slate-400">({rootExpenseAccounts.length})</span>
                </div>

                <div className="flex items-center space-x-2 tabular-nums">
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    {formatCurrency(Math.abs(activeMonth?.egresosOperativos || 0), baseCurrency)}
                  </span>
                  {expandedSections.has('expenses') ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </div>
              </div>

              {expandedSections.has('expenses') && (
                <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
                  {rootExpenseAccounts.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400">No hay egresos.</div>
                  ) : (
                    rootExpenseAccounts.map((acc) => renderAccountNode(acc, 'DEFAULT'))
                  )}
                </div>
              )}
            </div>

            {/* Caja Proyectada Seccion 4: Salidas Activo / Pasivo */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
              <div
                onClick={() => toggleSection('assetOutflow')}
                className="flex items-center justify-between p-3.5 cursor-pointer select-none bg-slate-50/60 dark:bg-slate-800/30"
              >
                <div className="flex items-center space-x-2.5">
                  <span className="px-2.5 py-1 rounded-lg text-xs font-bold border bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20">
                    Salidas Activo / Pasivo
                  </span>
                  <span className="text-xs text-slate-400">
                    ({rootAssetLiabilityOutflow.length})
                  </span>
                </div>

                <div className="flex items-center space-x-2 tabular-nums">
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    {formatCurrency(Math.abs(activeMonth?.salidasActivoPasivo || 0), baseCurrency)}
                  </span>
                  {expandedSections.has('assetOutflow') ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </div>
              </div>

              {expandedSections.has('assetOutflow') && (
                <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
                  {rootAssetLiabilityOutflow.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400">
                      No hay salidas de balance.
                    </div>
                  ) : (
                    rootAssetLiabilityOutflow.map((acc) => renderAccountNode(acc, 'CASH_OUT'))
                  )}
                </div>
              )}
            </div>

            {/* Subtotal: Total Salidas */}
            <div className="bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-900/60 rounded-2xl p-3.5 shadow-xs flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <TrendingDown className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                <span className="text-xs font-bold text-rose-900 dark:text-rose-200">
                  Total Salidas
                </span>
              </div>
              <span className="text-xs font-extrabold text-rose-700 dark:text-rose-300 tabular-nums">
                {formatCurrency(Math.abs(activeMonth?.totalSalidas || 0), baseCurrency)}
              </span>
            </div>

            {/* Subtotal: Flujo Neto */}
            <div className="bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl p-3.5 shadow-xs flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Wallet className="w-4 h-4 text-indigo-500" />
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  Flujo Neto
                </span>
              </div>
              <span
                className={`text-xs font-extrabold tabular-nums ${
                  (activeMonth?.netFlow || 0) >= 0
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {(activeMonth?.netFlow || 0) > 0 ? '+' : ''}
                {formatCurrency(activeMonth?.netFlow || 0, baseCurrency)}
              </span>
            </div>

            {/* Destacado: Saldo Final de Caja */}
            <div className="bg-indigo-50/90 dark:bg-indigo-950/50 border-2 border-indigo-300/80 dark:border-indigo-800/80 rounded-2xl p-4 shadow-xs flex items-center justify-between">
              <div className="flex items-center space-x-1.5">
                <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span className="text-xs font-extrabold text-indigo-950 dark:text-indigo-100 tracking-tight">
                  Saldo Final de Caja
                </span>
              </div>
              <span
                className={`text-xs sm:text-sm font-black tabular-nums ${
                  (activeMonth?.finalCash || 0) >= 0
                    ? 'text-indigo-950 dark:text-indigo-100'
                    : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {formatCurrency(activeMonth?.finalCash || 0, baseCurrency)}
              </span>
            </div>
          </>
        )}

        {/* Bottom spacer to prevent clipping by mobile navigation */}
        <div className="h-16 w-full" aria-hidden="true" />
      </div>
    </div>
  );
};
