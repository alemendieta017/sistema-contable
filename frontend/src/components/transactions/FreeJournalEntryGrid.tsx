'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Plus, Calendar, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { formatCurrency, cn } from '../../lib/utils';
import type { CreateTransactionRequest } from '@sistema-contable/shared';
import FreeJournalEntryRow from './FreeJournalEntryRow';
import type { FreeJournalLineState, FreeJournalEntryGridProps } from './index';

const createDefaultLine = (idSuffix: string | number): FreeJournalLineState => ({
  id: `line-${idSuffix}-${Date.now()}`,
  accountId: '',
  debitAmount: '',
  creditAmount: '',
});

export function FreeJournalEntryGrid({
  accounts,
  baseCurrency = { code: 'USD', symbol: '$', decimalPlaces: 2 },
  initialValues,
  onSubmit,
  onCancel,
  loading = false,
  onQuickCreateAccount,
  className,
}: FreeJournalEntryGridProps) {
  // Today's date string YYYY-MM-DD
  const today = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Form states
  const [accountingDate, setAccountingDate] = useState<string>(
    initialValues?.accountingDate || today,
  );
  const [description, setDescription] = useState<string>(initialValues?.description || '');
  const [lines, setLines] = useState<FreeJournalLineState[]>(() => {
    if (initialValues?.lines && initialValues.lines.length >= 2) {
      return initialValues.lines;
    }
    return [createDefaultLine(1), createDefaultLine(2)];
  });

  // Sync initial values if they change
  useEffect(() => {
    if (initialValues) {
      if (initialValues.accountingDate !== undefined) {
        setAccountingDate(initialValues.accountingDate);
      }
      if (initialValues.description !== undefined) {
        setDescription(initialValues.description);
      }
      if (initialValues.lines && initialValues.lines.length >= 2) {
        setLines(initialValues.lines);
      }
    }
  }, [initialValues]);

  // Validation errors
  const [errors, setErrors] = useState<{
    accountingDate?: string;
    description?: string;
    general?: string;
    lines?: Record<number, { account?: string; amount?: string }>;
  }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Real-time calculations
  const totalDebit = useMemo(() => {
    return lines.reduce((sum, line) => {
      const val = typeof line.debitAmount === 'number' ? line.debitAmount : 0;
      return sum + val;
    }, 0);
  }, [lines]);

  const totalCredit = useMemo(() => {
    return lines.reduce((sum, line) => {
      const val = typeof line.creditAmount === 'number' ? line.creditAmount : 0;
      return sum + val;
    }, 0);
  }, [lines]);

  const roundedDebit = useMemo(() => Math.round(totalDebit * 100) / 100, [totalDebit]);
  const roundedCredit = useMemo(() => Math.round(totalCredit * 100) / 100, [totalCredit]);
  const difference = useMemo(
    () => Math.round(Math.abs(roundedDebit - roundedCredit) * 100) / 100,
    [roundedDebit, roundedCredit],
  );
  const isBalanced = useMemo(
    () => totalDebit > 0 && totalCredit > 0 && difference < 0.001,
    [totalDebit, totalCredit, difference],
  );

  // Line modification handler
  const handleLineChange = useCallback(
    (index: number, updatedLine: FreeJournalLineState) => {
      setLines((prev) => {
        const next = [...prev];
        next[index] = updatedLine;
        return next;
      });

      // Clear line errors if present
      if (errors.lines?.[index]) {
        setErrors((prev) => {
          const nextLines = { ...prev.lines };
          delete nextLines[index];
          return { ...prev, lines: nextLines };
        });
      }
    },
    [errors.lines],
  );

  // Add line with smart difference prefill
  const handleAddLine = useCallback(() => {
    const rawDiff = Math.round((totalDebit - totalCredit) * 100) / 100;
    let autoDebit: number | '' = '';
    let autoCredit: number | '' = '';

    if (rawDiff > 0) {
      // Debits exceed Credits -> auto-fill credit
      autoCredit = rawDiff;
    } else if (rawDiff < 0) {
      // Credits exceed Debits -> auto-fill debit
      autoDebit = Math.abs(rawDiff);
    }

    const newLine: FreeJournalLineState = {
      id: `line-${lines.length + 1}-${Date.now()}`,
      accountId: '',
      debitAmount: autoDebit,
      creditAmount: autoCredit,
    };

    setLines((prev) => [...prev, newLine]);
  }, [totalDebit, totalCredit, lines.length]);

  // Remove line handler
  const handleRemoveLine = useCallback(
    (index: number) => {
      if (lines.length <= 2) return;
      setLines((prev) => prev.filter((_, i) => i !== index));

      // Clean line errors
      if (errors.lines) {
        setErrors((prev) => {
          const nextLines = { ...prev.lines };
          delete nextLines[index];
          return { ...prev, lines: nextLines };
        });
      }
    },
    [lines.length, errors.lines],
  );

  // Validation function
  const validateForm = useCallback((): boolean => {
    const newErrors: typeof errors = { lines: {} };
    let hasError = false;

    if (!accountingDate) {
      newErrors.accountingDate = 'La fecha es obligatoria';
      hasError = true;
    }

    if (!description.trim()) {
      newErrors.description = 'El concepto / glosa es obligatorio';
      hasError = true;
    }

    if (lines.length < 2) {
      newErrors.general = 'El asiento debe tener al menos dos apuntes';
      hasError = true;
    }

    lines.forEach((line, idx) => {
      const lineError: { account?: string; amount?: string } = {};

      if (!line.accountId) {
        lineError.account = 'Seleccione una cuenta contable';
        hasError = true;
      }

      const hasDebit = typeof line.debitAmount === 'number' && line.debitAmount > 0;
      const hasCredit = typeof line.creditAmount === 'number' && line.creditAmount > 0;

      if (!hasDebit && !hasCredit) {
        lineError.amount = 'Debe ingresar un monto mayor a 0 en Debe o Haber';
        hasError = true;
      }

      if (lineError.account || lineError.amount) {
        if (newErrors.lines) {
          newErrors.lines[idx] = lineError;
        }
      }
    });

    if (!isBalanced) {
      newErrors.general = 'El asiento está descuadrado. Total Debe debe coincidir con Total Haber.';
      hasError = true;
    }

    setErrors(newErrors);
    return !hasError;
  }, [accountingDate, description, lines, isBalanced]);

  // Form submission handler
  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      if (e) {
        e.preventDefault();
      }

      if (loading || isSubmitting) return;

      if (!validateForm()) {
        return;
      }

      const payload: CreateTransactionRequest = {
        accountingDate,
        description: description.trim(),
        entries: lines.map((line) => {
          const isDebit = typeof line.debitAmount === 'number' && line.debitAmount > 0;
          return {
            accountId: line.accountId,
            entryType: isDebit ? 'DEBIT' : 'CREDIT',
            amount: isDebit ? Number(line.debitAmount) : Number(line.creditAmount),
          };
        }),
      };

      setIsSubmitting(true);
      try {
        await onSubmit(payload);
      } finally {
        setIsSubmitting(false);
      }
    },
    [validateForm, loading, isSubmitting, accountingDate, description, lines, onSubmit],
  );

  // Global Ctrl+Enter / Cmd+Enter submission handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSubmit();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSubmit]);

  return (
    <form
      onSubmit={handleSubmit}
      className={cn('flex flex-col gap-5 w-full', className)}
      noValidate
    >
      {/* Top Header Fields: Date & Description */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50/60 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
        {/* Accounting Date Field */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="free-journal-date"
            className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5"
          >
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>Fecha Contable</span>
          </label>
          <input
            id="free-journal-date"
            type="date"
            value={accountingDate}
            onChange={(e) => {
              setAccountingDate(e.target.value);
              if (errors.accountingDate) {
                setErrors((prev) => ({ ...prev, accountingDate: undefined }));
              }
            }}
            disabled={loading}
            aria-label="Fecha"
            className={cn(
              'w-full bg-white dark:bg-slate-800 border rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition',
              errors.accountingDate
                ? 'border-rose-400 dark:border-rose-600'
                : 'border-slate-200 dark:border-slate-700/80',
            )}
          />
          {errors.accountingDate && (
            <p className="text-[11px] font-medium text-rose-600 dark:text-rose-400">
              {errors.accountingDate}
            </p>
          )}
        </div>

        {/* Description / Glosa Field */}
        <div className="md:col-span-2 flex flex-col gap-1.5">
          <label
            htmlFor="free-journal-description"
            className="text-xs font-bold text-slate-700 dark:text-slate-300"
          >
            Concepto / Glosa
          </label>
          <input
            id="free-journal-description"
            type="text"
            placeholder="Ej: Devengamiento de planilla, apertura contable..."
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              if (errors.description) {
                setErrors((prev) => ({ ...prev, description: undefined }));
              }
            }}
            disabled={loading}
            aria-label="Concepto / Glosa"
            className={cn(
              'w-full bg-white dark:bg-slate-800 border rounded-xl px-3.5 py-2 text-xs font-medium text-slate-800 dark:text-slate-200 placeholder-slate-400 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition',
              errors.description
                ? 'border-rose-400 dark:border-rose-600'
                : 'border-slate-200 dark:border-slate-700/80',
            )}
          />
          {errors.description && (
            <p className="text-[11px] font-medium text-rose-600 dark:text-rose-400">
              {errors.description}
            </p>
          )}
        </div>
      </div>

      {/* Grid Lines Section */}
      <div className="flex flex-col gap-3">
        {/* Desktop Table Header */}
        <div
          data-testid="grid-header"
          className="hidden sm:flex items-center gap-3 px-4 py-2 bg-slate-100/60 dark:bg-slate-800/50 rounded-xl text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider"
        >
          <span className="w-6 text-center">#</span>
          <span className="flex-1">Cuenta Contable</span>
          <span data-testid="header-debit" className="w-32 md:w-36 text-right pr-3">
            Debe
          </span>
          <span data-testid="header-credit" className="w-32 md:w-36 text-right pr-3">
            Haber
          </span>
          <span className="w-8 text-center" />
        </div>

        {/* Rows List */}
        <div className="flex flex-col gap-2.5">
          {lines.map((line, index) => (
            <FreeJournalEntryRow
              key={line.id}
              line={line}
              index={index}
              accounts={accounts}
              baseCurrency={baseCurrency}
              onChange={(updatedLine) => handleLineChange(index, updatedLine)}
              onRemove={() => handleRemoveLine(index)}
              canRemove={lines.length > 2}
              onEnter={() => {
                if (index === lines.length - 1) {
                  handleAddLine();
                }
              }}
              onQuickCreateAccount={(initialName) => onQuickCreateAccount?.(initialName, index)}
              disabled={loading || isSubmitting}
              error={errors.lines?.[index]}
            />
          ))}
        </div>

        {/* Add Line Action */}
        <div className="flex items-center justify-between pt-1">
          <button
            type="button"
            onClick={handleAddLine}
            disabled={loading || isSubmitting}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/60 transition shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            <span>Agregar Apunte</span>
          </button>
        </div>
      </div>

      {/* Real-Time Balance Summary Panel */}
      <div className="bg-slate-50 dark:bg-slate-900/60 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Totals Breakdown */}
        <div data-testid="summary-totals" className="flex flex-wrap items-center gap-6 text-xs">
          <div data-testid="total-debit-container" className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Total Debe
            </span>
            <span
              data-testid="total-debit-amount"
              className="text-sm font-bold text-slate-800 dark:text-slate-200 tabular-nums"
            >
              {formatCurrency(totalDebit, baseCurrency)}
            </span>
          </div>

          <div data-testid="total-credit-container" className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Total Haber
            </span>
            <span
              data-testid="total-credit-amount"
              className="text-sm font-bold text-slate-800 dark:text-slate-200 tabular-nums"
            >
              {formatCurrency(totalCredit, baseCurrency)}
            </span>
          </div>

          <div data-testid="difference-container" className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Diferencia
            </span>
            <span
              data-testid="difference-amount"
              className={cn(
                'text-sm font-bold tabular-nums',
                difference > 0
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-slate-700 dark:text-slate-300',
              )}
            >
              {formatCurrency(difference, baseCurrency)}
            </span>
          </div>
        </div>

        {/* Balance Status Badge */}
        <div className="flex items-center gap-2">
          {isBalanced ? (
            <div
              data-testid="balance-badge"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 text-xs font-bold shadow-xs"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Cuadrado</span>
            </div>
          ) : (
            <div
              data-testid="balance-badge"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 text-xs font-bold shadow-xs"
            >
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>Descuadrado</span>
            </div>
          )}
        </div>
      </div>

      {/* General Form Error Feedback */}
      {errors.general && (
        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-xs font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errors.general}</span>
        </div>
      )}

      {/* Single Consolidated Action Bar */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading || isSubmitting}
          className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancelar
        </button>

        <button
          type="submit"
          disabled={loading || isSubmitting}
          className={cn(
            'flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-md transition-all duration-150',
            loading || isSubmitting
              ? 'bg-slate-400 cursor-not-allowed'
              : !isBalanced
                ? 'bg-slate-800/90 dark:bg-slate-700 hover:bg-slate-900'
                : 'bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98]',
          )}
        >
          {loading || isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Guardando...</span>
            </>
          ) : (
            <span>Guardar Asiento</span>
          )}
        </button>
      </div>
    </form>
  );
}

export default FreeJournalEntryGrid;
