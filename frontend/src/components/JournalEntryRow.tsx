"use client";

import React from "react";
import { Trash2 } from "lucide-react";

interface Account {
  id: string;
  name: string;
  type: string;
  parentId?: string | null;
}

interface Entry {
  accountId: string;
  entryType: "DEBIT" | "CREDIT";
  amount: number | "";
}

interface JournalEntryRowProps {
  entry: Entry;
  accounts: Account[];
  index: number;
  onUpdate: (index: number, updatedFields: Partial<Entry>) => void;
  onRemove: (index: number) => void;
  canRemove: boolean;
}

export default function JournalEntryRow({
  entry,
  accounts,
  index,
  onUpdate,
  onRemove,
  canRemove,
}: JournalEntryRowProps) {
  const formatAccountName = (a: Account) => {
    if (a.parentId) {
      const parent = accounts.find((p) => p.id === a.parentId);
      if (parent) {
        return `${parent.name} › ${a.name}`;
      }
    }
    return a.name;
  };

  return (
    <div className="flex flex-col sm:flex-row gap-3 items-end sm:items-center bg-slate-50 dark:bg-slate-900/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
      {/* Account Selector */}
      <div className="flex-1 w-full">
        <label className="block text-3xs font-bold uppercase text-slate-400 dark:text-slate-500 mb-1">
          Cuenta / Categoría
        </label>
        <select
          value={entry.accountId}
          onChange={(e) => onUpdate(index, { accountId: e.target.value })}
          className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs outline-none focus:border-indigo-500 text-slate-850 dark:text-slate-200"
        >
          <option value="">Seleccionar cuenta...</option>
          {/* Group options by type */}
          {["ASSET", "LIABILITY", "INCOME", "EXPENSE", "EQUITY"].map((groupType) => {
            const groupAccounts = accounts.filter((a) => a.type === groupType);
            if (groupAccounts.length === 0) return null;
            return (
              <optgroup
                key={groupType}
                label={
                  groupType === "ASSET"
                    ? "ACTIVOS"
                    : groupType === "LIABILITY"
                      ? "PASIVOS"
                      : groupType === "INCOME"
                        ? "INGRESOS"
                        : groupType === "EXPENSE"
                          ? "EGRESOS (GASTOS)"
                          : "PATRIMONIO NETO"
                }
              >
                {groupAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {formatAccountName(a)}
                  </option>
                ))}
              </optgroup>
            );
          })}
        </select>
      </div>

      {/* Entry Type Toggle (Debit/Credit) */}
      <div className="w-full sm:w-28">
        <label className="block text-3xs font-bold uppercase text-slate-400 dark:text-slate-500 mb-1">
          Tipo
        </label>
        <div className="grid grid-cols-2 gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-0.5 rounded-xl">
          <button
            type="button"
            onClick={() => onUpdate(index, { entryType: "DEBIT" })}
            className={`py-1.5 text-4xs font-bold rounded-lg transition duration-150 ${
              entry.entryType === "DEBIT"
                ? "bg-red-500 text-white shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700"
            }`}
          >
            DEBE
          </button>
          <button
            type="button"
            onClick={() => onUpdate(index, { entryType: "CREDIT" })}
            className={`py-1.5 text-4xs font-bold rounded-lg transition duration-150 ${
              entry.entryType === "CREDIT"
                ? "bg-green-500 text-white shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700"
            }`}
          >
            HABER
          </button>
        </div>
      </div>

      {/* Amount Input */}
      <div className="w-full sm:w-32">
        <label className="block text-3xs font-bold uppercase text-slate-400 dark:text-slate-500 mb-1">
          Monto
        </label>
        <input
          type="number"
          step="0.01"
          placeholder="0.00"
          value={entry.amount}
          onChange={(e) => {
            const val = e.target.value;
            onUpdate(index, { amount: val === "" ? "" : Number(val) });
          }}
          className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs outline-none text-right font-bold focus:border-indigo-500"
        />
      </div>

      {/* Delete Action Button */}
      {canRemove && (
        <button
          type="button"
          onClick={() => onRemove(index)}
          className="p-2.5 mb-0.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl border border-transparent hover:border-red-100 dark:hover:border-red-900 transition-all duration-200"
          title="Eliminar apunte"
        >
          <Trash2 className="w-4.5 h-4.5" />
        </button>
      )}
    </div>
  );
}
