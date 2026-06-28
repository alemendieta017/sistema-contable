"use client";

import React, { useState } from "react";
import { ArrowUpRight, ArrowDownLeft, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";

interface Entry {
  id: string;
  accountId: string;
  entryType: "DEBIT" | "CREDIT";
  amount: number;
  account: {
    id: string;
    name: string;
    type: string;
  };
}

interface Transaction {
  id: string;
  date: string;
  description: string;
  status?: string;
  reversalOfId?: string | null;
  entries: Entry[];
}

interface DailyViewProps {
  transactions: Transaction[];
  onReverse: (id: string) => void;
}

export default function DailyView({ transactions, onReverse }: DailyViewProps) {
  const [expandedTx, setExpandedTx] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpandedTx((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Group by date (YYYY-MM-DD)
  const grouped: Record<string, Transaction[]> = {};
  for (const tx of transactions) {
    const dStr = new Date(tx.date).toISOString().substring(0, 10);
    if (!grouped[dStr]) {
      grouped[dStr] = [];
    }
    grouped[dStr].push(tx);
  }

  // Sort dates descending
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  if (transactions.length === 0) {
    return (
      <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700">
        <p className="text-sm text-slate-450 dark:text-slate-500">No hay transacciones cargadas para este período.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {sortedDates.map((dateStr) => {
        const dayTxs = grouped[dateStr];
        const dateObj = new Date(dateStr + "T00:00:00");
        
        // Sum total flows for the day
        let dayDebits = 0;
        dayTxs.forEach((t) => {
          if (t.status !== "REVERSED") {
            t.entries
              .filter((e) => e.entryType === "DEBIT")
              .forEach((e) => {
                // If it affects expense/asset, consider it flow
                dayDebits += e.amount;
              });
          }
        });

        return (
          <div key={dateStr} className="space-y-2.5">
            {/* Day Header */}
            <div className="flex justify-between items-center px-2">
              <span className="text-xs font-bold text-slate-400 dark:text-slate-550 uppercase tracking-widest">
                {dateObj.toLocaleDateString("es-ES", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                })}
              </span>
              <span className="text-3xs font-semibold text-slate-400">
                Flujo del día: <span className="font-bold text-slate-650 dark:text-slate-300">${dayDebits.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </span>
            </div>

            {/* Day Transactions */}
            <div className="space-y-2">
              {dayTxs.map((tx) => {
                const isExpanded = !!expandedTx[tx.id];
                const isReversed = tx.status === "REVERSED";
                const isReversion = !!tx.reversalOfId;

                // Check dominant type for icon
                const firstDebit = tx.entries.find((e) => e.entryType === "DEBIT");
                const firstCredit = tx.entries.find((e) => e.entryType === "CREDIT");
                const isExpense = firstDebit?.account?.type === "EXPENSE";
                const isIncome = firstCredit?.account?.type === "INCOME";

                const txAmount = firstDebit?.amount || 0;

                return (
                  <div
                    key={tx.id}
                    className={`bg-white dark:bg-slate-800 rounded-2xl border transition-all duration-200 shadow-sm ${
                      isExpanded
                        ? "border-indigo-150 dark:border-indigo-900"
                        : "border-slate-100 dark:border-slate-700 hover:border-slate-200"
                    }`}
                  >
                    {/* Main Row */}
                    <div
                      onClick={() => toggleExpand(tx.id)}
                      className="p-4 flex items-center justify-between cursor-pointer select-none"
                    >
                      <div className="flex items-center space-x-3.5">
                        {/* Transaction Icon */}
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center border shrink-0 ${
                            isReversed
                              ? "bg-slate-50 dark:bg-slate-900 text-slate-400 border-slate-200/50"
                              : isReversion
                                ? "bg-amber-50 dark:bg-amber-950/20 text-amber-550 border-amber-200"
                                : isExpense
                                  ? "bg-red-50 dark:bg-red-950/20 text-red-500 border-red-100 dark:border-red-900/60"
                                  : isIncome
                                    ? "bg-green-50 dark:bg-green-950/20 text-green-500 border-green-100 dark:border-green-900/60"
                                    : "bg-indigo-50 dark:bg-indigo-950/20 text-indigo-500 border-indigo-100 dark:border-indigo-900/60"
                          }`}
                        >
                          {isReversed ? (
                            <RefreshCw className="w-4.5 h-4.5 opacity-50 line-through" />
                          ) : isReversion ? (
                            <RefreshCw className="w-4.5 h-4.5" />
                          ) : isIncome ? (
                            <ArrowUpRight className="w-4.5 h-4.5" />
                          ) : (
                            <ArrowDownLeft className="w-4.5 h-4.5" />
                          )}
                        </div>

                        <div>
                          <p
                            className={`text-xs font-bold ${
                              isReversed ? "line-through text-slate-400 dark:text-slate-550" : "text-slate-800 dark:text-slate-200"
                            }`}
                          >
                            {tx.description}
                          </p>
                          <p className="text-3xs text-slate-400 mt-0.5">
                            {tx.entries.length} apuntes
                            {isReversed && (
                              <span className="ml-1.5 text-red-500 font-bold uppercase tracking-wider text-4xs bg-red-50 dark:bg-red-950/20 px-1 py-0.5 rounded">
                                Anulado
                              </span>
                            )}
                            {isReversion && (
                              <span className="ml-1.5 text-amber-500 font-bold uppercase tracking-wider text-4xs bg-amber-50 dark:bg-amber-950/20 px-1 py-0.5 rounded">
                                Reversión
                              </span>
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3.5 text-right">
                        <div>
                          <p
                            className={`text-xs font-extrabold ${
                              isReversed
                                ? "line-through text-slate-400"
                                : isExpense
                                  ? "text-red-500"
                                  : isIncome
                                    ? "text-green-500"
                                    : "text-indigo-600 dark:text-indigo-400"
                            }`}
                          >
                            ${txAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </p>
                        </div>

                        <div className="text-slate-400">
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </div>
                      </div>
                    </div>

                    {/* Expandable Split Details Table */}
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-1 border-t border-slate-50 dark:border-slate-700/50 animate-in fade-in duration-200">
                        <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-3 border border-slate-100 dark:border-slate-800 space-y-2 text-2xs">
                          <p className="font-bold text-3xs text-slate-450 dark:text-slate-500 uppercase tracking-widest mb-1.5">
                            Detalles del Asiento (Partida Doble)
                          </p>
                          
                          <div className="divide-y divide-slate-100 dark:divide-slate-800">
                            {tx.entries.map((entry) => (
                              <div
                                key={entry.id}
                                className="flex justify-between items-center py-2 text-slate-650 dark:text-slate-350"
                              >
                                <span className="font-medium">
                                  {entry.account.name}{" "}
                                  <span className="text-4xs bg-slate-200 dark:bg-slate-800 text-slate-450 px-1 rounded-sm uppercase tracking-wider font-semibold ml-1.5">
                                    {entry.account.type}
                                  </span>
                                </span>
                                <div className="flex gap-4">
                                  <span className="font-semibold text-slate-450 uppercase w-10 text-right">
                                    {entry.entryType === "DEBIT" ? "Debe" : "Haber"}
                                  </span>
                                  <span
                                    className={`font-extrabold w-18 text-right ${
                                      entry.entryType === "DEBIT" ? "text-red-500" : "text-green-550 dark:text-green-400"
                                    }`}
                                  >
                                    ${entry.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Reversal action if eligible */}
                          {!isReversed && !isReversion && (
                            <div className="flex justify-end pt-2 mt-1 border-t border-slate-150 dark:border-slate-850">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onReverse(tx.id);
                                }}
                                className="flex items-center gap-1.5 py-1.5 px-3 border border-red-200 dark:border-red-800 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-950/40 text-red-650 dark:text-red-400 rounded-lg font-bold text-3xs transition duration-200 shadow-sm shadow-red-500/5"
                              >
                                <RefreshCw className="w-3 h-3" />
                                <span>Anular / Reversar Asiento</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
