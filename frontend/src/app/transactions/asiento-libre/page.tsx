"use client";

import React, { useState, useEffect } from "react";
import { api } from "../../../services/api";

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
  const [date, setDate] = useState(new Date().toISOString().substring(0, 10));
  const [description, setDescription] = useState("");
  const [entries, setEntries] = useState<EntryLine[]>([
    { accountId: "", entryType: "DEBIT", amount: "" },
    { accountId: "", entryType: "CREDIT", amount: "" },
  ]);

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const list = await api.accounts.list();
      setAccounts(list || []);
    } catch (err: any) {
      setError("Failed to load accounts list");
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
        date: new Date(date).toISOString(),
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-4 py-8 max-w-md mx-auto">
      <header className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Asiento Libre</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">Editor manual multilínea</p>
        </div>
        <button
          onClick={() => (window.location.href = "/transactions")}
          className="text-xs py-1.5 px-3 bg-slate-200 dark:bg-slate-800 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-700 transition"
        >
          Volver
        </button>
      </header>

      <form onSubmit={handleSubmit} className="space-y-4">
        {success && <div className="p-3 text-xs text-green-700 bg-green-50 dark:bg-green-950/30 dark:text-green-400 rounded-lg">{success}</div>}
        {error && <div className="p-3 text-xs text-red-700 bg-red-50 dark:bg-red-950/30 dark:text-red-400 rounded-lg">{error}</div>}

        {/* Date and Description */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-4 border border-slate-100 dark:border-slate-700 space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Fecha</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-sm outline-none focus:border-indigo-500 transition"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Concepto / Glosa</label>
            <input
              type="text"
              value={description}
              placeholder="Ej. Asiento de apertura"
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-sm outline-none focus:border-indigo-500 transition"
            />
          </div>
        </div>

        {/* Entry Lines */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Apuntes / Partidas</h2>
            <button
              type="button"
              onClick={addLine}
              className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
            >
              + Agregar línea
            </button>
          </div>

          {entries.map((entry, index) => (
            <div
              key={index}
              className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-100 dark:border-slate-700 space-y-3 relative shadow-sm"
            >
              {entries.length > 2 && (
                <button
                  type="button"
                  onClick={() => removeLine(index)}
                  className="absolute top-2 right-2 text-slate-400 hover:text-red-500 text-xs"
                >
                  Remover
                </button>
              )}

              <div>
                <label className="block text-3xs font-bold text-slate-400 uppercase mb-1">Cuenta</label>
                <select
                  value={entry.accountId}
                  onChange={(e) => updateLine(index, "accountId", e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs outline-none focus:border-indigo-500 transition"
                >
                  <option value="">Seleccionar cuenta...</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>{a.name} ({a.type})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-3xs font-bold text-slate-400 uppercase mb-1">Tipo</label>
                  <select
                    value={entry.entryType}
                    onChange={(e) => updateLine(index, "entryType", e.target.value as "DEBIT" | "CREDIT")}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs outline-none focus:border-indigo-500 transition font-semibold"
                  >
                    <option value="DEBIT">DÉBITO (Debe)</option>
                    <option value="CREDIT">CRÉDITO (Haber)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-3xs font-bold text-slate-400 uppercase mb-1">Monto</label>
                  <input
                    type="number"
                    step="0.01"
                    value={entry.amount}
                    placeholder="0.00"
                    onChange={(e) => updateLine(index, "amount", e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs outline-none focus:border-indigo-500 transition font-bold"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Live balance indicator */}
        <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 space-y-2">
          <div className="flex justify-between text-xs">
            <span>Total Débito (Debe):</span>
            <span className="font-bold text-green-600 dark:text-green-400">${totalDebits.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span>Total Crédito (Haber):</span>
            <span className="font-bold text-red-600 dark:text-red-400">${totalCredits.toFixed(2)}</span>
          </div>
          <div className="border-t border-slate-200 dark:border-slate-700 pt-2 flex justify-between text-xs font-bold">
            <span>Diferencia:</span>
            <span className={difference === 0 ? "text-green-500" : "text-amber-500"}>
              ${difference.toFixed(2)} {difference === 0 ? "✓ Cuadrado" : "✗ Descuadrado"}
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
