'use client';

import React, { useState } from 'react';
import {
  Wallet,
  Building2,
  CreditCard,
  TrendingUp,
  TrendingDown,
  ReceiptText,
  Landmark,
  Lock,
  MoreVertical,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
  EyeOff,
  SlidersHorizontal,
} from 'lucide-react';
import { formatCurrency } from '../lib/utils';

export interface AccountSummary {
  id: string;
  name: string;
  type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE';
  balance: number;
  currencyCode?: string;
  currencySymbol?: string;
  decimalPlaces?: number;
  isCashOrBank?: boolean;
  parentId?: string | null;
  status?: 'ACTIVE' | 'INACTIVE';
  systemRole?: string | null;
}

export interface AccountsListProps {
  accounts: AccountSummary[];
  activeTab?: 'FINANCIAL' | 'CATEGORIES';
  onDelete?: (id: string) => void;
  onDeactivate?: (id: string) => void;
  onReactivate?: (id: string) => void;
  onToggleCashOrBank?: (id: string, currentVal: boolean) => void;
  onEdit?: (account: AccountSummary) => void;
  onAddSubaccount?: (parent: AccountSummary) => void;
  onAdjustBalance?: (account: AccountSummary) => void;
  onAccountClick?: (account: AccountSummary) => void;
  deletingId?: string | null;
  deactivatingId?: string | null;
  reactivatingId?: string | null;
}

