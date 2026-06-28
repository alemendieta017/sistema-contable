"use client";

import React, { useState } from "react";
import { ArrowUpRight, ArrowDownLeft, ChevronLeft, ChevronRight, TrendingUp, TrendingDown, DollarSign } from "lucide-react";

interface Entry {
  accountId: string;
  entryType: "DEBIT" | "CREDIT";
  amount: number;
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
}

export default function MonthlyView({ transactions }: MonthlyViewProps) {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const months = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
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

    if (tx.status === "REVERSED") continue;

    const monthIndex = dateObj.getMonth();
    let txIncome = 0;
    let txExpense = 0;

    for (const entry of tx.entries) {
      if (entry.entryType === "CREDIT" && entry.account?.type === "INCOME") {
        txIncome += entry.amount;
      }
      if (entry.entryType === "DEBIT" && entry.account?.type === "EXPENSE") {
        txExpense += entry.amount;
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
    <div className="space-y-6">
      {/* Year Selection bar */}
      <div className="flex items-center justify-between bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Resumen por Año</span>
        
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setSelectedYear((y) => y - 1)}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 transition"
          >
            <ChevronLeft className="w-4.5 h-4.5" />
          </button>
          <span className="text-sm font-extrabold text-indigo-600 dark:text-indigo-400 select-none">
            {selectedYear}
          </span>
          <button
            onClick={() => setSelectedYear((y) => y + 1)}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 transition"
          >
            <ChevronRight className="w-4.5 h-4.5" />
          </button>
        </div>
      </div>

      {/* Yearly Summary Dashboard cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-3xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Ingresos Anuales
            </p>
            <h4 className="text-lg font-extrabold text-green-500 mt-1">
              ${yearlyIncome.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </h4>
          </div>
          <div className="w-10 h-10 bg-green-50 dark:bg-green-950/20 border border-green-150 rounded-xl flex items-center justify-center text-green-500">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-3xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Gastos Anuales
            </p>
            <h4 className="text-lg font-extrabold text-red-500 mt-1">
              ${yearlyExpense.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </h4>
          </div>
          <div className="w-10 h-10 bg-red-50 dark:bg-red-950/20 border border-red-150 rounded-xl flex items-center justify-center text-red-500">
            <TrendingDown className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-3xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Saldo Neto
            </p>
            <h4
              className={`text-lg font-extrabold mt-1 ${
                yearlyIncome - yearlyExpense >= 0 ? "text-indigo-500" : "text-red-500"
              }`}
            >
              ${(yearlyIncome - yearlyExpense).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </h4>
          </div>
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
              yearlyIncome - yearlyExpense >= 0
                ? "bg-indigo-50 dark:bg-indigo-950/20 text-indigo-500 border-indigo-150"
                : "bg-red-50 dark:bg-red-950/20 text-red-500 border-red-150"
            }`}
          >
            <DollarSign className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Monthly grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {monthlyData.map((m) => {
          const hasData = m.txCount > 0;
          return (
            <div
              key={m.monthIndex}
              className={`bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm space-y-4 transition ${
                hasData ? "opacity-100" : "opacity-60"
              }`}
            >
              {/* Header */}
              <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-700">
                <span className="font-bold text-sm text-slate-800 dark:text-slate-100">
                  {m.monthName}
                </span>
                <span className="text-3xs text-slate-450 dark:text-slate-500 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 px-2 py-0.5 rounded font-semibold">
                  {m.txCount} transacciones
                </span>
              </div>

              {/* Rows */}
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div>
                  <p className="text-4xs font-bold text-slate-400 uppercase tracking-wider">
                    Ingresos
                  </p>
                  <p className="font-bold text-green-500 mt-1">
                    ${m.income.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <p className="text-4xs font-bold text-slate-400 uppercase tracking-wider">
                    Gastos
                  </p>
                  <p className="font-bold text-red-550 dark:text-red-400 mt-1">
                    ${m.expense.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <p className="text-4xs font-bold text-slate-400 uppercase tracking-wider">
                    Neto
                  </p>
                  <p
                    className={`font-extrabold mt-1 ${
                      m.net >= 0 ? "text-indigo-600 dark:text-indigo-400" : "text-red-500"
                    }`}
                  >
                    ${m.net.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
