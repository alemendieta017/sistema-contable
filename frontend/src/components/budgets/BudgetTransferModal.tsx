'use client';

import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { formatCurrency } from '../../lib/utils';
import {
  BudgetControlSection,
  BudgetControlCategory,
  BudgetControlItem,
  CashFlowDirection,
} from '@sistema-contable/shared';
import { ArrowLeftRight, X, AlertCircle, TrendingDown, TrendingUp, DollarSign } from 'lucide-react';

interface BudgetTransferModalProps {
  periodId: string;
  sections?: BudgetControlSection[];
  categories?: BudgetControlCategory[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialSourceAccountId?: string;
  baseCurrency?: any;
}

export const BudgetTransferModal: React.FC<BudgetTransferModalProps> = ({
  periodId,
  sections,
  categories,
  isOpen,
  onClose,
  onSuccess,
  initialSourceAccountId,
  baseCurrency,
}) => {
  // Collect all items from sections or fallback categories
  const allItems: BudgetControlItem[] = React.useMemo(() => {
    if (sections && sections.length > 0) {
      return sections.flatMap((s) => s.items);
    }
    if (categories && categories.length > 0) {
      return categories.flatMap((c) => c.items);
    }
    return [];
  }, [sections, categories]);

  // Helper to determine flow direction reliably
  const getItemDirection = (item: BudgetControlItem): CashFlowDirection => {
    if (item.cashFlowDirection) {
      return item.cashFlowDirection;
    }
    // Fallback: Income accounts are Inflow (+), others are Outflow (-)
    return CashFlowDirection.EGRESO_EFECTIVO;
  };

  const eligibleSourceItems = React.useMemo(
    () => allItems.filter((i) => i.available > 0),
    [allItems],
  );

  const [sourceAccountId, setSourceAccountId] = useState<string>(() => {
    if (
      initialSourceAccountId &&
      eligibleSourceItems.some((i) => i.accountId === initialSourceAccountId)
    ) {
      return initialSourceAccountId;
    }
    return eligibleSourceItems[0]?.accountId || '';
  });
  const [targetAccountId, setTargetAccountId] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [reason, setReason] = useState<string>('');

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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

  // Initialize selected source account when opened or eligible items change
  useEffect(() => {
    if (isOpen && eligibleSourceItems.length > 0) {
      if (
        initialSourceAccountId &&
        eligibleSourceItems.some((i) => i.accountId === initialSourceAccountId)
      ) {
        setSourceAccountId(initialSourceAccountId);
      } else if (
        !sourceAccountId ||
        !eligibleSourceItems.some((i) => i.accountId === sourceAccountId)
      ) {
        setSourceAccountId(eligibleSourceItems[0].accountId);
      }
    }
  }, [isOpen, eligibleSourceItems, initialSourceAccountId, sourceAccountId]);

  const selectedSourceItem = allItems.find((i) => i.accountId === sourceAccountId);

  // Filter target accounts by matching cashFlowDirection
  const eligibleTargetItems = React.useMemo(() => {
    if (!selectedSourceItem) return [];
    const sourceDir = getItemDirection(selectedSourceItem);
    return allItems.filter(
      (item) => item.accountId !== sourceAccountId && getItemDirection(item) === sourceDir,
    );
  }, [allItems, sourceAccountId, selectedSourceItem]);

  // Reset target account if not in eligible list
  useEffect(() => {
    if (targetAccountId && !eligibleTargetItems.some((i) => i.accountId === targetAccountId)) {
      setTargetAccountId(eligibleTargetItems.length > 0 ? eligibleTargetItems[0].accountId : '');
    }
  }, [eligibleTargetItems, targetAccountId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const numAmount = parseFloat(amount);
    if (!sourceAccountId || !targetAccountId) {
      setErrorMsg('Seleccione cuenta origen y cuenta destino.');
      return;
    }
    if (sourceAccountId === targetAccountId) {
      setErrorMsg('La cuenta origen y destino deben ser distintas.');
      return;
    }
    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMsg('Ingrese un monto positivo a transferir.');
      return;
    }
    if (selectedSourceItem && numAmount > selectedSourceItem.available) {
      setErrorMsg(
        `El monto (${formatCurrency(numAmount, baseCurrency)}) excede el saldo disponible de la cuenta origen (${formatCurrency(selectedSourceItem.available, baseCurrency)}).`,
      );
      return;
    }

    setIsLoading(true);
    try {
      await api.budgets.transferFunds({
        periodId,
        sourceAccountId,
        targetAccountId,
        amount: numAmount,
        reason: reason.trim() || undefined,
      });
      onSuccess();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al reasignar presupuesto.');
    } finally {
      setIsLoading(false);
    }
  };

  const isSourceOutflow =
    selectedSourceItem &&
    getItemDirection(selectedSourceItem) === CashFlowDirection.EGRESO_EFECTIVO;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full sm:max-w-lg bg-white dark:bg-slate-900 border-t sm:border border-slate-200 dark:border-slate-800 rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[90vh] animate-in slide-in-from-bottom-full sm:slide-in-from-none sm:zoom-in-95 duration-200">
        {/* Mobile Pull Handle Indicator */}
        <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto my-2.5 sm:hidden shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              <ArrowLeftRight className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Reasignación de Presupuesto
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Transferencia direccional entre cuentas en el periodo activo
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 flex items-center justify-center"
            title="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 pb-8 sm:pb-6">
          {errorMsg && (
            <div className="flex items-center space-x-2.5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Direction Indicator Badge */}
          {selectedSourceItem && (
            <div className="flex items-start space-x-2.5 px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300">
              {isSourceOutflow ? (
                <>
                  <TrendingDown className="w-4 h-4 text-rose-500 dark:text-rose-400 shrink-0 mt-0.5" />
                  <div className="leading-snug">
                    <span className="font-semibold text-rose-600 dark:text-rose-400">
                      Flujo de Salida (-):
                    </span>{' '}
                    Solo se permite transferir a otras cuentas de salida (Gastos de Vida, Aportes a
                    Inversiones o Pagos de Deuda).
                  </div>
                </>
              ) : (
                <>
                  <TrendingUp className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div className="leading-snug">
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      Flujo de Entrada (+):
                    </span>{' '}
                    Solo se permite transferir a otras cuentas de entrada (Ingresos Operativos,
                    Rescates de Inversión o Préstamos Recibidos).
                  </div>
                </>
              )}
            </div>
          )}

          {/* Source Account */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Cuenta Origen (Cedente con Disponible):
            </label>
            <select
              value={sourceAccountId}
              onChange={(e) => setSourceAccountId(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-medium focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none min-h-[44px]"
            >
              <option value="">Seleccione cuenta origen...</option>
              {eligibleSourceItems.map((item) => (
                <option key={item.accountId} value={item.accountId}>
                  {item.accountName} (Disponible: {formatCurrency(item.available, baseCurrency)})
                </option>
              ))}
            </select>
            {selectedSourceItem && (
              <p className="text-[11px] text-indigo-600 dark:text-indigo-400 mt-1.5 font-mono font-semibold">
                Saldo disponible transferible:{' '}
                {formatCurrency(selectedSourceItem.available, baseCurrency)}
              </p>
            )}
          </div>

          {/* Target Account */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Cuenta Destino (Misma dirección de flujo):
            </label>
            <select
              value={targetAccountId}
              onChange={(e) => setTargetAccountId(e.target.value)}
              disabled={eligibleTargetItems.length === 0}
              className="w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-medium focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none disabled:opacity-50 min-h-[44px]"
            >
              <option value="">
                {eligibleTargetItems.length === 0
                  ? 'No hay cuentas destino con la misma dirección'
                  : 'Seleccione cuenta receptora...'}
              </option>
              {eligibleTargetItems.map((item) => (
                <option key={item.accountId} value={item.accountId}>
                  {item.accountName} (Presupuesto actual:{' '}
                  {formatCurrency(item.budgeted, baseCurrency)})
                </option>
              ))}
            </select>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
              <span>Monto a Transferir:</span>
            </label>
            <input
              type="number"
              inputMode="numeric"
              pattern="[0-9]*"
              step="any"
              min="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Ej: 150000"
              className="w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none min-h-[44px]"
            />
          </div>

          {/* Reason / Justification */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Justificación / Motivo (Opcional):
            </label>
            <textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej: Reasignación de remanente de suministros para reforzar inversión en fondos..."
              className="w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none resize-none min-h-[50px]"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors cursor-pointer min-h-[44px]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading || !sourceAccountId || !targetAccountId}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all cursor-pointer min-h-[44px]"
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              <span>{isLoading ? 'Procesando...' : 'Confirmar Transferencia'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
