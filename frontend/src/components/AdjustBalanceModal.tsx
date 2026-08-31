'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  AlertCircle,
  Landmark,
  ReceiptText,
  ArrowUpRight,
  ArrowDownRight,
  SlidersHorizontal,
} from 'lucide-react';
import { api } from '../services/api';
import { formatCurrency, formatInputDisplay, parseInputRaw, type CurrencyInfo } from '../lib/utils';
import type { AccountOption } from '../types/account';
import AccountPickerSheet from './transactions/AccountPickerSheet';

interface AdjustBalanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  account: {
    id: string;
    name: string;
    type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE';
    balance: number;
    currencyCode?: string;
    currencySymbol?: string;
    decimalPlaces?: number;
  };
  allAccounts: AccountOption[];
}

export default function AdjustBalanceModal({
  isOpen,
  onClose,
  onSuccess,
  account,
  allAccounts,
}: AdjustBalanceModalProps) {
  const [rawTargetBalance, setRawTargetBalance] = useState<string>(
    account ? String(account.balance) : '0',
  );
  const [displayValue, setDisplayValue] = useState<string>(
    account ? formatInputDisplay(String(account.balance)) : '0',
  );
  const [adjustmentType, setAdjustmentType] = useState<'CAPITAL' | 'CATEGORY'>('CAPITAL');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (account) {
      const initialStr = String(account.balance);
      setRawTargetBalance(initialStr);
      setDisplayValue(formatInputDisplay(initialStr));
      setAdjustmentType('CAPITAL');
      setSelectedCategoryId('');
      setError('');
    }
  }, [account, isOpen]);

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

  const currentBalance = account.balance || 0;
  const numTargetBalance =
    rawTargetBalance === '' || rawTargetBalance === '-' ? 0 : Number(rawTargetBalance);
  const delta = Number((numTargetBalance - currentBalance).toFixed(4));
  const hasDelta = Math.abs(delta) >= 0.0001;

  const currencyInfo: CurrencyInfo = {
    code: account.currencyCode || 'PYG',
    symbol: account.currencySymbol || '₲',
    decimalPlaces: account.decimalPlaces ?? 0,
  };

  const isAsset = account.type === 'ASSET';
  const requiredCategoryType: 'INCOME' | 'EXPENSE' = isAsset
    ? delta > 0
      ? 'INCOME'
      : 'EXPENSE'
    : delta > 0
      ? 'EXPENSE'
      : 'INCOME';

  const categoryCardTitle =
    requiredCategoryType === 'INCOME' ? 'Contabilizar como Ingreso' : 'Contabilizar como Egreso';

  const categoryCardDescription =
    requiredCategoryType === 'INCOME'
      ? 'Imputa la diferencia a una categoría de ingreso en el estado de resultados.'
      : 'Imputa la diferencia a una categoría de egreso en el estado de resultados.';

  const categoryPickerLabel =
    requiredCategoryType === 'INCOME' ? 'Categoría de Ingreso' : 'Categoría de Egreso';

  const categoryPickerPlaceholder =
    requiredCategoryType === 'INCOME'
      ? 'Seleccionar categoría de ingreso...'
      : 'Seleccionar categoría de egreso o gasto...';

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    const parsed = parseInputRaw(text);
    setRawTargetBalance(parsed);
    setDisplayValue(formatInputDisplay(parsed));

    // Reset selected category if it no longer matches the new delta direction
    const newTarget = parsed === '' || parsed === '-' ? 0 : Number(parsed);
    const newDelta = Number((newTarget - currentBalance).toFixed(4));
    const newRequiredType: 'INCOME' | 'EXPENSE' = isAsset
      ? newDelta > 0
        ? 'INCOME'
        : 'EXPENSE'
      : newDelta > 0
        ? 'EXPENSE'
        : 'INCOME';

    if (selectedCategoryId) {
      const selectedAcc = allAccounts.find((a) => a.id === selectedCategoryId);
      if (selectedAcc && selectedAcc.type !== newRequiredType) {
        setSelectedCategoryId('');
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasDelta) {
      onClose();
      return;
    }

    if (adjustmentType === 'CATEGORY' && !selectedCategoryId) {
      setError(
        `Por favor selecciona una ${categoryPickerLabel.toLowerCase()} para imputar la modificación.`,
      );
      return;
    }

    setLoading(true);
    setError('');

    try {
      await api.accounts.adjustBalance(account.id, {
        targetBalance: numTargetBalance,
        adjustmentType,
        categoryId: adjustmentType === 'CATEGORY' ? selectedCategoryId : null,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al procesar la modificación de saldo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-lg shadow-2xl border border-slate-100 dark:border-slate-700 animate-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200 dark:border-slate-700 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
                Modificar Saldo
              </h2>
              <p className="text-4xs text-slate-400 uppercase font-bold tracking-wider mt-0.5">
                {account.name} • {account.type === 'ASSET' ? 'Activo' : 'Pasivo'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition"
          >
            <X className="w-4.5 h-4.5 text-slate-500" />
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSave} className="p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 text-xs text-red-700 bg-red-50 dark:bg-red-950/30 dark:text-red-400 rounded-xl flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Current vs Difference Info */}
          <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl">
            <div>
              <span className="block text-4xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Saldo Actual
              </span>
              <span className="text-sm font-semibold tabular-nums text-slate-700 dark:text-slate-200">
                {formatCurrency(currentBalance, currencyInfo)}
              </span>
            </div>
            <div>
              <span className="block text-4xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Diferencia
              </span>
              <span
                className={`text-sm font-semibold tabular-nums flex items-center gap-0.5 ${
                  delta > 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : delta < 0
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-slate-400'
                }`}
              >
                {delta > 0 ? (
                  <ArrowUpRight className="w-4 h-4 shrink-0" />
                ) : delta < 0 ? (
                  <ArrowDownRight className="w-4 h-4 shrink-0" />
                ) : null}
                {delta > 0 ? '+' : ''}
                {formatCurrency(delta, currencyInfo)}
              </span>
            </div>
          </div>

          {/* Editable Target Balance Input with thousand separators */}
          <div>
            <label
              htmlFor="targetBalanceInput"
              className="block text-3xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-1"
            >
              Nuevo Saldo de la Cuenta
            </label>
            <input
              id="targetBalanceInput"
              type="text"
              inputMode="numeric"
              value={displayValue}
              placeholder="0"
              required
              onFocus={(e) => e.target.select()}
              onChange={handleInputChange}
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-base outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-100 font-semibold tabular-nums shadow-sm transition"
            />
          </div>

          {/* 2 Choice Cards when balance changed */}
          {hasDelta && (
            <div className="space-y-2.5 pt-1 animate-in fade-in duration-200">
              <label className="block text-3xs font-bold uppercase text-slate-500 dark:text-slate-400">
                ¿Cómo deseas contabilizar la diferencia?
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Option 1: Contabilizar contra capital */}
                <button
                  type="button"
                  onClick={() => setAdjustmentType('CAPITAL')}
                  className={`flex flex-col p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                    adjustmentType === 'CAPITAL'
                      ? 'bg-indigo-50/80 dark:bg-indigo-950/50 border-indigo-500 ring-2 ring-indigo-500/20 text-indigo-950 dark:text-indigo-100 shadow-sm'
                      : 'bg-slate-50/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs mb-1">
                    <Landmark className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <span>Contabilizar contra capital</span>
                  </div>
                  <span className="text-4xs text-slate-500 dark:text-slate-400 leading-tight">
                    No afecta los ingresos ni gastos del período.
                  </span>
                </button>

                {/* Option 2: Contabilizar como Ingreso / Egreso */}
                <button
                  type="button"
                  onClick={() => setAdjustmentType('CATEGORY')}
                  className={`flex flex-col p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                    adjustmentType === 'CATEGORY'
                      ? 'bg-indigo-50/80 dark:bg-indigo-950/50 border-indigo-500 ring-2 ring-indigo-500/20 text-indigo-950 dark:text-indigo-100 shadow-sm'
                      : 'bg-slate-50/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs mb-1">
                    <ReceiptText className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <span>{categoryCardTitle}</span>
                  </div>
                  <span className="text-4xs text-slate-500 dark:text-slate-400 leading-tight">
                    {categoryCardDescription}
                  </span>
                </button>
              </div>

              {/* Reusable AccountPickerSheet when CATEGORY is selected */}
              {adjustmentType === 'CATEGORY' && (
                <div className="pt-2 animate-in fade-in duration-200">
                  <AccountPickerSheet
                    accounts={allAccounts}
                    allowedTypes={[requiredCategoryType]}
                    selectedAccountId={selectedCategoryId}
                    onSelect={(acc) => setSelectedCategoryId(acc.id)}
                    label={categoryPickerLabel}
                    placeholder={categoryPickerPlaceholder}
                    baseCurrency={currencyInfo}
                  />
                </div>
              )}
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex space-x-2 pt-4 border-t border-slate-100 dark:border-slate-700">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs hover:bg-slate-300 dark:hover:bg-slate-600 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={
                loading || !hasDelta || (adjustmentType === 'CATEGORY' && !selectedCategoryId)
              }
              className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-md transition disabled:opacity-50"
            >
              {loading ? 'Guardando...' : 'Modificar Saldo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
