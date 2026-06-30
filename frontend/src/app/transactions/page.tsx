'use client';

import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useSearch } from '../../lib/search-context';
import TransactionFilters from '../../components/TransactionFilters';
import DailyView from '../../components/DailyView';
import MonthlyView from '../../components/MonthlyView';
import CalendarView from '../../components/CalendarView';
import {
  ReceiptText,
  Calendar as CalendarIcon,
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
} from 'lucide-react';
import { formatCurrency, formatLocalDateWithOffset, formatLocalDateEndWithOffset } from '../../lib/utils';

type Account = {
  id: string;
  name: string;
  type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE';
  currencyId: string;
  parentId?: string | null;
};

export default function TransactionsPage() {
  const { searchQuery } = useSearch();
  const [view, setView] = useState<'daily' | 'calendar' | 'monthly'>('daily');

  // Date Range (default: current month)
  const getFirstDayOfMonth = () => {
    const d = new Date();
    const firstDay = new Date(d.getFullYear(), d.getMonth(), 1);
    const y = firstDay.getFullYear();
    const m = String(firstDay.getMonth() + 1).padStart(2, '0');
    const day = String(firstDay.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };
  const getLastDayOfMonth = () => {
    const d = new Date();
    const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    const y = lastDay.getFullYear();
    const m = String(lastDay.getMonth() + 1).padStart(2, '0');
    const day = lastDay.getDate();
    const dayStr = String(day).padStart(2, '0');
    return `${y}-${m}-${dayStr}`;
  };

  const [dailyDates, setDailyDates] = useState({
    startDate: getFirstDayOfMonth(),
    endDate: getLastDayOfMonth(),
  });
  const [calendarDates, setCalendarDates] = useState({
    startDate: getFirstDayOfMonth(),
    endDate: getLastDayOfMonth(),
  });
  const [monthlyDates, setMonthlyDates] = useState({
    startDate: `${new Date().getFullYear()}-01-01`,
    endDate: `${new Date().getFullYear()}-12-31`,
  });

  const [selectedAccountId, setSelectedAccountId] = useState('');

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [currencies, setCurrencies] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const activeStartDate =
    view === 'daily'
      ? dailyDates.startDate
      : view === 'calendar'
      ? calendarDates.startDate
      : monthlyDates.startDate;

  const activeEndDate =
    view === 'daily'
      ? dailyDates.endDate
      : view === 'calendar'
      ? calendarDates.endDate
      : monthlyDates.endDate;

  useEffect(() => {
    fetchData();
  }, [activeStartDate, activeEndDate]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');

      const [accs, curs, txs] = await Promise.all([
        api.accounts.list(),
        api.currencies.list(),
        api.transactions.list(
          formatLocalDateWithOffset(activeStartDate),
          formatLocalDateEndWithOffset(activeEndDate)
        ),
      ]);

      setAccounts(accs || []);
      setCurrencies(curs || []);
      setTransactions(txs || []);
    } catch (err: any) {
      setError(err.message || 'Error al cargar registros contables.');
    } finally {
      setLoading(false);
    }
  };

  const handleReverse = async (id: string) => {
    if (
      !confirm(
        '¿Está seguro de que desea anular/reversar este asiento? Se creará una transacción de offset automática.',
      )
    ) {
      return;
    }
    try {
      setLoading(true);
      await api.transactions.reverse(id);
      setSuccess('Asiento reversado con éxito.');
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Error al anular transacción.');
    } finally {
      setLoading(false);
    }
  };

  // Perform Client-side search and account filters
  const filteredTransactions = transactions.filter((tx) => {
    // 1. Account Filter
    if (selectedAccountId) {
      const containsAccount = tx.entries.some((e: any) => e.accountId === selectedAccountId);
      if (!containsAccount) return false;
    }

    // 2. Substring query search (filters description, notes, or entries account names)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchDesc = tx.description.toLowerCase().includes(q);
      const matchAccount = tx.entries.some((e: any) => e.account?.name.toLowerCase().includes(q));
      if (!matchDesc && !matchAccount) return false;
    }

    return true;
  });

  // Find the base currency to display totals
  const baseCurrency = currencies.find((c) => c.isBase) || {
    code: 'PYG',
    symbol: '₲',
    decimalPlaces: 0,
  };

  // Calculate totals for dashboard summary cards (aggregates in base currency)
  let totalIncome = 0;
  let totalExpense = 0;

  filteredTransactions.forEach((tx) => {
    if (tx.status === 'REVERSED') return;
    tx.entries.forEach((entry: any) => {
      if (entry.entryType === 'CREDIT' && entry.account?.type === 'INCOME') {
        totalIncome += Number(entry.amountBase || entry.amount);
      }
      if (entry.entryType === 'DEBIT' && entry.account?.type === 'EXPENSE') {
        totalExpense += Number(entry.amountBase || entry.amount);
      }
    });
  });

  const handleViewChange = (newView: 'daily' | 'calendar' | 'monthly') => {
    setView(newView);
  };

  const handleMonthChange = (newDate: Date) => {
    const firstDay = new Date(newDate.getFullYear(), newDate.getMonth(), 1);
    const lastDay = new Date(newDate.getFullYear(), newDate.getMonth() + 1, 0);

    const formatToYYYYMMDD = (date: Date) => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    setCalendarDates({
      startDate: formatToYYYYMMDD(firstDay),
      endDate: formatToYYYYMMDD(lastDay),
    });
  };

  const handleYearChange = (newYear: number) => {
    setMonthlyDates({
      startDate: `${newYear}-01-01`,
      endDate: `${newYear}-12-31`,
    });
  };

  const netBalance = totalIncome - totalExpense;

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* API Toast Messages */}
      {success && (
        <div className="p-2.5 text-xs text-green-700 bg-green-50 dark:bg-green-950/30 dark:text-green-400 rounded-xl border border-green-150">
          {success}
        </div>
      )}
      {error && (
        <div className="p-2.5 text-xs text-red-700 bg-red-50 dark:bg-red-950/30 dark:text-red-400 rounded-xl border border-red-150">
          {error}
        </div>
      )}

      {/* Unified Dashboard Header Card */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm space-y-4">
        {/* Top Page Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h1 className="text-lg font-bold tracking-tight text-slate-850 dark:text-slate-100">
              Libro Diario
            </h1>
          </div>

          {/* View Switch Tabs */}
          <div className="grid grid-cols-3 gap-1 bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-850 p-0.5 rounded-xl shadow-inner self-stretch sm:self-auto">
            <button
              onClick={() => handleViewChange('daily')}
              className={`flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer ${
                view === 'daily'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-550 dark:text-slate-450 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              <ReceiptText className="w-3.5 h-3.5" />
              <span>Diario</span>
            </button>
            <button
              onClick={() => handleViewChange('calendar')}
              className={`flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer ${
                view === 'calendar'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-550 dark:text-slate-450 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>Calendario</span>
            </button>
            <button
              onClick={() => handleViewChange('monthly')}
              className={`flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer ${
                view === 'monthly'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-550 dark:text-slate-450 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Mensual</span>
            </button>
          </div>
        </div>

        {/* Dashboard Summary Cards */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <div className="p-2 sm:p-3 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center justify-between min-w-0">
            <div className="min-w-0">
              <p className="text-4xs font-bold text-slate-400 dark:text-slate-555 uppercase tracking-wider truncate">
                Ingresos
              </p>
              <h4 className="text-sm sm:text-base font-extrabold text-green-500 mt-0.5 truncate">
                {formatCurrency(totalIncome, baseCurrency)}
              </h4>
            </div>
            <div className="hidden sm:flex w-8 h-8 bg-green-50 dark:bg-green-950/20 rounded-xl items-center justify-center text-green-500 shrink-0">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>

          <div className="p-2 sm:p-3 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center justify-between min-w-0">
            <div className="min-w-0">
              <p className="text-4xs font-bold text-slate-400 dark:text-slate-555 uppercase tracking-wider truncate">
                Egresos
              </p>
              <h4 className="text-sm sm:text-base font-extrabold text-red-500 mt-0.5 truncate">
                {formatCurrency(totalExpense, baseCurrency)}
              </h4>
            </div>
            <div className="hidden sm:flex w-8 h-8 bg-red-50 dark:bg-red-950/20 rounded-xl items-center justify-center text-red-500 shrink-0">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>

          <div className="p-2 sm:p-3 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center justify-between min-w-0">
            <div className="min-w-0">
              <p className="text-4xs font-bold text-slate-400 dark:text-slate-555 uppercase tracking-wider truncate">
                Saldo Neto
              </p>
              <h4
                className={`text-sm sm:text-base font-extrabold mt-0.5 truncate ${
                  netBalance >= 0 ? 'text-indigo-500' : 'text-red-500'
                }`}
              >
                {formatCurrency(netBalance, baseCurrency)}
              </h4>
            </div>
            <div
              className={`hidden sm:flex w-8 h-8 rounded-xl items-center justify-center shrink-0 border ${
                netBalance >= 0
                  ? 'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-500 border-indigo-100'
                  : 'bg-red-50 dark:bg-red-950/20 text-red-550 border-red-100'
              }`}
            >
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>

      {/* Global Filters */}
      <TransactionFilters
        startDate={dailyDates.startDate}
        endDate={dailyDates.endDate}
        onDateRangeChange={(start, end) => {
          setDailyDates({ startDate: start, endDate: end });
        }}
        selectedAccountId={selectedAccountId}
        onAccountIdChange={setSelectedAccountId}
        accounts={accounts}
        view={view}
      />

      {/* Active View Render */}
      {loading ? (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <span className="text-xs text-slate-400 font-semibold">Cargando registros...</span>
        </div>
      ) : (
        <div className="animate-in fade-in duration-200">
          {view === 'daily' && (
            <DailyView
              transactions={filteredTransactions}
              onReverse={handleReverse}
              baseCurrency={baseCurrency}
            />
          )}
          {view === 'calendar' && (
            <CalendarView
              transactions={filteredTransactions}
              baseCurrency={baseCurrency}
              currentDate={new Date(calendarDates.startDate + 'T12:00:00')}
              onMonthChange={handleMonthChange}
            />
          )}
          {view === 'monthly' && (
            <MonthlyView
              transactions={filteredTransactions}
              baseCurrency={baseCurrency}
              currentYear={new Date(monthlyDates.startDate + 'T12:00:00').getFullYear()}
              onYearChange={handleYearChange}
            />
          )}
        </div>
      )}
    </div>
  );
}
