'use client';

import React from 'react';
import { Trash2, RotateCcw } from 'lucide-react';
import { formatCurrency } from '../lib/utils';

interface AccountSummary {
  id: string;
  name: string;
  type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE';
  balance: number;
  currencyCode?: string;
  currencySymbol?: string;
  decimalPlaces?: number;
  parentId?: string | null;
  status?: 'ACTIVE' | 'INACTIVE';
  isCashOrBank?: boolean;
  systemRole?: string | null;
}

interface AccountsListProps {
  accounts: AccountSummary[];
  onDelete?: (id: string) => void;
  deletingId?: string;
  onToggleCashOrBank?: (id: string, isCashOrBank: boolean) => void;
  onReactivate?: (id: string) => void;
  onDeactivate?: (id: string) => void;
  reactivatingId?: string;
  deactivatingId?: string;
}

export default function AccountsList({
  accounts,
  onDelete,
  deletingId,
  onToggleCashOrBank: _onToggleCashOrBank,
  onReactivate,
  onDeactivate,
  reactivatingId,
  deactivatingId,
}: AccountsListProps) {
  const renderAccountList = (list: AccountSummary[]) => {
    const roots = list.filter((a) => !a.parentId);
    const children = list.filter((a) => a.parentId);

    const ordered: AccountSummary[] = [];
    for (const root of roots) {
      ordered.push(root);
      const childs = children.filter((c) => c.parentId === root.id);
      ordered.push(...childs);
    }

    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700 shadow-sm overflow-hidden">
        {ordered.map((a) => {
          const isChild = !!a.parentId;
          const isInactive = a.status === 'INACTIVE';
          const isReactivating = reactivatingId === a.id;
          const isDeletingOrDeactivating = deletingId === a.id || deactivatingId === a.id;

          return (
            <div
              key={a.id}
              className={`flex justify-between items-center p-3.5 text-xs transition duration-150 hover:bg-slate-50/50 dark:hover:bg-slate-700/30 ${
                isChild
                  ? 'pl-8 bg-slate-50/20 dark:bg-slate-900/10 border-l-2 border-indigo-500/20'
                  : ''
              } ${isInactive ? 'opacity-60 bg-slate-50/30 dark:bg-slate-900/20' : ''}`}
            >
              <span
                className={`${isChild ? 'text-slate-500 dark:text-slate-400 font-medium' : 'font-bold text-slate-700 dark:text-slate-200'}`}
              >
                {isChild && <span className="mr-1 text-slate-400">└─</span>}
                {a.name}
                {isInactive && (
                  <span className="ml-1.5 text-5xs bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded uppercase tracking-wider font-bold">
                    Inactiva
                  </span>
                )}
                {a.isCashOrBank && (
                  <span className="ml-1.5 text-5xs bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded uppercase tracking-wider font-bold">
                    Caja/Banco
                  </span>
                )}
                {a.systemRole && (
                  <span
                    className="ml-1.5 text-5xs bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-300 px-1.5 py-0.5 rounded uppercase tracking-wider font-bold"
                    title="Cuenta especial reservada por el sistema"
                  >
                    Sistema ({a.systemRole === 'NET_INCOME' ? 'Resultado' : 'Retenidas'})
                  </span>
                )}
              </span>
              <div className="flex items-center gap-4">
                <span
                  className={`font-extrabold ${
                    a.type === 'ASSET'
                      ? 'text-green-600 dark:text-green-400'
                      : a.type === 'LIABILITY'
                        ? 'text-red-500'
                        : a.type === 'INCOME'
                          ? 'text-indigo-500'
                          : 'text-slate-500'
                  }`}
                >
                  {formatCurrency(a.balance, {
                    code: a.currencyCode,
                    symbol: a.currencySymbol,
                    decimalPlaces: a.decimalPlaces,
                  })}
                </span>
                {!a.systemRole &&
                  (isInactive ? (
                    onReactivate && (
                      <button
                        type="button"
                        onClick={() => onReactivate(a.id)}
                        disabled={isReactivating}
                        className="flex items-center gap-1 text-3xs font-bold py-1 px-2.5 border border-emerald-200 dark:border-emerald-900 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-lg transition disabled:opacity-50"
                        title="Reactivar cuenta"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Reactivar</span>
                      </button>
                    )
                  ) : (
                    <div className="flex items-center gap-1.5">
                      {onDeactivate && (
                        <button
                          type="button"
                          onClick={() => onDeactivate(a.id)}
                          disabled={isDeletingOrDeactivating}
                          className="text-3xs font-bold py-1 px-2 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition disabled:opacity-50"
                          title="Desactivar cuenta"
                        >
                          Desactivar
                        </button>
                      )}
                      {onDelete && (
                        <button
                          type="button"
                          onClick={() => onDelete(a.id)}
                          disabled={isDeletingOrDeactivating}
                          className="text-slate-400 hover:text-red-500 transition-all duration-150 p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20"
                          title="Eliminar cuenta"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const assets = accounts.filter((a) => a.type === 'ASSET') || [];
  const liabilities = accounts.filter((a) => a.type === 'LIABILITY') || [];
  const equity = accounts.filter((a) => a.type === 'EQUITY') || [];
  const incomes = accounts.filter((a) => a.type === 'INCOME') || [];
  const expenses = accounts.filter((a) => a.type === 'EXPENSE') || [];

  return (
    <div className="space-y-6">
      {/* Assets */}
      {assets.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-3xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">
            Activos (Cuentas de efectivo, bancos)
          </h3>
          {renderAccountList(assets)}
        </section>
      )}

      {/* Liabilities */}
      {liabilities.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-3xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">
            Pasivos (Tarjetas, deudas, créditos)
          </h3>
          {renderAccountList(liabilities)}
        </section>
      )}

      {/* Incomes */}
      {incomes.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-3xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">
            Ingresos (Categorías de entrada)
          </h3>
          {renderAccountList(incomes)}
        </section>
      )}

      {/* Expenses */}
      {expenses.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-3xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">
            Egresos (Categorías de gasto)
          </h3>
          {renderAccountList(expenses)}
        </section>
      )}

      {/* Equity */}
      {equity.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-3xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">
            Patrimonio Neto (Capital de inicio)
          </h3>
          {renderAccountList(equity)}
        </section>
      )}
    </div>
  );
}
