"use client";

import React from "react";
import { Trash2 } from "lucide-react";
import { formatCurrency } from "../lib/utils";

interface AccountSummary {
  id: string;
  name: string;
  type: "ASSET" | "LIABILITY" | "EQUITY" | "INCOME" | "EXPENSE";
  balance: number;
  currencyCode?: string;
  currencySymbol?: string;
  decimalPlaces?: number;
  parentId?: string | null;
  status?: "ACTIVE" | "INACTIVE";
}

interface AccountsListProps {
  accounts: AccountSummary[];
  onDelete: (id: string) => void;
  deletingId?: string;
}

export default function AccountsList({ accounts, onDelete, deletingId }: AccountsListProps) {
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
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-750 shadow-sm overflow-hidden">
        {ordered.map((a) => {
          const isChild = !!a.parentId;
          const isInactive = a.status === "INACTIVE";
          return (
            <div
              key={a.id}
              className={`flex justify-between items-center p-3.5 text-xs transition duration-150 hover:bg-slate-50/50 dark:hover:bg-slate-750/30 ${
                isChild
                  ? "pl-8 bg-slate-50/20 dark:bg-slate-900/10 border-l-2 border-indigo-500/20"
                  : ""
              } ${isInactive ? "opacity-50" : ""}`}
            >
              <span className={`${isChild ? "text-slate-500 dark:text-slate-450 font-medium" : "font-bold text-slate-700 dark:text-slate-200"}`}>
                {isChild && <span className="mr-1 text-slate-400">└─</span>}
                {a.name}
                {isInactive && (
                  <span className="ml-1.5 text-5xs bg-slate-200 dark:bg-slate-700 text-slate-500 px-1 rounded uppercase tracking-wider font-bold">
                    Inactiva
                  </span>
                )}
              </span>
              <div className="flex items-center gap-4">
                <span
                  className={`font-extrabold ${
                    a.type === "ASSET"
                      ? "text-green-600 dark:text-green-400"
                      : a.type === "LIABILITY"
                        ? "text-red-500"
                        : a.type === "INCOME"
                          ? "text-indigo-500"
                          : "text-slate-500"
                  }`}
                >
                  {formatCurrency(a.balance, {
                    code: a.currencyCode,
                    symbol: a.currencySymbol,
                    decimalPlaces: a.decimalPlaces,
                  })}
                </span>
                {!isInactive && (
                  <button
                    type="button"
                    onClick={() => onDelete(a.id)}
                    disabled={deletingId === a.id}
                    className="text-slate-400 hover:text-red-500 transition-all duration-150 p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20"
                    title="Eliminar o Desactivar"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const assets = accounts.filter((a) => a.type === "ASSET") || [];
  const liabilities = accounts.filter((a) => a.type === "LIABILITY") || [];
  const equity = accounts.filter((a) => a.type === "EQUITY") || [];
  const incomes = accounts.filter((a) => a.type === "INCOME") || [];
  const expenses = accounts.filter((a) => a.type === "EXPENSE") || [];

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
