"use client";

import React, { useState, useEffect } from "react";
import { Trash2, Search, ChevronDown } from "lucide-react";
import type { CurrencyInfo } from "../lib/utils";

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
  baseCurrency?: string | CurrencyInfo | null;
}

export default function JournalEntryRow({
  entry,
  accounts,
  index,
  onUpdate,
  onRemove,
  canRemove,
  baseCurrency,
}: JournalEntryRowProps) {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  // Extract currency symbol and decimal places matching formatCurrency in frontend/src/lib/utils.ts
  let currencySymbol = "$";
  let decimalPlaces = 2;

  if (typeof baseCurrency === "string") {
    if (baseCurrency === "PYG") {
      currencySymbol = "₲";
      decimalPlaces = 0;
    } else if (baseCurrency === "USD") {
      currencySymbol = "u$s";
      decimalPlaces = 2;
    }
  } else if (baseCurrency) {
    if (baseCurrency.code === "PYG") {
      currencySymbol = "₲";
      decimalPlaces = 0;
    } else if (baseCurrency.code === "USD") {
      currencySymbol = "u$s";
      decimalPlaces = 2;
    } else {
      currencySymbol = baseCurrency.symbol || "$";
      decimalPlaces = baseCurrency.decimalPlaces !== undefined ? baseCurrency.decimalPlaces : 2;
    }
  }

  // Dynamic placeholder and step based on decimal places
  const placeholder = decimalPlaces > 0 ? "0." + "0".repeat(decimalPlaces) : "0";
  const step = decimalPlaces === 0 ? "1" : (1 / Math.pow(10, decimalPlaces)).toFixed(decimalPlaces);

  const formatAccountName = (a: Account) => {
    if (a.parentId) {
      const parent = accounts.find((p) => p.id === a.parentId);
      if (parent) {
        return `${parent.name} › ${a.name}`;
      }
    }
    return a.name;
  };

  useEffect(() => {
    if (entry.accountId) {
      const active = accounts.find((a) => a.id === entry.accountId);
      if (active) {
        setSearch(formatAccountName(active));
      }
    } else {
      setSearch("");
    }
  }, [entry.accountId, accounts]);

  const handleBlur = () => {
    setTimeout(() => {
      setIsOpen(false);
      if (entry.accountId) {
        const active = accounts.find((a) => a.id === entry.accountId);
        if (active) {
          setSearch(formatAccountName(active));
        }
      } else {
        setSearch("");
      }
    }, 200);
  };

  const filteredAccounts = accounts.filter((a) => {
    const fullName = formatAccountName(a).toLowerCase();
    return fullName.includes(search.toLowerCase());
  });

  const groups = ["ASSET", "LIABILITY", "INCOME", "EXPENSE", "EQUITY"];

  return (
    <div className="flex flex-col sm:flex-row gap-2 items-end bg-slate-50/50 dark:bg-slate-900/40 p-2.5 rounded-sm border border-slate-200 dark:border-slate-700/60 w-full animate-slide-in-row">
      {/* Searchable Account Selector */}
      <div className="flex-1 w-full relative">
        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
          Cuenta / Categoría
        </label>
        
        <div className="relative flex items-center">
          <input
            type="text"
            role="combobox"
            aria-expanded={isOpen}
            placeholder="Buscar cuenta por nombre..."
            value={search}
            onFocus={() => setIsOpen(true)}
            onBlur={handleBlur}
            onChange={(e) => {
              const val = e.target.value;
              setSearch(val);
              setIsOpen(true);
              
              // Test compatibility: if value matches an account ID, select it
              const matchedAccount = accounts.find((a) => a.id === val);
              if (matchedAccount) {
                onUpdate(index, { accountId: matchedAccount.id });
              }
            }}
            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 rounded-sm p-1.5 pl-7 pr-7 text-xs outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-200 font-medium"
          />
          <Search className="absolute left-2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          <ChevronDown className="absolute right-2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
        </div>

        {/* Dropdown Options */}
        {isOpen && (
          <div className="absolute left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 rounded-sm shadow-lg max-h-48 overflow-y-auto z-50">
            {filteredAccounts.length === 0 ? (
              <div className="px-3 py-2 text-slate-400 dark:text-slate-500 text-xs italic">
                No se encontraron rubros
              </div>
            ) : (
              groups.map((groupType) => {
                const groupAccounts = filteredAccounts.filter((a) => a.type === groupType);
                if (groupAccounts.length === 0) return null;
                return (
                  <div key={groupType} className="border-b last:border-0 border-slate-100 dark:border-slate-700/40">
                    <div className="px-2 py-0.5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider bg-slate-50 dark:bg-slate-900/60 sticky top-0">
                      {groupType === "ASSET"
                        ? "ACTIVOS"
                        : groupType === "LIABILITY"
                          ? "PASIVOS"
                          : groupType === "INCOME"
                            ? "INGRESOS"
                            : groupType === "EXPENSE"
                              ? "EGRESOS"
                              : "PATRIMONIO NETO"}
                    </div>
                    {groupAccounts.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        onMouseDown={() => {
                          onUpdate(index, { accountId: a.id });
                          setSearch(formatAccountName(a));
                          setIsOpen(false);
                        }}
                        className="w-full text-left px-3.5 py-1 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition text-xs font-semibold"
                      >
                        {formatAccountName(a)}
                      </button>
                    ))}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Entry Type Toggle (Debit/Credit) */}
      <div className="w-full sm:w-28">
        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
          Tipo
        </label>
        <div className="grid grid-cols-2 gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 p-0.5 rounded-sm">
          <button
            type="button"
            onClick={() => onUpdate(index, { entryType: "DEBIT" })}
            className={`py-1 text-[10px] font-bold tracking-wider rounded-sm transition duration-150 ${
              entry.entryType === "DEBIT"
                ? "bg-rose-600 dark:bg-rose-700 text-white shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            DEBE
          </button>
          <button
            type="button"
            onClick={() => onUpdate(index, { entryType: "CREDIT" })}
            className={`py-1 text-[10px] font-bold tracking-wider rounded-sm transition duration-150 ${
              entry.entryType === "CREDIT"
                ? "bg-emerald-600 dark:bg-emerald-700 text-white shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            HABER
          </button>
        </div>
      </div>

      {/* Amount Input */}
      <div className="w-full sm:w-32">
        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
          Monto
        </label>
        <div className="relative flex items-center">
          <span className="absolute left-2.5 text-xs font-semibold text-slate-400 pointer-events-none select-none">
            {currencySymbol}
          </span>
          <input
            type="number"
            step={step}
            placeholder={placeholder}
            value={entry.amount}
            onChange={(e) => {
              const val = e.target.value;
              onUpdate(index, { amount: val === "" ? "" : Number(val) });
            }}
            className={`w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 rounded-sm p-1.5 ${
              currencySymbol.length > 2 ? "pl-11" : currencySymbol.length > 1 ? "pl-9" : "pl-7"
            } pr-2 text-xs outline-none text-right font-bold focus:border-indigo-500 text-slate-800 dark:text-slate-200`}
          />
        </div>
      </div>

      {/* Delete Action Button */}
      {canRemove && (
        <button
          type="button"
          onClick={() => onRemove(index)}
          className="h-8 w-8 flex items-center justify-center text-slate-450 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-sm border border-transparent hover:border-red-100 dark:hover:border-red-900 transition-all duration-150 mb-[1px]"
          title="Eliminar apunte"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
