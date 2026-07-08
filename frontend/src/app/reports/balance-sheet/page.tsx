'use client';

import React, { useState, useEffect } from 'react';
import { api } from '../../../services/api';
import { formatCurrency } from '../../../lib/utils';
import {
  Calendar,
  AlertCircle,
  Scale,
  AlertTriangle,
  Printer,
  Sliders,
  Plus,
  Trash2,
  Clock,
  Grid,
} from 'lucide-react';

type ReportItem = {
  accountId: string;
  name: string;
  balance?: number;
  balances?: number[];
};

type BalanceSheetData = {
  mode: 'period' | 'date' | 'comparative';
  period?: string;
  date?: string;
  periods?: string[];
  assets: ReportItem[];
  liabilities: ReportItem[];
  equity: ReportItem[];
  totalAssets: number | number[];
  totalLiabilities: number | number[];
  totalEquity: number | number[];
  balanced: boolean | boolean[];
};

type Period = {
  id: string;
  name: string;
  status: string;
};

export default function BalanceSheetPage() {
  const [periods, setPeriods] = useState<Period[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().substring(0, 10));
  const [selectedPeriodIds, setSelectedPeriodIds] = useState<string[]>([]);
  const depth = 4;
  const [mode, setMode] = useState<'period' | 'date' | 'comparative'>('period');

  const [report, setReport] = useState<BalanceSheetData | null>(null);
  const [currencies, setCurrencies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportLoading, setReportLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadPeriods();
  }, []);

  const loadPeriods = async () => {
    try {
      setLoading(true);
      setError('');
      const [periodData, currencyData] = await Promise.all([
        api.periods.list(),
        api.currencies.list(),
      ]);

      const sortedPeriods = (periodData || []).sort((a: any, b: any) =>
        b.name.localeCompare(a.name),
      );

      setPeriods(sortedPeriods);
      setCurrencies(currencyData || []);

      if (sortedPeriods.length > 0) {
        setSelectedPeriodId(sortedPeriods[0].id);
        setSelectedPeriodIds([sortedPeriods[0].id, sortedPeriods[1]?.id || sortedPeriods[0].id]);
      }
    } catch (err: any) {
      setError(err.message || 'Error al cargar los períodos contables.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (mode === 'period' && selectedPeriodId) {
      loadReport();
    } else if (mode === 'date' && selectedDate) {
      loadReport();
    } else if (mode === 'comparative' && selectedPeriodIds.filter(Boolean).length > 0) {
      loadReport();
    } else {
      setReport(null);
    }
  }, [mode, selectedPeriodId, selectedDate, selectedPeriodIds, depth]);

  const loadReport = async () => {
    try {
      setReportLoading(true);
      setError('');

      const options: any = {
        mode,
        depth,
      };

      if (mode === 'period') {
        options.periodId = selectedPeriodId;
      } else if (mode === 'date') {
        options.date = selectedDate;
      } else if (mode === 'comparative') {
        options.periodIds = selectedPeriodIds.filter(Boolean);
      }

      const data = await api.reports.balanceSheet(options);
      setReport(data);
    } catch (err: any) {
      setError(err.message || 'Error al generar el Balance General.');
      setReport(null);
    } finally {
      setReportLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const baseCurrency = currencies.find((c) => c.isBase) || {
    code: 'PYG',
    symbol: '₲',
    decimalPlaces: 0,
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <span className="text-xs text-slate-400 font-semibold">Cargando datos del reporte...</span>
      </div>
    );
  }

  const isComparative = report?.mode === 'comparative';

  // Check balance integrity
  const isBalanced = report
    ? isComparative
      ? (report.balanced as boolean[]).every((b) => b)
      : (report.balanced as boolean)
    : true;

  const totalLiabEquity = report
    ? isComparative && Array.isArray(report.totalLiabilities) && Array.isArray(report.totalEquity)
      ? report.totalLiabilities.map((val, idx) => val + (report.totalEquity as number[])[idx])
      : (report.totalLiabilities as number) + (report.totalEquity as number)
    : 0;

  const renderRow = (item: ReportItem) => {
    return (
      <div
        key={item.accountId}
        className="flex justify-between items-center text-xs py-2 border-b border-dashed border-slate-100 dark:border-slate-750/50"
      >
        <span className="text-slate-655 dark:text-slate-350 font-semibold">{item.name}</span>
        {isComparative && item.balances ? (
          <div className="flex gap-4">
            {item.balances.map((bal, idx) => (
              <span
                key={idx}
                className="font-bold text-slate-800 dark:text-slate-100 min-w-[120px] text-right whitespace-nowrap"
              >
                {formatCurrency(bal, baseCurrency)}
              </span>
            ))}
          </div>
        ) : (
          <span className="font-bold text-slate-800 dark:text-slate-100">
            {formatCurrency(item.balance ?? 0, baseCurrency)}
          </span>
        )}
      </div>
    );
  };

  const renderTotals = (
    label: string,
    totals: number | number[],
    totalColorClass: string = 'text-indigo-600 dark:text-indigo-400',
  ) => {
    return (
      <div className="flex justify-between items-center pt-3 mt-4 border-t border-slate-150 dark:border-slate-700 font-extrabold text-xs">
        <span className="text-slate-700 dark:text-slate-300">{label}</span>
        {isComparative && Array.isArray(totals) ? (
          <div className="flex gap-4">
            {totals.map((tot, idx) => (
              <span key={idx} className={`${totalColorClass} min-w-[120px] text-right text-sm whitespace-nowrap`}>
                {formatCurrency(tot, baseCurrency)}
              </span>
            ))}
          </div>
        ) : (
          <span className={`${totalColorClass} text-sm`}>
            {formatCurrency(totals as number, baseCurrency)}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto print:p-0 print:max-w-full">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-800 dark:text-slate-100">
            Balance General
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-455 mt-0.5">
            Situación patrimonial consolidada: Activos, Pasivos y Patrimonio Neto
          </p>
        </div>

        {report && (
          <button
            onClick={handlePrint}
            className="self-end flex items-center gap-1.5 py-2 px-3.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-250 font-bold rounded-xl text-xs transition cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir</span>
          </button>
        )}
      </div>

      {/* Advanced Filters Panel */}
      <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm space-y-4 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Mode Tabs */}
          <div className="flex bg-slate-50 dark:bg-slate-900 p-1 rounded-2xl border border-slate-100 dark:border-slate-750">
            {(['period', 'date', 'comparative'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`py-1.5 px-3.5 rounded-xl text-xs font-bold transition duration-150 cursor-pointer ${
                  mode === m
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/10'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-205'
                }`}
              >
                {m === 'period' ? (
                  <span className="flex items-center gap-1.5">
                    <Grid className="w-3.5 h-3.5" />
                    Por Período
                  </span>
                ) : m === 'date' ? (
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />A la Fecha
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5" />
                    Comparativo
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic filter selectors depending on mode */}
        <div className="pt-2 border-t border-slate-50 dark:border-slate-700/50 flex flex-wrap items-center gap-4">
          {mode === 'period' && periods.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-450 dark:text-slate-550 uppercase tracking-wider">
                Seleccionar Período:
              </span>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-450 dark:text-slate-500" />
                <select
                  value={selectedPeriodId}
                  onChange={(e) => setSelectedPeriodId(e.target.value)}
                  className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
                >
                  {periods.map((p) => (
                    <option key={p.id} value={p.id}>
                      Período {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {mode === 'date' && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-450 dark:text-slate-550 uppercase tracking-wider">
                Balance a la Fecha:
              </span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
              />
            </div>
          )}

          {mode === 'comparative' && periods.length > 0 && (
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-[10px] font-bold text-slate-450 dark:text-slate-550 uppercase tracking-wider">
                Comparar Períodos:
              </span>
              {selectedPeriodIds.map((id, index) => (
                <div
                  key={index}
                  className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900 pl-2 pr-1 py-1 rounded-xl border border-slate-100 dark:border-slate-750"
                >
                  <span className="text-[10px] font-bold text-slate-400">#{index + 1}</span>
                  <select
                    value={id}
                    onChange={(e) => {
                      const nextIds = [...selectedPeriodIds];
                      nextIds[index] = e.target.value;
                      setSelectedPeriodIds(nextIds);
                    }}
                    className="border-none bg-transparent text-slate-800 dark:text-slate-200 text-xs font-bold focus:ring-0 outline-none py-0.5 px-1"
                  >
                    {periods.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  {selectedPeriodIds.length > 2 && (
                    <button
                      type="button"
                      onClick={() => {
                        const nextIds = [...selectedPeriodIds];
                        nextIds.splice(index, 1);
                        setSelectedPeriodIds(nextIds);
                      }}
                      className="text-red-500 hover:text-red-750 p-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
              {selectedPeriodIds.length < 3 && (
                <button
                  type="button"
                  onClick={() => setSelectedPeriodIds([...selectedPeriodIds, periods[0]?.id])}
                  className="flex items-center gap-1 py-1.5 px-3 border border-dashed border-indigo-500 text-indigo-600 dark:text-indigo-400 font-bold rounded-xl text-[10px] hover:bg-indigo-50 dark:hover:bg-indigo-950/20 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Añadir</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="p-3.5 text-xs text-red-700 bg-red-50 dark:bg-red-950/30 dark:text-red-400 rounded-2xl border border-red-150 flex items-start gap-2.5 print:hidden">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Empty State */}
      {periods.length === 0 && (
        <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm text-center space-y-4 max-w-lg mx-auto print:hidden">
          <Scale className="w-12 h-12 text-slate-350 dark:text-slate-550 mx-auto" />
          <div>
            <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">
              No hay períodos contables registrados
            </h3>
            <p className="text-xs text-slate-455 dark:text-slate-550 mt-1 max-w-sm mx-auto leading-relaxed">
              Cree un ejercicio fiscal y registre períodos contables para poder consultar el Balance
              General del sistema.
            </p>
          </div>
        </div>
      )}

      {/* Print Document Title (Visible only when printing) */}
      {report && (
        <div className="hidden print:block mb-8 border-b pb-4 text-center">
          <h1 className="text-2xl font-bold">BALANCE GENERAL</h1>
          {report.mode === 'period' && (
            <p className="text-sm text-gray-500">Período Contable: {report.period}</p>
          )}
          {report.mode === 'date' && (
            <p className="text-sm text-gray-500">A la fecha: {report.date}</p>
          )}
          {report.mode === 'comparative' && (
            <p className="text-sm text-gray-500">
              Comparativa de Períodos: {report.periods?.join(', ')}
            </p>
          )}
          <p className="text-xs text-gray-400 mt-1">
            Generado automáticamente - Base: {baseCurrency.code}
          </p>
        </div>
      )}

      {/* Balance Sheet Tables */}
      {report && (
        <div className="space-y-6">
          {/* Integrity alert box */}
          {!isBalanced && (
            <div className="print:hidden">
              <div className="p-3.5 text-xs text-amber-750 bg-amber-50/50 dark:bg-amber-950/20 dark:text-amber-400 rounded-2xl border border-amber-200 flex items-start gap-2.5 font-semibold">
                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Aviso:</strong> El balance no se encuentra equilibrado en alguno de los
                  periodos. Puede requerir una reconstrucción de saldos.
                </span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:grid-cols-2">
            {/* Left Column: Assets */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm p-6 space-y-4 print:border-none print:shadow-none print:p-0">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-700">
                <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-205 uppercase tracking-wider">
                  1. Activos
                </h3>
                {isComparative && report.periods && (
                  <div className="flex gap-4 pr-1">
                    {report.periods.map((pName, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] font-bold text-slate-400 dark:text-slate-500 min-w-[120px] text-right whitespace-nowrap"
                      >
                        {pName}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {report.assets.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-2">
                  No hay cuentas de Activos con movimientos.
                </p>
              ) : (
                <div className="space-y-1 max-h-[400px] overflow-y-auto pr-1 print:max-h-full">
                  {report.assets.map((item) => renderRow(item))}
                </div>
              )}

              {renderTotals('TOTAL ACTIVOS', report.totalAssets)}
            </div>

            {/* Right Column: Liabilities & Equity */}
            <div className="space-y-6">
              {/* Liabilities Card */}
              <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm p-6 space-y-4 print:border-none print:shadow-none print:p-0">
                <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-700">
                  <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-205 uppercase tracking-wider">
                    2. Pasivos
                  </h3>
                  {isComparative && report.periods && (
                    <div className="flex gap-4 pr-1">
                      {report.periods.map((pName, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] font-bold text-slate-400 dark:text-slate-500 min-w-[120px] text-right whitespace-nowrap"
                        >
                          {pName}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {report.liabilities.length === 0 ? (
                  <p className="text-xs text-slate-455 italic py-2">
                    No hay cuentas de Pasivos con movimientos.
                  </p>
                ) : (
                  <div className="space-y-1 max-h-[200px] overflow-y-auto pr-1 print:max-h-full">
                    {report.liabilities.map((item) => renderRow(item))}
                  </div>
                )}

                {renderTotals(
                  'TOTAL PASIVOS',
                  report.totalLiabilities,
                  'text-indigo-650 dark:text-indigo-400',
                )}
              </div>

              {/* Equity Card */}
              <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm p-6 space-y-4 print:border-none print:shadow-none print:p-0">
                <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-700">
                  <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-205 uppercase tracking-wider">
                    3. Patrimonio Neto
                  </h3>
                  {isComparative && report.periods && (
                    <div className="flex gap-4 pr-1">
                      {report.periods.map((pName, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] font-bold text-slate-400 dark:text-slate-500 min-w-[120px] text-right whitespace-nowrap"
                        >
                          {pName}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {report.equity.length === 0 ? (
                  <p className="text-xs text-slate-450 italic py-2">
                    No hay cuentas de Patrimonio con movimientos.
                  </p>
                ) : (
                  <div className="space-y-1 max-h-[200px] overflow-y-auto pr-1 print:max-h-full">
                    {report.equity.map((item) => renderRow(item))}
                  </div>
                )}

                {renderTotals(
                  'TOTAL PATRIMONIO',
                  report.totalEquity,
                  'text-indigo-650 dark:text-indigo-400',
                )}
              </div>

              {/* Total Liabilities + Equity Card */}
              <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-105 dark:border-slate-700 shadow-sm p-6 print:border-none print:shadow-none print:p-0">
                <div className="flex justify-between items-center font-extrabold text-xs">
                  <span className="text-slate-800 dark:text-slate-200">
                    TOTAL PASIVO + PATRIMONIO NETO
                  </span>
                  {isComparative && Array.isArray(totalLiabEquity) ? (
                    <div className="flex gap-4">
                      {totalLiabEquity.map((tot, idx) => (
                        <span
                          key={idx}
                          className="text-indigo-650 dark:text-indigo-400 min-w-[120px] text-right text-sm font-extrabold whitespace-nowrap"
                        >
                          {formatCurrency(tot, baseCurrency)}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-indigo-650 dark:text-indigo-400 text-sm font-extrabold">
                      {formatCurrency(totalLiabEquity as number, baseCurrency)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Aggregated Closing Summary Footer */}
          <div className="bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-850 p-5 rounded-3xl flex flex-col gap-4 text-xs font-extrabold">
            <div>
              <p className="text-slate-400 dark:text-slate-500 text-3xs uppercase tracking-wider">
                Ecuación Contable Consolidada
              </p>

              <div className="mt-2 space-y-2">
                {isComparative &&
                report.periods &&
                Array.isArray(report.totalAssets) &&
                Array.isArray(report.totalLiabilities) &&
                Array.isArray(report.totalEquity) ? (
                  report.periods.map((pName, idx) => {
                    const totalAssetVal = (report.totalAssets as number[])[idx] ?? 0;
                    const totalLiabilityVal = (report.totalLiabilities as number[])[idx] ?? 0;
                    const totalEquityVal = (report.totalEquity as number[])[idx] ?? 0;
                    const isBal = (report.balanced as boolean[])[idx] ?? false;
                    return (
                      <div
                        key={idx}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-100 dark:border-slate-800 pb-2 last:border-0 last:pb-0"
                      >
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                          Período {pName}:
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-800 dark:text-slate-200">
                            Activo ({formatCurrency(totalAssetVal, baseCurrency)})
                          </span>
                          <span className="text-slate-400">=</span>
                          <span className="text-slate-800 dark:text-slate-200">
                            Pasivo + Patrimonio (
                            {formatCurrency(totalLiabilityVal + totalEquityVal, baseCurrency)})
                          </span>
                          <span
                            className={`ml-2 px-1.5 py-0.5 rounded text-[8px] uppercase tracking-wider font-bold ${
                              isBal
                                ? 'bg-green-50 text-green-600 dark:bg-green-950/20 dark:text-green-400'
                                : 'bg-red-50 text-red-655 dark:bg-red-950/20 dark:text-red-400'
                            }`}
                          >
                            {isBal ? 'Cuadrado' : 'Descuadrado'}
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-800 dark:text-slate-200">
                        Activo ({formatCurrency(report.totalAssets as number, baseCurrency)})
                      </span>
                      <span className="text-slate-400">=</span>
                      <span className="text-slate-800 dark:text-slate-200">
                        Pasivo + Patrimonio (
                        {formatCurrency(
                          (report.totalLiabilities as number) + (report.totalEquity as number),
                          baseCurrency,
                        )}
                        )
                      </span>
                    </div>

                    <div className="flex items-center gap-2 bg-white dark:bg-slate-800 py-1.5 px-3 rounded-xl border border-slate-100 dark:border-slate-700">
                      <span className="text-3xs text-slate-455 dark:text-slate-500 uppercase tracking-widest">
                        Estado del Balance
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[9px] uppercase tracking-wider font-bold ${
                          report.balanced
                            ? 'bg-green-50 text-green-600 dark:bg-green-950/20 dark:text-green-400'
                            : 'bg-red-50 text-red-655 dark:bg-red-950/20 dark:text-red-400'
                        }`}
                      >
                        {report.balanced ? 'Cuadrado' : 'Descuadrado'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Blocking Recalculation Loader Overlay */}
      {reportLoading && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 flex flex-col items-center max-w-xs shadow-xl border border-slate-100 dark:border-slate-700 text-center space-y-4">
            <div className="w-10 h-10 border-4 border-indigo-550 border-t-transparent rounded-full animate-spin"></div>
            <div>
              <p className="font-extrabold text-slate-800 dark:text-slate-150 text-sm">
                Actualizando saldos históricos...
              </p>
              <p className="text-4xs text-slate-400 dark:text-slate-550 mt-1 font-semibold">
                Consolidando movimientos contables en tiempo real.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
