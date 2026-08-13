'use client';

import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { CashFlowDirection, BudgetMatrixSectionKey } from '@sistema-contable/shared';
import { X, Plus, ArrowDownRight, ArrowUpRight, Landmark, CreditCard, Layers } from 'lucide-react';

interface AddBalanceBudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetBlock: 'ASSET' | 'LIABILITY' | BudgetMatrixSectionKey | string;
  onAdd: (
    account: { id: string; name: string; code: string; type: string },
    subRowLabel: string,
    cashFlowDirection: CashFlowDirection,
  ) => void;
}

interface AccountItem {
  id: string;
  name: string;
  code?: string;
  type: string;
  isCashOrBank?: boolean;
  status?: string;
}

export const AddBalanceBudgetModal: React.FC<AddBalanceBudgetModalProps> = ({
  isOpen,
  onClose,
  targetBlock,
  onAdd,
}) => {
  const isAsset =
    targetBlock === 'ASSET' || targetBlock === BudgetMatrixSectionKey.AHORRO_INVERSIONES;

  const [accounts, setAccounts] = useState<AccountItem[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [direction, setDirection] = useState<CashFlowDirection>(CashFlowDirection.EGRESO_EFECTIVO);
  const [label, setLabel] = useState<string>('');
  const [isLoadingAccounts, setIsLoadingAccounts] = useState<boolean>(true);

  // Fetch accounts on open
  useEffect(() => {
    if (!isOpen) return;

    async function loadAccounts() {
      setIsLoadingAccounts(true);
      try {
        const list = await api.accounts.list();
        const rawAccounts: AccountItem[] = Array.isArray(list) ? list : list?.accounts || [];

        // Filter based on targetBlock
        const filtered = rawAccounts.filter((acc) => {
          if (acc.status && acc.status !== 'ACTIVE') return false;
          if (isAsset) {
            return acc.type === 'ASSET' && !acc.isCashOrBank;
          } else {
            return acc.type === 'LIABILITY' || acc.type === 'EQUITY';
          }
        });

        setAccounts(filtered);
        if (filtered.length > 0) {
          setSelectedAccountId(filtered[0].id);
          const defaultLabel = isAsset
            ? `Aporte ${filtered[0].name}`
            : `Pago Cuota ${filtered[0].name}`;
          setLabel(defaultLabel);
        } else {
          setSelectedAccountId('');
          setLabel('');
        }
      } catch (err) {
        console.error('Error al cargar cuentas de balance:', err);
      } finally {
        setIsLoadingAccounts(false);
      }
    }

    loadAccounts();
  }, [isOpen, isAsset]);

  // Update default label when account or direction changes
  const handleAccountChange = (accId: string) => {
    setSelectedAccountId(accId);
    const selectedAcc = accounts.find((a) => a.id === accId);
    if (!selectedAcc) return;

    if (isAsset) {
      if (direction === CashFlowDirection.EGRESO_EFECTIVO) {
        setLabel(`Aporte ${selectedAcc.name}`);
      } else {
        setLabel(`Rescate ${selectedAcc.name}`);
      }
    } else {
      if (direction === CashFlowDirection.EGRESO_EFECTIVO) {
        setLabel(`Pago Cuota ${selectedAcc.name}`);
      } else {
        setLabel(`Financiación ${selectedAcc.name}`);
      }
    }
  };

  const handleDirectionChange = (newDir: CashFlowDirection) => {
    setDirection(newDir);
    const selectedAcc = accounts.find((a) => a.id === selectedAccountId);
    if (!selectedAcc) return;

    if (isAsset) {
      if (newDir === CashFlowDirection.EGRESO_EFECTIVO) {
        setLabel(`Aporte ${selectedAcc.name}`);
      } else {
        setLabel(`Rescate ${selectedAcc.name}`);
      }
    } else {
      if (newDir === CashFlowDirection.EGRESO_EFECTIVO) {
        setLabel(`Pago Cuota ${selectedAcc.name}`);
      } else {
        setLabel(`Financiación ${selectedAcc.name}`);
      }
    }
  };

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

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccountId) return;
    const selectedAcc = accounts.find((a) => a.id === selectedAccountId);
    if (!selectedAcc) return;

    const finalLabel = label.trim() || selectedAcc.name;
    onAdd(
      {
        id: selectedAcc.id,
        name: selectedAcc.name,
        code: selectedAcc.code || selectedAcc.name.substring(0, 8),
        type: selectedAcc.type,
      },
      finalLabel,
      direction,
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl max-w-lg w-full p-6 space-y-5 font-sans text-slate-100 animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2.5">
            <div
              className={`p-2 rounded-lg ${
                isAsset
                  ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                  : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
              }`}
            >
              {isAsset ? <Landmark className="w-5 h-5" /> : <CreditCard className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">
                {isAsset
                  ? 'Presupuestar Activo (Ahorro e Inversiones)'
                  : 'Presupuestar Deuda (Financiación)'}
              </h3>
              <p className="text-xs text-slate-400">
                {isAsset
                  ? 'Agregue una cuenta de activo con intención de aporte o rescate de fondos.'
                  : 'Agregue una cuenta de pasivo con intención de amortización o nueva financiación.'}
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

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Account Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              <span>Seleccionar Cuenta Contable de Balance:</span>
            </label>
            {isLoadingAccounts ? (
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-400">
                Cargando cuentas disponibles...
              </div>
            ) : accounts.length === 0 ? (
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs text-rose-400">
                {isAsset
                  ? 'No se encontraron cuentas de activo registradas. Cree una cuenta de activo primero en el Plan de Cuentas.'
                  : 'No se encontraron cuentas de pasivo registradas. Cree una cuenta de pasivo primero en el Plan de Cuentas.'}
              </div>
            ) : (
              <select
                value={selectedAccountId}
                onChange={(e) => handleAccountChange(e.target.value)}
                className="w-full bg-slate-950 text-xs text-slate-100 border border-slate-800 rounded-lg p-2.5 outline-none focus:border-indigo-500 font-medium"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id} className="bg-slate-900 text-slate-100">
                    {acc.code ? `${acc.code} - ` : ''}
                    {acc.name} ({acc.type})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Intention / Cash Flow Direction Radio Buttons */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Intención de Movimiento / Dirección del Flujo:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Option 1: Outflow (EGRESO_EFECTIVO) */}
              <button
                type="button"
                onClick={() => handleDirectionChange(CashFlowDirection.EGRESO_EFECTIVO)}
                className={`flex flex-col p-3 rounded-lg border text-left transition-all cursor-pointer ${
                  direction === CashFlowDirection.EGRESO_EFECTIVO
                    ? 'bg-rose-500/15 border-rose-500/60 ring-1 ring-rose-500/40 text-rose-200'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-850 hover:text-slate-300'
                }`}
              >
                <div className="flex items-center space-x-1.5 font-bold text-xs mb-1">
                  <ArrowDownRight className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{isAsset ? '[-] Aporte / Inversión' : '[-] Pago / Amortización'}</span>
                </div>
                <span className="text-[11px] text-rose-400/80 font-mono">
                  Salida de Efectivo (Flujo -)
                </span>
                <span className="text-[10px] text-slate-400 mt-1">
                  {isAsset
                    ? 'Compra de activos, aportes a FCI o fondos'
                    : 'Pago de cuotas de préstamos o deudas'}
                </span>
              </button>

              {/* Option 2: Inflow (INGRESO_EFECTIVO) */}
              <button
                type="button"
                onClick={() => handleDirectionChange(CashFlowDirection.INGRESO_EFECTIVO)}
                className={`flex flex-col p-3 rounded-lg border text-left transition-all cursor-pointer ${
                  direction === CashFlowDirection.INGRESO_EFECTIVO
                    ? 'bg-emerald-500/15 border-emerald-500/60 ring-1 ring-emerald-500/40 text-emerald-200'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-850 hover:text-slate-300'
                }`}
              >
                <div className="flex items-center space-x-1.5 font-bold text-xs mb-1">
                  <ArrowUpRight className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    {isAsset ? '[+] Rescate / Desinversión' : '[+] Nuevo Préstamo / Financiación'}
                  </span>
                </div>
                <span className="text-[11px] text-emerald-400/80 font-mono">
                  Entrada de Efectivo (Flujo +)
                </span>
                <span className="text-[10px] text-slate-400 mt-1">
                  {isAsset
                    ? 'Venta de activos, rescates de inversiones'
                    : 'Desembolso de créditos o financiación'}
                </span>
              </button>
            </div>
          </div>

          {/* Sub-Row / Row Label */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Etiqueta de la Fila Presupuestaria:
            </label>
            <input
              type="text"
              required
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Ej: Aporte Fondo Mutuo, Pago Cuota Auto..."
              className="w-full bg-slate-950 text-xs text-slate-100 border border-slate-800 rounded-lg p-2.5 outline-none focus:border-indigo-500 font-medium"
            />
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={accounts.length === 0 || !selectedAccountId}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isAsset ? 'Agregar Fila de Activo' : 'Agregar Fila de Deuda'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
