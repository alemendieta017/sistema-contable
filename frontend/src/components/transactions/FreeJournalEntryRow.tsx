'use client';

import React from 'react';
import { Trash2 } from 'lucide-react';
import { cn, formatInputDisplay, parseInputRaw, type CurrencyInfo } from '../../lib/utils';
import type { AccountOption } from '../../types/account';
import { AccountType } from '@sistema-contable/shared';
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
  onQuickCreateAccount?: (initialName: string, suggestedType?: AccountType) => void;
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
    const raw = e.target.value;
    const parsed = parseInputRaw(raw);
    const num = parsed === '' ? '' : Number(parsed);
    onChange({
      ...line,
      debitAmount: num,
      creditAmount: '',
    });
  };

  const handleCreditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const parsed = parseInputRaw(raw);
    const num = parsed === '' ? '' : Number(parsed);
    onChange({
      ...line,
      creditAmount: num,
      debitAmount: '',
    });
  };

  const handleAmountKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
      e.preventDefault();
      onEnter?.();
    }
  };

  const isZeroDecimal = baseCurrency?.decimalPlaces === 0 || baseCurrency?.code === 'PYG';

  return (
    <div
      data-testid={`free-journal-row-${index}`}
      className={cn(
        'group relative bg-white dark:bg-slate-900 border rounded-2xl p-3 sm:p-3.5 transition-all duration-200 shadow-2xs',
        'flex flex-col sm:flex-row sm:items-center gap-3',
        error?.account || error?.amount
          ? 'border-rose-300 dark:border-rose-800/80 bg-rose-50/25 dark:bg-rose-950/15'
          : 'border-slate-200/90 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-slate-700 hover:shadow-xs',
        className,
      )}
    >
      {/* Mobile Row Header Bar */}
      <div className="flex sm:hidden items-center justify-between gap-2 pb-1.5 border-b border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center gap-2">
          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-400">
            {index + 1}
          </span>
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Línea #{index + 1}
          </span>
        </div>
      </div>

      {/* Desktop Line Number Badge */}
      <div
        className={cn(
          'hidden sm:flex items-center justify-center shrink-0 w-7',
          isMobile && '!hidden',
        )}
      >
        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-500 dark:text-slate-400 tabular-nums">
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

      {/* Amount Inputs Container (Responsive Grid on Mobile / Flex on Desktop) */}
      <div className="grid grid-cols-2 sm:flex items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
        {/* Debe (Debit) Input */}
        <div className="flex flex-col sm:w-32 md:w-36 shrink-0 gap-1">
          <label
            htmlFor={`debit-${line.id}`}
            className="text-[11px] font-bold text-slate-600 dark:text-slate-400 sm:hidden flex items-center justify-between"
          >
            <span>Debe ({currencySymbol})</span>
          </label>
          <div className="relative flex items-center">
            <span className="absolute left-2.5 text-xs font-bold text-slate-400 select-none pointer-events-none">
              {currencySymbol}
            </span>
            <input
              id={`debit-${line.id}`}
              type="text"
              inputMode="decimal"
              placeholder={isZeroDecimal ? '0' : '0,00'}
              value={formatInputDisplay(line.debitAmount)}
              disabled={disabled}
              onFocus={(e) => e.target.select()}
              onChange={handleDebitChange}
              onKeyDown={handleAmountKeyDown}
              aria-label="Debe"
              className={cn(
                'w-full bg-white dark:bg-slate-800 border rounded-xl pl-7 pr-3 py-2 text-xs font-bold text-right tabular-nums text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-none transition-all',
                error?.amount
                  ? 'border-rose-400 dark:border-rose-600'
                  : 'border-slate-200 dark:border-slate-700/80 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20',
                line.debitAmount !== '' &&
                  Number(line.debitAmount) > 0 &&
                  'bg-indigo-50/40 dark:bg-indigo-950/25 border-indigo-300 dark:border-indigo-800 font-bold',
              )}
            />
          </div>
        </div>

        {/* Haber (Credit) Input */}
        <div className="flex flex-col sm:w-32 md:w-36 shrink-0 gap-1">
          <label
            htmlFor={`credit-${line.id}`}
            className="text-[11px] font-bold text-slate-600 dark:text-slate-400 sm:hidden flex items-center justify-between"
          >
            <span>Haber ({currencySymbol})</span>
          </label>
          <div className="relative flex items-center">
            <span className="absolute left-2.5 text-xs font-bold text-slate-400 select-none pointer-events-none">
              {currencySymbol}
            </span>
            <input
              id={`credit-${line.id}`}
              type="text"
              inputMode="decimal"
              placeholder={isZeroDecimal ? '0' : '0,00'}
              value={formatInputDisplay(line.creditAmount)}
              disabled={disabled}
              onFocus={(e) => e.target.select()}
              onChange={handleCreditChange}
              onKeyDown={handleAmountKeyDown}
              aria-label="Haber"
              className={cn(
                'w-full bg-white dark:bg-slate-800 border rounded-xl pl-7 pr-3 py-2 text-xs font-bold text-right tabular-nums text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-none transition-all',
                error?.amount
                  ? 'border-rose-400 dark:border-rose-600'
                  : 'border-slate-200 dark:border-slate-700/80 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20',
                line.creditAmount !== '' &&
                  Number(line.creditAmount) > 0 &&
                  'bg-indigo-50/40 dark:bg-indigo-950/25 border-indigo-300 dark:border-indigo-800 font-bold',
              )}
            />
          </div>
        </div>
      </div>

      {/* Responsive Delete Action Button */}
      <div className="flex items-center justify-end shrink-0 sm:w-8">
        <button
          type="button"
          aria-label="Eliminar fila"
          title="Eliminar fila"
          disabled={!canRemove || disabled}
          onClick={onRemove}
          className={cn(
            'min-h-[44px] min-w-[44px] sm:min-h-[32px] sm:min-w-[32px] sm:w-8 sm:h-8 flex items-center justify-center gap-1.5 px-3 sm:px-0 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer text-xs font-semibold',
            (!canRemove || disabled) &&
              'opacity-20 cursor-not-allowed hover:bg-transparent hover:text-slate-400 pointer-events-none',
          )}
        >
          <Trash2 className="w-4 h-4 shrink-0" />
          <span className="sm:hidden text-rose-600 dark:text-rose-400">Eliminar apunte</span>
        </button>
      </div>
    </div>
  );
}

export default FreeJournalEntryRow;
