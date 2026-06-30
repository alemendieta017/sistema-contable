"use client";

import React, { useState } from "react";
import { Filter, Calendar, Search, ChevronDown, Check, SlidersHorizontal } from "lucide-react";

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
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const isFullMonth = (start: string, end: string) => {
    const s = new Date(start + "T00:00:00");
    const e = new Date(end + "T00:00:00");
    if (isNaN(s.getTime()) || isNaN(e.getTime())) return false;
    if (s.getDate() !== 1) return false;
    const expectedLastDay = new Date(s.getFullYear(), s.getMonth() + 1, 0);
    return s.getFullYear() === e.getFullYear() &&
           s.getMonth() === e.getMonth() &&
           e.getDate() === expectedLastDay.getDate();
  };

  const isCustomRangeActive = view === 'daily' && !isFullMonth(startDate, endDate);

  const formatAccountName = (a: Account) => {
    if (a.parentId) {
      const parent = accounts.find((p) => p.id === a.parentId);
      if (parent) {
        return `${parent.name} › ${a.name}`;
      }
    }
    return a.name;
  };

  // Determine active display label for the month/year navigation slider
  const currentDate = new Date(startDate + "T00:00:00");
  const monthNames = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];
  const activeLabel = view === 'monthly'
    ? (isNaN(currentDate.getTime()) ? new Date().getFullYear().toString() : currentDate.getFullYear().toString())
    : (isNaN(currentDate.getTime()) ? "Mes" : `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`);

  const resetToFullMonth = () => {
    const d = isNaN(currentDate.getTime()) ? new Date() : currentDate;
    const startOfMonth = new Date(d.getFullYear(), d.getMonth(), 1);
    const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    const formatToYYYYMMDD = (date: Date) => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    };
    onDateRangeChange(formatToYYYYMMDD(startOfMonth), formatToYYYYMMDD(endOfMonth));
  };

  const handlePrev = () => {
    if (isCustomRangeActive) {
      resetToFullMonth();
      return;
    }
    if (view === 'monthly') {
      const currentYear = isNaN(currentDate.getTime()) ? new Date().getFullYear() : currentDate.getFullYear();
      const prevYear = currentYear - 1;
      onDateRangeChange(`${prevYear}-01-01`, `${prevYear}-12-31`);
    } else {
      const d = isNaN(currentDate.getTime()) ? new Date() : currentDate;
      const prevMonth = new Date(d.getFullYear(), d.getMonth() - 1, 1);
      const lastDay = new Date(prevMonth.getFullYear(), prevMonth.getMonth() + 1, 0);
      
      const formatToYYYYMMDD = (date: Date) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${y}-${m}-${day}`;
      };

      onDateRangeChange(formatToYYYYMMDD(prevMonth), formatToYYYYMMDD(lastDay));
    }
  };

  const handleNext = () => {
    if (isCustomRangeActive) {
      resetToFullMonth();
      return;
    }
    if (view === 'monthly') {
      const currentYear = isNaN(currentDate.getTime()) ? new Date().getFullYear() : currentDate.getFullYear();
      const nextYear = currentYear + 1;
      onDateRangeChange(`${nextYear}-01-01`, `${nextYear}-12-31`);
    } else {
      const d = isNaN(currentDate.getTime()) ? new Date() : currentDate;
      const nextMonth = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      const lastDay = new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 0);

      const formatToYYYYMMDD = (date: Date) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${y}-${m}-${day}`;
      };

      onDateRangeChange(formatToYYYYMMDD(nextMonth), formatToYYYYMMDD(lastDay));
    }
  };

  // Find currently selected account
  const selectedAccount = accounts.find((a) => a.id === selectedAccountId);

  // Filter accounts by search term
  const filteredAccounts = accounts.filter((a) =>
    formatAccountName(a).toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-white dark:bg-slate-800 -mx-4 sm:mx-0 rounded-none sm:rounded-2xl border-y sm:border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col animate-in fade-in duration-100 -mt-4 sm:mt-0">
      
      {/* Collapsed main bar */}
      <div className="p-2 flex items-center justify-between gap-2 text-xs w-full">
        {/* Left side: Filtros label */}
        <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider select-none pl-1">
          <Filter className="w-3.5 h-3.5 text-indigo-500" />
          <span className="hidden sm:inline">Filtros</span>
        </div>

        {/* Center: Month/Year navigation slider */}
        <div className={`flex items-center border border-slate-200 dark:border-slate-750/70 rounded-xl bg-slate-50 dark:bg-slate-900 p-0.5 shadow-inner transition-opacity ${
          isCustomRangeActive ? "opacity-60 hover:opacity-100" : ""
        }`}>
          <button
            onClick={handlePrev}
            type="button"
            className="px-2 py-0.5 text-xs hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-600 dark:text-slate-300 font-bold rounded-lg transition cursor-pointer"
            title={isCustomRangeActive ? "Volver a mes completo" : "Anterior"}
          >
            &larr;
          </button>
          <button
            onClick={resetToFullMonth}
            disabled={!isCustomRangeActive}
            type="button"
            className={`px-3 py-0.5 font-bold text-center min-w-[110px] text-slate-700 dark:text-slate-200 select-none text-xs tracking-wide cursor-pointer ${
              isCustomRangeActive ? "hover:text-indigo-650 dark:hover:text-indigo-400" : ""
            }`}
            title={isCustomRangeActive ? "Volver a mes completo" : ""}
          >
            {isCustomRangeActive ? "Rango Personalizado" : activeLabel}
          </button>
          <button
            onClick={handleNext}
            type="button"
            className="px-2 py-0.5 text-xs hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-600 dark:text-slate-300 font-bold rounded-lg transition cursor-pointer"
            title={isCustomRangeActive ? "Volver a mes completo" : "Siguiente"}
          >
            &rarr;
          </button>
        </div>

        {/* Right side: Toggle button */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          type="button"
          className={`flex items-center gap-1 px-2.5 py-1.5 font-bold rounded-xl border transition cursor-pointer text-xs ${
            showAdvanced
              ? "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800 text-indigo-650 dark:text-indigo-400"
              : (selectedAccountId || isCustomRangeActive)
                ? "bg-amber-50 dark:bg-amber-950/20 border-amber-200 text-amber-600 dark:text-amber-400"
                : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-750"
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>Filtros</span>
          {(selectedAccountId || isCustomRangeActive) && (
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
          )}
        </button>
      </div>

      {/* Expanded panel */}
      {showAdvanced && (
        <div className="border-t border-slate-100 dark:border-slate-700/60 p-3 bg-slate-50/20 dark:bg-slate-900/10 flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between text-xs animate-in slide-in-from-top-1 duration-150 rounded-b-2xl">
          
          {/* Account Selector Section */}
          <div className="flex-1 flex flex-col gap-1.5">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">
              Cuenta / Categoría
            </span>
            <div className="relative w-full">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                type="button"
                className="w-full flex items-center justify-between py-1.5 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-slate-700 dark:text-slate-200 font-bold text-xs cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-750 transition"
              >
                <span className="truncate">
                  {selectedAccount ? formatAccountName(selectedAccount) : "Todas las cuentas"}
                </span>
                <ChevronDown className="w-3.5 h-3.5 ml-2 text-slate-400 shrink-0" />
              </button>

              {isDropdownOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => {
                      setIsDropdownOpen(false);
                      setSearchTerm("");
                    }}
                  />
                  <div className="absolute left-0 mt-1 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg z-50 p-2 space-y-2 animate-in fade-in slide-in-from-top-1 duration-100 max-h-72 flex flex-col">
                    {/* Search Box */}
                    <div className="relative flex items-center shrink-0">
                      <Search className="absolute left-2.5 w-3.5 h-3.5 text-slate-400 dark:text-slate-550 pointer-events-none" />
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Buscar cuenta..."
                        className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-indigo-500 text-slate-700 dark:text-slate-200 placeholder-slate-400"
                        autoFocus
                      />
                    </div>

                    {/* Account List */}
                    <div className="overflow-y-auto flex-1 min-h-0 space-y-1 pr-1">
                      <button
                        onClick={() => {
                          onAccountIdChange("");
                          setIsDropdownOpen(false);
                          setSearchTerm("");
                        }}
                        type="button"
                        className={`w-full flex items-center justify-between text-left px-2 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                          !selectedAccountId 
                            ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-650 dark:text-indigo-450" 
                            : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                        }`}
                      >
                        <span>Todas las cuentas</span>
                        {!selectedAccountId && <Check className="w-3.5 h-3.5 text-indigo-500" />}
                      </button>

                      {["ASSET", "LIABILITY", "INCOME", "EXPENSE", "EQUITY"].map((type) => {
                        const groupAccs = filteredAccounts.filter((a) => a.type === type);
                        if (groupAccs.length === 0) return null;
                        return (
                          <div key={type} className="space-y-0.5">
                            <div className="text-[9px] font-extrabold text-slate-400 dark:text-slate-555 uppercase tracking-widest px-2 pt-2 pb-0.5">
                              {type === "ASSET"
                                ? "ACTIVOS"
                                : type === "LIABILITY"
                                  ? "PASIVOS"
                                  : type === "INCOME"
                                    ? "INGRESOS"
                                    : type === "EXPENSE"
                                      ? "EGRESOS"
                                      : "PATRIMONIO"}
                            </div>
                            {groupAccs.map((a) => {
                              const isSelected = selectedAccountId === a.id;
                              return (
                                <button
                                  key={a.id}
                                  onClick={() => {
                                    onAccountIdChange(a.id);
                                    setIsDropdownOpen(false);
                                    setSearchTerm("");
                                  }}
                                  type="button"
                                  className={`w-full flex items-center justify-between text-left px-2 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                                    isSelected
                                      ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-650 dark:text-indigo-450 font-bold"
                                      : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                                  }`}
                                >
                                  <span className="truncate">{formatAccountName(a)}</span>
                                  {isSelected && <Check className="w-3.5 h-3.5 text-indigo-500 shrink-0" />}
                                </button>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Date Selector Section */}
          {view === 'daily' && (
            <div className="flex-1 flex flex-col gap-1.5">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-widest px-1">
                Rango de Fecha Personalizado
              </span>
              <div className="flex items-center gap-2 mt-0.5 animate-in fade-in duration-100">
                {/* Start Date */}
                <div className="relative flex items-center flex-1">
                  <Calendar className="absolute left-2.5 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => onDateRangeChange(e.target.value, endDate)}
                    className="w-full pl-8 pr-2 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 font-semibold text-xs text-slate-700 dark:text-slate-200"
                    title="Fecha inicio"
                  />
                </div>

                <span className="text-slate-400 font-semibold">—</span>

                {/* End Date */}
                <div className="relative flex items-center flex-1">
                  <Calendar className="absolute left-2.5 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => onDateRangeChange(startDate, e.target.value)}
                    className="w-full pl-8 pr-2 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 font-semibold text-xs text-slate-700 dark:text-slate-200"
                    title="Fecha fin"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
