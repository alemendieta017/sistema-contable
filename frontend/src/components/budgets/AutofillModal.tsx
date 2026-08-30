'use client';

import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { formatCurrency } from '../../lib/utils';
import { BudgetDriverType, BudgetMatrixPeriod, BudgetMatrixRow } from '@sistema-contable/shared';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { X, AlertCircle, FastForward, History, Trash2, Check, Calendar } from 'lucide-react';

export interface AutofillModalProps {
  fiscalYearId?: string;
  account: BudgetMatrixRow;
  periods: BudgetMatrixPeriod[];
  baseCurrency?: any;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AutofillModal: React.FC<AutofillModalProps> = ({
  account,
  periods,
  baseCurrency,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const isMobile = useIsMobile();
  const [actionType, setActionType] = useState<'REPLICATE' | 'PRIOR_YEAR' | 'CLEAR'>('REPLICATE');
  const [sourcePeriodId, setSourcePeriodId] = useState<string>(periods[0]?.id || '');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (periods.length > 0 && !sourcePeriodId) {
      setSourcePeriodId(periods[0].id);
    }
  }, [periods, sourcePeriodId]);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);

    try {
      if (actionType === 'PRIOR_YEAR') {
        await api.budgets.baselineActuals({
          adjustmentPercentage: 0,
          accountIds: [account.accountId],
        });
      } else if (actionType === 'CLEAR') {
        const updates = periods.map((p) => ({
          periodId: p.id,
          accountId: account.accountId,
          subRowId: account.subRowId || null,
          amount: 0,
        }));
        await api.budgets.updateBudgetMatrix({ updates });
      } else {
        // REPLICATE
        await api.budgets.applyDriver({
          accountId: account.accountId,
          subRowId: account.subRowId || undefined,
          driverType: BudgetDriverType.FORWARD_FILL,
          sourcePeriodId: sourcePeriodId || undefined,
        });
      }
      onSuccess();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al aplicar cambios.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

      <div
        className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom sm:zoom-in-95 duration-200 flex flex-col max-h-[90vh] z-10"
        style={{
          paddingBottom: isMobile ? 'max(1.25rem, env(safe-area-inset-bottom))' : undefined,
        }}
      >
        {isMobile && (
          <div className="w-full flex items-center justify-center pt-3 pb-1">
            <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full" />
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              <FastForward className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Rellenar Partida
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-xs">
                {account.subRowLabel || account.accountName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
          {errorMsg && (
            <div className="flex items-center space-x-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Action Options */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Seleccioná una acción
            </label>
            <div className="grid grid-cols-1 gap-2">
              {/* Option 1: Replicate */}
              <label
                className={`flex items-start p-3 rounded-xl border cursor-pointer transition-all ${
                  actionType === 'REPLICATE'
                    ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                <input
                  type="radio"
                  name="actionType"
                  value="REPLICATE"
                  checked={actionType === 'REPLICATE'}
                  onChange={() => setActionType('REPLICATE')}
                  className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                />
                <div className="ml-3 flex-1">
                  <div className="flex items-center space-x-1.5">
                    <FastForward className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      Replicar monto hacia adelante
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Copia el monto del mes base a todos los meses siguientes.
                  </p>
                </div>
              </label>

              {/* Option 2: Prior Year Actual */}
              <label
                className={`flex items-start p-3 rounded-xl border cursor-pointer transition-all ${
                  actionType === 'PRIOR_YEAR'
                    ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                <input
                  type="radio"
                  name="actionType"
                  value="PRIOR_YEAR"
                  checked={actionType === 'PRIOR_YEAR'}
                  onChange={() => setActionType('PRIOR_YEAR')}
                  className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                />
                <div className="ml-3 flex-1">
                  <div className="flex items-center space-x-1.5">
                    <History className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      Traer real del año anterior
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Copia los gastos reales ejecutados en el libro diario el año pasado.
                  </p>
                </div>
              </label>

              {/* Option 3: Clear */}
              <label
                className={`flex items-start p-3 rounded-xl border cursor-pointer transition-all ${
                  actionType === 'CLEAR'
                    ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                <input
                  type="radio"
                  name="actionType"
                  value="CLEAR"
                  checked={actionType === 'CLEAR'}
                  onChange={() => setActionType('CLEAR')}
                  className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                />
                <div className="ml-3 flex-1">
                  <div className="flex items-center space-x-1.5">
                    <Trash2 className="w-4 h-4 text-slate-400" />
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      Limpiar montos
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Pone en cero los valores de este rubro.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Conditional Month Selector for REPLICATE */}
          {actionType === 'REPLICATE' && (
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl space-y-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center space-x-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                <span>Mes base para copiar:</span>
              </label>
              <select
                value={sourcePeriodId}
                onChange={(e) => setSourcePeriodId(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-200 font-semibold focus:border-indigo-500 outline-none"
              >
                {periods.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.friendlyName || p.name} — (
                    {formatCurrency(account.amounts[p.id] ?? 0, baseCurrency)})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Buttons */}
          <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center space-x-1.5 px-5 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{isLoading ? 'Aplicando...' : 'Aplicar'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
