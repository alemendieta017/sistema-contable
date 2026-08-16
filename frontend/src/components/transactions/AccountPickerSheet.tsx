'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Search, ChevronDown, Plus, X, Check } from 'lucide-react';
import { formatCurrency, cn, type CurrencyInfo } from '../../lib/utils';
import type { AccountOption } from '../../types/account';

export type AccountPickerFilterMode =
  | 'ALL'
  | 'PAYMENT_ACCOUNTS'
  | 'EXPENSES'
  | 'INCOMES'
  | 'ASSETS';

export interface AccountPickerSheetProps {
  accounts: AccountOption[];
  selectedAccountId?: string;
  onSelect: (account: AccountOption) => void;
  allowedTypes?: Array<'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE'>;
  filterMode?: AccountPickerFilterMode;
  label?: string;
  placeholder?: string;
  baseCurrency?: CurrencyInfo;
  onQuickCreateAccount?: (initialName: string) => void;
  error?: string;
  disabled?: boolean;
  className?: string;
}

type TabConfig = {
  id: string;
  type?: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE';
  label: string;
  dot: string | null;
};

const ALL_TABS: TabConfig[] = [
  { id: 'ALL', label: 'Todos', dot: null },
  { id: 'ASSET', type: 'ASSET', label: 'Activos', dot: 'bg-emerald-500' },
  { id: 'LIABILITY', type: 'LIABILITY', label: 'Pasivos', dot: 'bg-rose-500' },
  { id: 'EXPENSE', type: 'EXPENSE', label: 'Gastos', dot: 'bg-amber-500' },
  { id: 'INCOME', type: 'INCOME', label: 'Ingresos', dot: 'bg-sky-500' },
  { id: 'EQUITY', type: 'EQUITY', label: 'Patrimonio', dot: 'bg-violet-500' },
];

const ORDERED_GROUPS: Array<{
  type: 'ASSET' | 'LIABILITY' | 'EXPENSE' | 'INCOME' | 'EQUITY';
  label: string;
}> = [
  { type: 'ASSET', label: 'Activos' },
  { type: 'LIABILITY', label: 'Pasivos' },
  { type: 'EXPENSE', label: 'Gastos' },
  { type: 'INCOME', label: 'Ingresos' },
  { type: 'EQUITY', label: 'Patrimonio Neto' },
];

