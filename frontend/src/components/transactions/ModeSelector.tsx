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
      className={`inline-flex items-center w-full sm:w-auto p-1 bg-slate-100 dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 shadow-xs backdrop-blur-xs transition-all ${className}`}
    >
      <button
        type="button"
        role="tab"
        aria-selected={isQuick}
        aria-pressed={isQuick}
        aria-label="Transacción Rápida"
        disabled={disabled}
        onClick={() => handleSelect(TransactionMode.QUICK)}
        className={`relative flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 select-none min-h-[40px] ${
          isQuick
            ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm border border-slate-200/80 dark:border-slate-600/60 ring-1 ring-indigo-500/10'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
        } ${disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : 'cursor-pointer active:scale-[0.98]'}`}
      >
        <span
          className={`flex items-center justify-center w-5 h-5 rounded-lg transition-colors ${
            isQuick
              ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
              : 'text-slate-400 dark:text-slate-500'
          }`}
        >
          <Zap
            className={`w-3.5 h-3.5 transition-transform duration-200 ${
              isQuick ? 'scale-110' : ''
            }`}
          />
        </span>
        <span className="truncate">Transacción Rápida</span>
      </button>

      <button
        type="button"
        role="tab"
        aria-selected={isFree}
        aria-pressed={isFree}
        aria-label="Asiento Libre"
        disabled={disabled}
        onClick={() => handleSelect(TransactionMode.FREE_JOURNAL)}
        className={`relative flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 select-none min-h-[40px] ${
          isFree
            ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm border border-slate-200/80 dark:border-slate-600/60 ring-1 ring-indigo-500/10'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
        } ${disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : 'cursor-pointer active:scale-[0.98]'}`}
      >
        <span
          className={`flex items-center justify-center w-5 h-5 rounded-lg transition-colors ${
            isFree
              ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
              : 'text-slate-400 dark:text-slate-500'
          }`}
        >
          <BookOpen
            className={`w-3.5 h-3.5 transition-transform duration-200 ${isFree ? 'scale-110' : ''}`}
          />
        </span>
        <span className="truncate">Asiento Libre</span>
      </button>
    </div>
  );
};
