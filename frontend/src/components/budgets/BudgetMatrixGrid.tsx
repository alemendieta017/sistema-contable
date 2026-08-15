'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  BudgetMatrixResponse,
  BudgetMatrixRow,
  BudgetMatrixSection,
  BudgetMatrixSectionKey,
  CashFlowDirection,
} from '@sistema-contable/shared';
import {
  Wand2,
  Save,
  Lock,
  Plus,
  Trash2,
  Edit2,
  MoreHorizontal,
  ChevronDown,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { formatCurrency } from '../../lib/utils';
import { BudgetAccountModal } from './BudgetAccountModal';

export interface BudgetMatrixGridProps {
  matrixData: BudgetMatrixResponse;
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
  onSave: () => void;
  onOpenDriverModal?: (row: BudgetMatrixRow) => void;
  onOpenAutofill?: (row: BudgetMatrixRow) => void;
  onDirectionChange?: (
    accountId: string,
    subRowId: string | null,
    direction: CashFlowDirection,
  ) => void;
  onAddSubRow?: (accountId: string, label: string, direction: CashFlowDirection) => void;
  onDeleteSubRow?: (accountId: string, subRowId: string) => void;
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

// Robust numeric sanitizer for currency symbols ($ , Gs.), parentheses (100), invalid text
function parseNumericValue(valueStr: string): number {
  if (!valueStr) return 0;
  let str = valueStr.trim();

  let isNegative = false;
  if (/^\(.*\)$/.test(str)) {
    isNegative = true;
    str = str.replace(/^\((.*)\)$/, '$1');
  } else if (str.startsWith('-')) {
    isNegative = true;
  }

  // Strip currency symbols, spaces, letters
  str = str.replace(/[^0-9.,-]/g, '');
  if (!str) return 0;

  if (str.includes(',') && str.includes('.')) {
    if (str.lastIndexOf(',') > str.lastIndexOf('.')) {
      str = str.replace(/\./g, '').replace(',', '.');
    } else {
      str = str.replace(/,/g, '');
    }
  } else if (str.includes(',')) {
    const parts = str.split(',');
    if (parts.length === 2 && parts[1].length <= 2) {
      str = str.replace(',', '.');
    } else {
      str = str.replace(/,/g, '');
    }
  }

  const num = parseFloat(str);
  if (isNaN(num)) return 0;
  return isNegative ? -Math.abs(num) : Math.abs(num);
}

export const BudgetMatrixGrid: React.FC<BudgetMatrixGridProps> = ({
  matrixData,
  baseCurrency,
  onCellChange,
  onPasteBatch,
  onSave,
  onOpenDriverModal,
  onOpenAutofill,
  onDirectionChange,
  onAddBalanceRow,
  onEditBalanceRow,
  onDeleteRow,
  onDeleteSubRow,
  isSaving = false,
  dirtyCells,
}) => {
  const { periods, rows, sections } = matrixData;

  // Collapsed parent account branches
  const [collapsedParentIds, setCollapsedParentIds] = useState<Set<string>>(new Set());

  const toggleParentCollapse = (parentId: string) => {
    setCollapsedParentIds((prev) => {
      const next = new Set(prev);
      if (next.has(parentId)) {
        next.delete(parentId);
      } else {
        next.add(parentId);
      }
      return next;
    });
  };

  // 3-dots dropdown menu state
  const [openMenuRowKey, setOpenMenuRowKey] = useState<string | null>(null);

  // Close 3-dots menu on click outside or Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.row-options-menu-container')) {
        setOpenMenuRowKey(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenMenuRowKey(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Budget Account Modal state (Unified Modal for create and edit balance accounts)
  const [accountModalState, setAccountModalState] = useState<{
    isOpen: boolean;
    targetSection?: 'ASSET' | 'LIABILITY' | null;
    editRow?: BudgetMatrixRow | null;
  }>({
    isOpen: false,
    targetSection: null,
    editRow: null,
  });

  const openCreateAccountModal = (target: 'ASSET' | 'LIABILITY') => {
    setAccountModalState({
      isOpen: true,
      targetSection: target,
      editRow: null,
    });
  };

  const openEditAccountModal = (row: BudgetMatrixRow) => {
    setAccountModalState({
      isOpen: true,
      targetSection: null,
      editRow: row,
    });
  };

  // Check if a row is visible based on parent collapse state
  const isRowVisible = useCallback(
    (row: BudgetMatrixRow) => {
      if (!row.parentId) return true;
      if (collapsedParentIds.has(row.parentId)) return false;
      return true;
    },
    [collapsedParentIds],
  );

  // Flattened visible row list for index-based spreadsheet grid keyboard navigation
  const allFlatRows: BudgetMatrixRow[] = useMemo(() => {
    let rawList: BudgetMatrixRow[] = [];
    if (sections && sections.length > 0) {
      rawList = sections.flatMap((sec) => sec.rows);
    } else {
      rawList = rows || [];
    }
    return rawList.filter(isRowVisible);
  }, [sections, rows, isRowVisible]);

  // Selected cell tracking: { rowIndex, colIndex }
  const [selectedCell, setSelectedCell] = useState<{ rowIndex: number; colIndex: number } | null>(
    null,
  );
  const [editingCell, setEditingCell] = useState<{ rowIndex: number; colIndex: number } | null>(
    null,
  );
  const [editValue, setEditValue] = useState<string>('');

  const inputRef = useRef<HTMLInputElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  // Focus input on edit mode
  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingCell]);

  const commitEdit = useCallback(() => {
    if (!editingCell) return;
    const { rowIndex, colIndex } = editingCell;
    const row = allFlatRows[rowIndex];
    const period = periods[colIndex];
    if (row && !row.isParent && period && period.status !== 'CLOSED') {
      const numVal = parseNumericValue(editValue);
      onCellChange(row.accountId, period.id, Math.max(0, numVal), row.subRowId);
    }
    setEditingCell(null);
  }, [editingCell, editValue, allFlatRows, periods, onCellChange]);

  const cancelEdit = useCallback(() => {
    setEditingCell(null);
  }, []);

  const startEditing = useCallback(
    (rowIndex: number, colIndex: number) => {
      const period = periods[colIndex];
      if (period && period.status === 'CLOSED') return;
      const row = allFlatRows[rowIndex];
      if (!row || row.isParent) return; // Prevent editing parent subtotal rows
      const val = row.amounts[period.id] ?? 0;
      setEditingCell({ rowIndex, colIndex });
      setEditValue(val === 0 ? '' : String(val));
    },
    [periods, allFlatRows],
  );

  // Fill Right handler (Ctrl+D / Cmd+D)
  const handleFillRight = useCallback(
    (customAmount?: number) => {
      if (!selectedCell) return;
      const { rowIndex, colIndex } = selectedCell;
      if (colIndex >= periods.length - 1) return;

      const row = allFlatRows[rowIndex];
      if (!row || row.isParent) return;
      const currentPeriod = periods[colIndex];
      const sourceAmount =
        customAmount !== undefined ? customAmount : (row.amounts[currentPeriod.id] ?? 0);

      const updates: Array<{
        accountId: string;
        periodId: string;
        amount: number;
        subRowId?: string | null;
      }> = [];

      // If a custom amount was provided (from active editing cell), also update current cell
      if (customAmount !== undefined) {
        updates.push({
          accountId: row.accountId,
          periodId: currentPeriod.id,
          amount: sourceAmount,
          subRowId: row.subRowId,
        });
      }

      for (let c = colIndex + 1; c < periods.length; c++) {
        const targetPeriod = periods[c];
        if (targetPeriod.status !== 'CLOSED') {
          updates.push({
            accountId: row.accountId,
            periodId: targetPeriod.id,
            amount: sourceAmount,
            subRowId: row.subRowId,
          });
        }
      }

      if (updates.length > 0) {
        if (onPasteBatch) {
          onPasteBatch(updates);
        } else {
          updates.forEach((u) => onCellChange(u.accountId, u.periodId, u.amount, u.subRowId));
        }
      }
    },
    [selectedCell, periods, allFlatRows, onPasteBatch, onCellChange],
  );

  // Keyboard navigation & Shortcuts (Tab, Enter, Esc, Shift+Tab, Shift+Enter, Arrows, Ctrl+D)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Intercept Ctrl+D / Cmd+D (Fill Right / Forward Fill) globally on cell or input
    if ((e.ctrlKey || e.metaKey) && (e.key === 'd' || e.key === 'D')) {
      e.preventDefault();
      if (editingCell) {
        const numVal = Math.max(0, parseNumericValue(editValue));
        setEditingCell(null);
        handleFillRight(numVal);
      } else {
        handleFillRight();
      }
      return;
    }

    if (editingCell) {
      if (e.key === 'Enter') {
        e.preventDefault();
        commitEdit();
        if (selectedCell) {
          if (e.shiftKey) {
            if (selectedCell.rowIndex > 0) {
              setSelectedCell({
                rowIndex: selectedCell.rowIndex - 1,
                colIndex: selectedCell.colIndex,
              });
            }
          } else {
            if (selectedCell.rowIndex < allFlatRows.length - 1) {
              setSelectedCell({
                rowIndex: selectedCell.rowIndex + 1,
                colIndex: selectedCell.colIndex,
              });
            }
          }
        }
      } else if (e.key === 'Tab') {
        e.preventDefault();
        commitEdit();
        if (selectedCell) {
          if (e.shiftKey) {
            if (selectedCell.colIndex > 0) {
              setSelectedCell({
                rowIndex: selectedCell.rowIndex,
                colIndex: selectedCell.colIndex - 1,
              });
            } else if (selectedCell.rowIndex > 0) {
              setSelectedCell({
                rowIndex: selectedCell.rowIndex - 1,
                colIndex: periods.length - 1,
              });
            }
          } else {
            if (selectedCell.colIndex < periods.length - 1) {
              setSelectedCell({
                rowIndex: selectedCell.rowIndex,
                colIndex: selectedCell.colIndex + 1,
              });
            } else if (selectedCell.rowIndex < allFlatRows.length - 1) {
              setSelectedCell({
                rowIndex: selectedCell.rowIndex + 1,
                colIndex: 0,
              });
            }
          }
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        cancelEdit();
      }
      return;
    }

    if (!selectedCell) return;

    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        if (selectedCell.rowIndex > 0) {
          setSelectedCell({ ...selectedCell, rowIndex: selectedCell.rowIndex - 1 });
        }
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (selectedCell.rowIndex < allFlatRows.length - 1) {
          setSelectedCell({ ...selectedCell, rowIndex: selectedCell.rowIndex + 1 });
        }
        break;
      case 'ArrowLeft':
        e.preventDefault();
        if (selectedCell.colIndex > 0) {
          setSelectedCell({ ...selectedCell, colIndex: selectedCell.colIndex - 1 });
        }
        break;
      case 'ArrowRight':
        e.preventDefault();
        if (selectedCell.colIndex < periods.length - 1) {
          setSelectedCell({ ...selectedCell, colIndex: selectedCell.colIndex + 1 });
        }
        break;
      case 'Tab':
        e.preventDefault();
        if (e.shiftKey) {
          if (selectedCell.colIndex > 0) {
            setSelectedCell({ ...selectedCell, colIndex: selectedCell.colIndex - 1 });
          } else if (selectedCell.rowIndex > 0) {
            setSelectedCell({ rowIndex: selectedCell.rowIndex - 1, colIndex: periods.length - 1 });
          }
        } else {
          if (selectedCell.colIndex < periods.length - 1) {
            setSelectedCell({ ...selectedCell, colIndex: selectedCell.colIndex + 1 });
          } else if (selectedCell.rowIndex < allFlatRows.length - 1) {
            setSelectedCell({ rowIndex: selectedCell.rowIndex + 1, colIndex: 0 });
          }
        }
        break;
      case 'Enter':
        e.preventDefault();
        startEditing(selectedCell.rowIndex, selectedCell.colIndex);
        break;
      default:
        if (/^[0-9.]$/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault();
          startEditing(selectedCell.rowIndex, selectedCell.colIndex);
          setEditValue(e.key);
        }
        break;
    }
  };

  // Clipboard paste parser with multi-cell \n / \t parsing and numeric sanitization
  const handlePaste = (e: React.ClipboardEvent) => {
    if (!selectedCell) return;
    const pasteData = e.clipboardData.getData('text');
    if (!pasteData) return;

    e.preventDefault();

    const pasteRows = pasteData
      .trim()
      .split(/\r?\n/)
      .map((line) => line.split('\t'));

    const updates: Array<{
      accountId: string;
      periodId: string;
      amount: number;
      subRowId?: string | null;
    }> = [];

    pasteRows.forEach((pRow, rOffset) => {
      const rIdx = selectedCell.rowIndex + rOffset;
      if (rIdx >= allFlatRows.length) return;
      const targetRow = allFlatRows[rIdx];
      if (targetRow.isParent) return; // Skip parent rows during paste

      pRow.forEach((valStr, cOffset) => {
        const cIdx = selectedCell.colIndex + cOffset;
        if (cIdx >= periods.length) return;
        const targetPeriod = periods[cIdx];

        if (targetPeriod.status !== 'CLOSED') {
          const cleanNum = parseNumericValue(valStr);
          updates.push({
            accountId: targetRow.accountId,
            periodId: targetPeriod.id,
            amount: Math.max(0, cleanNum),
            subRowId: targetRow.subRowId,
          });
        }
      });
    });

    if (updates.length > 0) {
      if (onPasteBatch) {
        onPasteBatch(updates);
      } else {
        updates.forEach((u) => onCellChange(u.accountId, u.periodId, u.amount, u.subRowId));
      }
    }
  };

  const formatValue = (amount: number) => {
    return formatCurrency(amount, baseCurrency);
  };

  // Section badge color helper
  const getSectionBadge = (key: BudgetMatrixSectionKey | string) => {
    switch (key) {
      case BudgetMatrixSectionKey.INGRESOS:
        return 'bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
      case BudgetMatrixSectionKey.GASTOS_VIDA:
      case BudgetMatrixSectionKey.EGRESOS:
        return 'bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/30';
      case BudgetMatrixSectionKey.AHORRO_INVERSIONES:
        return 'bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30';
      case BudgetMatrixSectionKey.DEUDAS_FINANCIACION:
      case BudgetMatrixSectionKey.FINANCIAMIENTO_AHORRO:
        return 'bg-purple-500/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-500/30';
      default:
        return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    }
  };

  // Render Section Panel
  const renderSection = (sec: BudgetMatrixSection) => {
    const isBalanceSection =
      sec.sectionKey === BudgetMatrixSectionKey.AHORRO_INVERSIONES ||
      sec.sectionKey === BudgetMatrixSectionKey.DEUDAS_FINANCIACION ||
      sec.sectionKey === BudgetMatrixSectionKey.FINANCIAMIENTO_AHORRO;

    const visibleSecRows = sec.rows.filter(isRowVisible);

    return (
      <React.Fragment key={sec.sectionKey}>
        {/* Section Header Banner */}
        <tr className="bg-slate-100 dark:bg-slate-950 font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider text-xs border-t-2 border-b border-slate-200 dark:border-slate-800">
          <td
            colSpan={periods.length + 3}
            className="p-3 bg-gradient-to-r from-slate-100 via-slate-50 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 text-slate-800 dark:text-slate-100 font-sans tracking-wide"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${getSectionBadge(sec.sectionKey)}`}
                >
                  {sec.sectionTitle}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-normal lowercase">
                  ({sec.rows.filter((r) => !r.isParent).length} cuenta(s) activas)
                </span>
              </div>

              {/* On-Demand Budgeting Action Buttons in Section Headers (Without redundant '+') */}
              {sec.sectionKey === BudgetMatrixSectionKey.AHORRO_INVERSIONES && (
                <button
                  type="button"
                  onClick={() => openCreateAccountModal('ASSET')}
                  className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-600/30 dark:hover:bg-blue-600/50 text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-500/40 text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Presupuestar Activo</span>
                </button>
              )}

              {(sec.sectionKey === BudgetMatrixSectionKey.DEUDAS_FINANCIACION ||
                sec.sectionKey === BudgetMatrixSectionKey.FINANCIAMIENTO_AHORRO ||
                sec.sectionKey === 'FINANCIAMIENTO_AHORRO') && (
                <button
                  type="button"
                  onClick={() => openCreateAccountModal('LIABILITY')}
                  className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 dark:bg-purple-600/30 dark:hover:bg-purple-600/50 text-purple-600 dark:text-purple-300 border border-purple-200 dark:border-purple-500/40 text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Presupuestar Deuda</span>
                </button>
              )}
            </div>
          </td>
        </tr>

        {/* Empty State for Section */}
        {visibleSecRows.length === 0 && (
          <tr>
            <td
              colSpan={periods.length + 3}
              className="p-6 text-center bg-slate-50/50 dark:bg-slate-900/40 text-slate-500 dark:text-slate-400 font-sans text-xs border-b border-slate-200 dark:border-slate-800/60"
            >
              <div className="flex flex-col items-center justify-center space-y-2">
                <span>
                  {sec.sectionKey === BudgetMatrixSectionKey.AHORRO_INVERSIONES
                    ? 'No hay cuentas de activo presupuestadas para este ejercicio.'
                    : sec.sectionKey === BudgetMatrixSectionKey.DEUDAS_FINANCIACION ||
                        sec.sectionKey === 'FINANCIAMIENTO_AHORRO'
                      ? 'No hay cuentas de pasivo o deuda presupuestadas para este ejercicio.'
                      : 'No hay cuentas registradas en esta categoría.'}
                </span>
                {isBalanceSection && (
                  <button
                    type="button"
                    onClick={() =>
                      openCreateAccountModal(
                        sec.sectionKey === BudgetMatrixSectionKey.AHORRO_INVERSIONES
                          ? 'ASSET'
                          : 'LIABILITY',
                      )
                    }
                    className="inline-flex items-center space-x-1 px-3 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-600/20 dark:hover:bg-indigo-600/30 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30 text-xs font-semibold transition-colors cursor-pointer"
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
        )}

        {/* Section Rows */}
        {visibleSecRows.map((row) => {
          const rowKey = `${row.accountId}_${row.subRowId || 'main'}`;
          const absoluteFlatIdx = allFlatRows.findIndex(
            (r) => r.accountId === row.accountId && r.subRowId === row.subRowId,
          );
          const isAssetOrLiability =
            isBalanceSection || ['ASSET', 'LIABILITY', 'EQUITY'].includes(row.accountType);
          const isParent = row.isParent;
          const isChild = !!row.parentId;
          const isCollapsed = isParent && collapsedParentIds.has(row.accountId);
          const isMenuOpen = openMenuRowKey === rowKey;

          return (
            <tr
              key={rowKey}
              className={`transition-colors group ${
                isParent
                  ? 'bg-slate-100/80 dark:bg-slate-950/70 font-semibold text-slate-900 dark:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-900'
                  : 'hover:bg-slate-50 dark:hover:bg-slate-800/30'
              }`}
            >
              {/* Account Label (Sticky left column for desktop & mobile) */}
              <td
                className={`p-3 border-r border-slate-200 dark:border-slate-800 font-sans sticky left-0 z-10 min-w-[240px] max-w-[320px] shadow-sm ${
                  isParent
                    ? 'bg-slate-100 group-hover:bg-slate-200/80 dark:bg-slate-950 dark:group-hover:bg-slate-900 font-bold text-slate-900 dark:text-slate-100'
                    : 'bg-white group-hover:bg-slate-50 dark:bg-slate-900 dark:group-hover:bg-slate-850 font-medium text-slate-800 dark:text-slate-200'
                } ${isChild ? 'pl-7' : 'pl-3'}`}
              >
                <div className="flex flex-col space-y-1">
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center space-x-1.5 truncate">
                      {/* Collapse/Expand Chevron for Parent Categories */}
                      {isParent && (
                        <button
                          type="button"
                          onClick={() => toggleParentCollapse(row.accountId)}
                          className="p-0.5 rounded text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-200 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors cursor-pointer"
                          title={isCollapsed ? 'Expandir grupo' : 'Colapsar grupo'}
                        >
                          {isCollapsed ? (
                            <ChevronRight className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}

                      <span
                        className={`truncate ${
                          isParent
                            ? 'text-indigo-700 dark:text-indigo-300 font-bold text-xs cursor-pointer'
                            : isChild
                              ? 'text-slate-700 dark:text-slate-300 text-xs'
                              : 'text-slate-800 dark:text-slate-100 text-xs'
                        }`}
                        title={row.accountName}
                        onClick={() => isParent && toggleParentCollapse(row.accountId)}
                      >
                        {row.subRowLabel
                          ? `${row.accountName} (${row.subRowLabel})`
                          : row.accountName}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                        {row.accountCode}
                      </span>
                      {isParent && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30">
                          Subtotal Grupo
                        </span>
                      )}
                    </div>

                    {/* Discrete Cash Flow Direction Badge for Balance Accounts */}
                    {!isParent && isAssetOrLiability && row.cashFlowDirection && (
                      <span
                        className={`inline-flex items-center space-x-1 text-[10px] font-medium px-2 py-0.5 rounded border ${
                          row.cashFlowDirection === CashFlowDirection.INGRESO_EFECTIVO
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                        }`}
                      >
                        {row.cashFlowDirection === CashFlowDirection.INGRESO_EFECTIVO ? (
                          <>
                            <ArrowUpRight className="w-3 h-3 text-emerald-500 dark:text-emerald-400" />
                            <span>Entrada</span>
                          </>
                        ) : (
                          <>
                            <ArrowDownRight className="w-3 h-3 text-rose-500 dark:text-rose-400" />
                            <span>Salida</span>
                          </>
                        )}
                      </span>
                    )}
                  </div>
                </div>
              </td>

              {/* 3-Dots Options Menu Column (•••) */}
              <td
                className={`p-2 text-center border-r border-slate-200 dark:border-slate-800 w-12 relative row-options-menu-container ${
                  isParent
                    ? 'bg-slate-100 dark:bg-slate-950'
                    : 'bg-white group-hover:bg-slate-50 dark:bg-slate-900 dark:group-hover:bg-slate-850'
                }`}
              >
                {!isParent ? (
                  <div className="relative inline-block">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuRowKey(isMenuOpen ? null : rowKey);
                      }}
                      title="Opciones de fila"
                      className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>

                    {/* Dropdown Menu */}
                    {isMenuOpen && (
                      <div className="absolute left-full top-0 ml-1 w-44 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl py-1 z-50 text-left animate-in fade-in zoom-in-95 duration-100">
                        {/* Option 1: Rellenar (Driver / Autofill) */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuRowKey(null);
                            if (onOpenAutofill) {
                              onOpenAutofill(row);
                            } else if (onOpenDriverModal) {
                              onOpenDriverModal(row);
                            }
                          }}
                          className="w-full flex items-center space-x-2 px-3 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors cursor-pointer"
                        >
                          <Wand2 className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400 shrink-0" />
                          <span>Rellenar</span>
                        </button>

                        {/* Option 2: Editar (for Balance / Sub-Rows) */}
                        {(isAssetOrLiability || row.subRowId) && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuRowKey(null);
                              openEditAccountModal(row);
                            }}
                            className="w-full flex items-center space-x-2 px-3 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-amber-600 dark:hover:text-amber-300 transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 shrink-0" />
                            <span>Editar</span>
                          </button>
                        )}

                        {/* Option 3: Eliminar (for Balance / Sub-Rows) */}
                        {(isAssetOrLiability || row.subRowId) && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuRowKey(null);
                              const rowTitle = row.subRowLabel
                                ? `${row.accountName} (${row.subRowLabel})`
                                : row.accountName;
                              if (
                                confirm(
                                  `¿Está seguro de que desea eliminar la fila presupuestaria de "${rowTitle}"? Se borrarán sus valores para este ejercicio fiscal.`,
                                )
                              ) {
                                if (onDeleteRow) {
                                  onDeleteRow(row.accountId, row.subRowId || null);
                                } else if (onDeleteSubRow && row.subRowId) {
                                  onDeleteSubRow(row.accountId, row.subRowId);
                                }
                              }
                            }}
                            className="w-full flex items-center space-x-2 px-3 py-2 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:text-rose-700 dark:hover:text-rose-300 transition-colors cursor-pointer border-t border-slate-100 dark:border-slate-800"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400 shrink-0" />
                            <span>Eliminar</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <span className="text-[10px] text-slate-400 dark:text-slate-600">—</span>
                )}
              </td>

              {/* Monthly Period Amount Cells */}
              {periods.map((period, cIdx) => {
                const isSelected =
                  absoluteFlatIdx >= 0 &&
                  selectedCell?.rowIndex === absoluteFlatIdx &&
                  selectedCell?.colIndex === cIdx;
                const isEditing =
                  absoluteFlatIdx >= 0 &&
                  editingCell?.rowIndex === absoluteFlatIdx &&
                  editingCell?.colIndex === cIdx;
                const cellKey = `${period.id}_${row.accountId}${row.subRowId ? `_${row.subRowId}` : ''}`;
                const isDirty = dirtyCells.has(cellKey);
                const isClosed = period.status === 'CLOSED';
                const amount = row.amounts[period.id] ?? 0;

                return (
                  <td
                    key={period.id}
                    onClick={() => {
                      if (absoluteFlatIdx >= 0) {
                        setSelectedCell({ rowIndex: absoluteFlatIdx, colIndex: cIdx });
                      }
                    }}
                    onDoubleClick={() => {
                      if (!isParent && absoluteFlatIdx >= 0) {
                        startEditing(absoluteFlatIdx, cIdx);
                      }
                    }}
                    className={`p-2.5 text-right border-r border-slate-200/60 dark:border-slate-800/50 select-none transition-all ${
                      isClosed
                        ? 'bg-slate-100/60 dark:bg-slate-950/60 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                        : isParent
                          ? 'bg-slate-100/40 dark:bg-slate-950/40 text-indigo-700 dark:text-indigo-300 font-bold cursor-default'
                          : 'cursor-pointer'
                    } ${
                      isSelected
                        ? 'ring-2 ring-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 z-10'
                        : ''
                    } ${isDirty ? 'bg-amber-500/15 font-bold text-amber-700 dark:text-amber-300' : ''}`}
                  >
                    {isEditing ? (
                      <input
                        ref={inputRef}
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onBlur={commitEdit}
                        className="w-full bg-white dark:bg-slate-950 text-right font-mono text-xs text-slate-900 dark:text-white border border-indigo-500 rounded px-1.5 py-0.5 outline-none"
                      />
                    ) : (
                      <div className="flex items-center justify-end space-x-1">
                        {isClosed && (
                          <Lock className="w-3 h-3 text-slate-400 dark:text-slate-600 inline mr-1" />
                        )}
                        <span
                          className={
                            isParent
                              ? 'text-indigo-700 dark:text-indigo-300 font-bold'
                              : amount === 0
                                ? 'text-slate-400 dark:text-slate-600'
                                : 'text-slate-800 dark:text-slate-200'
                          }
                        >
                          {formatValue(amount)}
                        </span>
                      </div>
                    )}
                  </td>
                );
              })}

              {/* Row Total */}
              <td
                className={`p-3 text-right font-bold ${
                  isParent
                    ? 'text-indigo-700 dark:text-indigo-300 bg-slate-100 dark:bg-slate-950'
                    : 'text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-900/80'
                }`}
              >
                {formatValue(row.rowTotal)}
              </td>
            </tr>
          );
        })}

        {/* Section Total Row */}
        <tr className="bg-slate-100 dark:bg-slate-950 font-bold border-t border-b-2 border-slate-200 dark:border-slate-800">
          <td className="p-3 border-r border-slate-200 dark:border-slate-800 font-sans text-indigo-700 dark:text-indigo-400 sticky left-0 z-10 bg-slate-100 dark:bg-slate-950 shadow-sm">
            Total {sec.sectionTitle}
          </td>
          <td className="p-3 border-r border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950"></td>
          {periods.map((period) => (
            <td
              key={period.id}
              className="p-3 text-right border-r border-slate-200 dark:border-slate-800 text-indigo-700 dark:text-indigo-300"
            >
              {formatValue(sec.sectionTotals[period.id] || 0)}
            </td>
          ))}
          <td className="p-3 text-right text-indigo-800 dark:text-indigo-200 bg-slate-100 dark:bg-slate-950">
            {formatValue(sec.sectionTotals.total || 0)}
          </td>
        </tr>
      </React.Fragment>
    );
  };

  return (
    <div className="flex flex-col h-full w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm dark:shadow-2xl relative">
      {/* Grid Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 bg-slate-50/90 dark:bg-slate-900/80 backdrop-blur border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center space-x-3">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Navegación por teclado (
            <kbd className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-800 rounded text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
              Tab
            </kbd>
            ,{' '}
            <kbd className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-800 rounded text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
              Enter
            </kbd>
            ,{' '}
            <kbd className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-800 rounded text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
              Esc
            </kbd>
            ), Copiar/Pegar Excel &{' '}
            <kbd className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-800 rounded text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
              Ctrl+D
            </kbd>{' '}
            (Rellenar Derecha)
          </span>
        </div>

        <div className="flex items-center space-x-4">
          {dirtyCells.size > 0 && (
            <span className="text-xs text-amber-600 dark:text-amber-400 font-medium animate-pulse">
              ● {dirtyCells.size} celda(s) con cambios sin guardar
            </span>
          )}
          <button
            onClick={onSave}
            disabled={isSaving || dirtyCells.size === 0}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              dirtyCells.size > 0
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 cursor-pointer'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed border border-slate-200 dark:border-slate-700'
            }`}
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Guardando...' : 'Guardar Todo'}</span>
          </button>
        </div>
      </div>

      {/* Spreadsheet Table with Horizontal Touch Scroll & Sticky Account Column (No bottom cash flow footer) */}
      <div
        ref={gridRef}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        className="flex-1 w-full overflow-auto outline-none"
      >
        <table className="w-full text-left border-collapse text-xs">
          <thead className="sticky top-0 z-20 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800 uppercase tracking-wider">
            <tr>
              <th className="p-3 min-w-[240px] max-w-[320px] border-r border-slate-200 dark:border-slate-800 sticky left-0 z-30 bg-slate-50 dark:bg-slate-950">
                Cuenta Contable / Sub-línea
              </th>
              <th className="p-3 w-12 text-center border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                •••
              </th>
              {periods.map((period) => (
                <th
                  key={period.id}
                  className={`p-3 min-w-[110px] text-right border-r border-slate-200 dark:border-slate-800 ${
                    period.status === 'CLOSED'
                      ? 'bg-slate-100/60 dark:bg-slate-900/50 text-slate-400 dark:text-slate-500'
                      : ''
                  }`}
                >
                  <div className="flex flex-col items-end">
                    <span className="flex items-center gap-1">
                      {period.friendlyName || period.name}
                      {period.status === 'CLOSED' && (
                        <Lock className="w-3 h-3 text-rose-500 dark:text-rose-400" />
                      )}
                    </span>
                    {period.status === 'CLOSED' && (
                      <span className="text-[10px] text-rose-500 dark:text-rose-400/80 lowercase">
                        cerrado
                      </span>
                    )}
                  </div>
                </th>
              ))}
              <th className="p-3 min-w-[120px] text-right font-bold text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-950">
                Total Anual
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
            {sections && sections.length > 0
              ? sections.map((sec) => renderSection(sec))
              : (rows || []).map((row, rIdx) => {
                  const rowKey = `${row.accountId}_${row.subRowId || 'main'}`;
                  const isMenuOpen = openMenuRowKey === rowKey;
                  return (
                    <tr
                      key={rowKey}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group"
                    >
                      <td className="p-3 border-r border-slate-200 dark:border-slate-800 font-sans font-medium text-slate-800 dark:text-slate-200 sticky left-0 z-10 bg-white group-hover:bg-slate-50 dark:bg-slate-900 dark:group-hover:bg-slate-850 shadow-sm">
                        <div className="flex flex-col">
                          <span className="text-slate-900 dark:text-slate-100 font-medium">
                            {row.accountName}
                          </span>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                            {row.accountCode}
                          </span>
                        </div>
                      </td>
                      <td className="p-2 text-center border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 relative row-options-menu-container">
                        <div className="relative inline-block">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuRowKey(isMenuOpen ? null : rowKey);
                            }}
                            title="Opciones de fila"
                            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>

                          {isMenuOpen && (
                            <div className="absolute left-full top-0 ml-1 w-44 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl py-1 z-50 text-left animate-in fade-in zoom-in-95 duration-100">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenMenuRowKey(null);
                                  if (onOpenAutofill) {
                                    onOpenAutofill(row);
                                  } else if (onOpenDriverModal) {
                                    onOpenDriverModal(row);
                                  }
                                }}
                                className="w-full flex items-center space-x-2 px-3 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors cursor-pointer"
                              >
                                <Wand2 className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400 shrink-0" />
                                <span>Rellenar</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                      {periods.map((period, cIdx) => {
                        const isSelected =
                          selectedCell?.rowIndex === rIdx && selectedCell?.colIndex === cIdx;
                        const isEditing =
                          editingCell?.rowIndex === rIdx && editingCell?.colIndex === cIdx;
                        const isClosed = period.status === 'CLOSED';
                        const amount = row.amounts[period.id] ?? 0;
                        return (
                          <td
                            key={period.id}
                            onClick={() => setSelectedCell({ rowIndex: rIdx, colIndex: cIdx })}
                            onDoubleClick={() => startEditing(rIdx, cIdx)}
                            className={`p-2.5 text-right border-r border-slate-200/60 dark:border-slate-800/50 cursor-pointer select-none ${
                              isClosed
                                ? 'bg-slate-100/60 dark:bg-slate-950/60 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                                : ''
                            } ${isSelected ? 'ring-2 ring-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 z-10' : ''}`}
                          >
                            {isEditing ? (
                              <input
                                ref={inputRef}
                                type="text"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onKeyDown={handleKeyDown}
                                onBlur={commitEdit}
                                className="w-full bg-white dark:bg-slate-950 text-right font-mono text-xs text-slate-900 dark:text-white border border-indigo-500 rounded px-1.5 py-0.5 outline-none"
                              />
                            ) : (
                              <div className="flex items-center justify-end">
                                {isClosed && (
                                  <Lock className="w-3 h-3 text-slate-400 dark:text-slate-600 inline mr-1" />
                                )}
                                <span
                                  className={
                                    amount === 0
                                      ? 'text-slate-400 dark:text-slate-600'
                                      : 'text-slate-800 dark:text-slate-200'
                                  }
                                >
                                  {formatValue(amount)}
                                </span>
                              </div>
                            )}
                          </td>
                        );
                      })}
                      <td className="p-3 text-right font-bold text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-900/80">
                        {formatValue(row.rowTotal)}
                      </td>
                    </tr>
                  );
                })}
          </tbody>
        </table>
      </div>

      {/* Unified Budget Account Modal for Create & Edit */}
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
              if (onEditBalanceRow) {
                onEditBalanceRow(account, label, direction, subRowId);
              } else if (onDirectionChange) {
                onDirectionChange(account.id, subRowId || null, direction);
              }
            } else {
              if (onAddBalanceRow) {
                onAddBalanceRow(account, label, direction);
              }
            }
            setAccountModalState({ isOpen: false, targetSection: null, editRow: null });
          }}
        />
      )}
    </div>
  );
};
