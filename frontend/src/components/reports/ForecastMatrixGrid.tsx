'use client';

import React, { useState } from 'react';
import {
  ChevronRight,
  ChevronDown,
  File,
  TrendingUp,
  TrendingDown,
  Wallet,
  Building2,
  ShieldCheck,
} from 'lucide-react';
import { formatCurrency } from '../../lib/utils';

export interface AccountForecastItem {
  accountId: string;
  accountName: string;
  accountType: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE';
  parentId: string | null;
  values: { [periodId: string]: number };
}

export interface MonthForecastItem {
  periodId: string;
  periodName: string;
  status?: string;
  isReal: boolean;
  // Cash flow fields
  initialCash?: number;
  ingresosOperativos?: number;
  entradasActivoPasivo?: number;
  totalEntradas?: number;
  egresosOperativos?: number;
  salidasActivoPasivo?: number;
  totalSalidas?: number;
  netFlow?: number;
  finalCash?: number;
  // Income statement fields
  income?: number;
  expense?: number;
  netProfit?: number;
}

export interface ForecastMatrixGridProps {
  type: 'CASH_FLOW' | 'INCOME_STATEMENT';
  months: MonthForecastItem[];
  accounts: AccountForecastItem[];
  baseCurrency?: any;
}

const SPANISH_MONTHS_SHORT = [
  'Ene',
  'Feb',
  'Mar',
  'Abr',
  'May',
  'Jun',
  'Jul',
  'Ago',
  'Sep',
  'Oct',
  'Nov',
  'Dic',
];

function formatMonthHeader(periodName: string): { label: string; year: string } {
  const match = periodName.match(/^(\d{4})-(\d{2})/);
  if (!match) return { label: periodName, year: '' };
  const year = match[1];
  const monthIdx = parseInt(match[2], 10) - 1;
  const label = SPANISH_MONTHS_SHORT[monthIdx] || periodName;
  return { label, year };
}

