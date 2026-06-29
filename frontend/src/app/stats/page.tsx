"use client";

import React, { useState, useEffect } from "react";
import { api } from "../../services/api";
import PieChart from "../../components/PieChart";
import NetWorthChart from "../../components/NetWorthChart";
import IncomeStatementChart from "../../components/IncomeStatementChart";
import { BarChart3, TrendingUp, ShieldAlert } from "lucide-react";

type StatItem = {
  accountId: string;
  accountName: string;
  amount: number;
  percentage: number;
};

export default function StatsPage() {
  const [period, setPeriod] = useState(new Date().toISOString().substring(0, 7)); // 'YYYY-MM'
  const [type, setType] = useState<"EXPENSE" | "INCOME">("EXPENSE");
  
  const [stats, setStats] = useState<StatItem[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchData();
  }, [period, type]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError("");

      // 1. Fetch category aggregates for selected month
      const statData = await api.reports.statistics(period, type, new Date().getTimezoneOffset());
      setStats(statData || []);

      // 2. Fetch full transactions list to reconstruct net worth history & comparison
      const txList = await api.transactions.list();
      setTransactions(txList || []);
    } catch (err: any) {
      setError(err.message || "Error al cargar estadísticas contables.");
    } finally {
      setLoading(false);
    }
  };

  // Reconstruct Net Worth History points
  const getNetWorthHistory = () => {
    // Sort transactions ascending by date
    const sorted = [...transactions]
      .filter((t) => t.status !== "REVERSED")
      .sort((a, b) => a.date.localeCompare(b.date));

    let runningNetWorth = 0;
    const historyPoints: { date: string; balance: number }[] = [];

    // Accumulate (in base currency)
    sorted.forEach((tx) => {
      let assetChange = 0;
      let liabilityChange = 0;

      tx.entries.forEach((entry: any) => {
        if (entry.account?.type === "ASSET") {
          assetChange += entry.entryType === "DEBIT" ? Number(entry.amountBase || entry.amount) : -Number(entry.amountBase || entry.amount);
        } else if (entry.account?.type === "LIABILITY") {
          liabilityChange += entry.entryType === "CREDIT" ? Number(entry.amountBase || entry.amount) : -Number(entry.amountBase || entry.amount);
        }
      });

      runningNetWorth += assetChange - liabilityChange;
      
      const dateStr = tx.date.substring(0, 10);
      // Group points on the same date or just add
      historyPoints.push({
        date: dateStr,
        balance: runningNetWorth,
      });
    });

    return historyPoints;
  };

  // Build Monthly income vs expense comparative data (last 6 months)
  const getMonthlyComparative = () => {
    const months = [
      "Ene", "Feb", "Mar", "Abr", "May", "Jun",
      "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"
    ];

    const currentYear = new Date().getFullYear();
    const comparative: Record<string, { monthName: string; income: number; expense: number; monthVal: number }> = {};

    // Initialize past 6 months
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      comparative[key] = {
        monthName: `${months[d.getMonth()]} ${String(d.getFullYear()).substring(2)}`,
        income: 0,
        expense: 0,
        monthVal: d.getMonth(),
      };
    }

    transactions.forEach((tx) => {
      if (tx.status === "REVERSED") return;
      const txDate = new Date(tx.date);
      const key = `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, "0")}`;

      if (comparative[key]) {
        tx.entries.forEach((entry: any) => {
          if (entry.entryType === "CREDIT" && entry.account?.type === "INCOME") {
            comparative[key].income += Number(entry.amountBase || entry.amount);
          }
          if (entry.entryType === "DEBIT" && entry.account?.type === "EXPENSE") {
            comparative[key].expense += Number(entry.amountBase || entry.amount);
          }
        });
      }
    });

    return Object.values(comparative);
  };

  const totalAmount = stats.reduce((sum, item) => sum + item.amount, 0);

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <span className="text-xs text-slate-400 font-semibold">Cargando reportes gráficos...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-800 dark:text-slate-100">
            Estadísticas e Informes
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-455 mt-0.5">
            Información analítica visual de sus flujos financieros
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3.5 text-xs text-red-750 bg-red-50 dark:bg-red-950/30 dark:text-red-400 rounded-2xl border border-red-155 flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Control Panel selectors */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex items-center space-x-3.5 w-full sm:w-auto">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Seleccionar Mes:
          </span>
          <input
            type="month"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-xs outline-none font-bold text-indigo-600 dark:text-indigo-400 focus:border-indigo-500"
          />
        </div>

        {/* Expense/Income Toggle tabs */}
        <div className="grid grid-cols-2 gap-1 bg-slate-55 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 p-0.5 rounded-xl w-full sm:w-60 text-xs">
          <button
            onClick={() => setType("EXPENSE")}
            className={`py-2 font-bold rounded-lg transition duration-150 ${
              type === "EXPENSE"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/10"
                : "text-slate-550 dark:text-slate-450 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            Egresos
          </button>
          <button
            onClick={() => setType("INCOME")}
            className={`py-2 font-bold rounded-lg transition duration-150 ${
              type === "INCOME"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/10"
                : "text-slate-550 dark:text-slate-455 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            Ingresos
          </button>
        </div>
      </div>

      {/* Main Charts Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Doughnut Chart Distribution */}
        <div className="space-y-2">
          <span className="text-3xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">
            Distribución de {type === "EXPENSE" ? "Gastos" : "Ingresos"}
          </span>
          <PieChart data={stats} type={type} />
        </div>

        {/* Income vs Expense Comparative Bar Chart */}
        <div className="space-y-2">
          <span className="text-3xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">
            Historial de Comparativa
          </span>
          <IncomeStatementChart data={getMonthlyComparative()} />
        </div>

        {/* Net Worth Line/Area Curve Chart */}
        <div className="lg:col-span-2 space-y-2">
          <span className="text-3xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">
            Evolución del Patrimonio Neto
          </span>
          <NetWorthChart data={getNetWorthHistory()} />
        </div>

      </div>
    </div>
  );
}
