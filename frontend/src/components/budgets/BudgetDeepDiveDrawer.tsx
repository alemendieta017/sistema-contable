'use client';

import React, { useState, useEffect } from 'react';
import {
  BudgetMatrixRow,
  BudgetMatrixPeriod,
  BudgetDriverType,
  CashFlowDirection,
} from '@sistema-contable/shared';
import { formatCurrency } from '../../lib/utils';
import { useIsMobile } from '../../hooks/useMediaQuery';
import {
  X,
  Calculator,
  FastForward,
  CalendarClock,
  Check,
  Lock,
  ArrowDownRight,
  ArrowUpRight,
  DollarSign,
  Percent,
} from 'lucide-react';

export interface BudgetDeepDiveDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  account: BudgetMatrixRow | null;
  periods: BudgetMatrixPeriod[];
  baseCurrency?: any;
  fiscalYearId?: string;
  onAmountChange: (
    accountId: string,
    periodId: string,
    value: number,
    subRowId?: string | null,
  ) => void;
  onApplyDriver?: (params: {
    driverType: BudgetDriverType;
    annualTotal?: number;
    growthPercentage?: number;
    sourcePeriodId?: string;
  }) => Promise<void> | void;
  onBaselineActuals?: (adjustmentPercentage: number) => Promise<void> | void;
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

