'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ArrowDownLeft, ArrowUpRight, ArrowLeftRight, Loader2 } from 'lucide-react';
import { QuickOperationType, type CreateTransactionRequest } from '@sistema-contable/shared';
import AccountPickerSheet from './AccountPickerSheet';
import type { AccountOption } from '../../types/account';
import { cn, type CurrencyInfo } from '../../lib/utils';
import type { QuickTransactionFormValues } from './index';

export interface QuickTransactionFormProps {
  accounts: AccountOption[];
  baseCurrency?: CurrencyInfo;
  initialValues?: Partial<QuickTransactionFormValues>;
  onSubmit: (payload: CreateTransactionRequest) => Promise<void>;
  onCancel: () => void;
  loading: boolean;
  onQuickCreateAccount?: (initialName: string, targetField: 'primary' | 'secondary') => void;
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

  const primaryConfig = getPrimaryConfig();
  const secondaryConfig = getSecondaryConfig();

  return (
    <form
      onSubmit={handleSubmit}
      className={cn('space-y-4 text-slate-800 dark:text-slate-100', className)}
      noValidate
    >
      {/* Operation Template Selector */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
          Tipo de Operación
        </label>
        <div role="group" aria-label="Tipo de Operación Rápida" className="grid grid-cols-3 gap-2">
          {/* Expense Button */}
          <button
            type="button"
            aria-pressed={operationType === QuickOperationType.EXPENSE}
            disabled={loading}
            onClick={() => handleOperationTypeChange(QuickOperationType.EXPENSE)}
            className={cn(
              'flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg border text-xs font-bold transition-all select-none',
              operationType === QuickOperationType.EXPENSE
                ? 'bg-amber-500/10 text-amber-700 border-amber-500/40 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-700/60 shadow-xs'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700/60 hover:bg-slate-50 dark:hover:bg-slate-700/40',
              loading && 'opacity-60 cursor-not-allowed',
            )}
          >
            <ArrowDownLeft className="w-4 h-4 shrink-0" />
            <span>Gasto</span>
          </button>

          {/* Income Button */}
          <button
            type="button"
            aria-pressed={operationType === QuickOperationType.INCOME}
            disabled={loading}
            onClick={() => handleOperationTypeChange(QuickOperationType.INCOME)}
            className={cn(
              'flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg border text-xs font-bold transition-all select-none',
              operationType === QuickOperationType.INCOME
                ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/40 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-700/60 shadow-xs'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700/60 hover:bg-slate-50 dark:hover:bg-slate-700/40',
              loading && 'opacity-60 cursor-not-allowed',
            )}
          >
            <ArrowUpRight className="w-4 h-4 shrink-0" />
            <span>Ingreso</span>
          </button>

          {/* Transfer Button */}
          <button
            type="button"
            aria-pressed={operationType === QuickOperationType.TRANSFER}
            disabled={loading}
            onClick={() => handleOperationTypeChange(QuickOperationType.TRANSFER)}
            className={cn(
              'flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg border text-xs font-bold transition-all select-none',
              operationType === QuickOperationType.TRANSFER
                ? 'bg-indigo-500/10 text-indigo-700 border-indigo-500/40 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-700/60 shadow-xs'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700/60 hover:bg-slate-50 dark:hover:bg-slate-700/40',
              loading && 'opacity-60 cursor-not-allowed',
            )}
          >
            <ArrowLeftRight className="w-4 h-4 shrink-0" />
            <span>Transferencia</span>
          </button>
        </div>
      </div>

      {/* 5-Step Sequential Form Fields */}
      <div className="space-y-3.5 pt-1">
        {/* Step 1: Fecha (accountingDate) */}
        <div data-step="1-date" className="flex flex-col gap-1">
          <label
            htmlFor="quick-accounting-date"
            className="block text-xs font-semibold text-slate-600 dark:text-slate-400"
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
              'w-full bg-white dark:bg-slate-800 border rounded-lg px-3 py-2 text-xs font-medium outline-none transition',
              errors.accountingDate
                ? 'border-rose-500 dark:border-rose-500/80 focus:ring-2 focus:ring-rose-500/20'
                : 'border-slate-200 dark:border-slate-700/60 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20',
              loading && 'opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-900',
            )}
          />
          {errors.accountingDate && (
            <p className="text-[11px] font-medium text-rose-600 dark:text-rose-400">
              {errors.accountingDate}
            </p>
          )}
        </div>

