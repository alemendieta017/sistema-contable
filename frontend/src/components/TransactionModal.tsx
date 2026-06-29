"use client";

import React, { useState, useEffect } from "react";
import { X, Plus, AlertCircle, CheckCircle2 } from "lucide-react";
import { api } from "../services/api";
import JournalEntryRow from "./JournalEntryRow";
import { formatCurrency, formatLocalDateWithOffset } from "../lib/utils";

interface Account {
  id: string;
  name: string;
  type: "ASSET" | "LIABILITY" | "EQUITY" | "INCOME" | "EXPENSE";
  currencyId: string;
  parentId?: string | null;
}

interface Entry {
  accountId: string;
  entryType: "DEBIT" | "CREDIT";
  amount: number | "";
}

interface TransactionModalProps {
  onClose: () => void;
  onSaveSuccess?: () => void;
}

export default function TransactionModal({ onClose, onSaveSuccess }: TransactionModalProps) {
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
  const [entries, setEntries] = useState<Entry[]>([
    { accountId: "", entryType: "DEBIT", amount: "" },
    { accountId: "", entryType: "CREDIT", amount: "" },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [accData, curData] = await Promise.all([
        api.accounts.list(),
        api.currencies.list(),
      ]);
      setAccounts(accData || []);
      setCurrencies(curData || []);
    } catch (err: any) {
      setError("Error al cargar cuentas y monedas.");
    }
  };

  const handleUpdateEntry = (index: number, updatedFields: Partial<Entry>) => {
    const updated = [...entries];
    updated[index] = { ...updated[index], ...updatedFields };
    setEntries(updated);
  };

  // Math calculations for balancing
  const totalDebits = entries
    .filter((e) => e.entryType === "DEBIT")
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  const totalCredits = entries
    .filter((e) => e.entryType === "CREDIT")
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  const difference = Math.abs(totalDebits - totalCredits);
  const isBalanced = difference < 0.001 && totalDebits > 0;

  const handleAddEntry = () => {
    // Alternate default type based on last entry
    const lastType = entries[entries.length - 1]?.entryType || "DEBIT";
    const nextType = lastType === "DEBIT" ? "CREDIT" : "DEBIT";
    
    // Auto-fill/suggest the balancing amount if there is an active difference
    const prefillAmount = difference > 0 ? Number(difference.toFixed(2)) : "";
    
    setEntries([...entries, { accountId: "", entryType: nextType, amount: prefillAmount }]);
  };

  const handleRemoveEntry = (index: number) => {
    if (entries.length <= 2) return;
    setEntries(entries.filter((_, i) => i !== index));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!description.trim()) {
      setError("Ingrese una descripción para el asiento contable.");
      return;
    }

    if (entries.length < 2) {
      setError("Un asiento contable requiere al menos dos apuntes.");
      return;
    }

    // Verify all fields are completed
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      if (!entry.accountId) {
        setError(`El apunte #${i + 1} no tiene una cuenta seleccionada.`);
        return;
      }
      if (entry.amount === "" || Number(entry.amount) <= 0) {
        setError(`El apunte #${i + 1} debe tener un monto mayor a cero.`);
        return;
      }
    }

    const baseCurrency = currencies.find((c) => c.isBase) || { code: "PYG", symbol: "₲", decimalPlaces: 0 };

    if (!isBalanced) {
      setError(
        `El asiento está descuadrado por ${formatCurrency(difference, baseCurrency)}. Las columnas del Debe y Haber deben coincidir.`
      );
      return;
    }

    setLoading(true);

    try {
      const payload = {
        date: formatLocalDateWithOffset(date),
        description,
        entries: entries.map((e) => ({
          accountId: e.accountId,
          entryType: e.entryType,
          amount: Number(e.amount),
        })),
      };

      await api.transactions.create(payload);
      setSuccess("Asiento contable registrado con éxito.");
      
      setTimeout(() => {
        if (onSaveSuccess) onSaveSuccess();
        if (typeof window !== "undefined") {
          if (window.location.pathname.startsWith("/transactions") || window.location.pathname.startsWith("/accounts")) {
            window.location.reload();
          }
        }
        onClose();
      }, 1000);
    } catch (err: any) {
      setError(err.message || "Error al guardar el asiento contable.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-800 rounded-sm w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-700 animate-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="flex justify-between items-center px-5 py-3.5 border-b border-slate-150 dark:border-slate-700">
          <div>
            <h2 className="text-sm font-bold text-slate-850 dark:text-slate-100 uppercase">
              Registrar Asiento Contable
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-sm bg-slate-100 dark:bg-slate-750 hover:bg-slate-200 dark:hover:bg-slate-650 transition"
          >
            <X className="w-4 h-4 text-slate-500 dark:text-slate-350" />
          </button>
        </div>

        {/* Modal Content Scroll Area */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-5 space-y-4">
          {error && (
            <div className="p-2.5 text-xs text-red-700 bg-red-50 dark:bg-red-950/30 dark:text-red-400 rounded-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="p-2.5 text-xs text-green-700 bg-green-50 dark:bg-green-950/30 dark:text-green-400 rounded-sm flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* Header Info */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-1">
              <label className="block text-4xs font-bold uppercase text-slate-400 dark:text-slate-500 mb-1">
                Fecha del Asiento
              </label>
              <input
                type="date"
                value={date}
                required
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-sm p-2 text-xs outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-200 font-medium"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-4xs font-bold uppercase text-slate-400 dark:text-slate-500 mb-1">
                Descripción / Glosa
              </label>
              <input
                type="text"
                value={description}
                required
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ej. Compra alimentos del mes"
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-sm p-2 text-xs outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-200 font-medium"
              />
            </div>
          </div>

          {/* Journal Entries List */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <h3 className="text-4xs font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider">
                Apuntes (Debe / Haber)
              </h3>
              <button
                type="button"
                onClick={handleAddEntry}
                className="flex items-center gap-0.5 text-xs font-bold text-indigo-650 dark:text-indigo-400 hover:underline"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Agregar Apunte</span>
              </button>
            </div>

            <div className="space-y-2 max-h-[35vh] overflow-y-auto pr-1">
              {entries.map((entry, index) => {
                const baseCurrency = currencies.find((c) => c.isBase) || { code: "PYG", symbol: "₲", decimalPlaces: 0 };
                return (
                  <JournalEntryRow
                    key={index}
                    index={index}
                    entry={entry}
                    accounts={accounts}
                    onUpdate={handleUpdateEntry}
                    onRemove={handleRemoveEntry}
                    canRemove={entries.length > 2}
                    baseCurrency={baseCurrency}
                  />
                );
              })}
            </div>
          </div>
        </form>

        <div className="bg-slate-50 dark:bg-slate-900/60 border-t border-slate-150 dark:border-slate-700 p-5 flex flex-col sm:flex-row gap-4 items-center justify-between rounded-b-sm">
          <div className="flex items-center gap-6 w-full sm:w-auto text-xs">
            {(() => {
              const baseCurrency = currencies.find((c) => c.isBase) || { code: "PYG", symbol: "₲", decimalPlaces: 0 };
              return (
                <>
                  <div className="text-center sm:text-left">
                    <p className="text-4xs font-bold text-slate-400 dark:text-slate-500 uppercase">
                      Total Debe
                    </p>
                    <p className="font-extrabold text-xs sm:text-sm text-rose-600 dark:text-rose-450 mt-0.5">
                      {formatCurrency(totalDebits, baseCurrency)}
                    </p>
                  </div>
                  <div className="text-center sm:text-left">
                    <p className="text-4xs font-bold text-slate-400 dark:text-slate-500 uppercase">
                      Total Haber
                    </p>
                    <p className="font-extrabold text-xs sm:text-sm text-emerald-600 dark:text-emerald-450 mt-0.5">
                      {formatCurrency(totalCredits, baseCurrency)}
                    </p>
                  </div>
                  <div className="text-center sm:text-left">
                    <p className="text-4xs font-bold text-slate-400 dark:text-slate-500 uppercase">
                      Diferencia
                    </p>
                    <p
                      className={`font-extrabold text-xs sm:text-sm mt-0.5 ${
                        isBalanced ? "text-indigo-600 dark:text-indigo-400" : "text-amber-500"
                      }`}
                    >
                      {formatCurrency(difference, baseCurrency)}
                    </p>
                  </div>
                </>
              );
            })()}
          </div>

          <div className="flex gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-250 font-bold rounded-sm text-xs hover:bg-slate-300 transition"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              type="submit"
              disabled={loading || !isBalanced}
              className={`flex-1 sm:flex-none px-5 py-2 text-white font-bold rounded-sm text-xs transition duration-150 flex items-center justify-center gap-1 shadow-sm ${
                isBalanced
                  ? "bg-indigo-600 hover:bg-indigo-700"
                  : "bg-slate-300 dark:bg-slate-700 text-slate-450 cursor-not-allowed shadow-none"
              }`}
            >
              {loading ? "Registrando..." : "Guardar Asiento"}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
