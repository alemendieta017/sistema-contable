'use client';

import React, { useState } from 'react';
import { api } from '../../services/api';
import { BudgetControlCategory, BudgetControlItem } from '@sistema-contable/shared';
import { ArrowLeftRight, X, AlertCircle } from 'lucide-react';

interface BudgetTransferModalProps {
  periodId: string;
  categories: BudgetControlCategory[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const BudgetTransferModal: React.FC<BudgetTransferModalProps> = ({
  periodId,
  categories,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const allItems: BudgetControlItem[] = categories.flatMap((c) => c.items);
  const eligibleSourceItems = allItems.filter((i) => i.available > 0);

  const [sourceAccountId, setSourceAccountId] = useState<string>(
    eligibleSourceItems[0]?.accountId || '',
  );
  const [targetAccountId, setTargetAccountId] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [reason, setReason] = useState<string>('');

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const selectedSourceItem = allItems.find((i) => i.accountId === sourceAccountId);

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
        `El monto excede el disponible disponible de la cuenta origen (${selectedSourceItem.available}).`,
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <ArrowLeftRight className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">Reasignación de Presupuesto</h2>
              <p className="text-xs text-slate-400">
                Transferencia entre cuentas en el periodo activo
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
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

          {/* Source Account */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Cuenta Origen (Cedente):
            </label>
            <select
              value={sourceAccountId}
              onChange={(e) => setSourceAccountId(e.target.value)}
              className="w-full bg-slate-950 text-slate-100 border border-slate-800 rounded-xl px-3.5 py-2 text-xs font-medium focus:border-indigo-500 outline-none"
            >
              <option value="">Seleccione cuenta origen...</option>
              {eligibleSourceItems.map((item) => (
                <option key={item.accountId} value={item.accountId}>
                  {item.accountName} (Disponible: {formatCurrency(item.available)})
                </option>
              ))}
            </select>
            {selectedSourceItem && (
              <p className="text-[11px] text-indigo-400 mt-1 font-mono">
                Saldo disponible para transferir: {formatCurrency(selectedSourceItem.available)}
              </p>
            )}
          </div>

          {/* Target Account */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Cuenta Destino (Receptora):
            </label>
            <select
              value={targetAccountId}
              onChange={(e) => setTargetAccountId(e.target.value)}
              className="w-full bg-slate-950 text-slate-100 border border-slate-800 rounded-xl px-3.5 py-2 text-xs font-medium focus:border-indigo-500 outline-none"
            >
              <option value="">Seleccione cuenta destino...</option>
              {allItems
                .filter((item) => item.accountId !== sourceAccountId)
                .map((item) => (
                  <option key={item.accountId} value={item.accountId}>
                    {item.accountName} (Presupuestado actual: {formatCurrency(item.budgeted)})
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
              Justificación / Motivo:
            </label>
            <textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej: Cobertura de desfase en gastos operativos..."
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
              disabled={isLoading}
              className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
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
