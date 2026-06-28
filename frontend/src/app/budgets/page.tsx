"use client";

import React, { useState, useEffect } from "react";
import { api } from "../../services/api";

type BudgetSummary = {
  id: string | null;
  accountId: string;
  accountName: string;
  limit: number;
  spent: number;
  percentage: number;
  isExceeded: boolean;
  period: string;
};

type Account = {
  id: string;
  name: string;
  type: string;
};

export default function BudgetsPage() {
  const [period, setPeriod] = useState(new Date().toISOString().substring(0, 7)); // 'YYYY-MM'
  const [budgets, setBudgets] = useState<BudgetSummary[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Budget configuration state
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [limitAmount, setLimitAmount] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, [period]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const summary = await api.budgets.summary(period);
      setBudgets(summary || []);

      const accList = await api.accounts.list();
      const expenseAccs = (accList || []).filter((a: any) => a.type === "EXPENSE");
      setAccounts(expenseAccs);
    } catch (err: any) {
      setError(err.message || "Failed to load budget data");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccountId || !limitAmount) return;
    setSaving(true);
    setError("");

    try {
      await api.budgets.create({
        accountId: selectedAccountId,
        limit: Number(limitAmount),
        period: isDefault ? "0000-00" : period,
      });

      setLimitAmount("");
      setSelectedAccountId("");
      setIsDefault(false);
      fetchData();
    } catch (err: any) {
      setError(err.message || "Failed to save budget");
    } finally {
      setSaving(false);
    }
  };

  // Helper function to render progress bar color
  const getProgressBarColor = (percentage: number) => {
    if (percentage >= 100) return "bg-red-500 shadow-md shadow-red-500/20";
    if (percentage >= 80) return "bg-amber-500 shadow-md shadow-amber-500/20";
    return "bg-green-500 shadow-md shadow-green-500/20";
  };

  // Helper function to render text color based on limit excess
  const getPercentageTextColor = (percentage: number) => {
    if (percentage >= 100) return "text-red-600 dark:text-red-400 font-extrabold";
    if (percentage >= 80) return "text-amber-600 dark:text-amber-400 font-bold";
    return "text-green-600 dark:text-green-400 font-bold";
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-4 py-8 max-w-md mx-auto">
      <header className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Presupuestos</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">Metas y Límites de Gasto</p>
        </div>
        <button
          onClick={() => (window.location.href = "/accounts")}
          className="text-xs py-1.5 px-3 bg-slate-200 dark:bg-slate-800 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-700 transition"
        >
          Cuentas
        </button>
      </header>

      {error && <div className="p-3 mb-4 text-xs text-red-700 bg-red-50 dark:bg-red-950/30 dark:text-red-400 rounded-lg">{error}</div>}

      {/* Period Selection Controls */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 mb-6 flex justify-between items-center shadow-sm">
        <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Período de control</label>
        <input
          type="month"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-1.5 text-xs outline-none font-bold text-indigo-600 dark:text-indigo-400 focus:border-indigo-500"
        />
      </div>

      {/* Set Category Limit Form */}
      <form onSubmit={handleSaveBudget} className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 mb-6 space-y-3 shadow-sm">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Definir Límite de Gasto</h3>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-3xs font-bold uppercase text-slate-400 mb-1">Categoría</label>
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs outline-none focus:border-indigo-500"
            >
              <option value="">Seleccionar...</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-3xs font-bold uppercase text-slate-400 mb-1">Límite mensual ($)</label>
            <input
              type="number"
              value={limitAmount}
              placeholder="Ej. 500000"
              onChange={(e) => setLimitAmount(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs outline-none focus:border-indigo-500 font-bold"
            />
          </div>
        </div>
        <div className="flex items-center space-x-2 py-1">
          <input
            type="checkbox"
            id="isDefault"
            checked={isDefault}
            onChange={(e) => setIsDefault(e.target.checked)}
            className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500"
          />
          <label htmlFor="isDefault" className="text-xs font-medium text-slate-500 dark:text-slate-400 select-none">
            Presupuesto general recurrente (Periodo 0 por defecto)
          </label>
        </div>
        <button
          type="submit"
          disabled={saving || !selectedAccountId || !limitAmount}
          className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs transition disabled:opacity-50"
        >
          {saving ? "Asignando..." : "Asignar Límite"}
        </button>
      </form>

      {/* Budgets Progress List */}
      <div className="space-y-4">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Límites y Consumo</h2>

        {loading ? (
          <p className="text-xs text-slate-400 text-center py-4">Cargando...</p>
        ) : budgets.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-8 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
            No hay presupuestos configurados para {period}.
          </p>
        ) : (
          budgets.map((b) => (
            <div
              key={b.accountId}
              className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-100 dark:border-slate-700 shadow-sm space-y-2.5"
            >
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="text-sm font-bold flex items-center gap-1.5">
                    {b.accountName}
                    {b.period === "0000-00" && (
                      <span className="text-5xs bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider">
                        Recurrente
                      </span>
                    )}
                  </h4>
                  <p className="text-3xs text-slate-400">
                    Consumido: ${b.spent.toLocaleString()} de ${b.limit.toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <span className={`text-xs ${getPercentageTextColor(b.percentage)}`}>
                    {b.percentage}%
                  </span>
                </div>
              </div>

              {/* Progress Bar Container */}
              <div className="w-full bg-slate-100 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${getProgressBarColor(b.percentage)}`}
                  style={{ width: `${Math.min(b.percentage, 100)}%` }}
                />
              </div>

              {/* Exceeded Warn Badge */}
              {b.isExceeded && (
                <div className="inline-flex items-center space-x-1 py-1 px-2.5 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 rounded-md text-3xs font-extrabold uppercase tracking-wide">
                  <span>⚠ Presupuesto Excedido por ${Math.abs(b.limit - b.spent).toLocaleString()}</span>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
