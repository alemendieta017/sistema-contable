"use client";

import React, { useState } from "react";
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
  onDateRangeChange: (start: string, end: string) => void;
  selectedAccountId: string;
  onAccountIdChange: (val: string) => void;
  accounts: Account[];
  view: 'daily' | 'calendar' | 'monthly';
}

export default function TransactionFilters({
  startDate,
  endDate,
  onDateRangeChange,
  selectedAccountId,
  onAccountIdChange,
  accounts,
  view,
}: TransactionFiltersProps) {
  const [showCustom, setShowCustom] = useState(false);

  const formatAccountName = (a: Account) => {
    if (a.parentId) {
      const parent = accounts.find((p) => p.id === a.parentId);
      if (parent) {
        return `${parent.name} › ${a.name}`;
      }
    }
    return a.name;
  };

  // Determine current active month/year for display based on startDate
  const currentDate = new Date(startDate + "T00:00:00");
  const monthNames = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];
  const activeMonthLabel = isNaN(currentDate.getTime())
    ? "Mes"
    : `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;

  const handlePrevMonth = () => {
    const d = new Date(startDate + "T00:00:00");
    if (isNaN(d.getTime())) return;
    const prevMonth = new Date(d.getFullYear(), d.getMonth() - 1, 1);
    const lastDay = new Date(prevMonth.getFullYear(), prevMonth.getMonth() + 1, 0);
    
    const formatToYYYYMMDD = (date: Date) => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    };

    onDateRangeChange(formatToYYYYMMDD(prevMonth), formatToYYYYMMDD(lastDay));
  };

  const handleNextMonth = () => {
    const d = new Date(startDate + "T00:00:00");
    if (isNaN(d.getTime())) return;
    const nextMonth = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    const lastDay = new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 0);

    const formatToYYYYMMDD = (date: Date) => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    };

    onDateRangeChange(formatToYYYYMMDD(nextMonth), formatToYYYYMMDD(lastDay));
  };

  return (
    <div className="bg-white dark:bg-slate-800 p-2 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between text-xs animate-in fade-in duration-100">
      <div className="flex items-center gap-2 self-start md:self-auto text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
        <Filter className="w-3.5 h-3.5 text-indigo-500" />
        <span>Filtros</span>
      </div>

      <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
        {view === 'daily' && (
          <>
            {/* Custom Toggle */}
            <label className="flex items-center gap-1.5 cursor-pointer text-slate-500 dark:text-slate-400 font-bold select-none text-xs">
              <input
                type="checkbox"
                checked={showCustom}
                onChange={(e) => setShowCustom(e.target.checked)}
                className="rounded-md border-slate-300 dark:border-slate-650 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
              />
              <span>Rango Personalizado</span>
            </label>

            {/* Temporal Navigation: Month navigation or custom pickers */}
            {!showCustom ? (
              <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 p-0.5">
                <button
                  onClick={handlePrevMonth}
                  type="button"
                  className="px-2 py-0.5 text-xs hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-lg transition"
                >
                  &larr;
                </button>
                <span className="px-3 py-0.5 font-semibold text-center min-w-[110px] text-slate-700 dark:text-slate-250 select-none text-xs">
                  {activeMonthLabel}
                </span>
                <button
                  onClick={handleNextMonth}
                  type="button"
                  className="px-2 py-0.5 text-xs hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-lg transition"
                >
                  &rarr;
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {/* Start Date */}
                <div className="relative flex items-center">
                  <Calendar className="absolute left-2.5 w-3 h-3 text-slate-400 pointer-events-none" />
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => onDateRangeChange(e.target.value, endDate)}
                    className="w-full pl-7 pr-1.5 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 font-medium text-xs text-slate-700 dark:text-slate-200"
                    title="Fecha inicio"
                  />
                </div>

                {/* End Date */}
                <div className="relative flex items-center">
                  <Calendar className="absolute left-2.5 w-3 h-3 text-slate-400 pointer-events-none" />
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => onDateRangeChange(startDate, e.target.value)}
                    className="w-full pl-7 pr-1.5 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 font-medium text-xs text-slate-700 dark:text-slate-200"
                    title="Fecha fin"
                  />
                </div>
              </div>
            )}
          </>
        )}

        {/* Account / Category Selector */}
        <div>
          <select
            value={selectedAccountId}
            onChange={(e) => onAccountIdChange(e.target.value)}
            className="py-1 px-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 font-bold text-xs"
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
