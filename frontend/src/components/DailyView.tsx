'use client';

import React, { useState } from 'react';
import { ArrowUpRight, ArrowDownLeft, RefreshCw, ChevronDown, ChevronUp, Trash2, Copy, Edit } from 'lucide-react';
import Link from 'next/link';
import { formatCurrency, CurrencyInfo } from '../lib/utils';

interface Entry {
  id: string;
  accountId: string;
  entryType: 'DEBIT' | 'CREDIT';
  amount: number;
  amountBase?: number;
  account: {
    id: string;
    name: string;
    type: string;
    currency?: CurrencyInfo;
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
  onDelete: (id: string) => void;
  baseCurrency?: CurrencyInfo;
}

export default function DailyView({ transactions, onReverse, onDelete, baseCurrency }: DailyViewProps) {
  const [expandedTxId, setExpandedTxId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedTxId((prevId) => (prevId === id ? null : id));
  };

  // Group by date (YYYY-MM-DD)
  const grouped: Record<string, Transaction[]> = {};
  for (const tx of transactions) {
    const d = new Date(tx.date);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const dStr = `${y}-${m}-${day}`;
    if (!grouped[dStr]) {
      grouped[dStr] = [];
    }
    grouped[dStr].push(tx);
  }

  // Sort dates descending
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  if (transactions.length === 0) {
    return (
      <div className="text-center py-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
        <p className="text-xs text-slate-450 dark:text-slate-500">
          No hay transacciones cargadas para este período.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sortedDates.map((dateStr) => {
        const dayTxs = grouped[dateStr];
        const dateObj = new Date(dateStr + 'T00:00:00');

        // Sum total flows for the day (aggregates in base currency)
        let dayDebits = 0;
        dayTxs.forEach((t) => {
          if (t.status !== 'REVERSED') {
            t.entries
              .filter((e) => e.entryType === 'DEBIT')
              .forEach((e) => {
                dayDebits += Number(e.amountBase || e.amount);
              });
          }
        });

        return (
          <div key={dateStr} className="space-y-1">
            {/* Day Header */}
            <div className="flex justify-between items-center px-1">
              <span className="text-xs font-bold text-slate-400 dark:text-slate-550 uppercase tracking-widest">
                {dateObj.toLocaleDateString('es-ES', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                })}
              </span>
              <span className="text-[10px] font-semibold text-slate-400">
                Flujo del día:{' '}
                <span className="font-bold text-slate-600 dark:text-slate-300">
                  {formatCurrency(dayDebits, baseCurrency)}
                </span>
              </span>
            </div>

            {/* Day Transactions */}
            <div className="space-y-1">
              {dayTxs.map((tx) => {
                const isExpanded = expandedTxId === tx.id;
                const isReversed = tx.status === 'REVERSED';
                const isReversion = !!tx.reversalOfId;

                // Check dominant type for icon
                const firstDebit = tx.entries.find((e) => e.entryType === 'DEBIT');
                const firstCredit = tx.entries.find((e) => e.entryType === 'CREDIT');
                const isExpense = firstDebit?.account?.type === 'EXPENSE';
                const isIncome = firstCredit?.account?.type === 'INCOME';

                const txAmount = firstDebit?.amount || 0;
                return (
                  <div
                    key={tx.id}
                    className={`bg-white dark:bg-slate-800 rounded-2xl border transition-all duration-200 shadow-sm ${
                      isExpanded
                        ? 'border-indigo-500/25 dark:border-indigo-500/30 shadow-md shadow-indigo-500/5'
                        : 'border-slate-100 dark:border-slate-700 hover:border-slate-200'
                    }`}
                  >
                    {/* Main Row */}
                    <div
                      onClick={() => toggleExpand(tx.id)}
                      className="p-2 flex items-center justify-between cursor-pointer select-none"
                    >
                      <div className="flex items-center space-x-2">
                        {/* Transaction Icon */}
                        <div
                          className={`w-7 h-7 rounded-xl flex items-center justify-center border shrink-0 ${
                            isReversed
                              ? 'bg-slate-50 dark:bg-slate-900 text-slate-400 border-slate-200/50'
                              : isReversion
                                ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-550 border-amber-200'
                                : isExpense
                                  ? 'bg-red-50 dark:bg-red-950/20 text-red-500 border-red-100 dark:border-red-900/60'
                                  : isIncome
                                    ? 'bg-green-50 dark:bg-green-950/20 text-green-500 border-green-100 dark:border-green-900/60'
                                    : 'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-500 border-indigo-100 dark:border-indigo-900/60'
                          }`}
                        >
                          {isReversed ? (
                            <RefreshCw className="w-3.5 h-3.5 opacity-50 line-through" />
                          ) : isReversion ? (
                            <RefreshCw className="w-3.5 h-3.5" />
                          ) : isIncome ? (
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          ) : (
                            <ArrowDownLeft className="w-3.5 h-3.5" />
                          )}
                        </div>

                        <div>
                          <p
                            className={`text-xs font-bold ${
                              isReversed
                                ? 'line-through text-slate-400 dark:text-slate-550'
                                : 'text-slate-800 dark:text-slate-200'
                            }`}
                          >
                            {tx.description}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {tx.entries.length} apuntes
                            {isReversed && (
                              <span className="ml-1.5 text-red-500 font-bold uppercase tracking-wider text-[8px] bg-red-50 dark:bg-red-950/20 px-1 py-0.5 rounded-md">
                                Anulado
                              </span>
                            )}
                            {isReversion && (
                              <span className="ml-1.5 text-amber-500 font-bold uppercase tracking-wider text-[8px] bg-amber-50 dark:bg-amber-950/20 px-1 py-0.5 rounded-md">
                                Reversión
                              </span>
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 text-right">
                        <div>
                          <p
                            className={`text-xs font-extrabold ${
                              isReversed
                                ? 'line-through text-slate-400'
                                : isExpense
                                  ? 'text-red-500'
                                  : isIncome
                                    ? 'text-green-500'
                                    : 'text-indigo-600 dark:text-indigo-400'
                            }`}
                          >
                            {formatCurrency(
                              txAmount,
                              firstDebit?.account?.currency || baseCurrency,
                            )}
                          </p>
                        </div>

                        <div className="text-slate-400">
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </div>
                      </div>
                    </div>
                    {/* Expandable Split Details Table */}
                    {isExpanded && (
                      <div className="px-4 pb-3 pt-3 bg-slate-50/50 dark:bg-slate-900/30 border-t border-slate-150 dark:border-slate-700/80 rounded-b-2xl animate-in fade-in duration-200">
                        <div className="space-y-3">
                          <p className="font-bold text-[10px] text-slate-400 dark:text-slate-550 uppercase tracking-widest px-1">
                            Detalles del Asiento
                          </p>

                          <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs">
                              <thead>
                                <tr className="border-b border-slate-200/60 dark:border-slate-800/80 text-slate-450 dark:text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                                  <th className="py-2 px-2 text-left font-semibold">
                                    Cuenta / Categoría
                                  </th>
                                  <th className="py-2 px-2 text-right w-28 sm:w-36 font-semibold">
                                    Debe
                                  </th>
                                  <th className="py-2 px-2 text-right w-28 sm:w-36 font-semibold">
                                    Haber
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 font-medium text-slate-600 dark:text-slate-350">
                                {tx.entries.map((entry) => {
                                  const entryCurrency = entry.account?.currency || baseCurrency;
                                  return (
                                    <tr
                                      key={entry.id}
                                      className="hover:bg-slate-50/40 dark:hover:bg-slate-850/10 transition duration-150"
                                    >
                                      <td className="py-2.5 px-2">
                                        <div className="flex items-center gap-2">
                                          <span className="font-semibold text-slate-700 dark:text-slate-200">
                                            {entry.account.name}
                                          </span>
                                          <span className="text-[9px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-450 dark:text-slate-400 px-1.5 py-0.5 rounded-md tracking-wider">
                                            {entry.account.type}
                                          </span>
                                        </div>
                                      </td>
                                      <td className="py-2.5 px-2 text-right">
                                        {entry.entryType === 'DEBIT' ? (
                                          <span className="font-extrabold text-red-500/90 dark:text-red-400">
                                            {formatCurrency(entry.amount, entryCurrency)}
                                          </span>
                                        ) : (
                                          <span className="text-slate-300 dark:text-slate-600 font-normal select-none">
                                            —
                                          </span>
                                        )}
                                      </td>
                                      <td className="py-2.5 px-2 text-right">
                                        {entry.entryType === 'CREDIT' ? (
                                          <span className="font-extrabold text-green-600 dark:text-green-400">
                                            {formatCurrency(entry.amount, entryCurrency)}
                                          </span>
                                        ) : (
                                          <span className="text-slate-300 dark:text-slate-600 font-normal select-none">
                                            —
                                          </span>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>

                          {/* Transaction action toolbar */}
                          <div className="flex flex-wrap justify-end gap-2 pt-2 border-t border-slate-150 dark:border-slate-800">
                            {/* Delete Button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDelete(tx.id);
                              }}
                              className="flex items-center gap-1.5 py-1.5 px-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-950/20 text-slate-500 hover:text-red-655 dark:text-slate-400 rounded-xl font-bold text-[10px] transition duration-200 shadow-sm"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Eliminar</span>
                            </button>

                            {/* Clone Button */}
                            <Link
                              href={`/transactions/new?cloneFrom=${tx.id}`}
                              className="flex items-center gap-1.5 py-1.5 px-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-[10px] transition duration-200 shadow-sm"
                            >
                              <Copy className="w-3 h-3" />
                              <span>Duplicar</span>
                            </Link>

                            {/* Edit Button */}
                            {!isReversed && !isReversion && (
                              <Link
                                href={`/transactions/new?edit=${tx.id}`}
                                className="flex items-center gap-1.5 py-1.5 px-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-[10px] transition duration-200 shadow-sm"
                              >
                                <Edit className="w-3 h-3" />
                                <span>Editar</span>
                              </Link>
                            )}

                            {/* Reversal button if eligible */}
                            {!isReversed && !isReversion && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onReverse(tx.id);
                                }}
                                className="flex items-center gap-1.5 py-1.5 px-3 border border-red-200 dark:border-red-900 bg-red-50/50 hover:bg-red-50 dark:bg-red-950/20 dark:hover:bg-red-950/40 text-red-655 dark:text-red-400 rounded-xl font-bold text-[10px] transition duration-200 shadow-sm"
                              >
                                <RefreshCw className="w-3 h-3" />
                                <span>Anular / Reversar</span>
                              </button>
                            )}
                          </div>
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
