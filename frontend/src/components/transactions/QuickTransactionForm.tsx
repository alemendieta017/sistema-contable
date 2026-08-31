'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ArrowDownLeft, ArrowUpRight, ArrowLeftRight, Loader2 } from 'lucide-react';
import {
  QuickOperationType,
  AccountType,
  type CreateTransactionRequest,
} from '@sistema-contable/shared';
import AccountPickerSheet from './AccountPickerSheet';
import type { AccountOption } from '../../types/account';
import { cn, formatInputDisplay, parseInputRaw, type CurrencyInfo } from '../../lib/utils';
import type { QuickTransactionFormValues } from './index';

export interface QuickTransactionFormProps {
  accounts: AccountOption[];
  baseCurrency?: CurrencyInfo;
  initialValues?: Partial<QuickTransactionFormValues>;
  onSubmit: (payload: CreateTransactionRequest) => Promise<void>;
  onCancel: () => void;
  loading: boolean;
  onQuickCreateAccount?: (
    initialName: string,
    targetField: 'primary' | 'secondary',
    suggestedType?: AccountType,
  ) => void;
  className?: string;
}

const getLocalDateString = (): string => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export function QuickTransactionForm({
  accounts,
  baseCurrency = { code: 'PYG', symbol: '₲', decimalPlaces: 0 },
  initialValues,
  onSubmit,
  onCancel,
  loading = false,
  onQuickCreateAccount,
  className,
}: QuickTransactionFormProps) {
  // Form field states
  const [operationType, setOperationType] = useState<QuickOperationType>(
    initialValues?.operationType || QuickOperationType.EXPENSE,
  );
  const [accountingDate, setAccountingDate] = useState<string>(
    initialValues?.accountingDate || getLocalDateString(),
  );
  const [primaryAccountId, setPrimaryAccountId] = useState<string>(
    initialValues?.primaryAccountId || '',
  );
  const [secondaryAccountId, setSecondaryAccountId] = useState<string>(
    initialValues?.secondaryAccountId || '',
  );
  const [amount, setAmount] = useState<number | string>(
    initialValues?.amount !== undefined ? initialValues.amount : '',
  );
  const [description, setDescription] = useState<string>(initialValues?.description || '');

  // Validation error states
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync initial values if they change
  useEffect(() => {
    if (initialValues) {
      if (initialValues.operationType !== undefined) {
        setOperationType(initialValues.operationType);
      }
      if (initialValues.accountingDate !== undefined) {
        setAccountingDate(initialValues.accountingDate);
      }
      if (initialValues.primaryAccountId !== undefined) {
        setPrimaryAccountId(initialValues.primaryAccountId);
      }
      if (initialValues.secondaryAccountId !== undefined) {
        setSecondaryAccountId(initialValues.secondaryAccountId);
      }
      if (initialValues.amount !== undefined) {
        setAmount(initialValues.amount);
      }
      if (initialValues.description !== undefined) {
        setDescription(initialValues.description);
      }
    }
  }, [initialValues]);

  // Dynamic field labels and placeholders based on operation type
  const getPrimaryConfig = () => {
    switch (operationType) {
      case QuickOperationType.EXPENSE:
        return {
          label: 'Cuenta de Pago',
          placeholder: 'Seleccionar cuenta de pago (Caja, Banco)...',
        };
      case QuickOperationType.INCOME:
        return {
          label: 'Cuenta de Depósito',
          placeholder: 'Seleccionar cuenta de depósito...',
        };
      case QuickOperationType.TRANSFER:
        return {
          label: 'Cuenta Origen',
          placeholder: 'Seleccionar cuenta origen (donde sale el dinero)...',
        };
    }
  };

  const getSecondaryConfig = () => {
    switch (operationType) {
      case QuickOperationType.EXPENSE:
        return {
          label: 'Categoría de Gasto',
          placeholder: 'Seleccionar categoría de gasto...',
        };
      case QuickOperationType.INCOME:
        return {
          label: 'Categoría de Ingreso',
          placeholder: 'Seleccionar categoría de ingreso...',
        };
      case QuickOperationType.TRANSFER:
        return {
          label: 'Cuenta Destino',
          placeholder: 'Seleccionar cuenta destino (donde entra el dinero)...',
        };
    }
  };

  const clearFieldError = (fieldName: string) => {
    if (errors[fieldName]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[fieldName];
        return next;
      });
    }
  };

  const handleOperationTypeChange = (newType: QuickOperationType) => {
    if (loading || isSubmitting) return;
    setOperationType(newType);
    setErrors({});

    // Clean up incompatible accounts when switching operation mode
    const selectedSecondary = accounts.find((a) => a.id === secondaryAccountId);
    if (selectedSecondary) {
      if (
        newType === QuickOperationType.EXPENSE &&
        selectedSecondary.type !== AccountType.EXPENSE
      ) {
        setSecondaryAccountId('');
      } else if (
        newType === QuickOperationType.INCOME &&
        selectedSecondary.type !== AccountType.INCOME
      ) {
        setSecondaryAccountId('');
      } else if (
        newType === QuickOperationType.TRANSFER &&
        selectedSecondary.type !== AccountType.ASSET &&
        selectedSecondary.type !== AccountType.LIABILITY &&
        !selectedSecondary.isCashOrBank
      ) {
        setSecondaryAccountId('');
      }
    }

    const selectedPrimary = accounts.find((a) => a.id === primaryAccountId);
    if (selectedPrimary) {
      if (
        selectedPrimary.type !== AccountType.ASSET &&
        selectedPrimary.type !== AccountType.LIABILITY &&
        !selectedPrimary.isCashOrBank
      ) {
        setPrimaryAccountId('');
      }
    }

    // In transfer mode, origin and destination cannot be the same
    if (
      newType === QuickOperationType.TRANSFER &&
      primaryAccountId &&
      secondaryAccountId &&
      primaryAccountId === secondaryAccountId
    ) {
      setSecondaryAccountId('');
    }
  };

  const validateForm = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (!accountingDate.trim()) {
      newErrors.accountingDate = 'La fecha es obligatoria';
    }

    if (!primaryAccountId) {
      switch (operationType) {
        case QuickOperationType.EXPENSE:
          newErrors.primaryAccountId = 'Seleccione una cuenta de pago';
          break;
        case QuickOperationType.INCOME:
          newErrors.primaryAccountId = 'Seleccione una cuenta de depósito';
          break;
        case QuickOperationType.TRANSFER:
          newErrors.primaryAccountId = 'Seleccione una cuenta de origen';
          break;
      }
    }

    if (!secondaryAccountId) {
      switch (operationType) {
        case QuickOperationType.EXPENSE:
          newErrors.secondaryAccountId = 'Seleccione una categoría de gasto';
          break;
        case QuickOperationType.INCOME:
          newErrors.secondaryAccountId = 'Seleccione una categoría de ingreso';
          break;
        case QuickOperationType.TRANSFER:
          newErrors.secondaryAccountId = 'Seleccione una cuenta de destino';
          break;
      }
    }

    if (
      operationType === QuickOperationType.TRANSFER &&
      primaryAccountId &&
      secondaryAccountId &&
      primaryAccountId === secondaryAccountId
    ) {
      newErrors.secondaryAccountId = 'Las cuentas de origen y destino no pueden ser iguales';
    }

    const numericAmount = Number(amount);
    if (amount === '' || isNaN(numericAmount) || numericAmount <= 0) {
      newErrors.amount = 'El monto debe ser mayor a 0';
    }

    if (!description.trim()) {
      newErrors.description = 'El concepto es obligatorio';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [accountingDate, primaryAccountId, secondaryAccountId, operationType, amount, description]);

  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      if (e) {
        e.preventDefault();
      }

      if (loading || isSubmitting) return;

      if (!validateForm()) {
        return;
      }

      const numericAmount = Number(amount);
      let entries: CreateTransactionRequest['entries'];

      if (operationType === QuickOperationType.EXPENSE) {
        // Expense: DEBIT expense category, CREDIT payment account
        entries = [
          {
            accountId: secondaryAccountId,
            entryType: 'DEBIT',
            amount: numericAmount,
          },
          {
            accountId: primaryAccountId,
            entryType: 'CREDIT',
            amount: numericAmount,
          },
        ];
      } else if (operationType === QuickOperationType.INCOME) {
        // Income: DEBIT deposit account, CREDIT income category
        entries = [
          {
            accountId: primaryAccountId,
            entryType: 'DEBIT',
            amount: numericAmount,
          },
          {
            accountId: secondaryAccountId,
            entryType: 'CREDIT',
            amount: numericAmount,
          },
        ];
      } else {
        // Transfer: DEBIT destination account, CREDIT source account
        entries = [
          {
            accountId: secondaryAccountId,
            entryType: 'DEBIT',
            amount: numericAmount,
          },
          {
            accountId: primaryAccountId,
            entryType: 'CREDIT',
            amount: numericAmount,
          },
        ];
      }

      const payload: CreateTransactionRequest = {
        accountingDate,
        description: description.trim(),
        entries,
      };

      setIsSubmitting(true);
      try {
        await onSubmit(payload);
      } catch {
        // Error feedback is handled by parent container
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      loading,
      isSubmitting,
      accountingDate,
      description,
      amount,
      operationType,
      primaryAccountId,
      secondaryAccountId,
      onSubmit,
      validateForm,
    ],
  );

  // Global Ctrl+Enter / Cmd+Enter submission shortcut
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSubmit();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [handleSubmit]);

  const isZeroDecimal = baseCurrency?.decimalPlaces === 0 || baseCurrency?.code === 'PYG';
  const primaryConfig = getPrimaryConfig();
  const secondaryConfig = getSecondaryConfig();

  return (
    <form
      onSubmit={handleSubmit}
      className={cn('space-y-6 text-slate-800 dark:text-slate-100', className)}
      noValidate
    >
      {/* 1. Operation Template Selector (Responsive 3-Column / Grid) */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
          Tipo de Movimiento
        </label>

        <div
          role="group"
          aria-label="Tipo de Operación Rápida"
          className="grid grid-cols-3 gap-2 sm:gap-3"
        >
          {/* Egreso (Expense) */}
          <button
            type="button"
            aria-label="Egreso (Gasto)"
            aria-pressed={operationType === QuickOperationType.EXPENSE}
            disabled={loading}
            onClick={() => handleOperationTypeChange(QuickOperationType.EXPENSE)}
            className={cn(
              'group relative flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-2 sm:gap-2.5 py-2.5 px-3 rounded-xl border text-xs transition-all duration-200 select-none min-h-[44px] text-left cursor-pointer active:scale-[0.98]',
              operationType === QuickOperationType.EXPENSE
                ? 'bg-rose-50/80 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-800/60 shadow-2xs font-semibold'
                : 'bg-white dark:bg-slate-800/90 text-slate-600 dark:text-slate-300 border-slate-200/80 dark:border-slate-700/70 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 font-medium',
              loading && 'opacity-60 cursor-not-allowed pointer-events-none',
            )}
          >
            <span
              className={cn(
                'w-7 h-7 rounded-lg flex items-center justify-center transition-colors shrink-0',
                operationType === QuickOperationType.EXPENSE
                  ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-300'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:bg-rose-50 group-hover:text-rose-600 dark:group-hover:bg-rose-950/40 dark:group-hover:text-rose-400',
              )}
            >
              <ArrowDownLeft className="w-4 h-4" />
            </span>
            <div className="flex flex-col min-w-0">
              <span className="text-xs sm:text-sm font-medium truncate">Egreso</span>
            </div>
          </button>

          {/* Ingreso (Income) */}
          <button
            type="button"
            aria-pressed={operationType === QuickOperationType.INCOME}
            disabled={loading}
            onClick={() => handleOperationTypeChange(QuickOperationType.INCOME)}
            className={cn(
              'group relative flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-2 sm:gap-2.5 py-2.5 px-3 rounded-xl border text-xs transition-all duration-200 select-none min-h-[44px] text-left cursor-pointer active:scale-[0.98]',
              operationType === QuickOperationType.INCOME
                ? 'bg-emerald-50/80 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800/60 shadow-2xs font-semibold'
                : 'bg-white dark:bg-slate-800/90 text-slate-600 dark:text-slate-300 border-slate-200/80 dark:border-slate-700/70 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 font-medium',
              loading && 'opacity-60 cursor-not-allowed pointer-events-none',
            )}
          >
            <span
              className={cn(
                'w-7 h-7 rounded-lg flex items-center justify-center transition-colors shrink-0',
                operationType === QuickOperationType.INCOME
                  ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-600 dark:group-hover:bg-emerald-950/40 dark:group-hover:text-emerald-400',
              )}
            >
              <ArrowUpRight className="w-4 h-4" />
            </span>
            <div className="flex flex-col min-w-0">
              <span className="text-xs sm:text-sm font-medium truncate">Ingreso</span>
            </div>
          </button>

          {/* Transferencia (Transfer) */}
          <button
            type="button"
            aria-pressed={operationType === QuickOperationType.TRANSFER}
            disabled={loading}
            onClick={() => handleOperationTypeChange(QuickOperationType.TRANSFER)}
            className={cn(
              'group relative flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-2 sm:gap-2.5 py-2.5 px-3 rounded-xl border text-xs transition-all duration-200 select-none min-h-[44px] text-left cursor-pointer active:scale-[0.98]',
              operationType === QuickOperationType.TRANSFER
                ? 'bg-indigo-50/80 text-indigo-700 border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-300 dark:border-indigo-800/60 shadow-2xs font-semibold'
                : 'bg-white dark:bg-slate-800/90 text-slate-600 dark:text-slate-300 border-slate-200/80 dark:border-slate-700/70 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 font-medium',
              loading && 'opacity-60 cursor-not-allowed pointer-events-none',
            )}
          >
            <span
              className={cn(
                'w-7 h-7 rounded-lg flex items-center justify-center transition-colors shrink-0',
                operationType === QuickOperationType.TRANSFER
                  ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-300'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 dark:group-hover:bg-indigo-950/40 dark:group-hover:text-indigo-400',
              )}
            >
              <ArrowLeftRight className="w-4 h-4" />
            </span>
            <div className="flex flex-col min-w-0">
              <span className="text-xs sm:text-sm font-medium truncate">Transferencia</span>
            </div>
          </button>
        </div>
      </div>

      {/* 2. 5-Step Sequential Form Fields */}
      <div className="space-y-4 pt-1">
        {/* Step 1: Fecha (accountingDate) */}
        <div data-step="1-date" className="flex flex-col gap-1.5">
          <label
            htmlFor="quick-accounting-date"
            className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
          >
            Fecha
          </label>
          <input
            id="quick-accounting-date"
            name="accountingDate"
            type="date"
            required
            disabled={loading}
            value={accountingDate}
            onChange={(e) => {
              setAccountingDate(e.target.value);
              clearFieldError('accountingDate');
            }}
            className={cn(
              'w-full bg-slate-50/70 dark:bg-slate-800/80 border rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200 outline-none transition-all duration-200',
              errors.accountingDate
                ? 'border-rose-500 dark:border-rose-500/80 focus:ring-4 focus:ring-rose-500/15'
                : 'border-slate-200 dark:border-slate-700/70 focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/15 shadow-xs',
              loading && 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-900',
            )}
          />
          {errors.accountingDate && (
            <p className="text-[11px] font-medium text-rose-600 dark:text-rose-400">
              {errors.accountingDate}
            </p>
          )}
        </div>

        {/* Step 2: Primary Account */}
        <div data-step="2-primary-account" className="flex flex-col gap-1">
          <AccountPickerSheet
            accounts={accounts}
            selectedAccountId={primaryAccountId}
            onSelect={(acc) => {
              setPrimaryAccountId(acc.id);
              clearFieldError('primaryAccountId');
              clearFieldError('secondaryAccountId');
            }}
            filterMode="PAYMENT_ACCOUNTS"
            label={primaryConfig.label}
            placeholder={primaryConfig.placeholder}
            baseCurrency={baseCurrency}
            onQuickCreateAccount={
              onQuickCreateAccount
                ? (name, suggestedType) =>
                    onQuickCreateAccount(name, 'primary', suggestedType || AccountType.ASSET)
                : undefined
            }
            error={errors.primaryAccountId}
            disabled={loading}
          />
        </div>

        {/* Step 3: Secondary Account */}
        <div data-step="3-secondary-account" className="flex flex-col gap-1">
          <AccountPickerSheet
            accounts={accounts}
            selectedAccountId={secondaryAccountId}
            onSelect={(acc) => {
              setSecondaryAccountId(acc.id);
              clearFieldError('secondaryAccountId');
            }}
            filterMode={
              operationType === QuickOperationType.EXPENSE
                ? 'EXPENSES'
                : operationType === QuickOperationType.INCOME
                  ? 'INCOMES'
                  : 'PAYMENT_ACCOUNTS'
            }
            label={secondaryConfig.label}
            placeholder={secondaryConfig.placeholder}
            baseCurrency={baseCurrency}
            onQuickCreateAccount={
              onQuickCreateAccount
                ? (name, suggestedType) =>
                    onQuickCreateAccount(
                      name,
                      'secondary',
                      suggestedType ||
                        (operationType === QuickOperationType.EXPENSE
                          ? AccountType.EXPENSE
                          : operationType === QuickOperationType.INCOME
                            ? AccountType.INCOME
                            : AccountType.ASSET),
                    )
                : undefined
            }
            error={errors.secondaryAccountId}
            disabled={loading}
          />
        </div>

        {/* Step 4: Monto (amount) */}
        <div data-step="4-amount" className="flex flex-col gap-1.5">
          <label
            htmlFor="quick-amount"
            className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
          >
            Monto
          </label>
          <div className="relative flex items-center group">
            <span className="absolute left-3.5 text-xs sm:text-sm font-semibold text-slate-400 dark:text-slate-500 pointer-events-none select-none">
              {baseCurrency?.symbol || '$'}
            </span>
            <input
              id="quick-amount"
              name="amount"
              type="text"
              inputMode="decimal"
              disabled={loading}
              value={formatInputDisplay(amount)}
              onFocus={(e) => e.target.select()}
              onChange={(e) => {
                const parsed = parseInputRaw(e.target.value);
                setAmount(parsed === '' ? '' : parsed);
                clearFieldError('amount');
              }}
              placeholder={isZeroDecimal ? '0' : '0,00'}
              className={cn(
                'w-full bg-slate-50/70 dark:bg-slate-800/80 border rounded-xl pl-9 pr-3.5 py-2.5 text-xs sm:text-sm font-medium tabular-nums text-slate-900 dark:text-slate-50 outline-none transition-all duration-200',
                errors.amount
                  ? 'border-rose-500 dark:border-rose-500/80 focus:ring-4 focus:ring-rose-500/15 bg-rose-50/20'
                  : 'border-slate-200 dark:border-slate-700/70 focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/15 shadow-xs',
                loading && 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-900',
              )}
            />
          </div>
          {errors.amount && (
            <p className="text-[11px] font-medium text-rose-600 dark:text-rose-400">
              {errors.amount}
            </p>
          )}
        </div>

        {/* Step 5: Concepto (description) */}
        <div data-step="5-description" className="flex flex-col gap-1.5">
          <label
            htmlFor="quick-description"
            className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
          >
            Concepto
          </label>
          <input
            id="quick-description"
            name="description"
            type="text"
            disabled={loading}
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              clearFieldError('description');
            }}
            placeholder="Ej. Pago de combustible utilitario, cobro de factura #102..."
            className={cn(
              'w-full bg-slate-50/70 dark:bg-slate-800/80 border rounded-xl px-3.5 sm:px-4 py-2.5 text-xs sm:text-sm font-medium outline-none transition-all duration-200 placeholder-slate-400',
              errors.description
                ? 'border-rose-500 dark:border-rose-500/80 focus:ring-4 focus:ring-rose-500/15'
                : 'border-slate-200 dark:border-slate-700/70 focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/15 shadow-xs',
              loading && 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-900',
            )}
          />
          {errors.description && (
            <p className="text-[11px] font-medium text-rose-600 dark:text-rose-400">
              {errors.description}
            </p>
          )}
        </div>
      </div>

      {/* 3. Consolidated Action Bar */}
      <div className="pt-3 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800">
        <div className="hidden sm:flex items-center gap-2 text-[11px] text-slate-400 dark:text-slate-500 font-medium">
          <kbd className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-[10px]">
            Ctrl
          </kbd>
          <span>+</span>
          <kbd className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-[10px]">
            Enter
          </kbd>
          <span>para guardar rápidamente</span>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          <button
            type="button"
            disabled={loading || isSubmitting}
            onClick={onCancel}
            className="flex-1 sm:flex-initial px-4 py-2.5 min-h-[44px] text-xs font-bold rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading || isSubmitting}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-2.5 min-h-[44px] text-xs font-bold rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] transition-all shadow-md shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {(loading || isSubmitting) && (
              <Loader2 data-testid="loader-icon" className="w-4 h-4 animate-spin" />
            )}
            <span>{loading || isSubmitting ? 'Guardando...' : 'Guardar Transacción'}</span>
          </button>
        </div>
      </div>
    </form>
  );
}

export default QuickTransactionForm;
