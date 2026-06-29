"use client";

import React, { useState, useEffect } from "react";
import { api } from "../../../services/api";
import { Trash2 } from "lucide-react";
import { formatCurrency, formatLocalDateWithOffset } from "../../../lib/utils";

type Account = {
  id: string;
  name: string;
  type: "ASSET" | "LIABILITY" | "EQUITY" | "INCOME" | "EXPENSE";
};

type EntryLine = {
  accountId: string;
  entryType: "DEBIT" | "CREDIT";
  amount: string;
};

export default function AsientoLibrePage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [currencies, setCurrencies] = useState<any[]>([]);
  const getLocalDateString = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const [date, setDate] = useState(getLocalDateString());
  const [description, setDescription] = useState("");
  const [entries, setEntries] = useState<EntryLine[]>([
    { accountId: "", entryType: "DEBIT", amount: "" },
    { accountId: "", entryType: "CREDIT", amount: "" },
  ]);

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [accList, curList] = await Promise.all([
        api.accounts.list(),
        api.currencies.list(),
      ]);
      setAccounts(accList || []);
      setCurrencies(curList || []);
    } catch (err: any) {
      setError("Error al cargar datos iniciales.");
    }
  };

  const addLine = () => {
    setEntries([...entries, { accountId: "", entryType: "DEBIT", amount: "" }]);
  };

  const removeLine = (index: number) => {
    if (entries.length <= 2) return;
    setEntries(entries.filter((_, idx) => idx !== index));
  };

  const updateLine = (index: number, field: keyof EntryLine, value: string) => {
    const updated = [...entries];
    updated[index] = { ...updated[index], [field]: value };
    setEntries(updated);
  };

  const baseCurrency = currencies.find((c) => c.isBase) || { code: "PYG", symbol: "₲", decimalPlaces: 0 };
  const currencySymbol = baseCurrency.symbol || "$";
  const amountPlaceholder = (0).toFixed(baseCurrency.decimalPlaces !== undefined ? baseCurrency.decimalPlaces : 2);

  // Calculation of live sums
  const totalDebits = entries
    .filter((e) => e.entryType === "DEBIT")
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  const totalCredits = entries
    .filter((e) => e.entryType === "CREDIT")
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  const difference = Math.abs(totalDebits - totalCredits);
  const isBalanced = difference < 0.0001 && totalDebits > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess("");
    setError("");

    if (!isBalanced) {
      setError("El asiento debe estar balanceado (Débitos = Créditos) y contener montos válidos.");
      setLoading(false);
      return;
    }

    const payloadEntries = entries.map((e) => ({
      accountId: e.accountId,
      entryType: e.entryType,
      amount: Number(e.amount),
    }));

    try {
      await api.transactions.create({
        date: formatLocalDateWithOffset(date),
        description: description || "Asiento Libre",
        entries: payloadEntries,
      });

      setSuccess("Asiento guardado con éxito.");
      setDescription("");
      setEntries([
        { accountId: "", entryType: "DEBIT", amount: "" },
        { accountId: "", entryType: "CREDIT", amount: "" },
      ]);
    } catch (err: any) {
      setError(err.message || "Failed to post transaction");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-4 py-8 max-w-4xl mx-auto animate-in fade-in duration-200">
      <header className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Asiento Libre</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">Editor manual multilínea</p>
        </div>
        <button
          onClick={() => (window.location.href = "/transactions")}
          className="text-xs py-1.5 px-3 bg-slate-200 dark:bg-slate-800 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-700 transition font-semibold"
        >
          Volver
        </button>
      </header>

      <form onSubmit={handleSubmit} className="space-y-4">
        {success && <div className="p-3 text-xs text-green-700 bg-green-50 dark:bg-green-950/30 dark:text-green-400 rounded-lg">{success}</div>}
        {error && <div className="p-3 text-xs text-red-700 bg-red-50 dark:bg-red-950/30 dark:text-red-400 rounded-lg">{error}</div>}

        {/* Date and Description */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-4 border border-slate-100 dark:border-slate-700 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1">
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Fecha</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs outline-none focus:border-indigo-500 transition text-slate-800 dark:text-slate-200 font-medium"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Concepto / Glosa</label>
              <input
                type="text"
                value={description}
                placeholder="Ej. Asiento de apertura"
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs outline-none focus:border-indigo-500 transition text-slate-800 dark:text-slate-200 font-medium"
              />
            </div>
          </div>
        </div>

        {/* Entry Lines */}
        <div className="space-y-3">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-xs font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wider">
              Apuntes / Partidas
            </h2>
            <button
              type="button"
              onClick={addLine}
              className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center gap-0.5"
            >
              + Agregar línea
            </button>
          </div>

          {/* Table headers - visible on desktop */}
          <div className="hidden sm:grid sm:grid-cols-[1fr_120px_140px_auto] gap-3 px-2 mb-1.5 text-4xs font-bold uppercase text-slate-450 dark:text-slate-500 tracking-wider">
            <div>Cuenta / Categoría</div>
            <div>Tipo</div>
            <div className="text-right">Monto</div>
            <div></div>
          </div>

          <div className="space-y-2">
            {entries.map((entry, index) => (
              <div
                key={index}
                className="grid grid-cols-1 sm:grid-cols-[1fr_120px_140px_auto] gap-2 items-center bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-150 dark:border-slate-700 shadow-sm transition hover:border-slate-350 dark:hover:border-slate-600 relative"
              >
                {/* Account Selector */}
                <div className="w-full">
                  <label className="block sm:hidden text-4xs font-bold uppercase text-slate-400 dark:text-slate-500 mb-1">
                    Cuenta / Categoría
                  </label>
                  <select
                    value={entry.accountId}
                    onChange={(e) => updateLine(index, "accountId", e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs outline-none focus:border-indigo-500 transition text-slate-850 dark:text-slate-200 font-semibold"
                  >
                    <option value="">Seleccionar cuenta...</option>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.type})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Segmented Button for Tipo */}
                <div className="w-full">
                  <label className="block sm:hidden text-4xs font-bold uppercase text-slate-400 dark:text-slate-500 mb-1">
                    Tipo
                  </label>
                  <div className="grid grid-cols-2 gap-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-0.5 rounded-lg">
                    <button
                      type="button"
                      onClick={() => updateLine(index, "entryType", "DEBIT")}
                      className={`py-1 text-4xs font-bold rounded-lg transition duration-150 ${
                        entry.entryType === "DEBIT"
                          ? "bg-rose-600 text-white shadow-sm"
                          : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                      }`}
                    >
                      DEBE
                    </button>
                    <button
                      type="button"
                      onClick={() => updateLine(index, "entryType", "CREDIT")}
                      className={`py-1 text-4xs font-bold rounded-lg transition duration-150 ${
                        entry.entryType === "CREDIT"
                          ? "bg-emerald-600 text-white shadow-sm"
                          : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                      }`}
                    >
                      HABER
                    </button>
                  </div>
                </div>

                {/* Amount input with currency symbol prefix */}
                <div className="w-full">
                  <label className="block sm:hidden text-4xs font-bold uppercase text-slate-400 dark:text-slate-500 mb-1">
                    Monto
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-2.5 text-xs font-semibold text-slate-450 dark:text-slate-500">
                      {currencySymbol}
                    </span>
                    <input
                      type="number"
                      step="any"
                      value={entry.amount}
                      placeholder={amountPlaceholder}
                      onChange={(e) => updateLine(index, "amount", e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 pl-7 text-xs outline-none text-right font-bold focus:border-indigo-500 text-slate-800 dark:text-slate-200"
                    />
                  </div>
                </div>

                {/* Delete button */}
                <div className="flex justify-end sm:justify-start">
                  {entries.length > 2 ? (
                    <button
                      type="button"
                      onClick={() => removeLine(index)}
                      className="p-1.5 text-slate-450 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg border border-transparent hover:border-red-100 dark:hover:border-red-900 transition-all duration-150"
                      title="Remover línea"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  ) : (
                    <div className="w-7 h-7 hidden sm:block"></div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Live balance indicator */}
        <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 space-y-2 shadow-sm">
          <div className="flex justify-between text-xs">
            <span>Total Débito (Debe):</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-450">{formatCurrency(totalDebits, baseCurrency)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span>Total Crédito (Haber):</span>
            <span className="font-bold text-rose-600 dark:text-rose-450">{formatCurrency(totalCredits, baseCurrency)}</span>
          </div>
          <div className="border-t border-slate-200 dark:border-slate-700 pt-2 flex justify-between text-xs font-bold">
            <span>Diferencia:</span>
            <span className={difference === 0 ? "text-indigo-600 dark:text-indigo-400" : "text-amber-500"}>
              {formatCurrency(difference, baseCurrency)} {difference === 0 ? "✓ Cuadrado" : "✗ Descuadrado"}
            </span>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !isBalanced}
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition disabled:opacity-50"
        >
          {loading ? "Guardando..." : "Guardar Asiento Libre"}
        </button>
      </form>
    </div>
  );
}
