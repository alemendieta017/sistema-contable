"use client";

import React, { useState, useEffect } from "react";
import { api } from "../../services/api";
import { useSearch } from "../../lib/search-context";
import TransactionFilters from "../../components/TransactionFilters";
import DailyView from "../../components/DailyView";
import MonthlyView from "../../components/MonthlyView";
import CalendarView from "../../components/CalendarView";
import { ReceiptText, Calendar as CalendarIcon, BarChart3, TrendingUp, TrendingDown, DollarSign } from "lucide-react";

type Account = {
  id: string;
  name: string;
  type: "ASSET" | "LIABILITY" | "EQUITY" | "INCOME" | "EXPENSE";
  currencyId: string;
  parentId?: string | null;
};

export default function TransactionsPage() {
  const { searchQuery } = useSearch();
  const [view, setView] = useState<"daily" | "calendar" | "monthly">("daily");
  
  // Date Range (default: current month)
  const getFirstDayOfMonth = () => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().substring(0, 10);
  };
  const getLastDayOfMonth = () => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().substring(0, 10);
  };

  const [startDate, setStartDate] = useState(getFirstDayOfMonth());
  const [endDate, setEndDate] = useState(getLastDayOfMonth());
  const [selectedAccountId, setSelectedAccountId] = useState("");
  
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetchData();
  }, [startDate, endDate]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError("");

      const accs = await api.accounts.list();
      setAccounts(accs || []);

      // If view is calendar or monthly, we want to fetch a wider range of transactions (e.g. current year)
      // to populate aggregates properly. But let's fetch based on the selected range.
      const txs = await api.transactions.list(startDate, endDate);
      setTransactions(txs || []);
    } catch (err: any) {
      setError(err.message || "Error al cargar registros contables.");
    } finally {
      setLoading(false);
    }
  };

  const handleReverse = async (id: string) => {
    if (!confirm("¿Está seguro de que desea anular/reversar este asiento? Se creará una transacción de offset automática.")) {
      return;
    }
    try {
      setLoading(true);
      await api.transactions.reverse(id);
      setSuccess("Asiento reversado con éxito.");
      fetchData();
    } catch (err: any) {
      setError(err.message || "Error al anular transacción.");
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

  // Calculate totals for dashboard summary cards
  let totalIncome = 0;
  let totalExpense = 0;

  filteredTransactions.forEach((tx) => {
    if (tx.status === "REVERSED") return;
    tx.entries.forEach((entry: any) => {
      if (entry.entryType === "CREDIT" && entry.account?.type === "INCOME") {
        totalIncome += entry.amount;
      }
      if (entry.entryType === "DEBIT" && entry.account?.type === "EXPENSE") {
        totalExpense += entry.amount;
      }
    });
  });

  const netBalance = totalIncome - totalExpense;

  return (
    <div className="space-y-6">
      {/* Top Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-800 dark:text-slate-100">
            Registro de Transacciones
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-450 mt-0.5">
            Libro diario contable por partida doble
          </p>
        </div>

        {/* View Switch Tabs */}
        <div className="grid grid-cols-3 gap-1 bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 p-0.5 rounded-xl shadow-sm self-stretch sm:self-auto">
          <button
            onClick={() => setView("daily")}
            className={`flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition ${
              view === "daily"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/10"
                : "text-slate-550 dark:text-slate-450 hover:bg-slate-50 dark:hover:bg-slate-750"
            }`}
          >
            <ReceiptText className="w-3.5 h-3.5" />
            <span>Diario</span>
          </button>
          <button
            onClick={() => setView("calendar")}
            className={`flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition ${
              view === "calendar"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/10"
                : "text-slate-550 dark:text-slate-450 hover:bg-slate-50 dark:hover:bg-slate-750"
            }`}
          >
            <CalendarIcon className="w-3.5 h-3.5" />
            <span>Calendario</span>
          </button>
          <button
            onClick={() => setView("monthly")}
            className={`flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition ${
              view === "monthly"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/10"
                : "text-slate-550 dark:text-slate-450 hover:bg-slate-50 dark:hover:bg-slate-750"
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Mensual</span>
          </button>
        </div>
      </div>

      {/* API Toast Messages */}
      {success && (
        <div className="p-3.5 text-xs text-green-700 bg-green-50 dark:bg-green-950/30 dark:text-green-400 rounded-2xl border border-green-150">
          {success}
        </div>
      )}
      {error && (
        <div className="p-3.5 text-xs text-red-700 bg-red-50 dark:bg-red-950/30 dark:text-red-400 rounded-2xl border border-red-150">
          {error}
        </div>
      )}

      {/* Dashboard Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-3xs font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider">
              Ingresos del Período
            </p>
            <h4 className="text-base font-extrabold text-green-500 mt-1">
              ${totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </h4>
          </div>
          <div className="w-9 h-9 bg-green-50 dark:bg-green-950/20 rounded-xl flex items-center justify-center text-green-500">
            <TrendingUp className="w-4.5 h-4.5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-3xs font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider">
              Gastos del Período
            </p>
            <h4 className="text-base font-extrabold text-red-500 mt-1">
              ${totalExpense.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </h4>
          </div>
          <div className="w-9 h-9 bg-red-50 dark:bg-red-950/20 rounded-xl flex items-center justify-center text-red-500">
            <TrendingDown className="w-4.5 h-4.5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-3xs font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider">
              Saldo Neto
            </p>
            <h4
              className={`text-base font-extrabold mt-1 ${
                netBalance >= 0 ? "text-indigo-500" : "text-red-550 dark:text-red-400"
              }`}
            >
              ${netBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </h4>
          </div>
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center ${
              netBalance >= 0
                ? "bg-indigo-50 dark:bg-indigo-950/20 text-indigo-500"
                : "bg-red-50 dark:bg-red-950/20 text-red-550 dark:text-red-400"
            }`}
          >
            <DollarSign className="w-4.5 h-4.5" />
          </div>
        </div>
      </div>

      {/* Global Filters */}
      <TransactionFilters
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        selectedAccountId={selectedAccountId}
        onAccountIdChange={setSelectedAccountId}
        accounts={accounts}
      />

      {/* Active View Render */}
      {loading ? (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <span className="text-xs text-slate-400 font-semibold">Cargando registros...</span>
        </div>
      ) : (
        <div className="animate-in fade-in duration-200">
          {view === "daily" && (
            <DailyView transactions={filteredTransactions} onReverse={handleReverse} />
          )}
          {view === "calendar" && <CalendarView transactions={filteredTransactions} />}
          {view === "monthly" && <MonthlyView transactions={filteredTransactions} />}
        </div>
      )}
    </div>
  );
}
