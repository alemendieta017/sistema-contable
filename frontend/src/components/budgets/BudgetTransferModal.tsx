'use client';

import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import {
  BudgetControlSection,
  BudgetControlCategory,
  BudgetControlItem,
  CashFlowDirection,
} from '@sistema-contable/shared';
import { ArrowLeftRight, X, AlertCircle, TrendingDown, TrendingUp } from 'lucide-react';

interface BudgetTransferModalProps {
  periodId: string;
  sections?: BudgetControlSection[];
  categories?: BudgetControlCategory[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const BudgetTransferModal: React.FC<BudgetTransferModalProps> = ({
  periodId,
  sections,
  categories,
  isOpen,
  onClose,
  onSuccess,
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

  const eligibleSourceItems = React.useMemo(
    () => allItems.filter((i) => i.available > 0),
    [allItems],
  );

  const [sourceAccountId, setSourceAccountId] = useState<string>('');
  const [targetAccountId, setTargetAccountId] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [reason, setReason] = useState<string>('');

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Initialize selected source account when opened or eligible items change
  useEffect(() => {
    if (isOpen && eligibleSourceItems.length > 0 && !sourceAccountId) {
      setSourceAccountId(eligibleSourceItems[0].accountId);
    }
  }, [isOpen, eligibleSourceItems, sourceAccountId]);

  const selectedSourceItem = allItems.find((i) => i.accountId === sourceAccountId);

  // Filter target accounts by matching cashFlowDirection
  const eligibleTargetItems = React.useMemo(() => {
    if (!selectedSourceItem) return [];
    return allItems.filter(
      (item) =>
        item.accountId !== sourceAccountId &&
        item.cashFlowDirection === selectedSourceItem.cashFlowDirection,
    );
  }, [allItems, sourceAccountId, selectedSourceItem]);

  // Reset target account if not in eligible list
  useEffect(() => {
    if (targetAccountId && !eligibleTargetItems.some((i) => i.accountId === targetAccountId)) {
      setTargetAccountId('');
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
        `El monto excede el saldo disponible de la cuenta origen (${formatCurrency(selectedSourceItem.available)}).`,
      );
      return;
    }

    setIsLoading(true);
    try {
      await api.budgets.transferControl({
        periodId,
        sourceAccountId,
        targetAccountId,
        amount: numAmount,
        reason: reason || undefined,
      });
      onSuccess();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al reasignar presupuesto.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-PY', { maximumFractionDigits: 2 }).format(val);
  };

  const isSourceOutflow =
    selectedSourceItem?.cashFlowDirection === CashFlowDirection.EGRESO_EFECTIVO;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <ArrowLeftRight className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">Reasignación de Presupuesto</h2>
              <p className="text-xs text-slate-400">
                Transferencia direccional entre cuentas en el periodo activo
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="flex items-center space-x-2.5 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Direction Indicator Badge */}
          {selectedSourceItem && (
            <div className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300">
              {isSourceOutflow ? (
                <>
                  <TrendingDown className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>
                    Flujo de <strong className="text-rose-400">Salida (-)</strong>: Solo se permite
                    transferir a otras cuentas de salida (Gastos, Inversiones, Deudas).
                  </span>
                </>
              ) : (
                <>
                  <TrendingUp className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    Flujo de <strong className="text-emerald-400">Entrada (+)</strong>: Solo se
                    permite transferir a otras cuentas de entrada (Ingresos, Rescates, Préstamos).
                  </span>
                </>
              )}
            </div>
          )}

          {/* Source Account */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Cuenta Origen (Cedente con Disponible):
            </label>
            <select
              value={sourceAccountId}
              onChange={(e) => setSourceAccountId(e.target.value)}
              className="w-full bg-slate-950 text-slate-100 border border-slate-800 rounded-xl px-3.5 py-2 text-xs font-medium focus:border-indigo-500 outline-none"
            >
              <option value="">Seleccione cuenta origen...</option>
              {eligibleSourceItems.map((item) => (
                <option key={item.accountId} value={item.accountId}>
                  {item.accountName} (Disponible: ${formatCurrency(item.available)})
                </option>
              ))}
            </select>
            {selectedSourceItem && (
              <p className="text-[11px] text-indigo-400 mt-1 font-mono">
                Saldo disponible para transferir: ${formatCurrency(selectedSourceItem.available)}
              </p>
            )}
          </div>

          {/* Target Account */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Cuenta Destino (Misma dirección de flujo):
            </label>
            <select
              value={targetAccountId}
              onChange={(e) => setTargetAccountId(e.target.value)}
              disabled={eligibleTargetItems.length === 0}
              className="w-full bg-slate-950 text-slate-100 border border-slate-800 rounded-xl px-3.5 py-2 text-xs font-medium focus:border-indigo-500 outline-none disabled:opacity-50"
            >
              <option value="">
                {eligibleTargetItems.length === 0
                  ? 'No hay cuentas destino con la misma dirección'
                  : 'Seleccione cuenta receptora...'}
              </option>
              {eligibleTargetItems.map((item) => (
                <option key={item.accountId} value={item.accountId}>
                  {item.accountName} (Presupuestado actual: ${formatCurrency(item.budgeted)})
                </option>
              ))}
            </select>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Monto a Transferir:
            </label>
            <input
              type="number"
              step="any"
              min="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Ej: 5000"
              className="w-full bg-slate-950 text-slate-100 border border-slate-800 rounded-xl px-3.5 py-2 text-xs font-mono focus:border-indigo-500 outline-none"
            />
          </div>

          {/* Reason / Justification */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Justificación / Motivo (Opcional):
            </label>
            <textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej: Reasignación de sobrante de publicidad hacia aporte en fondo de inversión..."
              className="w-full bg-slate-950 text-slate-100 border border-slate-800 rounded-xl px-3.5 py-2 text-xs focus:border-indigo-500 outline-none resize-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading || !sourceAccountId || !targetAccountId}
              className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
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