        {/* Step 2: Primary Account (Cuenta / Cuenta Origen) */}
        <div data-step="2-primary-account">
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
              onQuickCreateAccount ? (name) => onQuickCreateAccount(name, 'primary') : undefined
            }
            error={errors.primaryAccountId}
            disabled={loading}
          />
        </div>

        {/* Step 3: Secondary Account (Categoría / Cuenta Destino) */}
        <div data-step="3-secondary-account">
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
              onQuickCreateAccount ? (name) => onQuickCreateAccount(name, 'secondary') : undefined
            }
            error={errors.secondaryAccountId}
            disabled={loading}
          />
        </div>

        {/* Step 4: Monto (amount) */}
        <div data-step="4-amount" className="flex flex-col gap-1">
          <label
            htmlFor="quick-amount"
            className="block text-xs font-semibold text-slate-600 dark:text-slate-400"
          >
            Monto
          </label>
          <div className="relative flex items-center">
            <span className="absolute left-3 text-xs font-bold text-slate-400 dark:text-slate-500 pointer-events-none select-none">
              {baseCurrency?.symbol || '$'}
            </span>
            <input
              id="quick-amount"
              name="amount"
              type="number"
              inputMode="decimal"
              step="any"
              min="0.01"
              disabled={loading}
              value={amount}
              onChange={(e) => {
                const val = e.target.value;
                setAmount(val === '' ? '' : val);
                clearFieldError('amount');
              }}
              placeholder="0.00"
              className={cn(
                'w-full bg-white dark:bg-slate-800 border rounded-lg pl-8 pr-3 py-2 text-xs font-semibold tabular-nums outline-none transition',
                errors.amount
                  ? 'border-rose-500 dark:border-rose-500/80 focus:ring-2 focus:ring-rose-500/20'
                  : 'border-slate-200 dark:border-slate-700/60 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20',
                loading && 'opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-900',
              )}
            />
          </div>
          {errors.amount && (
            <p className="text-[11px] font-medium text-rose-600 dark:text-rose-400">
              {errors.amount}
            </p>
          )}
        </div>

        {/* Step 5: Concepto / Glosa (description) */}
        <div data-step="5-description" className="flex flex-col gap-1">
          <label
            htmlFor="quick-description"
            className="block text-xs font-semibold text-slate-600 dark:text-slate-400"
          >
            Concepto / Glosa
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
            placeholder="Ej. Pago de combustible utilitario"
            className={cn(
              'w-full bg-white dark:bg-slate-800 border rounded-lg px-3 py-2 text-xs font-medium outline-none transition placeholder-slate-400',
              errors.description
                ? 'border-rose-500 dark:border-rose-500/80 focus:ring-2 focus:ring-rose-500/20'
                : 'border-slate-200 dark:border-slate-700/60 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20',
              loading && 'opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-900',
            )}
          />
          {errors.description && (
            <p className="text-[11px] font-medium text-rose-600 dark:text-rose-400">
              {errors.description}
            </p>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
        <button
          type="button"
          disabled={loading || isSubmitting}
          onClick={onCancel}
          className="px-4 py-2 text-xs font-semibold rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading || isSubmitting}
          className="flex items-center justify-center gap-1.5 px-5 py-2 text-xs font-bold rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 transition shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {(loading || isSubmitting) && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          <span>{loading || isSubmitting ? 'Guardando...' : 'Guardar Transacción'}</span>
        </button>
      </div>
    </form>
  );
}

export default QuickTransactionForm;
