'use client';

import React from 'react';
import { Save, RotateCcw, Loader2, Check } from 'lucide-react';

export interface BudgetStickyActionBarProps {
  isDirty: boolean;
  dirtyCount: number;
  isSaving: boolean;
  onSave: () => void | Promise<void>;
  onDiscard: () => void;
  saveSuccessMessage?: string | null;
}

export const BudgetStickyActionBar: React.FC<BudgetStickyActionBarProps> = ({
  isDirty,
  dirtyCount,
  isSaving,
  onSave,
  onDiscard,
  saveSuccessMessage,
}) => {
  // Always render in DOM for smooth slide up/down transitions
  const isVisible = isDirty || !!saveSuccessMessage || isSaving;

  return (
    <div
      className={`fixed bottom-16 lg:bottom-0 inset-x-0 z-50 px-4 py-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 shadow-2xl transition-all duration-300 ease-in-out transform ${
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'
      }`}
      style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
      role="region"
      aria-label="Barra de acciones pendientes"
    >
      <div className="max-w-xl mx-auto flex items-center justify-between gap-3">
        {/* Left Side: Discard or Pending Changes Count */}
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={onDiscard}
            disabled={isSaving}
            className="min-h-[44px] px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-colors flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span>Descartar</span>
          </button>

          {saveSuccessMessage && (
            <div className="hidden sm:flex items-center space-x-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 animate-in fade-in duration-150">
              <Check className="w-4 h-4 shrink-0" />
              <span>{saveSuccessMessage}</span>
            </div>
          )}
        </div>

        {/* Right Side: Primary Save Button with Count */}
        <button
          type="button"
          onClick={onSave}
          disabled={isSaving || (!isDirty && !isSaving)}
          className="flex-1 sm:flex-initial min-h-[44px] px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center space-x-2 cursor-pointer"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin shrink-0" />
              <span>Guardando...</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4 shrink-0" />
              <span>
                Guardar Cambios
                {dirtyCount > 0 ? ` (${dirtyCount} pendientes)` : ''}
              </span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
