'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Trash2, Search, ChevronDown } from 'lucide-react';
import type { CurrencyInfo } from '../lib/utils';

interface Account {
  id: string;
  name: string;
  type: string;
  parentId?: string | null;
}

interface Entry {
  accountId: string;
  entryType: 'DEBIT' | 'CREDIT';
  amount: number | '';
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
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('ALL');
  const [focusedIndex, setFocusedIndex] = useState<number>(0);

  // Extract currency symbol and decimal places matching formatCurrency in frontend/src/lib/utils.ts
  let currencySymbol = '$';
  let decimalPlaces = 2;

  if (typeof baseCurrency === 'string') {
    if (baseCurrency === 'PYG') {
      currencySymbol = '₲';
      decimalPlaces = 0;
    } else if (baseCurrency === 'USD') {
      currencySymbol = 'u$s';
      decimalPlaces = 2;
    }
  } else if (baseCurrency) {
    if (baseCurrency.code === 'PYG') {
      currencySymbol = '₲';
      decimalPlaces = 0;
    } else if (baseCurrency.code === 'USD') {
      currencySymbol = 'u$s';
      decimalPlaces = 2;
    } else {
      currencySymbol = baseCurrency.symbol || '$';
      decimalPlaces = baseCurrency.decimalPlaces !== undefined ? baseCurrency.decimalPlaces : 2;
    }
  }

