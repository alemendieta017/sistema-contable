'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../../services/api';
import { ArrowLeft, ChevronRight, ChevronDown, File, Sparkles } from 'lucide-react';

type Period = {
  id: string;
  name: string;
  startDate?: string;
  endDate?: string;
  status: string;
};

type AccountForecastItem = {
  accountId: string;
  accountName: string;
  accountType: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE';
  parentId: string | null;
  values: { [periodId: string]: number };
};

export default function ForecastReportPage() {
  const router = useRouter();

  const [periods, setPeriods] = useState<Period[]>([]);
  const [selectedStartPeriod, setSelectedStartPeriod] = useState('');

  // Toggles
  const [reportType, setReportType] = useState<'CASH_FLOW' | 'INCOME_STATEMENT'>('CASH_FLOW');
  const [isRolling, setIsRolling] = useState(true);

  // Expanded states for groups
  const [showIncomeTree, setShowIncomeTree] = useState(true);
  const [showExpenseTree, setShowExpenseTree] = useState(true);
  const [showAssetsInflowTree, setShowAssetsInflowTree] = useState(false);
  const [showAssetsOutflowTree, setShowAssetsOutflowTree] = useState(false);

  // Expanded states for individual account tree nodes
  const [expandedAccounts, setExpandedAccounts] = useState<Record<string, boolean>>({});

  // Data
  const [months, setMonths] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<AccountForecastItem[]>([]);
  const [periodRangeLabel, setPeriodRangeLabel] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const type = params.get('type');
      if (type === 'INCOME_STATEMENT' || type === 'CASH_FLOW') {
        setReportType(type);
      }
    }
    loadPeriods();
  }, []);

  const loadPeriods = async () => {
    try {
      setLoading(true);
      setError('');
      const pList = await api.periods.list();
      const sorted = (pList || []).sort((a: any, b: any) => a.name.localeCompare(b.name));
      setPeriods(sorted);

      if (sorted.length > 0) {
        const todayStr = new Date().toISOString().substring(0, 7);
        const currentP = sorted.find((p: any) => p.name === todayStr) || sorted[0];
        setSelectedStartPeriod(currentP.name);
      } else {
        const todayStr = new Date().toISOString().substring(0, 7);
        setSelectedStartPeriod(todayStr);
      }
    } catch {
      setError('Error al cargar los períodos contables.');
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedStartPeriod) {
      loadReport();
    }
  }, [selectedStartPeriod, reportType, isRolling]);

  const loadReport = async () => {
    try {
      setLoading(true);
      setError('');

      if (reportType === 'CASH_FLOW') {
        const res = await api.reports.realVsProjectedCashFlow({
          startPeriod: selectedStartPeriod,
          rolling: isRolling,
        });
        setMonths(res.months || []);
        setAccounts(res.accounts || []);
        setPeriodRangeLabel(res.periodRange || res.fiscalYearName || '');
      } else {
        const res = await api.reports.realVsProjectedIncomeStatement({
          startPeriod: selectedStartPeriod,
          rolling: isRolling,
        });
        setMonths(res.months || []);
        setAccounts(res.accounts || []);
        setPeriodRangeLabel(res.periodRange || res.fiscalYearName || '');
      }
    } catch (err: any) {
      setError(err.message || 'Error al generar el reporte de proyecciones.');
    } finally {
      setLoading(false);
    }
  };

  // Helper to format currency values
  const formatVal = (val: number) => {
    if (val === 0) return '₲0';
    return `₲${Math.round(val).toLocaleString('es-PY')}`;
  };

  const getMonthLabel = (periodName: string) => {
    const [, m] = periodName.split('-');
    const monthsNames = [
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
    return monthsNames[parseInt(m, 10) - 1] || periodName;
  };

  // Precompute rolled-up values recursively
  const getSubtreeValue = (
    accId: string,
    periodId: string,
    type: 'CASH_IN' | 'CASH_OUT' | 'DEFAULT',
  ): number => {
    const acc = accounts.find((a) => a.accountId === accId);
    if (!acc) return 0;

    let val = acc.values[periodId] || 0;

    // Filter value based on cash flow type
    if (type === 'CASH_IN') {
      if (acc.accountType === 'ASSET' || acc.accountType === 'LIABILITY') {
        val = val > 0 ? val : 0;
      }
    } else if (type === 'CASH_OUT') {
      if (acc.accountType === 'ASSET' || acc.accountType === 'LIABILITY') {
        val = val < 0 ? Math.abs(val) : 0;
      }
    }

    const children = accounts.filter((a) => a.parentId === accId);
    let childrenSum = 0;
    children.forEach((child) => {
      childrenSum += getSubtreeValue(child.accountId, periodId, type);
    });

    return val + childrenSum;
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

  const toggleAccount = (accId: string) => {
    setExpandedAccounts((prev) => ({
      ...prev,
      [accId]: !prev[accId],
    }));
  };

  // Render a row for an account in the tree
  const renderAccountRow = (acc: AccountForecastItem, type: 'CASH_IN' | 'CASH_OUT' | 'DEFAULT') => {
    if (!isAccountVisible(acc)) return null;

    const depth = getAccountDepth(acc);
    const childrenPresent = hasChildren(acc.accountId);
    const isExpanded = expandedAccounts[acc.accountId];

    return (
      <tr
        key={acc.accountId}
        className="hover:bg-slate-50/40 dark:hover:bg-slate-800/20 transition"
      >
        {/* Sticky left label */}
        <td
          className="p-3 sticky left-0 bg-white dark:bg-slate-900 z-10 shadow-xs border-r border-slate-100 dark:border-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300"
          style={{ paddingLeft: `${Math.max(12, depth * 20)}px` }}
        >
          <div className="flex items-center gap-1.5">
            {childrenPresent ? (
              <button
                onClick={() => toggleAccount(acc.accountId)}
                className="p-0.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition shrink-0"
              >
                {isExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                )}
              </button>
            ) : (
              <span className="w-4 h-4 shrink-0 flex items-center justify-center">
                <File className="w-3 h-3 text-slate-400" />
              </span>
            )}
            <span className="truncate max-w-48">{acc.accountName}</span>
          </div>
        </td>

        {/* Monthly columns */}
        {months.map((m) => {
          const val = getSubtreeValue(acc.accountId, m.periodId, type);
          return (
            <td
              key={m.periodId}
              className={`p-3 text-right pr-6 font-medium tabular-nums whitespace-nowrap ${val !== 0 ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400/80 dark:text-slate-600'}`}
            >
              {val === 0 ? '-' : formatVal(val)}
            </td>
          );
        })}
      </tr>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header section */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-2xl hover:bg-slate-100 border border-slate-200/50 dark:border-slate-700 transition"
          >
            <ArrowLeft className="w-4 h-4 text-slate-600 dark:text-slate-300" />
          </button>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-2">
              Proyecciones Financieras
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Informe consolidado Real vs. Proyectado:{' '}
              <span className="font-bold text-indigo-600 dark:text-indigo-400">
                {periodRangeLabel}
              </span>
            </p>
          </div>
        </div>

        {/* Period start select */}
        <div className="flex items-center gap-3">
          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Período Inicial:
          </label>
          <select
            value={selectedStartPeriod}
            onChange={(e) => setSelectedStartPeriod(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold focus:border-indigo-500 outline-none text-slate-800 dark:text-slate-200 tabular-nums"
          >
            {periods.map((p) => (
              <option key={p.id} value={p.name}>
                {p.name} (
                {p.status === 'OPEN'
                  ? 'Abierto'
                  : p.status === 'CLOSED'
                    ? 'Cerrado'
                    : 'Planificación'}
                )
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="p-4 text-xs text-red-700 bg-red-50 dark:bg-red-950/20 dark:text-red-400 rounded-2xl border border-red-200/40">
          {error}
        </div>
      )}

      {/* Control selectors block */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Toggle 1: Cash Flow vs Income Statement */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Tipo de Proyección
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Alternar base de caja o devengamiento</p>
          </div>
          <div className="flex bg-slate-50 dark:bg-slate-800 p-1 rounded-2xl border border-slate-100 dark:border-slate-700">
            <button
              onClick={() => setReportType('CASH_FLOW')}
              className={`py-2 px-4 rounded-xl text-xs font-bold transition ${
                reportType === 'CASH_FLOW'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Flujo de Caja
            </button>
            <button
              onClick={() => setReportType('INCOME_STATEMENT')}
              className={`py-2 px-4 rounded-xl text-xs font-bold transition ${
                reportType === 'INCOME_STATEMENT'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Pérdidas y Ganancias
            </button>
          </div>
        </div>

        {/* Toggle 2: Rolling vs Full Year */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Ventana Temporal
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Cambiar entre año calendario y 12 meses móviles
            </p>
          </div>
          <div className="flex bg-slate-50 dark:bg-slate-800 p-1 rounded-2xl border border-slate-100 dark:border-slate-700">
            <button
              onClick={() => setIsRolling(false)}
              className={`py-2 px-4 rounded-xl text-xs font-bold transition ${
                !isRolling
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Año Calendario
            </button>
            <button
              onClick={() => setIsRolling(true)}
              className={`py-2 px-4 rounded-xl text-xs font-bold transition ${
                isRolling
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              12M Rolling
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-24 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <span className="text-xs text-slate-400 font-semibold">
            Generando reporte de proyecciones...
          </span>
        </div>
      ) : (
        /* Matrix Grid */
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/60 dark:border-slate-800/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-full table-fixed">
              {/* Dynamic Header */}
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-800">
                  <th className="p-4 text-xs font-extrabold uppercase tracking-wider text-slate-500 w-64 sticky left-0 bg-slate-50 dark:bg-slate-800 z-20 shadow-xs border-r border-slate-100 dark:border-slate-800">
                    Concepto / Cuenta
                  </th>
                  {months.map((m) => (
                    <th
                      key={m.periodId}
                      onClick={() =>
                        router.push(
                          m.isReal
                            ? `/budgets/${m.periodId}/execution`
                            : `/budgets/${m.periodId}/edit`,
                        )
                      }
                      className="p-4 text-right pr-6 cursor-pointer group hover:bg-indigo-50/30 dark:hover:bg-slate-800/40 transition"
                    >
                      <div className="text-2xs font-extrabold text-slate-700 dark:text-slate-300">
                        {getMonthLabel(m.periodName)}
                      </div>
                      <div className="text-2xs text-slate-400 dark:text-slate-500 mt-0.5">
                        {m.periodName}
                      </div>
                      <div className="mt-2 flex flex-col gap-1 items-end">
                        <span
                          className={`text-2xs font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            m.isReal
                              ? 'bg-green-50 dark:bg-green-950/20 text-green-600 dark:text-green-400'
                              : 'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400'
                          }`}
                        >
                          {m.isReal ? 'Real' : 'Proyectado'}
                        </span>
                        <span className="text-2xs text-indigo-500 font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                          {m.isReal ? 'Ver Asientos' : 'Ajustar Proy.'}
                        </span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              {/* Table Body */}
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {reportType === 'CASH_FLOW' ? (
                  /* --- CASH FLOW VIEW --- */
                  <>
                    {/* Saldo Inicial */}
                    <tr className="bg-slate-50/20 dark:bg-slate-800/10 font-bold border-b border-slate-100 dark:border-slate-800">
                      <td className="p-3 sticky left-0 bg-slate-50/95 dark:bg-slate-900/95 z-10 shadow-xs border-r border-slate-50 dark:border-slate-800">
                        (+) Saldo Inicial de Caja
                      </td>
                      {months.map((m) => (
                        <td
                          key={m.periodId}
                          className="p-3 text-right pr-6 font-bold text-slate-700 dark:text-slate-300 tabular-nums whitespace-nowrap"
                        >
                          {formatVal(m.initialCash)}
                        </td>
                      ))}
                    </tr>

                    {/* Ingresos Operativos Collapsible Header */}
                    <tr className="bg-slate-50/40 dark:bg-slate-900/40">
                      <td className="p-3 font-extrabold text-xs uppercase text-indigo-600 dark:text-indigo-400 tracking-wider sticky left-0 bg-slate-50/95 dark:bg-slate-900/95 z-10 flex items-center gap-1.5 shadow-xs border-r border-slate-50 dark:border-slate-800">
                        <button
                          onClick={() => setShowIncomeTree(!showIncomeTree)}
                          className="p-0.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition"
                        >
                          {showIncomeTree ? (
                            <ChevronDown className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <span>(+) Ingresos Operativos</span>
                      </td>
                      {months.map((m) => (
                        <td
                          key={m.periodId}
                          className="p-3 text-right pr-6 font-bold text-green-600 dark:text-green-400 tabular-nums whitespace-nowrap"
                        >
                          {formatVal(m.ingresosOperativos)}
                        </td>
                      ))}
                    </tr>

                    {/* INCOME accounts tree */}
                    {showIncomeTree &&
                      accounts
                        .filter((a) => a.accountType === 'INCOME' && a.parentId === null)
                        .map((acc) => renderAccountRow(acc, 'DEFAULT'))}

                    {/* Entradas Activo/Pasivo Collapsible Header */}
                    <tr className="bg-slate-50/40 dark:bg-slate-900/40">
                      <td className="p-3 font-extrabold text-xs uppercase text-indigo-600 dark:text-indigo-400 tracking-wider sticky left-0 bg-slate-50/95 dark:bg-slate-900/95 z-10 flex items-center gap-1.5 shadow-xs border-r border-slate-50 dark:border-slate-800">
                        <button
                          onClick={() => setShowAssetsInflowTree(!showAssetsInflowTree)}
                          className="p-0.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition"
                        >
                          {showAssetsInflowTree ? (
                            <ChevronDown className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <span>(+) Entradas de Activo/Pasivo</span>
                      </td>
                      {months.map((m) => (
                        <td
                          key={m.periodId}
                          className="p-3 text-right pr-6 font-bold text-slate-700 dark:text-slate-300 tabular-nums whitespace-nowrap"
                        >
                          {formatVal(m.entradasActivoPasivo)}
                        </td>
                      ))}
                    </tr>

                    {/* ASSET/LIABILITY inflow tree */}
                    {showAssetsInflowTree &&
                      accounts
                        .filter(
                          (a) =>
                            (a.accountType === 'ASSET' || a.accountType === 'LIABILITY') &&
                            a.parentId === null,
                        )
                        .map((acc) => renderAccountRow(acc, 'CASH_IN'))}

                    {/* Total Entradas */}
                    <tr className="bg-slate-50/30 dark:bg-slate-800/10 font-bold border-t border-slate-100 dark:border-slate-800">
                      <td className="p-3 pl-6 sticky left-0 bg-slate-50/95 dark:bg-slate-900/95 z-10 shadow-xs border-r border-slate-50 dark:border-slate-800">
                        (=) Total Entradas de Caja
                      </td>
                      {months.map((m) => (
                        <td
                          key={m.periodId}
                          className="p-3 text-right pr-6 font-extrabold text-indigo-600 dark:text-indigo-400 tabular-nums whitespace-nowrap"
                        >
                          {formatVal(m.totalEntradas)}
                        </td>
                      ))}
                    </tr>

                    {/* Egresos Operativos Collapsible Header */}
                    <tr className="bg-slate-50/40 dark:bg-slate-900/40 border-t-2 border-slate-100 dark:border-slate-800">
                      <td className="p-3 font-extrabold text-xs uppercase text-indigo-600 dark:text-indigo-400 tracking-wider sticky left-0 bg-slate-50/95 dark:bg-slate-900/95 z-10 flex items-center gap-1.5 shadow-xs border-r border-slate-50 dark:border-slate-800">
                        <button
                          onClick={() => setShowExpenseTree(!showExpenseTree)}
                          className="p-0.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition"
                        >
                          {showExpenseTree ? (
                            <ChevronDown className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <span>(-) Egresos Operativos</span>
                      </td>
                      {months.map((m) => (
                        <td
                          key={m.periodId}
                          className="p-3 text-right pr-6 font-bold text-red-500 dark:text-red-400 tabular-nums whitespace-nowrap"
                        >
                          {formatVal(m.egresosOperativos)}
                        </td>
                      ))}
                    </tr>

                    {/* EXPENSE accounts tree */}
                    {showExpenseTree &&
                      accounts
                        .filter((a) => a.accountType === 'EXPENSE' && a.parentId === null)
                        .map((acc) => renderAccountRow(acc, 'DEFAULT'))}

                    {/* Salidas Activo/Pasivo Collapsible Header */}
                    <tr className="bg-slate-50/40 dark:bg-slate-900/40 border-t border-slate-100 dark:border-slate-800">
                      <td className="p-3 font-extrabold text-xs uppercase text-indigo-600 dark:text-indigo-400 tracking-wider sticky left-0 bg-slate-50/95 dark:bg-slate-900/95 z-10 flex items-center gap-1.5 shadow-xs border-r border-slate-50 dark:border-slate-800">
                        <button
                          onClick={() => setShowAssetsOutflowTree(!showAssetsOutflowTree)}
                          className="p-0.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition"
                        >
                          {showAssetsOutflowTree ? (
                            <ChevronDown className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <span>(-) Salidas de Activo/Pasivo</span>
                      </td>
                      {months.map((m) => (
                        <td
                          key={m.periodId}
                          className="p-3 text-right pr-6 font-bold text-slate-700 dark:text-slate-300 tabular-nums whitespace-nowrap"
                        >
                          {formatVal(m.salidasActivoPasivo)}
                        </td>
                      ))}
                    </tr>

                    {/* ASSET/LIABILITY outflow tree */}
                    {showAssetsOutflowTree &&
                      accounts
                        .filter(
                          (a) =>
                            (a.accountType === 'ASSET' || a.accountType === 'LIABILITY') &&
                            a.parentId === null,
                        )
                        .map((acc) => renderAccountRow(acc, 'CASH_OUT'))}

                    {/* Total Salidas */}
                    <tr className="bg-slate-50/30 dark:bg-slate-800/10 font-bold border-t border-slate-100 dark:border-slate-800">
                      <td className="p-3 pl-6 sticky left-0 bg-slate-50/95 dark:bg-slate-900/95 z-10 shadow-xs border-r border-slate-50 dark:border-slate-800">
                        (=) Total Salidas de Caja
                      </td>
                      {months.map((m) => (
                        <td
                          key={m.periodId}
                          className="p-3 text-right pr-6 font-extrabold text-red-600 dark:text-red-400 tabular-nums whitespace-nowrap"
                        >
                          {formatVal(m.totalSalidas)}
                        </td>
                      ))}
                    </tr>

                    {/* Flujo Neto */}
                    <tr className="hover:bg-slate-50/40 dark:hover:bg-slate-800/10 border-t border-slate-100 dark:border-slate-800">
                      <td className="p-3 font-extrabold sticky left-0 bg-white dark:bg-slate-900 z-10 shadow-xs border-r border-slate-50 dark:border-slate-800">
                        (=) Flujo Neto del Periodo
                      </td>
                      {months.map((m) => (
                        <td
                          key={m.periodId}
                          className={`p-3 text-right pr-6 font-black text-sm tabular-nums whitespace-nowrap ${
                            m.netFlow >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'
                          }`}
                        >
                          {m.netFlow > 0 ? '+' : ''}
                          {formatVal(m.netFlow)}
                        </td>
                      ))}
                    </tr>

                    {/* Saldo Final */}
                    <tr className="bg-indigo-50/30 dark:bg-indigo-950/20 font-black border-t-2 border-indigo-100 dark:border-indigo-900">
                      <td className="p-3 sticky left-0 bg-indigo-50/95 dark:bg-indigo-900 z-10 text-indigo-950 dark:text-indigo-100 shadow-xs border-r border-indigo-50 dark:border-indigo-800 text-xs flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        <span>(=) SALDO FINAL DE CAJA</span>
                      </td>
                      {months.map((m) => (
                        <td
                          key={m.periodId}
                          className={`p-3 text-right pr-6 font-black text-xs tabular-nums whitespace-nowrap ${
                            m.finalCash >= 0
                              ? 'text-slate-900 dark:text-slate-50'
                              : 'text-red-600 dark:text-red-400'
                          }`}
                        >
                          {formatVal(m.finalCash)}
                        </td>
                      ))}
                    </tr>
                  </>
                ) : (
                  /* --- INCOME STATEMENT (P&L) VIEW --- */
                  <>
                    {/* Ingresos Devengados Header */}
                    <tr className="bg-slate-50/40 dark:bg-slate-900/40">
                      <td className="p-3 font-extrabold text-xs uppercase text-indigo-600 dark:text-indigo-400 tracking-wider sticky left-0 bg-slate-50/95 dark:bg-slate-900/95 z-10 flex items-center gap-1.5 shadow-xs border-r border-slate-50 dark:border-slate-800">
                        <button
                          onClick={() => setShowIncomeTree(!showIncomeTree)}
                          className="p-0.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition"
                        >
                          {showIncomeTree ? (
                            <ChevronDown className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <span>Ingresos Devengados (+)</span>
                      </td>
                      {months.map((m) => (
                        <td
                          key={m.periodId}
                          className="p-3 text-right pr-6 font-bold text-green-600 dark:text-green-400 tabular-nums whitespace-nowrap"
                        >
                          {formatVal(m.income)}
                        </td>
                      ))}
                    </tr>

                    {/* INCOME accounts tree */}
                    {showIncomeTree &&
                      accounts
                        .filter((a) => a.accountType === 'INCOME' && a.parentId === null)
                        .map((acc) => renderAccountRow(acc, 'DEFAULT'))}

                    {/* Gastos Devengados Header */}
                    <tr className="bg-slate-50/40 dark:bg-slate-900/40 border-t-2 border-slate-100 dark:border-slate-800">
                      <td className="p-3 font-extrabold text-xs uppercase text-indigo-600 dark:text-indigo-400 tracking-wider sticky left-0 bg-slate-50/95 dark:bg-slate-900/95 z-10 flex items-center gap-1.5 shadow-xs border-r border-slate-50 dark:border-slate-800">
                        <button
                          onClick={() => setShowExpenseTree(!showExpenseTree)}
                          className="p-0.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition"
                        >
                          {showExpenseTree ? (
                            <ChevronDown className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <span>Gastos Devengados (-)</span>
                      </td>
                      {months.map((m) => (
                        <td
                          key={m.periodId}
                          className="p-3 text-right pr-6 font-bold text-red-500 dark:text-red-400 tabular-nums whitespace-nowrap"
                        >
                          {formatVal(m.expense)}
                        </td>
                      ))}
                    </tr>

                    {/* EXPENSE accounts tree */}
                    {showExpenseTree &&
                      accounts
                        .filter((a) => a.accountType === 'EXPENSE' && a.parentId === null)
                        .map((acc) => renderAccountRow(acc, 'DEFAULT'))}

                    {/* Resultado Neto */}
                    <tr className="bg-indigo-50/30 dark:bg-indigo-950/20 font-black border-t-2 border-indigo-100 dark:border-indigo-900">
                      <td className="p-3 sticky left-0 bg-indigo-50/95 dark:bg-indigo-900 z-10 text-indigo-950 dark:text-indigo-100 shadow-xs border-r border-indigo-50 dark:border-indigo-800 text-xs flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        <span>Resultado Neto (P&L)</span>
                      </td>
                      {months.map((m) => (
                        <td
                          key={m.periodId}
                          className={`p-3 text-right pr-6 font-black text-xs tabular-nums whitespace-nowrap ${
                            m.netProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'
                          }`}
                        >
                          {formatVal(m.netProfit)}
                        </td>
                      ))}
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
