'use client';

import React from 'react';
import { formatCurrency, CurrencyInfo } from '../lib/utils';

interface Entry {
  accountId: string;
  entryType: 'DEBIT' | 'CREDIT';
  amount: number;
  amountBase?: number;
  account: {
    type: string;
  };
}

interface Transaction {
  id: string;
  date: string;
  status?: string;
  entries: Entry[];
}

interface MonthlyViewProps {
  transactions: Transaction[];
  baseCurrency?: CurrencyInfo;
  currentYear: number;
}

export default function MonthlyView({
  transactions,
  baseCurrency,
  currentYear,
}: MonthlyViewProps) {
  const months = [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre',
  ];

  // Calculate monthly stats for the selected year
  const monthlyData = Array.from({ length: 12 }, (_, i) => ({
    monthIndex: i,
    monthName: months[i],
    income: 0,
    expense: 0,
    net: 0,
    txCount: 0,
  }));

  for (const tx of transactions) {
    const dateObj = new Date(tx.date);
    if (dateObj.getFullYear() !== currentYear) continue;

    if (tx.status === 'REVERSED') continue;

    const monthIndex = dateObj.getMonth();
    let txIncome = 0;
    let txExpense = 0;

    for (const entry of tx.entries) {
      if (entry.entryType === 'CREDIT' && entry.account?.type === 'INCOME') {
        txIncome += Number(entry.amountBase || entry.amount);
      }
      if (entry.entryType === 'DEBIT' && entry.account?.type === 'EXPENSE') {
        txExpense += Number(entry.amountBase || entry.amount);
      }
    }

    monthlyData[monthIndex].income += txIncome;
    monthlyData[monthIndex].expense += txExpense;
    monthlyData[monthIndex].net += txIncome - txExpense;
    monthlyData[monthIndex].txCount += 1;
  }

  return (
    <div className="space-y-3">
      {/* Monthly Table */}
      <div className="w-full overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
        <table className="w-full min-w-[600px] border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider select-none">
              <th className="py-2.5 px-4 text-left font-bold">Mes</th>
              <th className="py-2.5 px-4 text-right font-bold">Transacciones</th>
              <th className="py-2.5 px-4 text-right font-bold">Ingresos</th>
              <th className="py-2.5 px-4 text-right font-bold">Gastos</th>
              <th className="py-2.5 px-4 text-right font-bold">Saldo Neto</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
            {monthlyData.map((m) => {
              const hasData = m.txCount > 0;
              return (
                <tr
                  key={m.monthIndex}
                  className={`hover:bg-slate-50/50 dark:hover:bg-slate-700/50 transition duration-150 ${
                    hasData ? 'opacity-100' : 'opacity-55 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  <td className="py-2.5 px-4 font-semibold text-slate-800 dark:text-slate-100">
                    {m.monthName}
                  </td>
                  <td className="py-2.5 px-4 text-right font-medium text-slate-500 dark:text-slate-400">
                    {m.txCount}
                  </td>
                  <td className="py-2.5 px-4 text-right font-semibold text-green-500">
                    {formatCurrency(m.income, baseCurrency)}
                  </td>
                  <td className="py-2.5 px-4 text-right font-semibold text-red-500 dark:text-red-400">
                    {formatCurrency(m.expense, baseCurrency)}
                  </td>
                  <td
                    className={`py-2.5 px-4 text-right font-extrabold ${
                      m.net >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-red-500'
                    }`}
                  >
                    {formatCurrency(m.net, baseCurrency)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
