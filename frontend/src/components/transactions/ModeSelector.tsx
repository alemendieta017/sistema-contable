'use client';

import React from 'react';
import { Zap, BookOpen } from 'lucide-react';
import { TransactionMode } from '@sistema-contable/shared';

export interface ModeSelectorProps {
  value?: TransactionMode;
  onChange?: (mode: TransactionMode) => void;
  currentMode?: TransactionMode;
  onModeChange?: (mode: TransactionMode) => void;
  disabled?: boolean;
  className?: string;
}

export const ModeSelector: React.FC<ModeSelectorProps> = ({
  value,
  onChange,
  currentMode,
  onModeChange,
  disabled = false,
  className = '',
}) => {
  const activeMode = value ?? currentMode ?? TransactionMode.QUICK;

  const handleSelect = (mode: TransactionMode) => {
    if (disabled || mode === activeMode) return;
    onChange?.(mode);
    onModeChange?.(mode);
  };

  const isQuick = activeMode === TransactionMode.QUICK;
  const isFree = activeMode === TransactionMode.FREE_JOURNAL;

  return (
    <div
      role="tablist"
      aria-label="Modo de transacción"
      className={`inline-flex items-center p-1 bg-slate-100 dark:bg-slate-800/90 rounded-xl border border-slate-200/80 dark:border-slate-700/60 shadow-inner ${className}`}
    >
      <button
        type="button"
        role="tab"
        aria-selected={isQuick}
        aria-pressed={isQuick}
        aria-label="Transacción Rápida"
        disabled={disabled}
        onClick={() => handleSelect(TransactionMode.QUICK)}
        className={`flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-200 select-none ${
          isQuick
            ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm border border-slate-200/60 dark:border-slate-600/60'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
        } ${disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : 'cursor-pointer'}`}
      >
        <Zap
          className={`w-4 h-4 transition-transform duration-200 ${
            isQuick
              ? 'scale-110 text-amber-500 fill-amber-500/20'
              : 'text-slate-400 dark:text-slate-500'
          }`}
        />
        <span>Transacción Rápida</span>
      </button>

      <button
        type="button"
        role="tab"
        aria-selected={isFree}
        aria-pressed={isFree}
        aria-label="Asiento Libre"
        disabled={disabled}
        onClick={() => handleSelect(TransactionMode.FREE_JOURNAL)}
        className={`flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-200 select-none ${
          isFree
            ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm border border-slate-200/60 dark:border-slate-600/60'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
        } ${disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : 'cursor-pointer'}`}
      >
        <BookOpen
          className={`w-4 h-4 transition-transform duration-200 ${
            isFree ? 'scale-110 text-indigo-500' : 'text-slate-400 dark:text-slate-500'
          }`}
        />
        <span>Asiento Libre</span>
      </button>
    </div>
  );
};