  // Dynamic placeholder and step based on decimal places
  const placeholder = decimalPlaces > 0 ? '0.' + '0'.repeat(decimalPlaces) : '0';
  const step = decimalPlaces === 0 ? '1' : (1 / Math.pow(10, decimalPlaces)).toFixed(decimalPlaces);

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
      setSearch('');
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
        setSearch('');
      }
    }, 200);
  };

  const filteredAccounts = accounts.filter((a) => {
    const fullName = formatAccountName(a).toLowerCase();
    const matchesSearch = fullName.includes(search.toLowerCase());
    const matchesTab = activeTab === 'ALL' || a.type === activeTab;
    return matchesSearch && matchesTab;
  });

  const groups = ['ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE'];

  // Construct flat list of displayed accounts in the exact rendering order (by groups)
  const displayAccounts: Account[] = [];
  groups.forEach((groupType) => {
    if (activeTab === 'ALL' || activeTab === groupType) {
      const groupAccounts = filteredAccounts.filter((a) => a.type === groupType);
      displayAccounts.push(...groupAccounts);
    }
  });

  // Reset focused index when filtering criteria changes
  useEffect(() => {
    setFocusedIndex(displayAccounts.length > 0 ? 0 : -1);
  }, [search, activeTab]);

  useEffect(() => {
    if (focusedIndex >= 0 && isOpen) {
      const activeEl = document.getElementById(`account-opt-${index}-${focusedIndex}`);
      if (activeEl && typeof activeEl.scrollIntoView === 'function') {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [focusedIndex, isOpen, index]);

  const highlightMatch = (text: string, query: string) => {
    if (!query) return <span>{text}</span>;
    const parts = text.split(
      new RegExp(`(${query.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi'),
    );
    return (
      <span>
        {parts.map((part, i) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <mark
              key={i}
              className="bg-indigo-100 text-indigo-950 dark:bg-indigo-950/60 dark:text-indigo-200 px-0.5 rounded-sm font-bold"
            >
              {part}
            </mark>
          ) : (
            <span key={i}>{part}</span>
          ),
        )}
      </span>
    );
  };

  const getCount = (tabId: string) => {
    if (tabId === 'ALL') {
      return accounts.filter((a) =>
        formatAccountName(a).toLowerCase().includes(search.toLowerCase()),
      ).length;
    }
    return accounts.filter(
      (a) => a.type === tabId && formatAccountName(a).toLowerCase().includes(search.toLowerCase()),
    ).length;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex((prev) => (prev + 1 < displayAccounts.length ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : displayAccounts.length - 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < displayAccounts.length) {
          const selected = displayAccounts[focusedIndex];
          onUpdate(index, { accountId: selected.id });
          setSearch(formatAccountName(selected));
          setIsOpen(false);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        break;
      case 'Tab':
        setIsOpen(false);
        break;
    }
  };

  return (
    <div
      className={`flex flex-col sm:flex-row gap-2 items-end bg-slate-50/50 dark:bg-slate-900/40 p-2.5 rounded-sm border border-slate-200 dark:border-slate-700/60 w-full animate-slide-in-row relative ${isOpen ? 'z-20' : 'z-10'}`}
    >
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
            onKeyDown={handleKeyDown}
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
            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 rounded-sm p-1.5 pl-7 pr-8 text-xs outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-200 font-medium"
          />
          <Search className="absolute left-2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          <button
            type="button"
            className="absolute right-2 p-0.5 text-slate-400 hover:text-slate-650 dark:hover:text-slate-350 focus:outline-none transition-colors"
            onMouseDown={(e) => {
              e.preventDefault(); // Prevents input blur
            }}
            onClick={() => {
              setIsOpen((prev) => !prev);
            }}
          >
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
            />
          </button>
        </div>

        {/* Dropdown Options */}
        {isOpen && (
          <div className="absolute left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 rounded-sm shadow-lg max-h-56 overflow-hidden z-50 flex flex-col">
            {/* Horizontal Tabs Bar */}
            <div className="flex items-center gap-1.5 px-2 py-1.5 border-b border-slate-100 dark:border-slate-700/40 bg-slate-50/50 dark:bg-slate-900/30 overflow-x-auto whitespace-nowrap scrollbar-none shrink-0 select-none">
              {[
                { id: 'ALL', label: 'Todos', dot: null },
                { id: 'ASSET', label: 'Activos', dot: 'bg-emerald-500' },
                { id: 'LIABILITY', label: 'Pasivos', dot: 'bg-rose-500' },
                { id: 'EQUITY', label: 'Patrimonio', dot: 'bg-violet-500' },
                { id: 'INCOME', label: 'Ingresos', dot: 'bg-sky-500' },
                { id: 'EXPENSE', label: 'Egresos', dot: 'bg-amber-500' },
              ].map((tab) => {
                const count = getCount(tab.id);
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold rounded-full transition-all border shrink-0 ${
                      isActive
                        ? 'bg-slate-900 text-white border-slate-900 dark:bg-slate-100 dark:text-slate-900 dark:border-slate-100'
                        : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700/60 dark:hover:bg-slate-700/50'
                    }`}
                  >
                    {tab.dot && <span className={`w-1 h-1 rounded-full ${tab.dot}`} />}
                    <span>{tab.label}</span>
                    <span className="text-[8px] font-semibold opacity-75">({count})</span>
                  </button>
                );
              })}
            </div>

            {/* List Body */}
            <div className="overflow-y-auto flex-1 max-h-44">
              {displayAccounts.length === 0 ? (
                <div className="px-3 py-3 text-slate-400 dark:text-slate-500 text-xs italic text-center">
                  No se encontraron rubros
                </div>
              ) : (
                (() => {
                  let globalIndex = 0;
                  return groups.map((groupType) => {
                    if (activeTab !== 'ALL' && activeTab !== groupType) return null;
                    const groupAccounts = filteredAccounts.filter((a) => a.type === groupType);
                    if (groupAccounts.length === 0) return null;
                    return (
                      <div
                        key={groupType}
                        className="border-b last:border-0 border-slate-100 dark:border-slate-750/30"
                      >
                        {activeTab === 'ALL' && (
                          <div className="px-2 py-0.5 text-[9px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider bg-slate-50/70 dark:bg-slate-900/40 sticky top-0 backdrop-blur-sm z-10">
                            {groupType === 'ASSET'
                              ? 'ACTIVOS'
                              : groupType === 'LIABILITY'
                                ? 'PASIVOS'
                                : groupType === 'INCOME'
                                  ? 'INGRESOS'
                                  : groupType === 'EXPENSE'
                                    ? 'EGRESOS'
                                    : 'PATRIMONIO NETO'}
                          </div>
                        )}
                        <div className="divide-y divide-slate-50 dark:divide-slate-800/30">
                          {groupAccounts.map((a) => {
                            const itemIndex = globalIndex++;
                            const isFocused = itemIndex === focusedIndex;
                            return (
                              <button
                                key={a.id}
                                id={`account-opt-${index}-${itemIndex}`}
                                type="button"
                                onMouseDown={() => {
                                  onUpdate(index, { accountId: a.id });
                                  setSearch(formatAccountName(a));
                                  setIsOpen(false);
                                }}
                                className={`w-full text-left px-3 py-2 sm:py-2.5 transition text-xs font-semibold flex items-center justify-between outline-none ${
                                  isFocused
                                    ? 'bg-indigo-50/50 text-indigo-900 dark:bg-indigo-950/20 dark:text-indigo-200'
                                    : 'text-slate-750 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                                }`}
                              >
                                <div className="flex flex-col">
                                  {a.parentId ? (
                                    <div className="flex items-center gap-1">
                                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">
                                        {accounts.find((p) => p.id === a.parentId)?.name} ›
                                      </span>
                                      <span className="text-slate-800 dark:text-slate-200 font-medium">
                                        {highlightMatch(a.name, search)}
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-slate-800 dark:text-slate-200 font-medium">
                                      {highlightMatch(a.name, search)}
                                    </span>
                                  )}
                                </div>

                                {activeTab === 'ALL' && (
                                  <span
                                    className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${
                                      a.type === 'ASSET'
                                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400'
                                        : a.type === 'LIABILITY'
                                          ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400'
                                          : a.type === 'EQUITY'
                                            ? 'bg-violet-50 text-violet-700 dark:bg-violet-950/30 dark:text-violet-400'
                                            : a.type === 'INCOME'
                                              ? 'bg-sky-50 text-sky-700 dark:bg-sky-950/30 dark:text-sky-400'
                                              : 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400'
                                    }`}
                                  >
                                    {a.type === 'ASSET'
                                      ? 'Activo'
                                      : a.type === 'LIABILITY'
                                        ? 'Pasivo'
                                        : a.type === 'EQUITY'
                                          ? 'Patrimonio'
                                          : a.type === 'INCOME'
                                            ? 'Ingreso'
                                            : 'Egreso'}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  });
                })()
              )}
            </div>
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
            onClick={() => onUpdate(index, { entryType: 'DEBIT' })}
            className={`py-1 text-[10px] font-bold tracking-wider rounded-sm transition duration-150 ${
              entry.entryType === 'DEBIT'
                ? 'bg-rose-600 dark:bg-rose-700 text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            DEBE
          </button>
          <button
            type="button"
            onClick={() => onUpdate(index, { entryType: 'CREDIT' })}
            className={`py-1 text-[10px] font-bold tracking-wider rounded-sm transition duration-150 ${
              entry.entryType === 'CREDIT'
                ? 'bg-emerald-600 dark:bg-emerald-700 text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
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
              onUpdate(index, { amount: val === '' ? '' : Number(val) });
            }}
            className={`w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 rounded-sm p-1.5 ${
              currencySymbol.length > 2 ? 'pl-11' : currencySymbol.length > 1 ? 'pl-9' : 'pl-7'
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
