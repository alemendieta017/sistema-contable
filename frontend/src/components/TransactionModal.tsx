"use client";

import React, { useState, useEffect } from "react";
import { X, Plus, AlertCircle, CheckCircle2 } from "lucide-react";
import { api } from "../services/api";
import JournalEntryRow from "./JournalEntryRow";

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
  const [date, setDate] = useState(new Date().toISOString().substring(0, 10));
  const [description, setDescription] = useState("");
  const [entries, setEntries] = useState<Entry[]>([
    { accountId: "", entryType: "DEBIT", amount: "" },
    { accountId: "", entryType: "CREDIT", amount: "" },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const data = await api.accounts.list();
      setAccounts(data || []);
    } catch (err: any) {
      setError("Error al cargar las cuentas.");
    }
  };

  const handleUpdateEntry = (index: number, updatedFields: Partial<Entry>) => {
    const updated = [...entries];
    updated[index] = { ...updated[index], ...updatedFields };
    setEntries(updated);
  };

  const handleAddEntry = () => {
    // Alternate default type based on last entry
    const lastType = entries[entries.length - 1]?.entryType || "DEBIT";
    const nextType = lastType === "DEBIT" ? "CREDIT" : "DEBIT";
    setEntries([...entries, { accountId: "", entryType: nextType, amount: "" }]);
  };

  const handleRemoveEntry = (index: number) => {
    if (entries.length <= 2) return;
    setEntries(entries.filter((_, i) => i !== index));
  };

  // Math calculations
  const totalDebits = entries
    .filter((e) => e.entryType === "DEBIT")
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  const totalCredits = entries
    .filter((e) => e.entryType === "CREDIT")
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  const difference = Math.abs(totalDebits - totalCredits);
  const isBalanced = difference < 0.001 && totalDebits > 0;

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

    if (!isBalanced) {
      setError(
        `El asiento está descuadrado por $${difference.toLocaleString(undefined, {
          minimumFractionDigits: 2,
        })}. Total Debe y Haber deben coincidir.`
      );
      return;
    }

    setLoading(true);

    try {
      const payload = {
        date: new Date(date).toISOString(),
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
        // Sincronizar de forma forzada si no se pasa callback
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
      <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl border border-slate-100 dark:border-slate-700 animate-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-150 dark:border-slate-700">
          <div>
            <h2 className="text-base font-bold text-slate-850 dark:text-slate-100">
              Registrar Asiento Contable Libre
            </h2>
            <p className="text-4xs text-slate-400 dark:text-slate-500 uppercase font-bold tracking-wider mt-0.5">
              Partida Doble Multi-Ítem
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition"
          >
            <X className="w-4.5 h-4.5 text-slate-500 dark:text-slate-300" />
          </button>
        </div>

        {/* Modal Content Scroll Area */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-3 text-xs text-red-700 bg-red-50 dark:bg-red-950/30 dark:text-red-400 rounded-2xl flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="p-3 text-xs text-green-700 bg-green-50 dark:bg-green-950/30 dark:text-green-400 rounded-2xl flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* Header Info */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-1">
              <label className="block text-3xs font-bold uppercase text-slate-400 dark:text-slate-500 mb-1">
                Fecha del Asiento
              </label>
              <input
                type="date"
                value={date}
                required
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-200 font-medium"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-3xs font-bold uppercase text-slate-400 dark:text-slate-500 mb-1">
                Descripción / Glosa
              </label>
              <input
                type="text"
                value={description}
                required
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ej. Compra alimentos del mes"
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-200 font-medium"
              />
            </div>
          </div>

          {/* Journal Entries List */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-3xs font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider">
                Apuntes (Debe / Haber)
              </h3>
              <button
                type="button"
                onClick={handleAddEntry}
                className="flex items-center gap-1 text-3xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Agregar Apunte</span>
              </button>
            </div>

            <div className="space-y-3.5 max-h-[35vh] overflow-y-auto pr-1">
              {entries.map((entry, index) => (
                <JournalEntryRow
                  key={index}
                  index={index}
                  entry={entry}
                  accounts={accounts}
                  onUpdate={handleUpdateEntry}
                  onRemove={handleRemoveEntry}
                  canRemove={entries.length > 2}
                />
              ))}
            </div>
          </div>
        </form>

        {/* Modal Footer / Balancing Dashboard */}
        <div className="bg-slate-50 dark:bg-slate-900/60 border-t border-slate-150 dark:border-slate-700 p-6 flex flex-col sm:flex-row gap-4 items-center justify-between rounded-b-3xl">
          <div className="flex items-center gap-6 w-full sm:w-auto text-xs">
            <div className="text-center sm:text-left">
              <p className="text-3xs font-bold text-slate-400 dark:text-slate-500 uppercase">
                Total Debe
              </p>
              <p className="font-extrabold text-sm text-red-500 mt-0.5">
                ${totalDebits.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="text-center sm:text-left">
              <p className="text-3xs font-bold text-slate-400 dark:text-slate-500 uppercase">
                Total Haber
              </p>
              <p className="font-extrabold text-sm text-green-500 mt-0.5">
                ${totalCredits.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="text-center sm:text-left">
              <p className="text-3xs font-bold text-slate-400 dark:text-slate-500 uppercase">
                Diferencia
              </p>
              <p
                className={`font-extrabold text-sm mt-0.5 ${
                  isBalanced ? "text-indigo-600 dark:text-indigo-400" : "text-amber-500"
                }`}
              >
                ${difference.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          <div className="flex gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-5 py-2.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs hover:bg-slate-300 transition"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              type="submit"
              disabled={loading || !isBalanced}
              className={`flex-1 sm:flex-none px-6 py-2.5 text-white font-bold rounded-xl text-xs transition duration-200 flex items-center justify-center gap-1.5 shadow-md ${
                isBalanced
                  ? "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/20"
                  : "bg-slate-300 dark:bg-slate-700 text-slate-400 cursor-not-allowed shadow-none"
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
