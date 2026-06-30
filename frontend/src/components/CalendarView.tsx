'use client';

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
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

interface CalendarViewProps {
  transactions: Transaction[];
  baseCurrency?: CurrencyInfo;
  currentDate: Date;
  onMonthChange: (d: Date) => void;
}

export default function CalendarView({
  transactions,
  baseCurrency,
  currentDate,
  onMonthChange,
}: CalendarViewProps) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-11

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

  const daysOfWeek = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  // Helper calendar functions
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startDayOfWeek = new Date(year, month, 1).getDay(); // 0 (Sun) to 6 (Sat)

  // Aggregate day-by-day statistics
  const dayStats: Record<number, { income: number; expense: number; net: number }> = {};
  for (let i = 1; i <= daysInMonth; i++) {
    dayStats[i] = { income: 0, expense: 0, net: 0 };
  }

  for (const tx of transactions) {
    const txDateObj = new Date(tx.date);
    if (txDateObj.getFullYear() !== year || txDateObj.getMonth() !== month) continue;

    if (tx.status === 'REVERSED') continue;

    const day = txDateObj.getDate();
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

    if (dayStats[day]) {
      dayStats[day].income += txIncome;
      dayStats[day].expense += txExpense;
      dayStats[day].net += txIncome - txExpense;
    }
  }

  // Preceding empty slots
  const blankSlots = Array.from({ length: startDayOfWeek }, (_, i) => null);
  // Month days slots
  const daySlots = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const totalSlots = [...blankSlots, ...daySlots];

  const handlePrevMonth = () => {
    onMonthChange(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    onMonthChange(new Date(year, month + 1, 1));
  };

  return (
    <div className="space-y-3">
      {/* Selector Header */}
      <div className="flex items-center justify-between bg-white dark:bg-slate-800 p-2 px-3 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
        <span className="text-3xs font-bold text-slate-500 dark:text-slate-400 uppercase">
          Calendario Mensual
        </span>

        <div className="flex items-center space-x-2">
          <button
            onClick={handlePrevMonth}
            className="p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 transition"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 select-none">
            {months[month]} {year}
          </span>
          <button
            onClick={handleNextMonth}
            className="p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 transition"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Grid Sheet */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-2 border border-slate-100 dark:border-slate-700 shadow-sm overflow-x-auto">
        <div className="min-w-[600px] space-y-1">
          {/* Days of Week Headers */}
          <div className="grid grid-cols-7 gap-2 text-center border-b border-slate-100 dark:border-slate-700 pb-1">
            {daysOfWeek.map((day) => (
              <span
                key={day}
                className="text-3xs font-bold text-slate-400 dark:text-slate-550 uppercase tracking-widest"
              >
                {day}
              </span>
            ))}
          </div>

          {/* Calendar Slots */}
          <div className="grid grid-cols-7 gap-2">
            {totalSlots.map((dayNum, index) => {
              if (dayNum === null) {
                return (
                  <div
                    key={`blank-${index}`}
                    className="min-h-[60px] bg-slate-50/30 dark:bg-slate-900/10 rounded-xl border border-transparent"
                  />
                );
              }

              const stats = dayStats[dayNum];
              const hasFlow = stats && (stats.income > 0 || stats.expense > 0);

              return (
                <div
                  key={`day-${dayNum}`}
                  className={`min-h-[60px] p-1.5 rounded-xl border flex flex-col justify-between transition duration-150 ${
                    hasFlow
                      ? 'bg-indigo-50/10 dark:bg-indigo-950/5 border-indigo-100/60 dark:border-indigo-900/40'
                      : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
                >
                  {/* Day Number */}
                  <span className="text-3xs font-bold text-slate-700 dark:text-slate-300">
                    {dayNum}
                  </span>

                  {/* Flow Data */}
                  {hasFlow ? (
                    <div className="space-y-0.5 text-right">
                      {stats.income > 0 && (
                        <p className="text-5xs font-extrabold text-green-500 leading-none">
                          +{formatCurrency(stats.income, baseCurrency)}
                        </p>
                      )}
                      {stats.expense > 0 && (
                        <p className="text-5xs font-extrabold text-red-500 leading-none">
                          -{formatCurrency(stats.expense, baseCurrency)}
                        </p>
                      )}
                      <p
                        className={`text-4xs font-extrabold border-t border-slate-100 dark:border-slate-700 pt-0.5 mt-0.5 leading-none ${
                          stats.net >= 0
                            ? 'text-indigo-600 dark:text-indigo-400'
                            : 'text-red-500 dark:text-red-400'
                        }`}
                      >
                        {formatCurrency(stats.net, baseCurrency)}
                      </p>
                    </div>
                  ) : (
                    <span className="text-5xs text-slate-300 dark:text-slate-650 text-right font-semibold">
                      Sin flujo
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