export const ForecastMatrixGrid: React.FC<ForecastMatrixGridProps> = ({
  type,
  months,
  accounts,
  baseCurrency,
}) => {
  // Collapsible section state
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    income: false,
    expenses: false,
    assetInflow: false,
    assetOutflow: false,
  });

  // Account tree node expansion state
  const [expandedAccounts, setExpandedAccounts] = useState<Record<string, boolean>>({});

  const toggleSection = (sectionKey: string) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [sectionKey]: !prev[sectionKey],
    }));
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

  const isAccountVisible = (acc: AccountForecastItem) => {
    let parentId = acc.parentId;
    while (parentId) {
      if (!expandedAccounts[parentId]) {
        return false;
      }
      const parent = accounts.find((a) => a.accountId === parentId);
      parentId = parent ? parent.parentId : null;
    }
    return true;
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

  const getSubtreeRowTotal = (
    accId: string,
    flowFilter: 'CASH_IN' | 'CASH_OUT' | 'DEFAULT',
  ): number => {
    return months.reduce((acc, m) => acc + getSubtreeValue(accId, m.periodId, flowFilter), 0);
  };

  // Render Account Row
  const renderAccountRow = (
    acc: AccountForecastItem,
    flowFilter: 'CASH_IN' | 'CASH_OUT' | 'DEFAULT',
  ) => {
    if (!isAccountVisible(acc)) return null;

    const depth = getAccountDepth(acc);
    const childrenPresent = hasChildren(acc.accountId);
    const isExpanded = expandedAccounts[acc.accountId];
    const rowTotal = getSubtreeRowTotal(acc.accountId, flowFilter);

    // Recursively render child accounts if expanded
    const directChildren = accounts.filter((a) => a.parentId === acc.accountId);

    return (
      <React.Fragment key={acc.accountId}>
        <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors h-9">
          {/* Sticky left Account Name */}
          <td
            className="px-3 py-1.5 border-r border-slate-200 dark:border-slate-800 font-sans sticky left-0 z-10 bg-white dark:bg-slate-900 truncate"
            style={{ paddingLeft: `${Math.max(12, depth * 20 + 12)}px` }}
          >
            <div className="flex items-center gap-1.5 min-w-0">
              {childrenPresent ? (
                <button
                  type="button"
                  onClick={() => toggleAccount(acc.accountId)}
                  className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-md transition-colors cursor-pointer shrink-0 text-slate-500 dark:text-slate-400"
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
                className={`truncate block text-xs ${
                  childrenPresent
                    ? 'font-bold text-slate-900 dark:text-slate-100'
                    : 'text-slate-700 dark:text-slate-300'
                }`}
              >
                {acc.accountName}
              </span>
            </div>
          </td>

          {/* Month Columns */}
          {months.map((m) => {
            const val = getSubtreeValue(acc.accountId, m.periodId, flowFilter);
            return (
              <td
                key={m.periodId}
                className={`p-2 text-right border-r border-slate-200/60 dark:border-slate-800/60 font-mono text-xs tabular-nums whitespace-nowrap ${
                  val !== 0
                    ? childrenPresent
                      ? 'font-bold text-slate-900 dark:text-slate-100'
                      : 'text-slate-800 dark:text-slate-200 font-medium'
                    : 'text-slate-400 dark:text-slate-600'
                }`}
              >
                {val === 0 ? '-' : formatCurrency(val, baseCurrency)}
              </td>
            );
          })}

          {/* Row Total */}
          <td className="p-2 text-right font-mono text-xs font-bold text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-900/80 tabular-nums truncate">
            {rowTotal === 0 ? '-' : formatCurrency(rowTotal, baseCurrency)}
          </td>
        </tr>

        {isExpanded && directChildren.map((child) => renderAccountRow(child, flowFilter))}
      </React.Fragment>
    );
  };

  return (
    <div className="flex flex-col h-full w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs text-left border-collapse table-fixed min-w-full">
          {/* Table Header */}
          <thead className="bg-slate-100/90 dark:bg-slate-950 sticky top-0 z-20 font-sans border-b border-slate-200 dark:border-slate-800 backdrop-blur-xs">
            <tr>
              <th className="p-3 w-56 sm:w-72 font-bold text-slate-800 dark:text-slate-200 border-r border-slate-200/60 dark:border-slate-800/60 sticky left-0 bg-slate-100 dark:bg-slate-950 z-30 truncate">
                Concepto / Partida
              </th>
              {months.map((m) => {
                const { label, year } = formatMonthHeader(m.periodName);
                return (
                  <th
                    key={m.periodId}
                    className="p-2.5 w-28 sm:w-36 text-right font-bold text-slate-800 dark:text-slate-200 border-r border-slate-200/60 dark:border-slate-800/60"
                  >
                    <div className="flex flex-col items-end justify-center space-y-1">
                      <div className="flex items-center space-x-1">
                        <span className="text-xs font-bold">{label}</span>
                        {year && (
                          <span className="text-2xs text-slate-400 font-medium">{year}</span>
                        )}
                      </div>
                      <span
                        className={`text-2xs px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border ${
                          m.isReal
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                            : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30'
                        }`}
                      >
                        {m.isReal ? 'Real' : 'Proyectado'}
                      </span>
                    </div>
                  </th>
                );
              })}
              <th className="p-3 w-28 sm:w-36 text-right font-bold text-slate-900 dark:text-slate-100 bg-slate-100/60 dark:bg-slate-900 truncate">
                Total
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
            {type === 'CASH_FLOW' ? (
              /* ========================================================================= */
              /* --- FLUXO DE CAJA PROYECTADO --- */
              /* ========================================================================= */
              <>
                {/* 1. Saldo Inicial de Caja */}
                <tr className="bg-slate-50/50 dark:bg-slate-950/60 font-bold border-b border-slate-200 dark:border-slate-800 h-9">
                  <td className="px-3 py-2 border-r border-slate-200 dark:border-slate-800 font-sans text-slate-800 dark:text-slate-200 sticky left-0 bg-slate-50/95 dark:bg-slate-950 z-10 truncate">
                    <div className="flex items-center space-x-1.5">
                      <Building2 className="w-3.5 h-3.5 text-slate-500" />
                      <span>(+) Saldo Inicial de Caja</span>
                    </div>
                  </td>
                  {months.map((m) => (
                    <td
                      key={m.periodId}
                      className="p-2 text-right border-r border-slate-200/60 dark:border-slate-800/60 text-slate-800 dark:text-slate-200 tabular-nums whitespace-nowrap"
                    >
                      {formatCurrency(m.initialCash || 0, baseCurrency)}
                    </td>
                  ))}
                  <td className="p-2 text-right text-slate-500 bg-slate-50/80 dark:bg-slate-900/80">
                    —
                  </td>
                </tr>

                {/* 2. Sección: (+) Ingresos Operativos */}
                <tr className="bg-slate-100/70 dark:bg-slate-950 font-bold border-t border-b border-slate-200 dark:border-slate-800">
                  <td
                    colSpan={months.length + 2}
                    onClick={() => toggleSection('income')}
                    className="px-4 py-2.5 font-sans sticky left-0 bg-slate-100/90 dark:bg-slate-950 z-10 cursor-pointer select-none"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-0.5 rounded-lg text-xs font-bold border bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">
                          (+) Ingresos Operativos
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 text-slate-400">
                        {collapsedSections.income ? (
                          <ChevronRight className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </div>
                    </div>
                  </td>
                </tr>

                {/* Sub-árbol de Ingresos */}
                {!collapsedSections.income &&
                  accounts
                    .filter((a) => a.accountType === 'INCOME' && a.parentId === null)
                    .map((acc) => renderAccountRow(acc, 'DEFAULT'))}

                {/* 3. Sección: (+) Entradas de Activo / Pasivo */}
                <tr className="bg-slate-100/70 dark:bg-slate-950 font-bold border-t border-b border-slate-200 dark:border-slate-800">
                  <td
                    colSpan={months.length + 2}
                    onClick={() => toggleSection('assetInflow')}
                    className="px-4 py-2.5 font-sans sticky left-0 bg-slate-100/90 dark:bg-slate-950 z-10 cursor-pointer select-none"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-0.5 rounded-lg text-xs font-bold border bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30">
                          (+) Entradas de Activo / Pasivo
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 text-slate-400">
                        {collapsedSections.assetInflow ? (
                          <ChevronRight className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </div>
                    </div>
                  </td>
                </tr>

                {/* Sub-árbol de Entradas Activo/Pasivo */}
                {!collapsedSections.assetInflow &&
                  accounts
                    .filter(
                      (a) =>
                        (a.accountType === 'ASSET' || a.accountType === 'LIABILITY') &&
                        a.parentId === null,
                    )
                    .map((acc) => renderAccountRow(acc, 'CASH_IN'))}

                {/* 4. Subtotal: (=) TOTAL ENTRADAS DE CAJA */}
                <tr className="bg-emerald-50/40 dark:bg-emerald-950/20 font-bold border-t border-b border-emerald-200/60 dark:border-emerald-900/60 h-9">
                  <td className="px-3 py-2 border-r border-emerald-200/60 dark:border-emerald-900/60 font-sans text-emerald-800 dark:text-emerald-300 sticky left-0 bg-emerald-50 dark:bg-slate-950 truncate">
                    <div className="flex items-center space-x-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                      <span>(=) Total Entradas de Caja</span>
                    </div>
                  </td>
                  {months.map((m) => (
                    <td
                      key={m.periodId}
                      className="p-2 text-right border-r border-emerald-200/60 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-300 tabular-nums whitespace-nowrap"
                    >
                      {formatCurrency(m.totalEntradas || 0, baseCurrency)}
                    </td>
                  ))}
                  <td className="p-2 text-right text-emerald-800 dark:text-emerald-200 bg-emerald-100/40 dark:bg-slate-900 tabular-nums font-extrabold truncate">
                    {formatCurrency(
                      months.reduce((acc, m) => acc + (m.totalEntradas || 0), 0),
                      baseCurrency,
                    )}
                  </td>
                </tr>

                {/* 5. Sección: (-) Egresos Operativos */}
                <tr className="bg-slate-100/70 dark:bg-slate-950 font-bold border-t border-b border-slate-200 dark:border-slate-800">
                  <td
                    colSpan={months.length + 2}
                    onClick={() => toggleSection('expenses')}
                    className="px-4 py-2.5 font-sans sticky left-0 bg-slate-100/90 dark:bg-slate-950 z-10 cursor-pointer select-none"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-0.5 rounded-lg text-xs font-bold border bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30">
                          (-) Egresos Operativos
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 text-slate-400">
                        {collapsedSections.expenses ? (
                          <ChevronRight className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </div>
                    </div>
                  </td>
                </tr>

                {/* Sub-árbol de Gastos */}
                {!collapsedSections.expenses &&
                  accounts
                    .filter((a) => a.accountType === 'EXPENSE' && a.parentId === null)
                    .map((acc) => renderAccountRow(acc, 'DEFAULT'))}

                {/* 6. Sección: (-) Salidas de Activo / Pasivo */}
                <tr className="bg-slate-100/70 dark:bg-slate-950 font-bold border-t border-b border-slate-200 dark:border-slate-800">
                  <td
                    colSpan={months.length + 2}
                    onClick={() => toggleSection('assetOutflow')}
                    className="px-4 py-2.5 font-sans sticky left-0 bg-slate-100/90 dark:bg-slate-950 z-10 cursor-pointer select-none"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-0.5 rounded-lg text-xs font-bold border bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30">
                          (-) Salidas de Activo / Pasivo
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 text-slate-400">
                        {collapsedSections.assetOutflow ? (
                          <ChevronRight className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </div>
                    </div>
                  </td>
                </tr>

                {/* Sub-árbol de Salidas Activo/Pasivo */}
                {!collapsedSections.assetOutflow &&
                  accounts
                    .filter(
                      (a) =>
                        (a.accountType === 'ASSET' || a.accountType === 'LIABILITY') &&
                        a.parentId === null,
                    )
                    .map((acc) => renderAccountRow(acc, 'CASH_OUT'))}

                {/* 7. Subtotal: (=) TOTAL SALIDAS DE CAJA */}
                <tr className="bg-rose-50/40 dark:bg-rose-950/20 font-bold border-t border-b border-rose-200/60 dark:border-rose-900/60 h-9">
                  <td className="px-3 py-2 border-r border-rose-200/60 dark:border-rose-900/60 font-sans text-rose-800 dark:text-rose-300 sticky left-0 bg-rose-50 dark:bg-slate-950 truncate">
                    <div className="flex items-center space-x-1.5">
                      <TrendingDown className="w-3.5 h-3.5 text-rose-600" />
                      <span>(=) Total Salidas de Caja</span>
                    </div>
                  </td>
                  {months.map((m) => (
                    <td
                      key={m.periodId}
                      className="p-2 text-right border-r border-rose-200/60 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 tabular-nums whitespace-nowrap"
                    >
                      {formatCurrency(m.totalSalidas || 0, baseCurrency)}
                    </td>
                  ))}
                  <td className="p-2 text-right text-rose-800 dark:text-rose-200 bg-rose-100/40 dark:bg-slate-900 tabular-nums font-extrabold truncate">
                    {formatCurrency(
                      months.reduce((acc, m) => acc + (m.totalSalidas || 0), 0),
                      baseCurrency,
                    )}
                  </td>
                </tr>

                {/* 8. (=) FLUJO NETO DEL PERÍODO */}
                <tr className="bg-slate-100/60 dark:bg-slate-950/70 font-bold border-t border-b border-slate-300 dark:border-slate-700 h-9">
                  <td className="px-3 py-2 border-r border-slate-200 dark:border-slate-800 font-sans text-slate-900 dark:text-slate-100 sticky left-0 bg-slate-100 dark:bg-slate-950 truncate">
                    <div className="flex items-center space-x-1.5">
                      <Wallet className="w-3.5 h-3.5 text-indigo-500" />
                      <span>(=) Flujo Neto del Período</span>
                    </div>
                  </td>
                  {months.map((m) => {
                    const net = m.netFlow || 0;
                    return (
                      <td
                        key={m.periodId}
                        className={`p-2 text-right border-r border-slate-200 dark:border-slate-800 font-bold tabular-nums whitespace-nowrap ${
                          net >= 0
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {net > 0 ? '+' : ''}
                        {formatCurrency(net, baseCurrency)}
                      </td>
                    );
                  })}
                  <td className="p-2 text-right font-extrabold text-slate-900 dark:text-slate-100 bg-slate-200/40 dark:bg-slate-950 tabular-nums truncate">
                    {formatCurrency(
                      months.reduce((acc, m) => acc + (m.netFlow || 0), 0),
                      baseCurrency,
                    )}
                  </td>
                </tr>

                {/* 9. (=) SALDO FINAL DE CAJA (Resaltado Sobrio sin Sparkles) */}
                <tr className="bg-indigo-50/70 dark:bg-indigo-950/40 font-extrabold border-t-2 border-indigo-200 dark:border-indigo-800 h-10">
                  <td className="px-3 py-2 border-r border-indigo-200 dark:border-indigo-800 font-sans text-indigo-900 dark:text-indigo-200 sticky left-0 bg-indigo-50 dark:bg-slate-950 truncate">
                    <div className="flex items-center space-x-1.5">
                      <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <span className="tracking-tight">(=) SALDO FINAL DE CAJA</span>
                    </div>
                  </td>
                  {months.map((m) => {
                    const final = m.finalCash || 0;
                    return (
                      <td
                        key={m.periodId}
                        className={`p-2 text-right border-r border-indigo-200 dark:border-indigo-800 font-bold text-xs tabular-nums whitespace-nowrap ${
                          final >= 0
                            ? 'text-indigo-950 dark:text-indigo-100'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {formatCurrency(final, baseCurrency)}
                      </td>
                    );
                  })}
                  <td className="p-2 text-right font-black text-indigo-950 dark:text-indigo-100 bg-indigo-100/60 dark:bg-indigo-900/60 tabular-nums truncate">
                    {months.length > 0
                      ? formatCurrency(months[months.length - 1].finalCash || 0, baseCurrency)
                      : '—'}
                  </td>
                </tr>
              </>
            ) : (
              /* ========================================================================= */
              /* --- ESTADO DE RESULTADOS (P&L) PROYECTADO --- */
              /* ========================================================================= */
              <>
                {/* 1. Sección: (+) Ingresos Devengados */}
                <tr className="bg-slate-100/70 dark:bg-slate-950 font-bold border-t border-b border-slate-200 dark:border-slate-800">
                  <td
                    colSpan={months.length + 2}
                    onClick={() => toggleSection('income')}
                    className="px-4 py-2.5 font-sans sticky left-0 bg-slate-100/90 dark:bg-slate-950 z-10 cursor-pointer select-none"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-0.5 rounded-lg text-xs font-bold border bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">
                          (+) Ingresos Devengados
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 text-slate-400">
                        {collapsedSections.income ? (
                          <ChevronRight className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </div>
                    </div>
                  </td>
                </tr>

                {/* Sub-árbol de Ingresos */}
                {!collapsedSections.income &&
                  accounts
                    .filter((a) => a.accountType === 'INCOME' && a.parentId === null)
                    .map((acc) => renderAccountRow(acc, 'DEFAULT'))}

                {/* Subtotal Ingresos */}
                <tr className="bg-emerald-50/40 dark:bg-emerald-950/20 font-bold border-t border-b border-emerald-200/60 dark:border-emerald-900/60 h-9">
                  <td className="px-3 py-2 border-r border-emerald-200/60 dark:border-emerald-900/60 font-sans text-emerald-800 dark:text-emerald-300 sticky left-0 bg-emerald-50 dark:bg-slate-950 truncate">
                    <div className="flex items-center space-x-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Total Ingresos Devengados</span>
                    </div>
                  </td>
                  {months.map((m) => (
                    <td
                      key={m.periodId}
                      className="p-2 text-right border-r border-emerald-200/60 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-300 tabular-nums whitespace-nowrap"
                    >
                      {formatCurrency(m.income || 0, baseCurrency)}
                    </td>
                  ))}
                  <td className="p-2 text-right text-emerald-800 dark:text-emerald-200 bg-emerald-100/40 dark:bg-slate-900 tabular-nums font-extrabold truncate">
                    {formatCurrency(
                      months.reduce((acc, m) => acc + (m.income || 0), 0),
                      baseCurrency,
                    )}
                  </td>
                </tr>

                {/* 2. Sección: (-) Gastos Devengados */}
                <tr className="bg-slate-100/70 dark:bg-slate-950 font-bold border-t border-b border-slate-200 dark:border-slate-800">
                  <td
                    colSpan={months.length + 2}
                    onClick={() => toggleSection('expenses')}
                    className="px-4 py-2.5 font-sans sticky left-0 bg-slate-100/90 dark:bg-slate-950 z-10 cursor-pointer select-none"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-0.5 rounded-lg text-xs font-bold border bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30">
                          (-) Gastos Devengados
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 text-slate-400">
                        {collapsedSections.expenses ? (
                          <ChevronRight className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </div>
                    </div>
                  </td>
                </tr>

                {/* Sub-árbol de Gastos */}
                {!collapsedSections.expenses &&
                  accounts
                    .filter((a) => a.accountType === 'EXPENSE' && a.parentId === null)
                    .map((acc) => renderAccountRow(acc, 'DEFAULT'))}

                {/* Subtotal Gastos */}
                <tr className="bg-rose-50/40 dark:bg-rose-950/20 font-bold border-t border-b border-rose-200/60 dark:border-rose-900/60 h-9">
                  <td className="px-3 py-2 border-r border-rose-200/60 dark:border-rose-900/60 font-sans text-rose-800 dark:text-rose-300 sticky left-0 bg-rose-50 dark:bg-slate-950 truncate">
                    <div className="flex items-center space-x-1.5">
                      <TrendingDown className="w-3.5 h-3.5 text-rose-600" />
                      <span>Total Gastos Devengados</span>
                    </div>
                  </td>
                  {months.map((m) => (
                    <td
                      key={m.periodId}
                      className="p-2 text-right border-r border-rose-200/60 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 tabular-nums whitespace-nowrap"
                    >
                      {formatCurrency(m.expense || 0, baseCurrency)}
                    </td>
                  ))}
                  <td className="p-2 text-right text-rose-800 dark:text-rose-200 bg-rose-100/40 dark:bg-slate-900 tabular-nums font-extrabold truncate">
                    {formatCurrency(
                      months.reduce((acc, m) => acc + (m.expense || 0), 0),
                      baseCurrency,
                    )}
                  </td>
                </tr>

                {/* 3. (=) RESULTADO NETO (P&L) */}
                <tr className="bg-indigo-50/70 dark:bg-indigo-950/40 font-extrabold border-t-2 border-indigo-200 dark:border-indigo-800 h-10">
                  <td className="px-3 py-2 border-r border-indigo-200 dark:border-indigo-800 font-sans text-indigo-900 dark:text-indigo-200 sticky left-0 bg-indigo-50 dark:bg-slate-950 truncate">
                    <div className="flex items-center space-x-1.5">
                      <Wallet className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <span className="tracking-tight">(=) RESULTADO NETO (P&L)</span>
                    </div>
                  </td>
                  {months.map((m) => {
                    const net = m.netProfit || 0;
                    return (
                      <td
                        key={m.periodId}
                        className={`p-2 text-right border-r border-indigo-200 dark:border-indigo-800 font-bold text-xs tabular-nums whitespace-nowrap ${
                          net >= 0
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {formatCurrency(net, baseCurrency)}
                      </td>
                    );
                  })}
                  <td className="p-2 text-right font-black text-indigo-950 dark:text-indigo-100 bg-indigo-100/60 dark:bg-indigo-900/60 tabular-nums truncate">
                    {formatCurrency(
                      months.reduce((acc, m) => acc + (m.netProfit || 0), 0),
                      baseCurrency,
                    )}
                  </td>
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
