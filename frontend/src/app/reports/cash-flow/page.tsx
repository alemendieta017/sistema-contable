'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '../../../services/api';
import { useIsMobile } from '../../../hooks/useMediaQuery';
import { formatCurrency } from '../../../lib/utils';
import {
  ForecastMatrixGrid,
  AccountForecastItem,
  MonthForecastItem,
} from '../../../components/reports/ForecastMatrixGrid';
import {
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Wallet,
  Building2,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';

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

export default function CashFlowForecastPage() {
  const isMobile = useIsMobile();

  const [currencies, setCurrencies] = useState<any[]>([]);
  const [currentYearMonth, setCurrentYearMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // View Mode: 'four_months' (4 meses), 'six_months' (6 meses), 'annual' (12 meses)
  const [viewMode, setViewMode] = useState<'four_months' | 'six_months' | 'annual'>('annual');

  const [months, setMonths] = useState<MonthForecastItem[]>([]);
  const [accounts, setAccounts] = useState<AccountForecastItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  // Load Currencies on mount
  useEffect(() => {
    async function loadCurrencies() {
      try {
        const curList = await api.currencies.list();
        setCurrencies(curList || []);
      } catch (err) {
        console.error('Error al cargar monedas:', err);
      }
    }
    loadCurrencies();
  }, []);

  const baseCurrency = currencies.find((c) => c.isBase) || {
    code: 'PYG',
    symbol: '₲',
    decimalPlaces: 0,
  };

  // Determine query parameters based on viewMode and currentYearMonth
  const { queryStartPeriod, queryMonths, isRolling } = useMemo(() => {
    const [yearStr] = currentYearMonth.split('-');
    const year = parseInt(yearStr, 10);

    if (viewMode === 'annual') {
      // Full calendar year (Ene - Dic)
      return { queryStartPeriod: `${year}-01`, queryMonths: 12, isRolling: false };
    } else if (viewMode === 'six_months') {
      return { queryStartPeriod: currentYearMonth, queryMonths: 6, isRolling: true };
    } else {
      // Four months
      return { queryStartPeriod: currentYearMonth, queryMonths: 4, isRolling: true };
    }
  }, [currentYearMonth, viewMode]);

  // Fetch Cash Flow Data
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await api.reports.realVsProjectedCashFlow({
        startPeriod: queryStartPeriod,
        months: queryMonths,
        rolling: isRolling,
      });
      setMonths(res.months || []);
      setAccounts(res.accounts || []);
    } catch (err: any) {
      console.error('Error al cargar flujo de caja proyectado:', err);
      setError(err.message || 'Error al cargar los datos de flujo de caja proyectado.');
    } finally {
      setIsLoading(false);
    }
  }, [queryStartPeriod, queryMonths, isRolling]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Navigation handlers
  const handlePrev = () => {
    const [year, month] = currentYearMonth.split('-').map(Number);
    if (viewMode === 'annual') {
      setCurrentYearMonth(`${year - 1}-01`);
    } else if (viewMode === 'six_months') {
      let newMonth = month - 6;
      let newYear = year;
      if (newMonth <= 0) {
        newMonth += 12;
        newYear -= 1;
      }
      setCurrentYearMonth(`${newYear}-${String(newMonth).padStart(2, '0')}`);
    } else {
      let newMonth = month - 4;
      let newYear = year;
      if (newMonth <= 0) {
        newMonth += 12;
        newYear -= 1;
      }
      setCurrentYearMonth(`${newYear}-${String(newMonth).padStart(2, '0')}`);
    }
  };

  const handleNext = () => {
    const [year, month] = currentYearMonth.split('-').map(Number);
    if (viewMode === 'annual') {
      setCurrentYearMonth(`${year + 1}-01`);
    } else if (viewMode === 'six_months') {
      let newMonth = month + 6;
      let newYear = year;
      if (newMonth > 12) {
        newMonth -= 12;
        newYear += 1;
      }
      setCurrentYearMonth(`${newYear}-${String(newMonth).padStart(2, '0')}`);
    } else {
      let newMonth = month + 4;
      let newYear = year;
      if (newMonth > 12) {
        newMonth -= 12;
        newYear += 1;
      }
      setCurrentYearMonth(`${newYear}-${String(newMonth).padStart(2, '0')}`);
    }
  };

  const handleGoToday = () => {
    const now = new Date();
    setCurrentYearMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  };

  // Navigator text label
  const navigatorLabel = useMemo(() => {
    if (viewMode === 'annual') {
      return currentYearMonth.substring(0, 4);
    }
    if (months && months.length >= 2) {
      const pFirst = months[0].periodName;
      const pLast = months[months.length - 1].periodName;
      return `${getSpanishMonthName(pFirst)} — ${getSpanishMonthName(pLast)}`;
    }
    return getSpanishMonthName(currentYearMonth);
  }, [viewMode, currentYearMonth, months]);

  // Compute Hero Summary KPI Totals dynamically from months data
  const heroSummary = useMemo(() => {
    if (!months || months.length === 0) {
      return {
        initialCash: 0,
        totalEntradas: 0,
        totalSalidas: 0,
        netFlow: 0,
        finalCash: 0,
      };
    }

    const initialCash = months[0].initialCash || 0;
    const totalEntradas = months.reduce((acc, m) => acc + (m.totalEntradas || 0), 0);
    const totalSalidas = months.reduce((acc, m) => acc + (m.totalSalidas || 0), 0);
    const netFlow = totalEntradas - totalSalidas;
    const finalCash = months[months.length - 1].finalCash || 0;

    return {
      initialCash,
      totalEntradas,
      totalSalidas,
      netFlow,
      finalCash,
    };
  }, [months]);

  return (
    <div className="flex flex-col h-full w-full p-2 sm:p-4 space-y-3 font-sans overflow-hidden">
      {/* 1. Header Navigation & Mode Bar */}
      <div className="flex items-center justify-between gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 sm:px-4 py-2 rounded-2xl shadow-xs shrink-0 w-full flex-wrap sm:flex-nowrap">
        {/* Temporal Navigator */}
        <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
          <div className="flex items-center bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-0.5 sm:p-1">
            <button
              type="button"
              onClick={handlePrev}
              className="p-1 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="px-2 sm:px-3 text-xs font-bold text-slate-900 dark:text-slate-100 font-mono tracking-tight select-none truncate text-center min-w-24 sm:min-w-36">
              {navigatorLabel}
            </span>

            <button
              type="button"
              onClick={handleNext}
              className="p-1 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={handleGoToday}
            className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 transition-colors cursor-pointer shrink-0"
          >
            Actual
          </button>
        </div>

        {/* View Mode Switcher (Cuatrimestral / Semestral / Anual) */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-1 space-x-1 shrink-0">
          <button
            type="button"
            onClick={() => setViewMode('four_months')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'four_months'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-300 shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Cuatrimestral
          </button>
          <button
            type="button"
            onClick={() => setViewMode('six_months')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'six_months'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-300 shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Semestral
          </button>
          <button
            type="button"
            onClick={() => setViewMode('annual')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'annual'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-300 shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Anual
          </button>
        </div>
      </div>

      {/* 2. Hero Summary Bar (5 KPIs) */}
      {!isMobile && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 shrink-0">
          {/* Saldo Inicial */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>Saldo Inicial</span>
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <p className="text-sm sm:text-base font-bold font-mono text-slate-800 dark:text-slate-100 mt-1 truncate tabular-nums">
              {formatCurrency(heroSummary.initialCash, baseCurrency)}
            </p>
          </div>

          {/* (+) Entradas Totales */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>(+) Entradas Totales</span>
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
            </div>
            <p className="text-sm sm:text-base font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1 truncate tabular-nums">
              {formatCurrency(heroSummary.totalEntradas, baseCurrency)}
            </p>
          </div>

          {/* (-) Salidas Totales */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>(-) Salidas Totales</span>
              <TrendingDown className="w-3.5 h-3.5 text-rose-500" />
            </div>
            <p className="text-sm sm:text-base font-bold font-mono text-rose-600 dark:text-rose-400 mt-1 truncate tabular-nums">
              {formatCurrency(heroSummary.totalSalidas, baseCurrency)}
            </p>
          </div>

          {/* (=) Flujo Neto */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>(=) Flujo Neto</span>
              <Wallet className="w-3.5 h-3.5 text-indigo-500" />
            </div>
            <p
              className={`text-sm sm:text-base font-bold font-mono mt-1 truncate tabular-nums ${
                heroSummary.netFlow >= 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {heroSummary.netFlow > 0 ? '+' : ''}
              {formatCurrency(heroSummary.netFlow, baseCurrency)}
            </p>
          </div>

          {/* (=) Saldo Final */}
          <div className="bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-900/60 rounded-2xl p-3 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-indigo-700 dark:text-indigo-300 text-xs font-semibold">
              <span>(=) Saldo Final Proyectado</span>
              <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <p
              className={`text-sm sm:text-base font-bold font-mono mt-1 truncate tabular-nums ${
                heroSummary.finalCash >= 0
                  ? 'text-indigo-950 dark:text-indigo-100'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {formatCurrency(heroSummary.finalCash, baseCurrency)}
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="p-3 text-xs text-rose-700 bg-rose-50 dark:bg-rose-950/20 dark:text-rose-400 rounded-xl border border-rose-200/40 shrink-0">
          {error}
        </div>
      )}

      {/* 3. Main Grid Area */}
      <div className="flex-1 w-full min-h-0 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
            <div className="flex flex-col items-center space-y-2">
              <RefreshCw className="w-6 h-6 text-indigo-500 animate-spin" />
              <span className="text-xs font-semibold text-slate-400">
                Generando caja proyectada...
              </span>
            </div>
          </div>
        ) : (
          <ForecastMatrixGrid
            type="CASH_FLOW"
            months={months}
            accounts={accounts}
            baseCurrency={baseCurrency}
          />
        )}
      </div>
    </div>
  );
}
