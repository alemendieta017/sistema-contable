'use client';

import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import {
  Calendar,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Scale,
  Settings,
  ArrowRight,
  RefreshCw,
  PlusCircle,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type Period = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: 'OPEN' | 'CLOSED' | 'PLANNING';
};

type FiscalYear = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: 'OPEN' | 'CLOSED' | 'PLANNING';
  periods?: Period[];
};

type BudgetItem = {
  accountId: string;
  accountName: string;
  accountType: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE';
  parentId: string | null;
  isCashOrBank: boolean;
  amount: number;
};

type BudgetDetail = {
  id: string;
  periodId: string;
  periodName: string;
  friendlyName: string;
  startDate: string;
  endDate: string;
  isLocked: boolean;
  items: BudgetItem[];
};

type MatrixRow = {
  accountId: string;
  accountName: string;
  accountType: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE';
  amounts: { [periodId: string]: number }; // map periodId -> amount
};

export default function BudgetsPage() {
  const router = useRouter();
  const [fiscalYears, setFiscalYears] = useState<FiscalYear[]>([]);
  const [selectedFiscalYearId, setSelectedFiscalYearId] = useState<string>('');
  const [periods, setPeriods] = useState<Period[]>([]);
  const [budgetDetails, setBudgetDetails] = useState<{ [periodId: string]: BudgetDetail }>({});

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadFiscalYearsAndPeriods();
  }, []);

  const loadFiscalYearsAndPeriods = async () => {
    try {
      setLoading(true);
      setError('');

      // Load fiscal years from api
      const fyList = await api.fiscalYears.list();
      setFiscalYears(fyList || []);

      if (fyList && fyList.length > 0) {
        // Default to the open or most recent fiscal year
        const openFy = fyList.find((fy: any) => fy.status === 'OPEN') || fyList[0];
        setSelectedFiscalYearId(openFy.id);
      } else {
        setLoading(false);
      }
    } catch (err: any) {
      setError('Error al cargar los ejercicios fiscales.');
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedFiscalYearId) {
      loadPeriodsAndBudgets(selectedFiscalYearId);
    }
  }, [selectedFiscalYearId]);

  const loadPeriodsAndBudgets = async (fyId: string) => {
    try {
      setLoading(true);
      setError('');

      // Load periods for this fiscal year
      const allPeriods = await api.periods.list();
      const fyPeriods = (allPeriods || []).filter((p: any) => p.fiscalYearId === fyId);

      // Sort periods chronologically
      fyPeriods.sort((a: any, b: any) => a.startDate.localeCompare(b.startDate));
      setPeriods(fyPeriods);

      // Load budget details for each period in parallel
      const detailsMap: { [periodId: string]: BudgetDetail } = {};
      await Promise.all(
        fyPeriods.map(async (p: Period) => {
          try {
            const detail = await api.budgets.getByPeriod(p.id);
            detailsMap[p.id] = detail;
          } catch (e) {
            // If budget does not exist yet or fails, use empty budget mock
            detailsMap[p.id] = {
              id: '',
              periodId: p.id,
              periodName: p.name,
              friendlyName: p.name,
              startDate: p.startDate,
              endDate: p.endDate,
              isLocked: p.status === 'CLOSED',
              items: [],
            };
          }
        }),
      );
      setBudgetDetails(detailsMap);
    } catch (err: any) {
      setError('Error al cargar los presupuestos mensuales.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-24">
        <div className="w-10 h-10 border-4 border-indigo-650 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <span className="text-sm text-slate-500 font-semibold dark:text-slate-400">
          Cargando Matriz Anual...
        </span>
      </div>
    );
  }

  // 1. Collect all unique accounts across all months/budgets
  const accountMap = new Map<string, { name: string; type: any }>();
  Object.values(budgetDetails).forEach((detail) => {
    detail.items.forEach((item) => {
      // Ignore cash or bank in budgeting rows
      if (!item.isCashOrBank && item.accountType !== 'EQUITY') {
        accountMap.set(item.accountId, { name: item.accountName, type: item.accountType });
      }
    });
  });

  // 2. Build rows grouped by type
  const rows: MatrixRow[] = Array.from(accountMap.entries()).map(([accountId, accInfo]) => {
    const rowAmounts: { [periodId: string]: number } = {};
    periods.forEach((p) => {
      const budgetDetail = budgetDetails[p.id];
      const matchingItem = budgetDetail?.items.find((item) => item.accountId === accountId);
      rowAmounts[p.id] = matchingItem ? matchingItem.amount : 0;
    });

    return {
      accountId,
      accountName: accInfo.name,
      accountType: accInfo.type,
      amounts: rowAmounts,
    };
  });

  // Filter rows by type
  const incomeRows = rows.filter((r) => r.accountType === 'INCOME');
  const expenseRows = rows.filter((r) => r.accountType === 'EXPENSE');
  const balanceRows = rows.filter(
    (r) => r.accountType === 'ASSET' || r.accountType === 'LIABILITY',
  );

  // Helper to sum column values for a specific set of rows
  const getColumnTotal = (periodId: string, rowSet: MatrixRow[]) => {
    return rowSet.reduce((sum, row) => sum + (row.amounts[periodId] || 0), 0);
  };

  const formatVal = (val: number) => {
    if (val === 0) return '-';
    return `₲${Math.round(val).toLocaleString('es-PY')}`;
  };

  // Helper to get month label from period name (e.g. "2026-01" -> "Ene")
  const getMonthLabel = (periodName: string) => {
    const [_, m] = periodName.split('-');
    const months = [
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
    return months[parseInt(m, 10) - 1] || periodName;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header card */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-2">
            Matriz Anual de Presupuestos
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Consolidado anual de planificación mensual de ingresos, gastos, inversiones y
            amortizaciones.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Ejercicio:
          </label>
          <select
            value={selectedFiscalYearId}
            onChange={(e) => setSelectedFiscalYearId(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold focus:border-indigo-500 outline-none text-slate-850 dark:text-slate-200"
          >
            {fiscalYears.map((fy) => (
              <option key={fy.id} value={fy.id}>
                {fy.name} (
                {fy.status === 'OPEN'
                  ? 'Abierto'
                  : fy.status === 'CLOSED'
                    ? 'Cerrado'
                    : 'Planificación'}
                )
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="p-4 text-xs text-red-700 bg-red-50 dark:bg-red-950/20 dark:text-red-400 rounded-2xl border border-red-150/40">
          {error}
        </div>
      )}

      {/* Main Matrix table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-150/60 dark:border-slate-800/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse table-fixed min-w-[1500px]">
            {/* Table Header */}
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-850 border-b border-slate-100 dark:border-slate-800">
                <th className="p-4 text-[10px] font-extrabold uppercase tracking-wider text-slate-500 w-[240px] sticky left-0 bg-slate-50 dark:bg-slate-850 z-10">
                  Concepto / Cuenta
                </th>
                {periods.map((p) => (
                  <th
                    key={p.id}
                    onClick={() => router.push(`/budgets/${p.id}/edit`)}
                    className="p-4 text-right pr-6 cursor-pointer group hover:bg-indigo-50/50 dark:hover:bg-slate-800 transition"
                  >
                    <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 group-hover:text-indigo-650 dark:group-hover:text-indigo-400">
                      {getMonthLabel(p.name)}
                    </div>
                    <div className="text-[8px] text-slate-400 dark:text-slate-500 font-semibold mt-0.5 group-hover:text-indigo-500/80 flex items-center justify-end gap-0.5">
                      Editar{' '}
                      <ArrowRight className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {/* --- SECTION 1: INGRESOS --- */}
              <tr className="bg-slate-50/30 dark:bg-slate-900/40">
                <td className="p-3 font-extrabold text-[10px] uppercase text-indigo-650 dark:text-indigo-400 tracking-wider sticky left-0 bg-slate-50/95 dark:bg-slate-900/95 z-10 flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Ingresos</span>
                </td>
                {periods.map((p) => (
                  <td key={p.id} className="p-3 bg-slate-50/30 dark:bg-slate-900/40"></td>
                ))}
              </tr>
              {incomeRows.map((row) => (
                <tr
                  key={row.accountId}
                  className="hover:bg-slate-50/50 dark:hover:bg-slate-850/20 transition"
                >
                  <td className="p-3 font-semibold text-slate-700 dark:text-slate-300 pl-6 sticky left-0 bg-white dark:bg-slate-900 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] border-r border-slate-50 dark:border-slate-850">
                    {row.accountName}
                  </td>
                  {periods.map((p) => (
                    <td
                      key={p.id}
                      className="p-3 text-right pr-6 font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap"
                    >
                      {formatVal(row.amounts[p.id])}
                    </td>
                  ))}
                </tr>
              ))}
              {/* Total Ingresos */}
              <tr className="bg-slate-50/10 font-bold border-t border-slate-100 dark:border-slate-800">
                <td className="p-3 pl-6 sticky left-0 bg-slate-50/90 dark:bg-slate-900/90 z-10">
                  Total Ingresos
                </td>
                {periods.map((p) => (
                  <td
                    key={p.id}
                    className="p-3 text-right pr-6 text-green-600 dark:text-green-400 font-extrabold whitespace-nowrap"
                  >
                    {formatVal(getColumnTotal(p.id, incomeRows))}
                  </td>
                ))}
              </tr>

              {/* --- SECTION 2: EGRESOS --- */}
              <tr className="bg-slate-50/30 dark:bg-slate-900/40 border-t-2 border-slate-100 dark:border-slate-800">
                <td className="p-3 font-extrabold text-[10px] uppercase text-indigo-650 dark:text-indigo-400 tracking-wider sticky left-0 bg-slate-50/95 dark:bg-slate-900/95 z-10 flex items-center gap-1.5">
                  <TrendingDown className="w-3.5 h-3.5" />
                  <span>Egresos</span>
                </td>
                {periods.map((p) => (
                  <td key={p.id} className="p-3 bg-slate-50/30 dark:bg-slate-900/40"></td>
                ))}
              </tr>
              {expenseRows.map((row) => (
                <tr
                  key={row.accountId}
                  className="hover:bg-slate-50/50 dark:hover:bg-slate-850/20 transition"
                >
                  <td className="p-3 font-semibold text-slate-700 dark:text-slate-300 pl-6 sticky left-0 bg-white dark:bg-slate-900 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] border-r border-slate-50 dark:border-slate-850">
                    {row.accountName}
                  </td>
                  {periods.map((p) => (
                    <td
                      key={p.id}
                      className="p-3 text-right pr-6 font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap"
                    >
                      {formatVal(row.amounts[p.id])}
                    </td>
                  ))}
                </tr>
              ))}
              {/* Total Egresos */}
              <tr className="bg-slate-50/10 font-bold border-t border-slate-100 dark:border-slate-800">
                <td className="p-3 pl-6 sticky left-0 bg-slate-50/90 dark:bg-slate-900/90 z-10">
                  Total Egresos
                </td>
                {periods.map((p) => (
                  <td
                    key={p.id}
                    className="p-3 text-right pr-6 text-red-500 dark:text-red-400 font-extrabold whitespace-nowrap"
                  >
                    {formatVal(getColumnTotal(p.id, expenseRows))}
                  </td>
                ))}
              </tr>

              {/* --- SECTION 3: BALANCE (AHORROS / DEUDAS) --- */}
              <tr className="bg-slate-50/30 dark:bg-slate-900/40 border-t-2 border-slate-100 dark:border-slate-800">
                <td className="p-3 font-extrabold text-[10px] uppercase text-indigo-650 dark:text-indigo-400 tracking-wider sticky left-0 bg-slate-50/95 dark:bg-slate-900/95 z-10 flex items-center gap-1.5">
                  <Scale className="w-3.5 h-3.5" />
                  <span>Ahorros y Financiación</span>
                </td>
                {periods.map((p) => (
                  <td key={p.id} className="p-3 bg-slate-50/30 dark:bg-slate-900/40"></td>
                ))}
              </tr>
              {balanceRows.map((row) => (
                <tr
                  key={row.accountId}
                  className="hover:bg-slate-50/50 dark:hover:bg-slate-850/20 transition"
                >
                  <td className="p-3 font-semibold text-slate-700 dark:text-slate-300 pl-6 sticky left-0 bg-white dark:bg-slate-900 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] border-r border-slate-50 dark:border-slate-850">
                    <div>{row.accountName}</div>
                    <div className="text-[8px] uppercase tracking-wider text-slate-400 mt-0.5">
                      {row.accountType === 'ASSET' ? 'Ahorro/Inversión' : 'Deuda/Préstamo'}
                    </div>
                  </td>
                  {periods.map((p) => {
                    const amount = row.amounts[p.id] || 0;
                    return (
                      <td
                        key={p.id}
                        className={`p-3 text-right pr-6 font-bold whitespace-nowrap ${
                          amount < 0
                            ? 'text-slate-650 dark:text-slate-400'
                            : amount > 0
                              ? 'text-indigo-650 dark:text-indigo-400'
                              : ''
                        }`}
                      >
                        {formatVal(amount)}
                      </td>
                    );
                  })}
                </tr>
              ))}
              {/* Balance de Ahorros/Deudas */}
              <tr className="bg-slate-50/10 font-bold border-t border-slate-100 dark:border-slate-800">
                <td className="p-3 pl-6 sticky left-0 bg-slate-50/90 dark:bg-slate-900/90 z-10">
                  Total Financiero
                </td>
                {periods.map((p) => (
                  <td
                    key={p.id}
                    className="p-3 text-right pr-6 text-slate-700 dark:text-slate-300 font-extrabold whitespace-nowrap"
                  >
                    {formatVal(getColumnTotal(p.id, balanceRows))}
                  </td>
                ))}
              </tr>

              {/* --- COLUMN SUMMARY: CAJA NETO DEL MES --- */}
              <tr className="bg-indigo-50/30 dark:bg-indigo-950/20 border-t-2 border-indigo-100 dark:border-indigo-900 font-extrabold text-xs">
                <td className="p-3 sticky left-0 bg-indigo-50/90 dark:bg-indigo-950/90 z-10 flex items-center gap-1.5 text-indigo-950 dark:text-indigo-200">
                  <PlusCircle className="w-4 h-4 text-indigo-655" />
                  <span>Flujo Caja Neto Mes</span>
                </td>
                {periods.map((p) => {
                  const incTotal = getColumnTotal(p.id, incomeRows);
                  const expTotal = getColumnTotal(p.id, expenseRows);
                  const finTotal = getColumnTotal(p.id, balanceRows);

                  // Net cash flow of the month = Sum(income) - Sum(expense) + Sum(assets/liabilities budgeted)
                  // Note: savings are budgeted as negative, financing can be positive/negative.
                  const netMonthFlow = incTotal - expTotal + finTotal;

                  return (
                    <td
                      key={p.id}
                      className={`p-3 text-right pr-6 font-black whitespace-nowrap ${
                        netMonthFlow >= 0
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-red-650 dark:text-red-400'
                      }`}
                    >
                      {formatVal(netMonthFlow)}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
