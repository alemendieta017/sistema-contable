'use client';

import React, { useState, useEffect } from 'react';
import { api } from '../../../services/api';
import { formatCurrency } from '../../../lib/utils';
import { Calendar, AlertCircle, TrendingUp, TrendingDown, Printer, Sparkles } from 'lucide-react';

type ReportItem = {
  accountId: string;
  name: string;
  amount: number;
};

type IncomeStatementData = {
  period: string;
  income: ReportItem[];
  expenses: ReportItem[];
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
};

type Period = {
  id: string;
  name: string;
  status: string;
};

export default function IncomeStatementPage() {
  const [periods, setPeriods] = useState<Period[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState('');
  const [report, setReport] = useState<IncomeStatementData | null>(null);
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
      }
    } catch (err: any) {
      setError(err.message || 'Error al cargar los períodos contables.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedPeriodId) {
      loadReport(selectedPeriodId);
    } else {
      setReport(null);
    }
  }, [selectedPeriodId]);

  const loadReport = async (periodId: string) => {
    try {
      setReportLoading(true);
      setError('');
      const data = await api.reports.incomeStatement(periodId);
      setReport(data);
    } catch (err: any) {
      setError(err.message || 'Error al generar el Estado de Resultados.');
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

  const isProfit = report ? report.netProfit >= 0 : true;

  return (
    <div className="space-y-6 max-w-4xl mx-auto print:p-0 print:max-w-full">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-800 dark:text-slate-100">
            Estado de Resultados
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-450 mt-0.5">
            Rendimiento del período: Ingresos, Gastos y Resultado Neto
          </p>
        </div>

        <div className="flex items-center gap-3">
          {periods.length > 0 && (
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-455 dark:text-slate-500" />
              <select
                value={selectedPeriodId}
                onChange={(e) => setSelectedPeriodId(e.target.value)}
                className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-850 dark:text-slate-150 text-xs focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
              >
                {periods.map((p) => (
                  <option key={p.id} value={p.id}>
                    Período {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {report && (
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 py-2 px-3.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-205 font-bold rounded-xl text-xs transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir</span>
            </button>
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
          <TrendingUp className="w-12 h-12 text-slate-350 dark:text-slate-550 mx-auto" />
          <div>
            <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">
              No hay períodos contables registrados
            </h3>
            <p className="text-xs text-slate-455 dark:text-slate-550 mt-1 max-w-sm mx-auto leading-relaxed">
              Cree un ejercicio fiscal y registre períodos contables para poder consultar el Estado
              de Resultados del sistema.
            </p>
          </div>
        </div>
      )}

      {reportLoading && (
        <div className="text-center py-12">
          <div className="w-6 h-6 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <span className="text-[11px] text-slate-400 font-semibold">
            Consolidando flujos de ingresos y egresos...
          </span>
        </div>
      )}

      {/* Print Document Title (Visible only when printing) */}
      {report && (
        <div className="hidden print:block mb-8 border-b pb-4 text-center">
          <h1 className="text-2xl font-bold">ESTADO DE RESULTADOS</h1>
          <p className="text-sm text-gray-500">Período Contable: {report.period}</p>
          <p className="text-xs text-gray-400 mt-1">
            Generado automáticamente - Base: {baseCurrency.code}
          </p>
        </div>
      )}

      {/* Report Content */}
      {report && !reportLoading && (
        <div className="space-y-6">
          {/* Net Result Dashboard Card */}
          <div
            className={`rounded-3xl p-6 shadow-md transition relative overflow-hidden text-white bg-gradient-to-tr ${
              isProfit
                ? 'from-emerald-650 to-emerald-700 dark:from-emerald-600 dark:to-emerald-700 shadow-emerald-500/5'
                : 'from-rose-650 to-rose-700 dark:from-rose-600 dark:to-rose-700 shadow-rose-500/5'
            }`}
          >
            <div className="absolute right-4 bottom-4 opacity-10 pointer-events-none">
              {isProfit ? (
                <TrendingUp className="w-36 h-36" />
              ) : (
                <TrendingDown className="w-36 h-36" />
              )}
            </div>

            <span className="text-3xs font-extrabold uppercase tracking-widest text-white/80 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isProfit ? 'Resultado Neto (Utilidad)' : 'Resultado Neto (Pérdida)'}</span>
            </span>

            <h2 className="text-3xl font-extrabold mt-1 whitespace-nowrap">
              {formatCurrency(report.netProfit, baseCurrency)}
            </h2>

            <div className="grid grid-cols-2 gap-4 mt-6 border-t border-white/20 pt-4 text-xs">
              <div>
                <p className="text-white/70 font-semibold text-3xs uppercase tracking-wider">
                  Total Ingresos
                </p>
                <p className="font-bold text-base mt-0.5 whitespace-nowrap">
                  {formatCurrency(report.totalIncome, baseCurrency)}
                </p>
              </div>
              <div>
                <p className="text-white/70 font-semibold text-3xs uppercase tracking-wider">
                  Total Gastos
                </p>
                <p className="font-bold text-base mt-0.5 whitespace-nowrap">
                  {formatCurrency(report.totalExpenses, baseCurrency)}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:grid-cols-2">
            {/* Income Section */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm p-6 space-y-4 print:border-none print:shadow-none print:p-0">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-700">
                <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-205 uppercase tracking-wider">
                  Ingresos Operativos
                </h3>
              </div>

              {report.income.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-2">
                  No se registraron ingresos en este período.
                </p>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1 print:max-h-full">
                  {report.income.map((item) => (
                    <div
                      key={item.accountId}
                      className="flex justify-between items-center text-xs py-1.5 border-b border-dashed border-slate-100 dark:border-slate-750/50"
                    >
                      <span className="text-slate-655 dark:text-slate-350 font-semibold">
                        {item.name}
                      </span>
                      <span className="font-bold text-emerald-650 dark:text-emerald-450 whitespace-nowrap">
                        {formatCurrency(item.amount, baseCurrency)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-between items-center pt-3 mt-4 border-t border-slate-100 dark:border-slate-700 font-extrabold text-xs">
                <span className="text-slate-700 dark:text-slate-300">TOTAL INGRESOS</span>
                <span className="text-emerald-600 dark:text-emerald-400 text-sm whitespace-nowrap">
                  {formatCurrency(report.totalIncome, baseCurrency)}
                </span>
              </div>
            </div>

            {/* Expenses Section */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm p-6 space-y-4 print:border-none print:shadow-none print:p-0">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-700">
                <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-205 uppercase tracking-wider">
                  Gastos / Egresos
                </h3>
              </div>

              {report.expenses.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-2">
                  No se registraron gastos en este período.
                </p>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1 print:max-h-full">
                  {report.expenses.map((item) => (
                    <div
                      key={item.accountId}
                      className="flex justify-between items-center text-xs py-1.5 border-b border-dashed border-slate-100 dark:border-slate-750/50"
                    >
                      <span className="text-slate-655 dark:text-slate-350 font-semibold">
                        {item.name}
                      </span>
                      <span className="font-bold text-rose-600 dark:text-rose-400 whitespace-nowrap">
                        {formatCurrency(item.amount, baseCurrency)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-between items-center pt-3 mt-4 border-t border-slate-100 dark:border-slate-700 font-extrabold text-xs">
                <span className="text-slate-700 dark:text-slate-300">TOTAL GASTOS</span>
                <span className="text-rose-600 dark:text-rose-400 text-sm whitespace-nowrap">
                  {formatCurrency(report.totalExpenses, baseCurrency)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
