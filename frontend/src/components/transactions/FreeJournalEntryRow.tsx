'use client';

import React from 'react';
import { Trash2 } from 'lucide-react';
import { cn, type CurrencyInfo } from '../../lib/utils';
import type { AccountOption } from '../../types/account';
import AccountPickerSheet from './AccountPickerSheet';
import type { FreeJournalLineState } from './index';

export interface FreeJournalEntryRowProps {
  line: FreeJournalLineState;
  index: number;
  accounts: AccountOption[];
  baseCurrency?: CurrencyInfo;
  onChange: (updatedLine: FreeJournalLineState) => void;
  onRemove: () => void;
  canRemove: boolean;
  onEnter?: () => void;
  onQuickCreateAccount?: (initialName: string) => void;
  disabled?: boolean;
  isMobile?: boolean;
  error?: {
    account?: string;
    amount?: string;
  };
  className?: string;
}

export function FreeJournalEntryRow({
  line,
  index,
  accounts,
  baseCurrency,
  onChange,
  onRemove,
  canRemove,
  onEnter,
  onQuickCreateAccount,
  disabled = false,
  isMobile = false,
  error,
  className,
}: FreeJournalEntryRowProps) {
  // Currency symbol resolution
  const currencySymbol =
    baseCurrency?.symbol ||
    (baseCurrency?.code === 'PYG' ? '₲' : baseCurrency?.code === 'USD' ? 'u$s' : '$');

  const handleDebitChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange({
      ...line,
      debitAmount: val === '' ? '' : Number(val),
      creditAmount: '',
    });
  };

  const handleCreditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange({
      ...line,
      creditAmount: val === '' ? '' : Number(val),
      debitAmount: '',
    });
  };

  const handleAmountKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
      e.preventDefault();
      onEnter?.();
    }
  };

  return (
    <div
      data-testid={`free-journal-row-${index}`}
      className={cn(
        'group relative bg-white dark:bg-slate-900 border rounded-xl p-3 transition-all duration-150',
        'flex flex-col sm:flex-row sm:items-start gap-3',
        error?.account || error?.amount
          ? 'border-rose-300 dark:border-rose-800/60 bg-rose-50/20 dark:bg-rose-950/10'
          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700',
        className,
      )}
    >
      {/* Mobile Card Header */}
      <div className="flex sm:hidden items-center justify-between gap-2 pb-1 border-b border-slate-100 dark:border-slate-800/80">
        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          Línea #{index + 1}
        </span>
      </div>

      {/* Desktop Line Number Indicator */}
      <div className={cn('hidden sm:block pt-2 text-center shrink-0 w-6', isMobile && '!hidden')}>
        <span className="text-xs font-bold text-slate-400 dark:text-slate-500 tabular-nums">
          {index + 1}
        </span>
      </div>

      {/* Account Selector */}
      <div className="flex-1 w-full min-w-0">
        <AccountPickerSheet
          accounts={accounts}
          selectedAccountId={line.accountId}
          onSelect={(account) => onChange({ ...line, accountId: account.id })}
          baseCurrency={baseCurrency}
          onQuickCreateAccount={onQuickCreateAccount}
          disabled={disabled}
          error={error?.account}
          placeholder="Seleccionar cuenta contable..."
        />
      </div>

      {/* Amount Inputs Container */}
      <div className="grid grid-cols-2 sm:flex items-start gap-2 sm:gap-3 w-full sm:w-auto">
        {/* Debe (Debit) Input */}
        <div className="flex flex-col sm:w-32 md:sm:w-36 shrink-0 gap-1">
          <label
            htmlFor={`debit-${line.id}`}
            className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 sm:hidden"
          >
            Debe ({currencySymbol})
          </label>
          <div className="relative flex items-center">
            <span className="absolute left-2.5 text-xs font-semibold text-slate-400 select-none pointer-events-none">
              {currencySymbol}
            </span>
            <input
              id={`debit-${line.id}`}
              type="number"
              inputMode="decimal"
              step="any"
              min="0"
              placeholder="0.00"
              value={line.debitAmount}
              disabled={disabled}
              onChange={handleDebitChange}
              onKeyDown={handleAmountKeyDown}
              aria-label="Debe"
              className={cn(
                'w-full bg-white dark:bg-slate-800 border rounded-lg pl-7 pr-3 py-2 text-xs font-semibold text-right tabular-nums text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition',
                error?.amount
                  ? 'border-rose-400 dark:border-rose-600'
                  : 'border-slate-200 dark:border-slate-700/80',
                line.debitAmount !== '' &&
                  Number(line.debitAmount) > 0 &&
                  'bg-indigo-50/30 dark:bg-indigo-950/20 border-indigo-300 dark:border-indigo-800 font-bold',
              )}
            />
          </div>
        </div>

        {/* Haber (Credit) Input */}
        <div className="flex flex-col sm:w-32 md:sm:w-36 shrink-0 gap-1">
          <label
            htmlFor={`credit-${line.id}`}
            className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 sm:hidden"
          >
            Haber ({currencySymbol})
          </label>
          <div className="relative flex items-center">
            <span className="absolute left-2.5 text-xs font-semibold text-slate-400 select-none pointer-events-none">
              {currencySymbol}
            </span>
            <input
              id={`credit-${line.id}`}
              type="number"
              inputMode="decimal"
              step="any"
              min="0"
              placeholder="0.00"
              value={line.creditAmount}
              disabled={disabled}
              onChange={handleCreditChange}
              onKeyDown={handleAmountKeyDown}
              aria-label="Haber"
              className={cn(
                'w-full bg-white dark:bg-slate-800 border rounded-lg pl-7 pr-3 py-2 text-xs font-semibold text-right tabular-nums text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition',
                error?.amount
                  ? 'border-rose-400 dark:border-rose-600'
                  : 'border-slate-200 dark:border-slate-700/80',
                line.creditAmount !== '' &&
                  Number(line.creditAmount) > 0 &&
                  'bg-indigo-50/30 dark:bg-indigo-950/20 border-indigo-300 dark:border-indigo-800 font-bold',
              )}
            />
          </div>
        </div>
      </div>

      {/* Delete Action Button */}
      <div className="flex justify-end sm:pt-0.5 shrink-0">
        <button
          type="button"
          aria-label="Eliminar fila"
          title="Eliminar fila"
          disabled={!canRemove || disabled}
          onClick={onRemove}
          className={cn(
            'min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition',
            (!canRemove || disabled) &&
              'opacity-30 cursor-not-allowed hover:bg-transparent hover:text-slate-400',
          )}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default FreeJournalEntryRow;