export default function AccountsList({
  accounts,
  activeTab = 'FINANCIAL',
  onDelete,
  onDeactivate,
  onReactivate,
  onEdit,
  onAddSubaccount,
  onAdjustBalance,
  onAccountClick,
  deletingId,
  deactivatingId,
  reactivatingId,
}: AccountsListProps) {
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const handleRowClick = (account: AccountSummary) => {
    if (onAccountClick) {
      onAccountClick(account);
    }
  };

  const getAccountIcon = (account: AccountSummary) => {
    if (account.isCashOrBank) {
      return <Wallet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
    }
    switch (account.type) {
      case 'ASSET':
        return <Building2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />;
      case 'LIABILITY':
        return <CreditCard className="w-4 h-4 text-red-500 dark:text-red-400" />;
      case 'INCOME':
        return <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
      case 'EXPENSE':
        return <TrendingDown className="w-4 h-4 text-rose-500 dark:text-rose-400" />;
      case 'EQUITY':
        return <Landmark className="w-4 h-4 text-purple-600 dark:text-purple-400" />;
      default:
        return <Wallet className="w-4 h-4 text-slate-500" />;
    }
  };

  const renderGroup = (title: string, list: AccountSummary[], showBalances: boolean = true) => {
    if (list.length === 0) return null;

    const roots = list.filter((a) => !a.parentId);
    const children = list.filter((a) => a.parentId);

    const ordered: AccountSummary[] = [];
    for (const root of roots) {
      ordered.push(root);
      const childs = children.filter((c) => c.parentId === root.id);
      ordered.push(...childs);
    }
    const remaining = children.filter((c) => !roots.some((r) => r.id === c.parentId));
    ordered.push(...remaining);

    const totalGroupBalance = list.reduce((acc, curr) => acc + (curr.balance || 0), 0);
    const firstAccount = list[0];
    const groupCurrency = {
      code: firstAccount?.currencyCode,
      symbol: firstAccount?.currencySymbol,
      decimalPlaces: firstAccount?.decimalPlaces,
    };

    return (
      <section className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <h3 className="text-3xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              {title}
            </h3>
            <span className="text-4xs font-bold px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
              {list.length}
            </span>
          </div>
          {showBalances && (
            <span className="text-3xs font-semibold tabular-nums text-slate-400 dark:text-slate-500">
              Subtotal: {formatCurrency(totalGroupBalance, groupCurrency)}
            </span>
          )}
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700 shadow-sm overflow-visible">
          {ordered.map((a) => {
            const isChild = !!a.parentId;
            const isInactive = a.status === 'INACTIVE';
            const isMenuOpen = activeMenuId === a.id;
            const isReactivating = reactivatingId === a.id;
            const isDeletingOrDeactivating = deletingId === a.id || deactivatingId === a.id;

            return (
              <div
                key={a.id}
                onClick={() => handleRowClick(a)}
                className={`relative flex items-center justify-between p-3 sm:p-3.5 text-xs transition duration-150 group cursor-pointer hover:bg-slate-50/80 dark:hover:bg-slate-700/30 ${
                  isChild ? 'pl-7 sm:pl-9 bg-slate-50/30 dark:bg-slate-900/10' : ''
                } ${isInactive ? 'opacity-60 bg-slate-50/20 dark:bg-slate-900/20' : ''}`}
              >
                {/* Left: Icon & Hierarchy & Info */}
                <div className="flex items-center gap-3 min-w-0 pr-2">
                  {isChild && (
                    <div className="w-2.5 h-2.5 border-l-2 border-b-2 border-indigo-300 dark:border-indigo-700 rounded-bl shrink-0 -ml-1" />
                  )}

                  <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-700/60 flex items-center justify-center shrink-0">
                    {getAccountIcon(a)}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`truncate ${
                          isChild
                            ? 'text-slate-600 dark:text-slate-300 font-semibold'
                            : 'font-bold text-slate-800 dark:text-slate-100'
                        }`}
                      >
                        {a.name}
                      </span>

                      {isInactive && (
                        <span className="text-5xs bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded uppercase tracking-wider font-bold shrink-0">
                          Inactiva
                        </span>
                      )}

                      {a.isCashOrBank && (
                        <span className="text-4xs bg-slate-100 dark:bg-slate-700/70 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-md font-medium border border-slate-200/60 dark:border-slate-600/60 shrink-0">
                          Efectivo
                        </span>
                      )}

                      {a.systemRole && (
                        <span
                          className="inline-flex items-center gap-1 text-5xs bg-slate-100 dark:bg-slate-700/60 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded uppercase tracking-wider font-semibold shrink-0"
                          title="Cuenta especial reservada por el sistema"
                        >
                          <Lock className="w-2.5 h-2.5" />
                          <span>
                            Sistema ({a.systemRole === 'NET_INCOME' ? 'Resultado' : 'Retenidas'})
                          </span>
                        </span>
                      )}
                    </div>

                    <p className="text-4xs text-slate-400 dark:text-slate-500 font-medium truncate mt-0.5">
                      {isChild ? 'Subcuenta • ' : ''}
                      {a.type === 'ASSET'
                        ? 'Activo'
                        : a.type === 'LIABILITY'
                          ? 'Pasivo'
                          : a.type === 'INCOME'
                            ? 'Ingreso'
                            : a.type === 'EXPENSE'
                              ? 'Egreso'
                              : 'Patrimonio'}
                      {a.currencyCode ? ` • ${a.currencyCode}` : ''}
                    </p>
                  </div>
                </div>

                {/* Right: Balance & Context Menu */}
                <div className="flex items-center gap-3 shrink-0">
                  {showBalances && (
                    <span
                      className={`font-bold tabular-nums text-xs sm:text-sm text-right ${
                        a.type === 'ASSET'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : a.type === 'LIABILITY'
                            ? 'text-red-500 dark:text-red-400'
                            : a.type === 'INCOME'
                              ? 'text-indigo-600 dark:text-indigo-400'
                              : 'text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {formatCurrency(a.balance, {
                        code: a.currencyCode,
                        symbol: a.currencySymbol,
                        decimalPlaces: a.decimalPlaces,
                      })}
                    </span>
                  )}

                  {/* Kebab Menu Trigger */}
                  <div className="relative">
                    <button
                      type="button"
                      aria-label={`Opciones de cuenta ${a.name}`}
                      data-testid={`menu-btn-${a.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenuId(isMenuOpen ? null : a.id);
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    {/* Context Menu Dropdown */}
                    {isMenuOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-30"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuId(null);
                          }}
                        />
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="absolute right-0 mt-1 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 py-1.5 z-40 text-xs font-semibold animate-in fade-in zoom-in-95 duration-100"
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setActiveMenuId(null);
                              handleRowClick(a);
                            }}
                            className="w-full text-left px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center gap-2 text-slate-700 dark:text-slate-200 transition"
                          >
                            <ReceiptText className="w-3.5 h-3.5 text-slate-400" />
                            <span>Ver movimientos</span>
                          </button>

                          {!a.systemRole &&
                            !isInactive &&
                            onAdjustBalance &&
                            (a.type === 'ASSET' || a.type === 'LIABILITY') && (
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveMenuId(null);
                                  onAdjustBalance(a);
                                }}
                                className="w-full text-left px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center gap-2 text-slate-700 dark:text-slate-200 transition"
                              >
                                <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
                                <span>Modificar saldo</span>
                              </button>
                            )}

                          {!a.systemRole && onEdit && (
                            <button
                              type="button"
                              onClick={() => {
                                setActiveMenuId(null);
                                onEdit(a);
                              }}
                              className="w-full text-left px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center gap-2 text-slate-700 dark:text-slate-200 transition"
                            >
                              <Pencil className="w-3.5 h-3.5 text-slate-400" />
                              <span>Editar</span>
                            </button>
                          )}

                          {!a.systemRole &&
                            a.type !== 'EQUITY' &&
                            a.name.trim().toLowerCase() !== 'capital' &&
                            !isChild &&
                            onAddSubaccount && (
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveMenuId(null);
                                  onAddSubaccount(a);
                                }}
                                className="w-full text-left px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center gap-2 text-slate-700 dark:text-slate-200 transition"
                              >
                                <Plus className="w-3.5 h-3.5 text-slate-400" />
                                <span>Agregar subcuenta</span>
                              </button>
                            )}

                          {!a.systemRole && (
                            <div className="my-1 border-t border-slate-100 dark:border-slate-700" />
                          )}

                          {!a.systemRole &&
                            (isInactive
                              ? onReactivate && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveMenuId(null);
                                      onReactivate(a.id);
                                    }}
                                    disabled={isReactivating}
                                    className="w-full text-left px-3.5 py-2 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 flex items-center gap-2 text-emerald-600 dark:text-emerald-400 transition"
                                  >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                    <span>Reactivar cuenta</span>
                                  </button>
                                )
                              : onDeactivate && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveMenuId(null);
                                      onDeactivate(a.id);
                                    }}
                                    disabled={isDeletingOrDeactivating}
                                    className="w-full text-left px-3.5 py-2 hover:bg-slate-100 dark:hover:bg-slate-700/60 flex items-center gap-2 text-slate-700 dark:text-slate-200 transition"
                                  >
                                    <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                                    <span>Desactivar cuenta</span>
                                  </button>
                                ))}

                          {!a.systemRole && onDelete && (
                            <button
                              type="button"
                              onClick={() => {
                                setActiveMenuId(null);
                                onDelete(a.id);
                              }}
                              disabled={isDeletingOrDeactivating}
                              className="w-full text-left px-3.5 py-2 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center gap-2 text-red-600 dark:text-red-400 transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Eliminar cuenta</span>
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    );
  };

  // Classify accounts into business groups
  const liquidAssets = accounts.filter((a) => a.type === 'ASSET' && a.isCashOrBank);
  const otherAssets = accounts.filter((a) => a.type === 'ASSET' && !a.isCashOrBank);
  const liabilities = accounts.filter((a) => a.type === 'LIABILITY');
  const incomes = accounts.filter((a) => a.type === 'INCOME');
  const expenses = accounts.filter((a) => a.type === 'EXPENSE');
  const equity = accounts.filter((a) => a.type === 'EQUITY');

  if (activeTab === 'FINANCIAL') {
    return (
      <div className="space-y-6">
        {renderGroup('Cuentas a la vista', liquidAssets)}
        {renderGroup('Activos e Inversiones', otherAssets)}
        {renderGroup('Pasivos y Deudas', liabilities)}
        {renderGroup('Patrimonio Neto', equity)}
      </div>
    );
  }

  if (activeTab === 'CATEGORIES') {
    return (
      <div className="space-y-6">
        {renderGroup('Categorías de Ingreso', incomes, false)}
        {renderGroup('Categorías de Gasto', expenses, false)}
      </div>
    );
  }

  // Default: Financial (Cash, Banks, Assets, Liabilities & Equity)
  return (
    <div className="space-y-6">
      {renderGroup('Cuentas a la vista', liquidAssets)}
      {renderGroup('Activos e Inversiones', otherAssets)}
      {renderGroup('Pasivos y Deudas', liabilities)}
      {renderGroup('Patrimonio Neto', equity)}
    </div>
  );
}
