'use client';

import React, { useState } from 'react';
import {
  ArrowUpRight,
  ArrowDownLeft,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  DollarSign,
} from 'lucide-react';
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
}

export default function MonthlyView({ transactions, baseCurrency }: MonthlyViewProps) {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

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

  let yearlyIncome = 0;
  let yearlyExpense = 0;

  for (const tx of transactions) {
    const dateObj = new Date(tx.date);
    if (dateObj.getFullYear() !== selectedYear) continue;

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

    yearlyIncome += txIncome;
    yearlyExpense += txExpense;
  }

  return (
    <div className="space-y-3">
      {/* Year Selection bar */}
      <div className="flex items-center justify-between bg-white dark:bg-slate-800 p-2 px-3 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
        <span className="text-3xs font-bold text-slate-500 dark:text-slate-400 uppercase">
          Resumen por Año
        </span>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setSelectedYear((y) => y - 1)}
            className="p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 transition"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 select-none">
            {selectedYear}
          </span>
          <button
            onClick={() => setSelectedYear((y) => y + 1)}
            className="p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 transition"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Yearly Summary Dashboard cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div className="bg-white dark:bg-slate-800 p-2 px-3 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-3xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Ingresos Anuales
            </p>
            <h4 className="text-sm font-extrabold text-green-500 mt-0.5">
              {formatCurrency(yearlyIncome, baseCurrency)}
            </h4>
          </div>
          <div className="w-7 h-7 bg-green-50 dark:bg-green-950/20 border border-green-150 rounded-xl flex items-center justify-center text-green-500">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-2 px-3 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-3xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Gastos Anuales
            </p>
            <h4 className="text-sm font-extrabold text-red-500 mt-0.5">
              {formatCurrency(yearlyExpense, baseCurrency)}
            </h4>
          </div>
          <div className="w-7 h-7 bg-red-50 dark:bg-red-950/20 border border-red-150 rounded-xl flex items-center justify-center text-red-500">
            <TrendingDown className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-2 px-3 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-3xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Saldo Neto
            </p>
            <h4
              className={`text-sm font-extrabold mt-0.5 ${
                yearlyIncome - yearlyExpense >= 0 ? 'text-indigo-500' : 'text-red-500'
              }`}
            >
              {formatCurrency(yearlyIncome - yearlyExpense, baseCurrency)}
            </h4>
          </div>
          <div
            className={`w-7 h-7 rounded-xl flex items-center justify-center border ${
              yearlyIncome - yearlyExpense >= 0
                ? 'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-500 border-indigo-150'
                : 'bg-red-50 dark:bg-red-950/20 text-red-555 dark:text-red-555 border-red-150'
            }`}
          >
            <DollarSign className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Monthly Table */}
      <div className="w-full overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
        <table className="w-full min-w-[600px] border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 text-3xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider select-none">
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
                  className={`hover:bg-slate-50/50 dark:hover:bg-slate-750/50 transition duration-150 ${
                    hasData ? 'opacity-100' : 'opacity-55 text-slate-450 dark:text-slate-550'
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
                  <td className="py-2.5 px-4 text-right font-semibold text-red-555 dark:text-red-400">
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
