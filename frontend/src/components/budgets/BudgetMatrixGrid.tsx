'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  BudgetMatrixResponse,
  BudgetMatrixRow,
  BudgetMatrixSectionKey,
  CashFlowDirection,
} from '@sistema-contable/shared';
import {
  Plus,
  MoreHorizontal,
  ChevronDown,
  ChevronRight,
  History,
  Edit2,
  Trash2,
  Repeat,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { formatCurrency } from '../../lib/utils';
import { BudgetAccountModal } from './BudgetAccountModal';

export interface BudgetMatrixGridProps {
  matrixData: BudgetMatrixResponse;
  viewMode?: 'monthly' | 'four_months' | 'six_months' | 'annual' | 'quarterly';
  activePeriodId?: string;
  baseCurrency?: any;
  onCellChange: (
    accountId: string,
    periodId: string,
    value: number,
    subRowId?: string | null,
  ) => void;
  onPasteBatch?: (
    updates: Array<{
      accountId: string;
      periodId: string;
      amount: number;
      subRowId?: string | null;
    }>,
  ) => void;
  onSave?: () => void;
  onOpenAutofill?: (row: BudgetMatrixRow) => void;
  onDirectionChange?: (
    accountId: string,
    subRowId: string | null,
    direction: CashFlowDirection,
  ) => void;
  onAddBalanceRow?: (
    account: { id: string; name: string; code: string; type: string },
    label: string,
    direction: CashFlowDirection,
  ) => void;
  onEditBalanceRow?: (
    account: { id: string; name: string; code: string; type: string },
    label: string,
    direction: CashFlowDirection,
    subRowId?: string | null,
  ) => void;
  onDeleteRow?: (accountId: string, subRowId?: string | null) => void;
  isSaving?: boolean;
  dirtyCells: Set<string>;
}

// Robust numeric parser supporting both zero-decimal (PYG) and decimal currencies
function parseNumericValue(valueStr: string, decimalPlaces: number = 0): number {
  if (!valueStr) return 0;
  let str = valueStr.trim();
  if (!str) return 0;

  if (decimalPlaces === 0) {
    const digitsOnly = str.replace(/[^\d]/g, '');
    if (!digitsOnly) return 0;
    const parsed = parseInt(digitsOnly, 10);
    return isNaN(parsed) ? 0 : Math.max(0, parsed);
  }

  // Currencies with decimals
  if (str.includes('.') && str.includes(',')) {
    if (str.lastIndexOf(',') > str.lastIndexOf('.')) {
      str = str.replace(/\./g, '').replace(',', '.');
    } else {
      str = str.replace(/,/g, '');
    }
  } else if (str.includes(',')) {
    str = str.replace(',', '.');
  } else if (str.includes('.')) {
    const dotsCount = (str.match(/\./g) || []).length;
    if (dotsCount > 1) {
      str = str.replace(/\./g, '');
    }
  }

  const parsed = parseFloat(str.replace(/[^0-9.-]/g, ''));
  return isNaN(parsed) ? 0 : Math.max(0, parsed);
}

// Format integer with thousand separator
function formatThousandNumber(val: number | string): string {
  if (val === '' || val === undefined || val === null) return '';
  const digits = String(val).replace(/[^\d]/g, '');
  if (!digits) return '';
  const num = parseInt(digits, 10);
  return new Intl.NumberFormat('es-PY').format(num);
}

interface CellIdentifier {
  accountId: string;
  subRowId: string | null;
  periodId: string;
}

export const BudgetMatrixGrid: React.FC<BudgetMatrixGridProps> = ({
  matrixData,
  viewMode = 'monthly',
  activePeriodId,
  baseCurrency,
  onCellChange,
  onPasteBatch: _onPasteBatch,
  onOpenAutofill,
  onAddBalanceRow,
  onEditBalanceRow,
  onDeleteRow,
  dirtyCells,
}) => {
  const { periods, sections } = matrixData;

  // Selected period for monthly mode (defaults to first open period or activePeriodId)
  const currentPeriod =
    periods.find((p) => p.id === activePeriodId) ||
    periods.find((p) => p.status !== 'CLOSED') ||
    periods[0];

  // Cell editing state (uniquely keyed by accountId + subRowId + periodId)
  const [editingCell, setEditingCell] = useState<CellIdentifier | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [openMenuRowKey, setOpenMenuRowKey] = useState<string | null>(null);

  // Unified modal state
  const [accountModalState, setAccountModalState] = useState<{
    isOpen: boolean;
    targetSection: BudgetMatrixSectionKey | null;
    editRow: BudgetMatrixRow | null;
  }>({
    isOpen: false,
    targetSection: null,
    editRow: null,
  });

  // Collapsed sections tracking
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  const toggleSectionCollapse = (sectionKey: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionKey)) {
        next.delete(sectionKey);
      } else {
        next.add(sectionKey);
      }
      return next;
    });
  };

  const inputRef = useRef<HTMLInputElement>(null);

  // Close menus on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (openMenuRowKey && !(e.target as HTMLElement).closest('.row-options-menu-container')) {
        setOpenMenuRowKey(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openMenuRowKey]);

  // Focus and select input when editing begins
  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingCell]);

  const startEditing = (row: BudgetMatrixRow, periodId: string) => {
    const targetPeriod = periods.find((p) => p.id === periodId);
    if (!targetPeriod || targetPeriod.status === 'CLOSED' || row.isParent) return;

    const currentAmt = row.amounts[periodId] ?? 0;
    setEditValue(currentAmt === 0 ? '' : formatThousandNumber(currentAmt));
    setEditingCell({
      accountId: row.accountId,
      subRowId: row.subRowId || null,
      periodId,
    });
  };

  const commitEdit = () => {
    if (!editingCell) return;
    const decPlaces = baseCurrency?.decimalPlaces ?? 0;
    const parsed = parseNumericValue(editValue, decPlaces);
    onCellChange(editingCell.accountId, editingCell.periodId, parsed, editingCell.subRowId || null);
    setEditingCell(null);
  };

  const cancelEdit = () => {
    setEditingCell(null);
  };

  // Keyboard navigation for inline table editing
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEdit();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      commitEdit();
    }
  };

  // Replicate to all open periods across the entire matrix
  const handleReplicateAllPeriods = (row: BudgetMatrixRow, fromPeriodId?: string) => {
    const pId = fromPeriodId || currentPeriod?.id || periods[0]?.id;
    const fromAmount = row.amounts[pId] ?? 0;
    periods.forEach((p) => {
      if (p.status !== 'CLOSED') {
        onCellChange(row.accountId, p.id, fromAmount, row.subRowId || null);
      }
    });
    setOpenMenuRowKey(null);
  };

  const handleOpenEditBalanceModal = (row: BudgetMatrixRow, secKey: BudgetMatrixSectionKey) => {
    setOpenMenuRowKey(null);
    setAccountModalState({
      isOpen: true,
      targetSection: secKey,
      editRow: row,
    });
  };

  const handleDeleteRowClick = (row: BudgetMatrixRow) => {
    setOpenMenuRowKey(null);
    const itemName = row.subRowLabel || row.accountName;
    if (confirm(`¿Desea eliminar la partida "${itemName}" de este presupuesto?`)) {
      if (onDeleteRow) {
        onDeleteRow(row.accountId, row.subRowId || null);
      }
    }
  };

  // ==========================================
  // RENDER 1: VISTA MENSUAL ENFOCADA (1 MES)
  // ==========================================
  if (viewMode === 'monthly') {
    const activeP = currentPeriod;
    const activeIdx = periods.findIndex((p) => p.id === activeP?.id);
    const prevPeriod = activeIdx > 0 ? periods[activeIdx - 1] : null;

    return (
      <div className="flex flex-col h-full w-full space-y-4 overflow-y-auto pr-1 pb-20">
        {(sections && sections.length > 0 ? sections : []).map((sec) => {
          const isCollapsed = collapsedSections.has(sec.sectionKey as string);
          const totalActive = sec.sectionTotals[activeP?.id || ''] || 0;

          // Header badge colors
          let badgeColor = 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200';
          let secTitle = sec.sectionTitle;
          if (sec.sectionKey === BudgetMatrixSectionKey.INGRESOS) {
            badgeColor =
              'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
            secTitle = 'Ingresos';
          } else if (
            sec.sectionKey === BudgetMatrixSectionKey.EGRESOS ||
            sec.sectionKey === BudgetMatrixSectionKey.GASTOS_VIDA
          ) {
            badgeColor = 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30';
            secTitle = 'Egresos';
          } else if (sec.sectionKey === BudgetMatrixSectionKey.AHORRO_INVERSIONES) {
            badgeColor = 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30';
            secTitle = 'Ahorros e Inversiones';
          } else if (sec.sectionKey === BudgetMatrixSectionKey.DEUDAS_FINANCIACION) {
            badgeColor =
              'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30';
            secTitle = 'Deudas y Financiación';
          }

          const isBalanceSec =
            sec.sectionKey === BudgetMatrixSectionKey.AHORRO_INVERSIONES ||
            sec.sectionKey === BudgetMatrixSectionKey.DEUDAS_FINANCIACION;

          return (
            <div
              key={sec.sectionKey}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs"
            >
              {/* Section Header */}
              <div
                onClick={() => toggleSectionCollapse(sec.sectionKey as string)}
                className={`flex items-center justify-between px-5 py-3.5 bg-slate-50/70 dark:bg-slate-950/40 border-b border-slate-200/80 dark:border-slate-800 cursor-pointer select-none rounded-t-2xl ${
                  isCollapsed ? 'rounded-b-2xl border-b-0' : ''
                }`}
              >
                <div className="flex items-center space-x-3">
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${badgeColor}`}>
                    {secTitle}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">
                    {sec.rows.length} {sec.rows.length === 1 ? 'partida' : 'partidas'}
                  </span>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-1.5 font-mono">
                    <span className="text-xs text-slate-400">Total:</span>
                    <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {formatCurrency(totalActive, baseCurrency)}
                    </span>
                  </div>

                  {isCollapsed ? (
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </div>
              </div>

              {/* Section Rows (Cards style) */}
              {!isCollapsed && (
                <div className="divide-y divide-slate-100 dark:divide-slate-800/60 rounded-b-2xl">
                  {sec.rows.map((row, rowIndex) => {
                    const rowKey = `${row.accountId}_${row.subRowId || 'main'}`;
                    const currentAmt = row.amounts[activeP?.id || ''] ?? 0;
                    const prevAmt = prevPeriod ? (row.amounts[prevPeriod.id] ?? 0) : null;
                    const isDirty = dirtyCells.has(
                      `${activeP?.id}_${row.accountId}${row.subRowId ? `_${row.subRowId}` : ''}`,
                    );
                    const isMenuOpen = openMenuRowKey === rowKey;
                    const isBalanceRow =
                      isBalanceSec ||
                      row.accountType === 'ASSET' ||
                      row.accountType === 'LIABILITY' ||
                      row.accountType === 'EQUITY' ||
                      Boolean(row.subRowId) ||
                      Boolean(row.cashFlowDirection);

                    const isBottomRow = rowIndex >= sec.rows.length - 2 && sec.rows.length > 2;

                    return (
                      <div
                        key={rowKey}
                        className={`flex items-center justify-between px-5 py-3 hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors ${
                          row.isParent ? 'bg-slate-50/40 dark:bg-slate-900/60 font-semibold' : ''
                        } ${isMenuOpen ? 'relative z-40' : 'relative z-0'}`}
                      >
                        {/* Account Name & Sub-label */}
                        <div className="flex items-center space-x-3 min-w-0 pr-4">
                          <div className="truncate">
                            <div className="flex items-center space-x-1.5 truncate">
                              <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 block truncate">
                                {row.subRowLabel || row.accountName}
                              </span>
                              {isBalanceSec && row.cashFlowDirection && (
                                <span
                                  className="inline-flex items-center shrink-0 select-none"
                                  title={
                                    row.cashFlowDirection === CashFlowDirection.EGRESO_EFECTIVO
                                      ? 'Salida de efectivo'
                                      : 'Entrada de efectivo'
                                  }
                                >
                                  {row.cashFlowDirection === CashFlowDirection.EGRESO_EFECTIVO ? (
                                    <TrendingDown className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400" />
                                  ) : (
                                    <TrendingUp className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
                                  )}
                                </span>
                              )}
                            </div>
                            {row.subRowLabel && (
                              <span className="text-xs text-slate-400 block truncate">
                                {row.accountName}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Right: Comparative vs Previous Month + Amount Input + Options Menu */}
                        <div className="flex items-center space-x-4 shrink-0">
                          {/* Comparative Pill */}
                          {prevAmt !== null && (
                            <span className="hidden md:inline-flex items-center text-xs text-slate-400 font-mono">
                              mes ant: {formatCurrency(prevAmt, baseCurrency)}
                            </span>
                          )}

                          {/* Editable Amount Input */}
                          {row.isParent ? (
                            <span className="font-mono text-sm font-bold text-slate-900 dark:text-slate-100 w-36 text-right px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl">
                              {formatCurrency(currentAmt, baseCurrency)}
                            </span>
                          ) : (
                            <div className="relative">
                              <input
                                type="text"
                                inputMode="decimal"
                                disabled={activeP?.status === 'CLOSED'}
                                value={currentAmt === 0 ? '' : formatThousandNumber(currentAmt)}
                                placeholder="0"
                                onChange={(e) => {
                                  const decPlaces = baseCurrency?.decimalPlaces ?? 0;
                                  const val = parseNumericValue(e.target.value, decPlaces);
                                  if (activeP) {
                                    onCellChange(
                                      row.accountId,
                                      activeP.id,
                                      val,
                                      row.subRowId || null,
                                    );
                                  }
                                }}
                                className={`w-36 text-right font-mono text-sm font-bold px-3 py-1.5 rounded-xl border transition-all outline-none ${
                                  isDirty
                                    ? 'border-indigo-500 bg-indigo-50/30 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-300'
                                    : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900'
                                }`}
                              />
                            </div>
                          )}

                          {/* 3-dots Menu for fast actions */}
                          {!row.isParent && (
                            <div className="relative row-options-menu-container">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenMenuRowKey(isMenuOpen ? null : rowKey);
                                }}
                                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                title="Acciones"
                              >
                                <MoreHorizontal className="w-4 h-4" />
                              </button>

                              {isMenuOpen && (
                                <div
                                  className={`absolute right-0 ${
                                    isBottomRow ? 'bottom-8 mb-1' : 'top-8 mt-1'
                                  } w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl py-1.5 z-50 text-xs animate-in fade-in duration-100`}
                                >
                                  {isBalanceRow && (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleOpenEditBalanceModal(
                                            row,
                                            sec.sectionKey as BudgetMatrixSectionKey,
                                          )
                                        }
                                        className="w-full flex items-center space-x-2 px-3.5 py-2 text-slate-700 dark:text-slate-200 hover:bg-amber-50 dark:hover:bg-amber-950/40 hover:text-amber-700 dark:hover:text-amber-300 transition-colors text-left cursor-pointer"
                                      >
                                        <Edit2 className="w-4 h-4 text-amber-500 shrink-0" />
                                        <span>Editar cuenta / naturaleza</span>
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => handleDeleteRowClick(row)}
                                        className="w-full flex items-center space-x-2 px-3.5 py-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors text-left cursor-pointer"
                                      >
                                        <Trash2 className="w-4 h-4 text-rose-500 shrink-0" />
                                        <span>Eliminar partida</span>
                                      </button>

                                      <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                                    </>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => handleReplicateAllPeriods(row, activeP?.id)}
                                    className="w-full flex items-center space-x-2 px-3.5 py-2 text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-950 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors text-left cursor-pointer"
                                  >
                                    <Repeat className="w-4 h-4 text-indigo-500 shrink-0" />
                                    <span>Replicar a todo el año</span>
                                  </button>

                                  {onOpenAutofill && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenMenuRowKey(null);
                                        onOpenAutofill(row);
                                      }}
                                      className="w-full flex items-center space-x-2 px-3.5 py-2 text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-950 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors text-left cursor-pointer"
                                    >
                                      <History className="w-4 h-4 text-indigo-500 shrink-0" />
                                      <span>Traer del año anterior</span>
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Add balance account button at the bottom of the section */}
                  {isBalanceSec && onAddBalanceRow && (
                    <div className="p-3 bg-slate-50/40 dark:bg-slate-800/20 text-center rounded-b-2xl">
                      <button
                        type="button"
                        onClick={() =>
                          setAccountModalState({
                            isOpen: true,
                            targetSection: sec.sectionKey as BudgetMatrixSectionKey,
                            editRow: null,
                          })
                        }
                        className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>
                          {sec.sectionKey === BudgetMatrixSectionKey.AHORRO_INVERSIONES
                            ? 'Presupuestar Activo'
                            : 'Presupuestar Deuda'}
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // =========================================================================
  // RENDER 2: VISTA TABLA MATRICIAL (CUATRIMESTRAL, SEMESTRAL, ANUAL)
  // =========================================================================
  return (
    <div className="flex flex-col h-full w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs text-left border-collapse table-fixed">
          {/* Table Header */}
          <thead className="bg-slate-100/90 dark:bg-slate-950 sticky top-0 z-20 font-sans border-b border-slate-200 dark:border-slate-800 backdrop-blur-xs">
            <tr>
              <th className="p-3 w-64 sm:w-80 font-bold text-slate-800 dark:text-slate-200 border-r border-slate-200/60 dark:border-slate-800/60 sticky left-0 bg-slate-100 dark:bg-slate-950 z-30 truncate">
                Partida Presupuestaria
              </th>
              {periods.map((p) => (
                <th
                  key={p.id}
                  className="p-3 w-28 sm:w-36 text-right font-bold text-slate-800 dark:text-slate-200 border-r border-slate-200/60 dark:border-slate-800/60"
                >
                  <div className="flex items-center justify-end space-x-1 truncate">
                    <span className="truncate">{p.friendlyName || p.name}</span>
                    {p.status === 'CLOSED' && <span title="Cerrado">🔒</span>}
                  </div>
                </th>
              ))}
              <th className="p-3 w-28 sm:w-36 text-right font-bold text-slate-900 dark:text-slate-100 bg-slate-100/60 dark:bg-slate-900 truncate">
                Total
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
            {(sections || []).map((sec) => {
              let secBadgeColor =
                'bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700';
              let secTitle = sec.sectionTitle;

              if (sec.sectionKey === BudgetMatrixSectionKey.INGRESOS) {
                secBadgeColor =
                  'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30';
                secTitle = 'Ingresos';
              } else if (
                sec.sectionKey === BudgetMatrixSectionKey.EGRESOS ||
                sec.sectionKey === BudgetMatrixSectionKey.GASTOS_VIDA
              ) {
                secBadgeColor =
                  'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30';
                secTitle = 'Egresos';
              } else if (sec.sectionKey === BudgetMatrixSectionKey.AHORRO_INVERSIONES) {
                secBadgeColor =
                  'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30';
                secTitle = 'Ahorros e Inversiones';
              } else if (sec.sectionKey === BudgetMatrixSectionKey.DEUDAS_FINANCIACION) {
                secBadgeColor =
                  'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30';
                secTitle = 'Deudas y Financiación';
              }

              const isBalanceSec =
                sec.sectionKey === BudgetMatrixSectionKey.AHORRO_INVERSIONES ||
                sec.sectionKey === BudgetMatrixSectionKey.DEUDAS_FINANCIACION;

              return (
                <React.Fragment key={sec.sectionKey}>
                  {/* Section Header Row */}
                  <tr className="bg-slate-100/70 dark:bg-slate-950 font-bold border-t border-b border-slate-200 dark:border-slate-800">
                    <td
                      colSpan={periods.length + 2}
                      className="p-0 font-sans bg-slate-100/90 dark:bg-slate-950"
                    >
                      <div className="sticky left-0 px-4 py-2.5 flex items-center justify-between w-max max-w-full space-x-4 z-10">
                        <div className="flex items-center space-x-2">
                          <span
                            className={`px-2 py-0.5 rounded-lg text-xs font-bold border ${secBadgeColor}`}
                          >
                            {secTitle}
                          </span>
                          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                            {sec.rows.length} {sec.rows.length === 1 ? 'partida' : 'partidas'}
                          </span>
                        </div>
                        {(sec.sectionKey === BudgetMatrixSectionKey.AHORRO_INVERSIONES ||
                          sec.sectionKey === BudgetMatrixSectionKey.DEUDAS_FINANCIACION) &&
                          onAddBalanceRow && (
                            <button
                              type="button"
                              onClick={() =>
                                setAccountModalState({
                                  isOpen: true,
                                  targetSection: sec.sectionKey as BudgetMatrixSectionKey,
                                  editRow: null,
                                })
                              }
                              className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-lg text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 transition-colors cursor-pointer shadow-2xs"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>
                                {sec.sectionKey === BudgetMatrixSectionKey.AHORRO_INVERSIONES
                                  ? 'Presupuestar Activo'
                                  : 'Presupuestar Deuda'}
                              </span>
                            </button>
                          )}
                      </div>
                    </td>
                  </tr>

                  {/* Rows */}
                  {sec.rows.map((row, rowIndex) => {
                    const isParent = row.isParent;
                    const rowKey = `${row.accountId}_${row.subRowId || 'main'}`;
                    const isMenuOpen = openMenuRowKey === rowKey;
                    const isBalanceRow =
                      isBalanceSec ||
                      row.accountType === 'ASSET' ||
                      row.accountType === 'LIABILITY' ||
                      row.accountType === 'EQUITY' ||
                      Boolean(row.subRowId) ||
                      Boolean(row.cashFlowDirection);

                    const isBottomRow = rowIndex >= sec.rows.length - 2 && sec.rows.length > 2;

                    return (
                      <tr
                        key={rowKey}
                        className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors h-9 ${
                          isParent ? 'bg-slate-50/50 dark:bg-slate-900/60 font-bold' : ''
                        }`}
                      >
                        <td
                          className={`px-3 py-1.5 border-r border-slate-200 dark:border-slate-800 font-sans sticky left-0 bg-white dark:bg-slate-900 ${
                            isMenuOpen ? 'z-40' : 'z-10'
                          }`}
                        >
                          <div className="flex items-center justify-between group gap-1.5 min-w-0">
                            <div className="truncate flex-1 min-w-0">
                              <div className="flex items-center space-x-1.5 truncate">
                                <span className="text-slate-800 dark:text-slate-200 truncate block font-medium">
                                  {row.subRowLabel || row.accountName}
                                </span>
                                {isBalanceSec && row.cashFlowDirection && (
                                  <span
                                    className="inline-flex items-center shrink-0 select-none"
                                    title={
                                      row.cashFlowDirection === CashFlowDirection.EGRESO_EFECTIVO
                                        ? 'Salida de efectivo'
                                        : 'Entrada de efectivo'
                                    }
                                  >
                                    {row.cashFlowDirection === CashFlowDirection.EGRESO_EFECTIVO ? (
                                      <TrendingDown className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400" />
                                    ) : (
                                      <TrendingUp className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
                                    )}
                                  </span>
                                )}
                              </div>
                              {row.subRowLabel && (
                                <span className="text-3xs text-slate-400 dark:text-slate-500 block truncate">
                                  {row.accountName}
                                </span>
                              )}
                            </div>

                            {!isParent && (
                              <div className="relative row-options-menu-container shrink-0">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenMenuRowKey(isMenuOpen ? null : rowKey);
                                  }}
                                  className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                  title="Opciones de partida"
                                >
                                  <MoreHorizontal className="w-3.5 h-3.5" />
                                </button>

                                {isMenuOpen && (
                                  <div
                                    className={`absolute left-0 ${
                                      isBottomRow ? 'bottom-8 mb-1' : 'top-8 mt-1'
                                    } w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl py-1.5 z-50 text-xs font-sans animate-in fade-in duration-100`}
                                  >
                                    {isBalanceRow && (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleOpenEditBalanceModal(
                                              row,
                                              sec.sectionKey as BudgetMatrixSectionKey,
                                            )
                                          }
                                          className="w-full flex items-center space-x-2 px-3.5 py-2 text-slate-700 dark:text-slate-200 hover:bg-amber-50 dark:hover:bg-amber-950/40 hover:text-amber-700 dark:hover:text-amber-300 transition-colors text-left cursor-pointer"
                                        >
                                          <Edit2 className="w-4 h-4 text-amber-500 shrink-0" />
                                          <span>Editar cuenta / naturaleza</span>
                                        </button>

                                        <button
                                          type="button"
                                          onClick={() => handleDeleteRowClick(row)}
                                          className="w-full flex items-center space-x-2 px-3.5 py-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors text-left cursor-pointer"
                                        >
                                          <Trash2 className="w-4 h-4 text-rose-500 shrink-0" />
                                          <span>Eliminar partida</span>
                                        </button>

                                        <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                                      </>
                                    )}

                                    <button
                                      type="button"
                                      onClick={() => handleReplicateAllPeriods(row)}
                                      className="w-full flex items-center space-x-2 px-3.5 py-2 text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-950 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors text-left cursor-pointer"
                                    >
                                      <Repeat className="w-4 h-4 text-indigo-500 shrink-0" />
                                      <span>Replicar a todo el año</span>
                                    </button>

                                    {onOpenAutofill && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setOpenMenuRowKey(null);
                                          onOpenAutofill(row);
                                        }}
                                        className="w-full flex items-center space-x-2 px-3.5 py-2 text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-950 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors text-left cursor-pointer"
                                      >
                                        <History className="w-4 h-4 text-indigo-500 shrink-0" />
                                        <span>Traer del año anterior</span>
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </td>

                        {periods.map((p) => {
                          const isEditing =
                            editingCell?.accountId === row.accountId &&
                            editingCell?.subRowId === (row.subRowId || null) &&
                            editingCell?.periodId === p.id;

                          const amt = row.amounts[p.id] ?? 0;
                          const cellKey = `${p.id}_${row.accountId}${row.subRowId ? `_${row.subRowId}` : ''}`;
                          const isDirty = dirtyCells.has(cellKey);

                          return (
                            <td
                              key={p.id}
                              onClick={() => !isParent && startEditing(row, p.id)}
                              className={`p-1 text-right border-r border-slate-200/60 dark:border-slate-800/60 cursor-pointer h-9 overflow-hidden ${
                                isEditing
                                  ? 'bg-indigo-50/50 dark:bg-indigo-950/50'
                                  : isDirty
                                    ? 'bg-amber-500/10'
                                    : 'hover:bg-slate-100/60 dark:hover:bg-slate-800/60'
                              }`}
                            >
                              {isEditing ? (
                                <input
                                  ref={inputRef}
                                  type="text"
                                  inputMode="decimal"
                                  value={editValue}
                                  onChange={(e) => {
                                    const digits = e.target.value.replace(/[^\d]/g, '');
                                    if (!digits) {
                                      setEditValue('');
                                    } else {
                                      setEditValue(formatThousandNumber(digits));
                                    }
                                  }}
                                  onKeyDown={handleKeyDown}
                                  onBlur={commitEdit}
                                  className="w-full h-7 text-right bg-white dark:bg-slate-950 font-mono text-xs font-bold border border-indigo-500 rounded px-2 py-0 outline-none text-slate-900 dark:text-white ring-1 ring-indigo-500 box-border"
                                />
                              ) : (
                                <span
                                  className={`block w-full h-7 leading-7 px-2 rounded font-mono text-xs text-right truncate ${
                                    isDirty
                                      ? 'text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-500/10'
                                      : amt === 0
                                        ? 'text-slate-400'
                                        : 'text-slate-800 dark:text-slate-200 font-semibold'
                                  }`}
                                >
                                  {formatCurrency(amt, baseCurrency)}
                                </span>
                              )}
                            </td>
                          );
                        })}

                        <td className="p-2 text-right font-bold text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-900/80 truncate">
                          {formatCurrency(row.rowTotal, baseCurrency)}
                        </td>
                      </tr>
                    );
                  })}

                  {/* Section Total Row */}
                  <tr className="bg-slate-100/50 dark:bg-slate-950/80 font-bold border-t border-b border-slate-200 dark:border-slate-800 h-9">
                    <td className="px-3 py-2 border-r border-slate-200 dark:border-slate-800 font-sans text-indigo-700 dark:text-indigo-400 sticky left-0 bg-slate-100 dark:bg-slate-950 truncate">
                      Total {sec.sectionTitle}
                    </td>
                    {periods.map((p) => (
                      <td
                        key={p.id}
                        className="p-2 text-right border-r border-slate-200 dark:border-slate-800 text-indigo-700 dark:text-indigo-300 truncate"
                      >
                        {formatCurrency(sec.sectionTotals[p.id] || 0, baseCurrency)}
                      </td>
                    ))}
                    <td className="p-2 text-right text-indigo-800 dark:text-indigo-200 bg-slate-100 dark:bg-slate-950 truncate">
                      {formatCurrency(sec.sectionTotals.total || 0, baseCurrency)}
                    </td>
                  </tr>
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal for Balance Rows */}
      {accountModalState.isOpen && (
        <BudgetAccountModal
          isOpen={accountModalState.isOpen}
          targetSection={accountModalState.targetSection}
          editRow={accountModalState.editRow}
          onClose={() =>
            setAccountModalState({ isOpen: false, targetSection: null, editRow: null })
          }
          onSave={({ account, label, direction, subRowId }) => {
            if (accountModalState.editRow) {
              if (onEditBalanceRow) onEditBalanceRow(account, label, direction, subRowId);
            } else {
              if (onAddBalanceRow) onAddBalanceRow(account, label, direction);
            }
            setAccountModalState({ isOpen: false, targetSection: null, editRow: null });
          }}
        />
      )}
    </div>
  );
};
