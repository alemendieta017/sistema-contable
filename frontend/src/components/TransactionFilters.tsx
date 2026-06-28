"use client";

import React from "react";
import { Filter, Calendar } from "lucide-react";

interface Account {
  id: string;
  name: string;
  type: string;
  parentId?: string | null;
}

interface TransactionFiltersProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (val: string) => void;
  onEndDateChange: (val: string) => void;
  selectedAccountId: string;
  onAccountIdChange: (val: string) => void;
  accounts: Account[];
}

export default function TransactionFilters({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  selectedAccountId,
  onAccountIdChange,
  accounts,
}: TransactionFiltersProps) {
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
    <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between text-xs">
      <div className="flex items-center gap-2.5 self-start md:self-auto text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
        <Filter className="w-4 h-4 text-indigo-500" />
        <span>Filtros de Búsqueda</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full md:w-auto flex-1 max-w-2xl justify-end">
        {/* Start Date */}
        <div className="relative flex items-center">
          <Calendar className="absolute left-3 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          <input
            type="date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            className="w-full pl-9 pr-2.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 font-medium"
            title="Fecha inicio"
          />
        </div>

        {/* End Date */}
        <div className="relative flex items-center">
          <Calendar className="absolute left-3 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          <input
            type="date"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            className="w-full pl-9 pr-2.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 font-medium"
            title="Fecha fin"
          />
        </div>

        {/* Account / Category */}
        <div>
          <select
            value={selectedAccountId}
            onChange={(e) => onAccountIdChange(e.target.value)}
            className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 font-semibold"
          >
            <option value="">Todas las cuentas</option>
            {["ASSET", "LIABILITY", "INCOME", "EXPENSE", "EQUITY"].map((type) => {
              const groupAccs = accounts.filter((a) => a.type === type);
              if (groupAccs.length === 0) return null;
              return (
                <optgroup
                  key={type}
                  label={
                    type === "ASSET"
                      ? "ACTIVOS"
                      : type === "LIABILITY"
                        ? "PASIVOS"
                        : type === "INCOME"
                          ? "INGRESOS"
                          : type === "EXPENSE"
                            ? "EGRESOS"
                            : "PATRIMONIO"
                  }
                >
                  {groupAccs.map((a) => (
                    <option key={a.id} value={a.id}>
                      {formatAccountName(a)}
                    </option>
                  ))}
                </optgroup>
              );
            })}
          </select>
        </div>
      </div>
    </div>
  );
}
