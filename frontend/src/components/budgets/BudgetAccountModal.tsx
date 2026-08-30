'use client';

import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { CashFlowDirection, BudgetMatrixSectionKey } from '@sistema-contable/shared';
import { useIsMobile } from '../../hooks/useMediaQuery';
import {
  X,
  Plus,
  Save,
  ArrowDownRight,
  ArrowUpRight,
  Landmark,
  CreditCard,
  Layers,
  Edit2,
} from 'lucide-react';

export interface BudgetAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetSection?: 'ASSET' | 'LIABILITY' | BudgetMatrixSectionKey | string | null;
  editRow?: {
    accountId: string;
    accountName: string;
    accountCode?: string;
    accountType?: string;
    subRowId?: string | null;
    subRowLabel?: string | null;
    cashFlowDirection?: CashFlowDirection | null;
  } | null;
  onSave: (data: {
    account: { id: string; name: string; code: string; type: string };
    label: string;
    direction: CashFlowDirection;
    subRowId?: string | null;
  }) => void;
}

interface AccountItem {
  id: string;
  name: string;
  code?: string;
  type: string;
  isCashOrBank?: boolean;
  status?: string;
}

export const BudgetAccountModal: React.FC<BudgetAccountModalProps> = ({
  isOpen,
  onClose,
  targetSection,
  editRow,
  onSave,
}) => {
  const isMobile = useIsMobile();
  const isEditMode = !!editRow;

  const isAsset =
    targetSection === 'ASSET' ||
    targetSection === BudgetMatrixSectionKey.AHORRO_INVERSIONES ||
    editRow?.accountType === 'ASSET';

  const isLiability =
    targetSection === 'LIABILITY' ||
    targetSection === BudgetMatrixSectionKey.DEUDAS_FINANCIACION ||
    targetSection === 'FINANCIAMIENTO_AHORRO' ||
    editRow?.accountType === 'LIABILITY' ||
    editRow?.accountType === 'EQUITY';

  const [accounts, setAccounts] = useState<AccountItem[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>(editRow?.accountId || '');
  const [direction, setDirection] = useState<CashFlowDirection>(
    editRow?.cashFlowDirection || CashFlowDirection.EGRESO_EFECTIVO,
  );
  const [label, setLabel] = useState<string>(editRow?.subRowLabel || '');
  const [isLoadingAccounts, setIsLoadingAccounts] = useState<boolean>(true);

  // Load accounts when modal opens
  useEffect(() => {
    if (!isOpen) return;

    async function loadAccounts() {
      setIsLoadingAccounts(true);
      try {
        const list = await api.accounts.list('ACTIVE');
        const rawAccounts: AccountItem[] = Array.isArray(list) ? list : list?.accounts || [];

        const filtered = rawAccounts.filter((acc) => {
          if (acc.status && acc.status !== 'ACTIVE' && (!editRow || editRow.accountId !== acc.id))
            return false;
          // Capital / Equity and system accounts cannot be budgeted
          if (
            (acc as any).isSystem ||
            acc.type === 'EQUITY' ||
            acc.name.toLowerCase() === 'capital'
          ) {
            return false;
          }
          if (isAsset) {
            return acc.type === 'ASSET' && !acc.isCashOrBank;
          } else if (isLiability) {
            return acc.type === 'LIABILITY';
          } else {
            return (acc.type === 'ASSET' || acc.type === 'LIABILITY') && !acc.isCashOrBank;
          }
        });

        setAccounts(filtered);

        if (editRow) {
          setSelectedAccountId(editRow.accountId);
          setLabel(editRow.subRowLabel || '');
          setDirection(editRow.cashFlowDirection || CashFlowDirection.EGRESO_EFECTIVO);
        } else {
          if (filtered.length > 0) {
            const firstAcc = filtered[0];
            setSelectedAccountId(firstAcc.id);
            const defaultLabel = isAsset
              ? `Aporte ${firstAcc.name}`
              : `Pago Cuota ${firstAcc.name}`;
            setLabel(defaultLabel);
          } else {
            setSelectedAccountId('');
            setLabel('');
          }
          setDirection(CashFlowDirection.EGRESO_EFECTIVO);
        }
      } catch (err) {
        console.error('Error al cargar cuentas de balance:', err);
      } finally {
        setIsLoadingAccounts(false);
      }
    }

    loadAccounts();
  }, [isOpen, isAsset, isLiability, editRow]);

  // Update default label when account changes (only in create mode)
  const handleAccountChange = (accId: string) => {
    setSelectedAccountId(accId);
    if (isEditMode) return;

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

  // Update default label when direction changes (only in create mode)
  const handleDirectionChange = (newDir: CashFlowDirection) => {
    setDirection(newDir);
    if (isEditMode) return;

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

  // Close modal on Escape key
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
    if (!selectedAccountId && !editRow) return;

    let targetAccount = accounts.find((a) => a.id === selectedAccountId);
    if (!targetAccount && editRow) {
      targetAccount = {
        id: editRow.accountId,
        name: editRow.accountName,
        code: editRow.accountCode || '',
        type: editRow.accountType || (isAsset ? 'ASSET' : 'LIABILITY'),
      };
    }

    if (!targetAccount) return;

    const finalLabel = label.trim() || targetAccount.name;
    onSave({
      account: {
        id: targetAccount.id,
        name: targetAccount.name,
        code: targetAccount.code || targetAccount.name.substring(0, 8),
        type: targetAccount.type,
      },
      label: finalLabel,
      direction,
      subRowId: editRow?.subRowId || null,
    });
    onClose();
  };

  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (isMobile) {
      e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      {/* Backdrop dismiss gesture / click */}
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

      {/* Dialog: Modal on Desktop / Bottom Sheet Drawer on Mobile */}
      <div
        className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-t-3xl sm:rounded-2xl shadow-2xl max-w-lg w-full p-5 sm:p-6 space-y-4 sm:space-y-5 font-sans text-slate-900 dark:text-slate-100 animate-in slide-in-from-bottom sm:zoom-in-95 duration-200 z-10 max-h-[92vh] sm:max-h-[90vh] flex flex-col overflow-hidden"
        style={{
          paddingBottom: isMobile ? 'max(1.25rem, env(safe-area-inset-bottom))' : undefined,
        }}
      >
        {/* Mobile Pull Handle Bar */}
        {isMobile && (
          <div className="w-full flex items-center justify-center -mt-1 pb-2 cursor-grab active:cursor-grabbing">
            <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full" />
          </div>
        )}

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center space-x-2.5">
            <div
              className={`p-2 rounded-xl ${
                isEditMode
                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                  : isAsset
                    ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                    : 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20'
              }`}
            >
              {isEditMode ? (
                <Edit2 className="w-5 h-5" />
              ) : isAsset ? (
                <Landmark className="w-5 h-5" />
              ) : (
                <CreditCard className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {isEditMode
                  ? 'Editar Fila Presupuestaria'
                  : isAsset
                    ? 'Presupuestar Ahorro o Inversión'
                    : 'Presupuestar Deuda o Préstamo'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isEditMode
                  ? 'Modifique el concepto o la dirección del flujo para esta partida.'
                  : isAsset
                    ? 'Agregue una cuenta de activo para aportes o rescates de fondos.'
                    : 'Agregue una cuenta de pasivo para pagos de cuotas o nuevos préstamos.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar ventana"
            className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto flex-1 pr-0.5">
          {/* 1. Account Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
              <span>Cuenta Contable:</span>
            </label>
            {isEditMode ? (
              <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-indigo-700 dark:text-indigo-300 min-h-[44px] flex items-center">
                {editRow.accountCode ? `${editRow.accountCode} — ` : ''}
                {editRow.accountName}
              </div>
            ) : isLoadingAccounts ? (
              <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-500 dark:text-slate-400 min-h-[44px] flex items-center">
                Cargando cuentas disponibles...
              </div>
            ) : accounts.length === 0 ? (
              <div className="p-3 bg-rose-50 dark:bg-slate-950 border border-rose-200 dark:border-slate-800 rounded-xl text-xs text-rose-600 dark:text-rose-400">
                {isAsset
                  ? 'No se encontraron cuentas de activo registradas. Cree una cuenta de activo primero en el Plan de Cuentas.'
                  : 'No se encontraron cuentas de pasivo registradas. Cree una cuenta de pasivo primero en el Plan de Cuentas.'}
              </div>
            ) : (
              <select
                value={selectedAccountId}
                onChange={(e) => handleAccountChange(e.target.value)}
                onFocus={handleInputFocus}
                className="w-full bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-xl p-3 outline-none focus:border-indigo-500 font-medium min-h-[44px]"
              >
                {accounts.map((acc) => (
                  <option
                    key={acc.id}
                    value={acc.id}
                    className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                  >
                    {acc.code ? `${acc.code} — ` : ''}
                    {acc.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* 2. Flow Direction Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Dirección del Flujo de Efectivo:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Option 1: Salida de efectivo */}
              <button
                type="button"
                onClick={() => handleDirectionChange(CashFlowDirection.EGRESO_EFECTIVO)}
                className={`flex flex-col p-3 rounded-xl border text-left transition-all cursor-pointer min-h-[52px] ${
                  direction === CashFlowDirection.EGRESO_EFECTIVO
                    ? 'bg-rose-500/10 border-rose-500/60 ring-1 ring-rose-500/40 text-rose-800 dark:text-rose-200'
                    : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-850 hover:text-slate-800 dark:hover:text-slate-300'
                }`}
              >
                <div className="flex items-center space-x-1.5 font-bold text-xs mb-0.5">
                  <ArrowDownRight className="w-4 h-4 text-rose-500 dark:text-rose-400 shrink-0" />
                  <span>{isAsset ? 'Aporte / Inversión' : 'Pago de Cuota / Amortización'}</span>
                </div>
                <span className="text-[11px] text-rose-600 dark:text-rose-400/80 font-medium">
                  {isAsset
                    ? '[-] Salida de dinero hacia el activo'
                    : '[-] Salida de dinero para pagar deuda'}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                  {isAsset
                    ? 'Ahorro, aportes a fondos mutuos o compra de activos'
                    : 'Amortización de préstamos, créditos o tarjetas'}
                </span>
              </button>

              {/* Option 2: Entrada de efectivo */}
              <button
                type="button"
                onClick={() => handleDirectionChange(CashFlowDirection.INGRESO_EFECTIVO)}
                className={`flex flex-col p-3 rounded-xl border text-left transition-all cursor-pointer min-h-[52px] ${
                  direction === CashFlowDirection.INGRESO_EFECTIVO
                    ? 'bg-emerald-500/10 border-emerald-500/60 ring-1 ring-emerald-500/40 text-emerald-800 dark:text-emerald-200'
                    : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-855 hover:text-slate-800 dark:hover:text-slate-300'
                }`}
              >
                <div className="flex items-center space-x-1.5 font-bold text-xs mb-0.5">
                  <ArrowUpRight className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0" />
                  <span>
                    {isAsset ? 'Rescate / Desinversión' : 'Nuevo Préstamo / Financiación'}
                  </span>
                </div>
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400/80 font-medium">
                  {isAsset
                    ? '[+] Entrada de dinero a caja'
                    : '[+] Entrada de dinero por nuevo crédito'}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                  {isAsset
                    ? 'Retiro de fondos, venta de activos o rescates'
                    : 'Desembolso de nuevo préstamo o financiación'}
                </span>
              </button>
            </div>
          </div>

          {/* 3. Concept / Label Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Concepto / Etiqueta Descriptiva:
            </label>
            <input
              type="text"
              required
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              onFocus={handleInputFocus}
              placeholder="Ej: Aporte Fondo Mutuo, Pago Cuota Auto, Préstamo Banco..."
              className="w-full bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-xl p-3 outline-none focus:border-indigo-500 font-medium min-h-[44px]"
            />
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors cursor-pointer min-h-[44px]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={(!isEditMode && accounts.length === 0) || (!selectedAccountId && !editRow)}
              className="flex items-center space-x-1.5 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-colors cursor-pointer min-h-[44px]"
            >
              {isEditMode ? <Save className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
              <span>
                {isEditMode
                  ? 'Guardar Cambios'
                  : isAsset
                    ? 'Agregar Fila de Activo'
                    : 'Agregar Fila de Deuda'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
