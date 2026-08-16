'use client';

import React, { useState, useEffect, useRef } from 'react';
import { BudgetMatrixRow, CashFlowDirection } from '@sistema-contable/shared';
import { formatCurrency } from '../../lib/utils';
import {
  MoreVertical,
  ArrowDownRight,
  ArrowUpRight,
  Wand2,
  Edit2,
  Trash2,
  Lock,
} from 'lucide-react';

export interface BudgetAccountCardProps {
  account: BudgetMatrixRow;
  activePeriodId: string;
  baseCurrency?: any;
  onAmountChange: (
    accountId: string,
    periodId: string,
    value: number,
    subRowId?: string | null,
  ) => void;
  onOpenDeepDive: (account: BudgetMatrixRow) => void;
  onOpenAutofill?: (account: BudgetMatrixRow) => void;
  onEditBalanceRow?: (account: BudgetMatrixRow) => void;
  onDeleteRow?: (accountId: string, subRowId?: string | null) => void;
  isDirty?: boolean;
  isLocked?: boolean;
}

export const BudgetAccountCard: React.FC<BudgetAccountCardProps> = ({
  account,
  activePeriodId,
  baseCurrency,
  onAmountChange,
  onOpenDeepDive,
  onOpenAutofill,
  onEditBalanceRow,
  onDeleteRow,
  isDirty = false,
  isLocked = false,
}) => {
  const currentAmount = account.amounts[activePeriodId] ?? 0;
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [inputValue, setInputValue] = useState<string>(String(currentAmount));
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Sync input value when active period or amounts change externally
  useEffect(() => {
    if (!isEditing) {
      setInputValue(String(currentAmount));
    }
  }, [currentAmount, isEditing, activePeriodId]);

  // Close menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen]);

  const handleInputBlur = () => {
    setIsEditing(false);
    const parsed = parseFloat(inputValue.replace(/\./g, '').replace(/,/g, '.')) || 0;
    if (parsed !== currentAmount) {
      onAmountChange(account.accountId, activePeriodId, parsed, account.subRowId);
    }
    setInputValue(String(parsed));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9]/g, '');
    setInputValue(val);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    } else if (e.key === 'Escape') {
      setInputValue(String(currentAmount));
      setIsEditing(false);
    }
  };

  const isBalanceRow =
    account.accountType === 'ASSET' ||
    account.accountType === 'LIABILITY' ||
    account.accountType === 'EQUITY';

  const isOutflow = account.cashFlowDirection === CashFlowDirection.EGRESO_EFECTIVO;

  return (
    <div
      className={`relative w-full bg-white dark:bg-slate-900 border rounded-xl p-3 shadow-sm transition-all duration-150 ${
        isDirty
          ? 'border-amber-500/60 ring-1 ring-amber-500/30 bg-amber-500/[0.02]'
          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
      }`}
    >
      {/* Top Header Row: Account Name, Balance Direction Badge & Actions */}
      <div className="flex items-center justify-between gap-2">
        <div
          className="flex-1 min-w-0 cursor-pointer"
          onClick={() => onOpenDeepDive(account)}
          title="Toca para ver desglose de 12 meses"
        >
          <div className="flex items-center space-x-1.5 min-w-0">
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
              {account.accountName}
              {account.subRowLabel && (
                <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400 ml-1.5">
                  ({account.subRowLabel})
                </span>
              )}
            </h4>
          </div>

          {/* Direction badge only for Balance Accounts (Assets / Liabilities) */}
          {isBalanceRow && account.cashFlowDirection && (
            <div className="flex items-center space-x-1.5 mt-0.5">
              <span
                className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                  isOutflow
                    ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                    : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                }`}
              >
                {isOutflow ? (
                  <ArrowDownRight className="w-3 h-3" />
                ) : (
                  <ArrowUpRight className="w-3 h-3" />
                )}
                <span>{isOutflow ? 'Salida de efectivo' : 'Entrada de efectivo'}</span>
              </span>
            </div>
          )}
        </div>

        {/* Action Buttons: Direct Rellenar (Wand) + 3-Dots for Balance Rows */}
        <div className="flex items-center space-x-1 shrink-0">
          {onOpenAutofill && (
            <button
              type="button"
              onClick={() => onOpenAutofill(account)}
              title="Rellenar"
              className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors cursor-pointer min-h-[36px]"
            >
              <Wand2 className="w-3.5 h-3.5" />
              <span>Rellenar</span>
            </button>
          )}

          {/* 3-Dots Menu ONLY for Balance accounts needing Edit/Delete */}
          {isBalanceRow && (onEditBalanceRow || onDeleteRow) && (
            <div className="relative shrink-0" ref={menuRef}>
              <button
                type="button"
                onClick={() => setIsMenuOpen((prev) => !prev)}
                aria-label="Opciones de cuenta"
                className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {/* Context Menu Dropdown */}
              {isMenuOpen && (
                <div className="absolute right-0 top-10 z-30 w-52 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl py-1 text-xs text-slate-700 dark:text-slate-300 animate-in fade-in zoom-in-95 duration-100">
                  {onEditBalanceRow && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        onEditBalanceRow(account);
                      }}
                      className="w-full flex items-center space-x-2 px-3 py-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-left cursor-pointer"
                    >
                      <Edit2 className="w-4 h-4 text-amber-500 shrink-0" />
                      <span>Editar cuenta / flujo</span>
                    </button>
                  )}

                  {onDeleteRow && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        if (
                          confirm(
                            `¿Desea eliminar la fila "${account.accountName}${
                              account.subRowLabel ? ` (${account.subRowLabel})` : ''
                            }" de este presupuesto?`,
                          )
                        ) {
                          onDeleteRow(account.accountId, account.subRowId);
                        }
                      }}
                      className="w-full flex items-center space-x-2 px-3 py-2.5 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-left cursor-pointer border-t border-slate-100 dark:border-slate-800"
                    >
                      <Trash2 className="w-4 h-4 text-rose-500 shrink-0" />
                      <span>Eliminar fila</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Middle Row: Numeric Amount Input for Active Month */}
      <div className="mt-2">
        <div className="relative flex items-center">
          {isEditing ? (
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              autoFocus
              disabled={isLocked}
              value={inputValue}
              onChange={handleInputChange}
              onBlur={handleInputBlur}
              onKeyDown={handleKeyDown}
              className="w-full min-h-[40px] bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-mono text-base font-bold px-3 py-1.5 rounded-lg border border-indigo-500 ring-2 ring-indigo-500/30 outline-none transition-all"
              placeholder="0"
            />
          ) : (
            <button
              type="button"
              disabled={isLocked}
              onClick={() => {
                if (!isLocked) {
                  setIsEditing(true);
                  setInputValue(String(currentAmount || ''));
                }
              }}
              className={`w-full min-h-[40px] px-3 py-1.5 rounded-lg flex items-center justify-between font-mono text-base font-bold text-left transition-all border ${
                isLocked
                  ? 'bg-slate-100 dark:bg-slate-800/40 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-800 cursor-not-allowed'
                  : 'bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:indigo-600 cursor-text'
              }`}
            >
              <span>{formatCurrency(currentAmount, baseCurrency)}</span>
              {isLocked ? (
                <Lock className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
              ) : (
                <span className="text-[11px] font-sans font-normal text-slate-400 dark:text-slate-500">
                  Toca para editar
                </span>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