export default function AccountPickerSheet({
  accounts,
  selectedAccountId,
  onSelect,
  allowedTypes,
  filterMode = 'ALL',
  label,
  placeholder = 'Seleccionar cuenta...',
  baseCurrency,
  onQuickCreateAccount,
  error,
  disabled = false,
  className,
}: AccountPickerSheetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('ALL');
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const listContainerRef = useRef<HTMLDivElement>(null);

  // Helper to format parent hierarchy
  const formatAccountName = useCallback(
    (a: AccountOption) => {
      if (a.parentId) {
        const parent = accounts.find((p) => p.id === a.parentId);
        if (parent) {
          return `${parent.name} › ${a.name}`;
        }
      }
      return a.name;
    },
    [accounts],
  );

  const getParentName = useCallback(
    (parentId: string) => {
      const parent = accounts.find((p) => p.id === parentId);
      return parent ? parent.name : '';
    },
    [accounts],
  );

  // Currency balance helper
  const isBalanceEligible = (type?: string) => type === 'ASSET' || type === 'LIABILITY';

  const formatAccBalance = useCallback(
    (a: AccountOption) => {
      const curInfo = a.currencySymbol
        ? {
            code: a.currencyCode,
            symbol: a.currencySymbol,
            decimalPlaces: a.decimalPlaces,
          }
        : baseCurrency;
      return formatCurrency(a.balance, curInfo);
    },
    [baseCurrency],
  );

  // Currently selected account
  const selectedAccount = useMemo(() => {
    return accounts.find((a) => a.id === selectedAccountId);
  }, [accounts, selectedAccountId]);

  // Determine effective allowed types
  const effectiveAllowedTypes = useMemo<
    Array<'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE'>
  >(() => {
    if (allowedTypes && allowedTypes.length > 0) {
      return allowedTypes;
    }
    if (filterMode === 'PAYMENT_ACCOUNTS') {
      return ['ASSET', 'LIABILITY'];
    }
    if (filterMode === 'EXPENSES') {
      return ['EXPENSE'];
    }
    if (filterMode === 'INCOMES') {
      return ['INCOME'];
    }
    if (filterMode === 'ASSETS') {
      return ['ASSET'];
    }
    return ['ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE'];
  }, [allowedTypes, filterMode]);

  // Operable accounts pool
  const operableAccounts = useMemo(() => {
    return accounts.filter((a) => {
      // Exclude system accounts
      if (a.systemRole === 'NET_INCOME') return false;
      // Exclude inactive accounts unless currently selected
      if (a.status === 'INACTIVE' && a.id !== selectedAccountId) return false;
      // Filter by mode / allowedTypes
      const matchesType = effectiveAllowedTypes.includes(a.type);
      const isPaymentMatch = filterMode === 'PAYMENT_ACCOUNTS' && a.isCashOrBank;
      return matchesType || isPaymentMatch;
    });
  }, [accounts, selectedAccountId, effectiveAllowedTypes, filterMode]);

  // Tabs available based on operable accounts
  const availableTabs = useMemo(() => {
    const presentTypes = new Set(operableAccounts.map((a) => a.type));
    return ALL_TABS.filter((tab) => {
      if (tab.id === 'ALL') return true;
      return tab.type && presentTypes.has(tab.type);
    });
  }, [operableAccounts]);

  // Filtered accounts based on search query & active tab
  const filteredAccounts = useMemo(() => {
    const trimmedSearch = search.trim().toLowerCase();
    return operableAccounts.filter((a) => {
      const matchesTab = activeTab === 'ALL' || a.type === activeTab;
      if (!matchesTab) return false;

      if (!trimmedSearch) return true;
      const fullName = formatAccountName(a).toLowerCase();
      return fullName.includes(trimmedSearch);
    });
  }, [operableAccounts, activeTab, search, formatAccountName]);

  // Group filtered accounts by standard accounting order
  const displayGroups = useMemo(() => {
    return ORDERED_GROUPS.map((grp) => ({
      type: grp.type,
      label: grp.label,
      accounts: filteredAccounts.filter((a) => a.type === grp.type),
    })).filter((grp) => grp.accounts.length > 0);
  }, [filteredAccounts]);

  // Determine if search-specific quick create button should appear
  const showSearchQuickCreate = useMemo(() => {
    if (!onQuickCreateAccount) return false;
    const trimmed = search.trim();
    if (!trimmed) return false;
    const hasExactMatch = accounts.some((a) => a.name.toLowerCase() === trimmed.toLowerCase());
    return !hasExactMatch;
  }, [onQuickCreateAccount, search, accounts]);

  // Flat list of selectable items for keyboard navigation
  type FlatItem =
    | { kind: 'SEARCH_CREATE'; term: string }
    | { kind: 'ACCOUNT'; account: AccountOption };

  const flatItems = useMemo<FlatItem[]>(() => {
    const items: FlatItem[] = [];
    if (showSearchQuickCreate) {
      items.push({ kind: 'SEARCH_CREATE', term: search.trim() });
    }
    displayGroups.forEach((grp) => {
      grp.accounts.forEach((acc) => {
        items.push({ kind: 'ACCOUNT', account: acc });
      });
    });
    return items;
  }, [showSearchQuickCreate, search, displayGroups]);

  // Reset focus index on search or tab change
  useEffect(() => {
    setFocusedIndex(-1);
  }, [search, activeTab]);

  // Active descendant ID for ARIA combobox / searchbox
  const activeDescendantId = useMemo(() => {
    if (focusedIndex >= 0 && focusedIndex < flatItems.length) {
      const item = flatItems[focusedIndex];
      if (item.kind === 'ACCOUNT') {
        return `account-sheet-opt-${item.account.id}`;
      }
      if (item.kind === 'SEARCH_CREATE') {
        return 'account-sheet-opt-search-create';
      }
    }
    return undefined;
  }, [focusedIndex, flatItems]);

  // Escape key global handler
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Auto focus search input when sheet opens
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    } else {
      setSearch('');
      setActiveTab('ALL');
      setFocusedIndex(-1);
    }
  }, [isOpen]);

  // Actions
  const handleSelectAccount = (account: AccountOption) => {
    onSelect(account);
    setIsOpen(false);
  };

  const handleQuickCreate = (initialName: string) => {
    setIsOpen(false);
    onQuickCreateAccount?.(initialName);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (flatItems.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex((prev) => (prev + 1 < flatItems.length ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : flatItems.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const targetIdx = focusedIndex >= 0 ? focusedIndex : 0;
      if (targetIdx < flatItems.length) {
        const item = flatItems[targetIdx];
        if (item.kind === 'ACCOUNT') {
          handleSelectAccount(item.account);
        } else if (item.kind === 'SEARCH_CREATE') {
          handleQuickCreate(item.term);
        }
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  // Helper to count accounts in tab
  const getTabCount = (tabId: string) => {
    const trimmed = search.trim().toLowerCase();
    const matchingSearch = operableAccounts.filter((a) =>
      trimmed ? formatAccountName(a).toLowerCase().includes(trimmed) : true,
    );
    if (tabId === 'ALL') return matchingSearch.length;
    return matchingSearch.filter((a) => a.type === tabId).length;
  };

  // Highlight search matches
  const highlightMatch = (text: string, query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return <span>{text}</span>;
    const parts = text.split(
      new RegExp(`(${trimmed.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi'),
    );
    return (
      <span>
        {parts.map((part, i) =>
          part.toLowerCase() === trimmed.toLowerCase() ? (
            <mark
              key={i}
              className="bg-indigo-100 text-indigo-950 dark:bg-indigo-950/60 dark:text-indigo-200 px-0.5 rounded-xs font-bold"
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

  const getTypeBadgeClasses = (type: string) => {
    switch (type) {
      case 'ASSET':
        return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400';
      case 'LIABILITY':
        return 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400';
      case 'EXPENSE':
        return 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400';
      case 'INCOME':
        return 'bg-sky-50 text-sky-700 dark:bg-sky-950/30 dark:text-sky-400';
      case 'EQUITY':
        return 'bg-violet-50 text-violet-700 dark:bg-violet-950/30 dark:text-violet-400';
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'ASSET':
        return 'Activo';
      case 'LIABILITY':
        return 'Pasivo';
      case 'EXPENSE':
        return 'Gasto';
      case 'INCOME':
        return 'Ingreso';
      case 'EQUITY':
        return 'Patrimonio';
      default:
        return type;
    }
  };

  return (
    <div className={cn('flex flex-col gap-1 w-full', className)}>
      {label && (
        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
          {label}
        </label>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(true)}
        onKeyDown={(e) => {
          if (!disabled && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
            e.preventDefault();
            setIsOpen(true);
          }
        }}
        className={cn(
          'w-full flex items-center justify-between gap-2 px-3 py-2 text-xs font-medium rounded-lg border bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 transition text-left outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500',
          error
            ? 'border-rose-500 dark:border-rose-500/80'
            : 'border-slate-200 dark:border-slate-700/60 hover:border-slate-300 dark:hover:border-slate-600',
          disabled && 'opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-900',
        )}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="truncate">
            {selectedAccount ? (
              formatAccountName(selectedAccount)
            ) : (
              <span className="text-slate-400 dark:text-slate-500 font-normal">{placeholder}</span>
            )}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {selectedAccount &&
            isBalanceEligible(selectedAccount.type) &&
            selectedAccount.balance !== undefined && (
              <span
                className={cn(
                  'text-[10px] font-semibold px-1.5 py-0.5 rounded',
                  selectedAccount.balance < 0
                    ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
                )}
              >
                {formatAccBalance(selectedAccount)}
              </span>
            )}
          <ChevronDown
            className={cn(
              'w-4 h-4 text-slate-400 transition-transform duration-200',
              isOpen && 'rotate-180',
            )}
          />
        </div>
      </button>

      {error && <p className="text-[11px] font-medium text-rose-600 dark:text-rose-400">{error}</p>}

      {/* Sheet / Dialog Modal Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
          aria-label={label || 'Seleccionar Cuenta'}
        >
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsOpen(false)}
            data-testid="account-picker-backdrop"
          />

          {/* Sheet / Popover Container */}
          <div className="fixed inset-x-0 bottom-0 max-h-[85vh] sm:max-h-[80vh] w-full sm:max-w-lg sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 rounded-t-2xl sm:rounded-2xl z-50 bg-white dark:bg-slate-900 shadow-2xl flex flex-col border border-slate-100 dark:border-slate-800 animate-in slide-in-from-bottom sm:slide-in-from-top-1/2 sm:zoom-in-95 duration-200 overflow-hidden">
            {/* Mobile Drag Indicator */}
            <div
              data-testid="mobile-pull-bar"
              className="sm:hidden w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto my-2 shrink-0"
            />

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                {label || 'Seleccionar Cuenta'}
              </h3>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Cerrar"
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search Input Bar */}
            <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <div className="relative flex items-center">
                <Search className="absolute left-3 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  role="searchbox"
                  aria-autocomplete="list"
                  aria-controls="account-picker-listbox"
                  aria-activedescendant={activeDescendantId}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Buscar por nombre..."
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-lg pl-9 pr-9 py-2 text-xs font-medium text-slate-800 dark:text-slate-100 placeholder-slate-400 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    aria-label="Limpiar búsqueda"
                    className="absolute right-2.5 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Category Filter Tabs Bar */}
            {availableTabs.length > 1 && (
              <div
                role="tablist"
                aria-label="Categorías de cuenta"
                className="flex items-center gap-1.5 px-3 py-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/30 overflow-x-auto whitespace-nowrap scrollbar-none shrink-0 select-none"
              >
                {availableTabs.map((tab) => {
                  const isActive = activeTab === tab.id;
                  const count = getTabCount(tab.id);
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      data-testid={`category-tab-${tab.id}`}
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-full min-h-[44px] transition-all border shrink-0',
                        isActive
                          ? 'bg-slate-900 text-white border-slate-900 dark:bg-slate-100 dark:text-slate-900 dark:border-slate-100 shadow-xs'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700/60 dark:hover:bg-slate-700/50',
                      )}
                    >
                      {tab.dot && <span className={cn('w-1.5 h-1.5 rounded-full', tab.dot)} />}
                      <span>{tab.label}</span>
                      <span className="text-[10px] font-normal opacity-75">({count})</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* List Content */}
            <div
              id="account-picker-listbox"
              role="listbox"
              aria-label="Cuentas disponibles"
              className="overflow-y-auto flex-1 p-2 space-y-1 max-h-80 sm:max-h-96"
              ref={listContainerRef}
            >
              {/* Dynamic Quick Create Option */}
              {showSearchQuickCreate && (
                <div className="p-1 mb-1">
                  <button
                    type="button"
                    role="option"
                    aria-selected={focusedIndex === 0}
                    id="account-sheet-opt-search-create"
                    onClick={() => handleQuickCreate(search.trim())}
                    className={cn(
                      'w-full text-left px-3 py-2.5 min-h-[44px] rounded-lg text-xs font-bold flex items-center gap-2 transition bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300 dark:hover:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-800/60',
                      focusedIndex === 0 &&
                        'ring-2 ring-indigo-500 bg-indigo-100 dark:bg-indigo-900/60',
                    )}
                  >
                    <Plus className="w-4 h-4 shrink-0" />
                    <span>Crear cuenta &ldquo;{search.trim()}&rdquo;</span>
                  </button>
                </div>
              )}

              {displayGroups.length === 0 ? (
                <div className="py-8 text-center text-slate-400 dark:text-slate-500 text-xs">
                  No se encontraron cuentas disponibles
                </div>
              ) : (
                displayGroups.map((group) => (
                  <div key={group.type} className="mb-2 last:mb-0">
                    {activeTab === 'ALL' && availableTabs.length > 2 && (
                      <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs z-10">
                        {group.label}
                      </div>
                    )}
                    <div className="space-y-0.5">
                      {group.accounts.map((acc) => {
                        const isSelected = acc.id === selectedAccountId;
                        const flatIdx = flatItems.findIndex(
                          (item) => item.kind === 'ACCOUNT' && item.account.id === acc.id,
                        );
                        const isFocused = flatIdx === focusedIndex;

                        return (
                          <button
                            key={acc.id}
                            type="button"
                            role="option"
                            aria-selected={isSelected}
                            data-testid={`account-option-${acc.id}`}
                            id={`account-sheet-opt-${acc.id}`}
                            onClick={() => handleSelectAccount(acc)}
                            className={cn(
                              'w-full text-left px-3 py-2.5 min-h-[44px] rounded-lg text-xs transition flex items-center justify-between gap-3 group outline-none',
                              isSelected
                                ? 'bg-indigo-50/70 text-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-200 font-semibold'
                                : isFocused
                                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100'
                                  : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60',
                            )}
                          >
                            <div className="flex flex-col min-w-0 flex-1">
                              {acc.parentId && (
                                <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                                  {getParentName(acc.parentId)} ›
                                </span>
                              )}
                              <div className="flex items-center gap-1.5">
                                <span className="truncate">{highlightMatch(acc.name, search)}</span>
                                {isSelected && (
                                  <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {isBalanceEligible(acc.type) && acc.balance !== undefined && (
                                <span
                                  className={cn(
                                    'text-[11px] font-semibold tabular-nums',
                                    acc.balance < 0
                                      ? 'text-rose-600 dark:text-rose-400'
                                      : 'text-slate-500 dark:text-slate-400',
                                  )}
                                >
                                  {formatAccBalance(acc)}
                                </span>
                              )}
                              <span
                                className={cn(
                                  'text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md',
                                  getTypeBadgeClasses(acc.type),
                                )}
                              >
                                {getTypeLabel(acc.type)}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}

              {/* Static Quick Create Button at bottom */}
              {onQuickCreateAccount && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => handleQuickCreate('')}
                    className="w-full text-left px-3 py-2.5 min-h-[44px] rounded-lg text-xs font-semibold flex items-center gap-2 text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/30 transition"
                  >
                    <Plus className="w-4 h-4 shrink-0" />
                    <span>Crear nueva cuenta</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
