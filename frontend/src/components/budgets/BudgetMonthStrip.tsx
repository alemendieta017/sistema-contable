'use client';

import React, { useRef, useEffect } from 'react';
import { BudgetMatrixPeriod } from '@sistema-contable/shared';
import { Lock, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';

export interface BudgetMonthStripProps {
  periods: BudgetMatrixPeriod[];
  activePeriodId: string;
  onSelectPeriod: (periodId: string) => void;
  dirtyPeriodIds?: Set<string>;
  monthlyTotals?: Record<string, number>;
  baseCurrency?: any;
}

const MONTH_NAMES: Record<number, { abbr: string; full: string }> = {
  0: { abbr: 'Ene', full: 'Enero' },
  1: { abbr: 'Feb', full: 'Febrero' },
  2: { abbr: 'Mar', full: 'Marzo' },
  3: { abbr: 'Abr', full: 'Abril' },
  4: { abbr: 'May', full: 'Mayo' },
  5: { abbr: 'Jun', full: 'Junio' },
  6: { abbr: 'Jul', full: 'Julio' },
  7: { abbr: 'Ago', full: 'Agosto' },
  8: { abbr: 'Set', full: 'Setiembre' },
  9: { abbr: 'Oct', full: 'Octubre' },
  10: { abbr: 'Nov', full: 'Noviembre' },
  11: { abbr: 'Dic', full: 'Diciembre' },
};

export const BudgetMonthStrip: React.FC<BudgetMonthStripProps> = ({
  periods,
  activePeriodId,
  onSelectPeriod,
  dirtyPeriodIds,
  monthlyTotals,
  baseCurrency,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const activePillRef = useRef<HTMLButtonElement>(null);

  // Auto-scroll active month pill into view smoothly
  useEffect(() => {
    if (activePillRef.current) {
      activePillRef.current.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest',
      });
    }
  }, [activePeriodId]);

  const handleScroll = (direction: 'left' | 'right') => {
    if (containerRef.current) {
      const scrollAmount = direction === 'left' ? -200 : 200;
      containerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const getMonthLabel = (period: BudgetMatrixPeriod, index: number) => {
    const fallback = MONTH_NAMES[index % 12] || { abbr: `M${index + 1}`, full: `Mes ${index + 1}` };
    const name = period.name || period.friendlyName || '';

    // Check if period.name matches Month or has a known string
    for (let i = 0; i < 12; i++) {
      const mn = MONTH_NAMES[i];
      if (
        name.toLowerCase().includes(mn.full.toLowerCase()) ||
        name.toLowerCase().includes(mn.abbr.toLowerCase())
      ) {
        return mn;
      }
    }
    return fallback;
  };

  return (
    <div className="relative w-full bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 select-none py-2 px-1">
      {/* Scroll Left Button */}
      <button
        type="button"
        onClick={() => handleScroll('left')}
        aria-label="Meses anteriores"
        className="hidden sm:flex absolute left-1 top-1/2 -translate-y-1/2 z-10 w-8 h-8 items-center justify-center rounded-full bg-white/90 dark:bg-slate-800/90 text-slate-600 dark:text-slate-300 shadow-md border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      {/* Swipeable Month Strip Container */}
      <div
        ref={containerRef}
        className="flex items-center space-x-2 overflow-x-auto scrollbar-none snap-x snap-mandatory px-2 sm:px-8 py-1 scroll-smooth"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {periods.map((period, index) => {
          const isActive = period.id === activePeriodId;
          const isClosed = period.status === 'CLOSED';
          const isDirty = dirtyPeriodIds ? dirtyPeriodIds.has(period.id) : false;
          const monthInfo = getMonthLabel(period, index);
          const totalAmount = monthlyTotals ? monthlyTotals[period.id] : undefined;

          return (
            <button
              key={period.id}
              ref={isActive ? activePillRef : null}
              type="button"
              onClick={() => onSelectPeriod(period.id)}
              className={`snap-center shrink-0 min-w-[76px] sm:min-w-[88px] min-h-[48px] px-3 py-2 rounded-xl flex flex-col items-center justify-center relative transition-all duration-150 cursor-pointer border ${
                isActive
                  ? 'bg-indigo-600 dark:bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-600/30 scale-[1.02] ring-2 ring-indigo-500/50'
                  : 'bg-slate-50 dark:bg-slate-950/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              {/* Header: Month Abbreviation & Lock Icon */}
              <div className="flex items-center space-x-1.5">
                <span
                  className={`text-xs font-bold tracking-tight ${isActive ? 'text-white' : 'text-slate-900 dark:text-slate-100'}`}
                >
                  {monthInfo.abbr}
                </span>

                {isClosed && (
                  <span title="Período Cerrado" className="flex items-center">
                    <Lock
                      className={`w-3 h-3 ${
                        isActive ? 'text-indigo-200' : 'text-slate-400 dark:text-slate-500'
                      }`}
                    />
                  </span>
                )}
              </div>

              {/* Sub-label: Full name or Status or Monthly Total */}
              <span
                className={`text-[10px] truncate max-w-[70px] mt-0.5 ${
                  isActive
                    ? 'text-indigo-100 font-medium'
                    : isClosed
                      ? 'text-slate-400 dark:text-slate-500'
                      : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {totalAmount !== undefined && totalAmount !== 0
                  ? formatCurrency(totalAmount, baseCurrency)
                  : monthInfo.full}
              </span>

              {/* Dirty State Indicator Dot */}
              {isDirty && (
                <span
                  className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-white dark:ring-slate-900 animate-pulse"
                  title="Cambios sin guardar en este mes"
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Scroll Right Button */}
      <button
        type="button"
        onClick={() => handleScroll('right')}
        aria-label="Meses siguientes"
        className="hidden sm:flex absolute right-1 top-1/2 -translate-y-1/2 z-10 w-8 h-8 items-center justify-center rounded-full bg-white/90 dark:bg-slate-800/90 text-slate-600 dark:text-slate-300 shadow-md border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
};