export const BudgetDeepDiveDrawer: React.FC<BudgetDeepDiveDrawerProps> = ({
  isOpen,
  onClose,
  account,
  periods,
  baseCurrency,
  onAmountChange,
  onApplyDriver,
  onBaselineActuals,
}) => {
  const isMobile = useIsMobile();
  const [activeAction, setActiveAction] = useState<'FLAT' | 'COPY_FORWARD' | 'PRIOR_YEAR' | null>(
    null,
  );
  const [actionInput, setActionInput] = useState<string>('');
  const [isApplyingAction, setIsApplyingAction] = useState<boolean>(false);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !account) return null;

  const isBalanceRow =
    account.accountType === 'ASSET' ||
    account.accountType === 'LIABILITY' ||
    account.accountType === 'EQUITY';

  const isOutflow = account.cashFlowDirection === CashFlowDirection.EGRESO_EFECTIVO;

  // Calculate live row total and average
  const totalAnnual = periods.reduce((sum, p) => sum + (account.amounts[p.id] || 0), 0);
  const monthlyAverage = Math.round(totalAnnual / (periods.length || 12));

  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    if (isMobile) {
      e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleApplyFlatProrate = async () => {
    const total = parseFloat(actionInput.replace(/\./g, '').replace(/,/g, '.')) || 0;
    if (total <= 0) return;

    setIsApplyingAction(true);
    try {
      if (onApplyDriver) {
        await onApplyDriver({
          driverType: BudgetDriverType.FLAT_PRORATE,
          annualTotal: total,
        });
      } else {
        // Fallback local distribution across open periods
        const openPeriods = periods.filter((p) => p.status !== 'CLOSED');
        const perMonth = openPeriods.length > 0 ? Math.round(total / openPeriods.length) : 0;
        openPeriods.forEach((p) => {
          onAmountChange(account.accountId, p.id, perMonth, account.subRowId);
        });
      }
      setActiveAction(null);
      setActionInput('');
    } finally {
      setIsApplyingAction(false);
    }
  };

  const handleCopyForward = async () => {
    const firstOpenPeriod = periods.find((p) => p.status !== 'CLOSED') || periods[0];
    const baseValue = account.amounts[firstOpenPeriod.id] || 0;

    setIsApplyingAction(true);
    try {
      if (onApplyDriver) {
        await onApplyDriver({
          driverType: BudgetDriverType.FORWARD_FILL,
          sourcePeriodId: firstOpenPeriod.id,
        });
      } else {
        // Fallback local replication
        periods.forEach((p) => {
          if (p.status !== 'CLOSED') {
            onAmountChange(account.accountId, p.id, baseValue, account.subRowId);
          }
        });
      }
      setActiveAction(null);
    } finally {
      setIsApplyingAction(false);
    }
  };

  const handleApplyPriorYear = async () => {
    const pct = parseFloat(actionInput.replace(/,/g, '.')) || 0;
    setIsApplyingAction(true);
    try {
      if (onBaselineActuals) {
        await onBaselineActuals(pct);
      } else if (onApplyDriver) {
        await onApplyDriver({
          driverType: BudgetDriverType.PRIOR_YEAR_ACTUAL,
          growthPercentage: pct,
        });
      }
      setActiveAction(null);
      setActionInput('');
    } finally {
      setIsApplyingAction(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Backdrop tap to close */}
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

      {/* Drawer Container */}
      <div
        className="relative w-full max-w-xl max-h-[92vh] flex flex-col bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 rounded-t-3xl shadow-2xl overflow-hidden z-10 animate-in slide-in-from-bottom duration-200"
        style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
      >
        {/* Drawer Pull Handle Bar */}
        <div className="w-full flex items-center justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing">
          <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full" />
        </div>

        {/* Drawer Header */}
        <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 truncate">
                {account.accountName}
                {account.subRowLabel ? ` (${account.subRowLabel})` : ''}
              </h3>

              {isBalanceRow && account.cashFlowDirection && (
                <span
                  className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                    isOutflow
                      ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                      : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                  }`}
                >
                  {isOutflow ? (
                    <ArrowDownRight className="w-3 h-3" />
                  ) : (
                    <ArrowUpRight className="w-3 h-3" />
                  )}
                  <span>{isOutflow ? 'Salida de efectivo' : 'Entrada de efectivo'}</span>
                </span>
              )}
            </div>

            {/* Annual and Average Metrics Summary */}
            <div className="flex items-center space-x-4 text-xs text-slate-500 dark:text-slate-400 mt-1">
              <div>
                Total Anual:{' '}
                <strong className="text-slate-900 dark:text-slate-100 tabular-nums font-bold">
                  {formatCurrency(totalAnnual, baseCurrency)}
                </strong>
              </div>
              <span>•</span>
              <div>
                Promedio:{' '}
                <strong className="text-slate-900 dark:text-slate-100 tabular-nums font-bold">
                  {formatCurrency(monthlyAverage, baseCurrency)}
                </strong>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar desglose"
            className="w-11 h-11 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top Mass-Distribution Actions Bar */}
        <div className="px-5 py-3 bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800">
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-2">
            Herramientas de Distribución Masiva:
          </div>

          <div className="grid grid-cols-3 gap-2">
            {/* Action 1: Distribuir Parejo */}
            <button
              type="button"
              onClick={() => {
                setActiveAction((prev) => (prev === 'FLAT' ? null : 'FLAT'));
                setActionInput(totalAnnual > 0 ? String(totalAnnual) : '1200000');
              }}
              className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all cursor-pointer min-h-[48px] ${
                activeAction === 'FLAT'
                  ? 'bg-emerald-500/10 border-emerald-500 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500/40'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Calculator className="w-4 h-4 mb-0.5 text-emerald-500" />
              <span className="text-[10px] font-bold leading-tight">Distribuir parejo</span>
            </button>

            {/* Action 2: Copiar de Ene a Dic */}
            <button
              type="button"
              onClick={handleCopyForward}
              disabled={isApplyingAction}
              className="flex flex-col items-center justify-center p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-center transition-all cursor-pointer min-h-[48px] disabled:opacity-50"
            >
              <FastForward className="w-4 h-4 mb-0.5 text-cyan-500" />
              <span className="text-[10px] font-bold leading-tight">Copiar Ene a Dic</span>
            </button>

            {/* Action 3: Traer Real del Año Anterior + % */}
            <button
              type="button"
              onClick={() => {
                setActiveAction((prev) => (prev === 'PRIOR_YEAR' ? null : 'PRIOR_YEAR'));
                setActionInput('0');
              }}
              className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all cursor-pointer min-h-[48px] ${
                activeAction === 'PRIOR_YEAR'
                  ? 'bg-purple-500/10 border-purple-500 text-purple-700 dark:text-purple-300 ring-1 ring-purple-500/40'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <CalendarClock className="w-4 h-4 mb-0.5 text-purple-500" />
              <span className="text-[10px] font-bold leading-tight">Traer Real + %</span>
            </button>
          </div>

          {/* Expanded Inline Action Parameter Configurator */}
          {activeAction === 'FLAT' && (
            <div className="mt-3 p-3 bg-white dark:bg-slate-900 rounded-xl border border-emerald-500/40 animate-in fade-in duration-150">
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                <span>Monto Total Anual a repartir:</span>
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={actionInput}
                  onChange={(e) => setActionInput(e.target.value.replace(/[^0-9]/g, ''))}
                  onFocus={handleInputFocus}
                  placeholder="Ej: 1200000"
                  className="flex-1 bg-slate-50 dark:bg-slate-950 tabular-nums text-xs font-bold px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 outline-none focus:border-emerald-500 min-h-[44px]"
                />
                <button
                  type="button"
                  onClick={handleApplyFlatProrate}
                  disabled={isApplyingAction}
                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-sm cursor-pointer disabled:opacity-50 flex items-center space-x-1 min-h-[44px]"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Aplicar</span>
                </button>
              </div>
            </div>
          )}

          {activeAction === 'PRIOR_YEAR' && (
            <div className="mt-3 p-3 bg-white dark:bg-slate-900 rounded-xl border border-purple-500/40 animate-in fade-in duration-150">
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <Percent className="w-3.5 h-3.5 text-purple-500" />
                <span>Porcentaje de Ajuste / Inflación (%):</span>
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  step="any"
                  value={actionInput}
                  onChange={(e) => setActionInput(e.target.value)}
                  onFocus={handleInputFocus}
                  placeholder="0 para mantener real"
                  className="flex-1 bg-slate-50 dark:bg-slate-950 tabular-nums text-xs font-bold px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 outline-none focus:border-purple-500 min-h-[44px]"
                />
                <button
                  type="button"
                  onClick={handleApplyPriorYear}
                  disabled={isApplyingAction}
                  className="px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-lg shadow-sm cursor-pointer disabled:opacity-50 flex items-center space-x-1 min-h-[44px]"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Cargar</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 12-Month Vertical Inputs List */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2.5">
          {periods.map((period, index) => {
            const isClosed = period.status === 'CLOSED';
            const monthInfo = MONTH_NAMES[index % 12] || {
              abbr: `M${index + 1}`,
              full: period.name,
            };
            const val = account.amounts[period.id] ?? 0;

            return (
              <div
                key={period.id}
                className={`flex items-center justify-between p-2.5 rounded-xl border transition-colors ${
                  isClosed
                    ? 'bg-slate-50/50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800/60'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                }`}
              >
                {/* Month Name and Status */}
                <div className="flex items-center space-x-2.5 min-w-[100px]">
                  <span className="w-10 text-center text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-1.5 py-1 rounded">
                    {monthInfo.abbr}
                  </span>
                  <div>
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                      {monthInfo.full}
                    </span>
                    {isClosed && (
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Lock className="w-2.5 h-2.5" />
                        <span>Cerrado</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Numeric Input */}
                <div className="flex-1 max-w-[180px]">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    disabled={isClosed}
                    value={val === 0 ? '' : val}
                    placeholder="0"
                    onFocus={handleInputFocus}
                    onChange={(e) => {
                      const num = parseFloat(e.target.value.replace(/[^0-9]/g, '')) || 0;
                      onAmountChange(account.accountId, period.id, num, account.subRowId);
                    }}
                    className={`w-full min-h-[44px] text-right tabular-nums text-sm font-bold px-3 py-2 rounded-xl border outline-none transition-all ${
                      isClosed
                        ? 'bg-slate-100 dark:bg-slate-800/40 text-slate-400 border-transparent cursor-not-allowed'
                        : 'bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 border-slate-200 dark:border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                    }`}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer with Done button */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition-all cursor-pointer min-h-[44px] flex items-center justify-center space-x-1.5"
          >
            <Check className="w-4 h-4" />
            <span>Listo</span>
          </button>
        </div>
      </div>
    </div>
  );
};
