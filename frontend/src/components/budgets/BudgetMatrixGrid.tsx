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
  ArrowUpRight,
  ArrowDownRight,
  ChevronDown,
  ChevronRight,
  X,
  TrendingUp,
  ArrowUpCircle,
  ArrowDownCircle,
  Scale,
} from 'lucide-react';
import { AddBalanceBudgetModal } from './AddBalanceBudgetModal';

interface BudgetMatrixGridProps {
  matrixData: BudgetMatrixResponse;
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
  onCellChange,
  onPasteBatch,
  onSave,
  onOpenDriverModal,
  onDirectionChange,
  onAddSubRow,
  onDeleteSubRow,
  onAddBalanceRow,
  onDeleteRow,
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

  // Modal state for adding on-demand balance accounts (Assets / Liabilities)
  const [balanceModalTarget, setBalanceModalTarget] = useState<'ASSET' | 'LIABILITY' | null>(null);

  // Modal state for adding a sub-row
  const [addSubRowTarget, setAddSubRowTarget] = useState<{
    accountId: string;
    accountName: string;
  } | null>(null);
  const [newSubRowLabel, setNewSubRowLabel] = useState<string>('');
  const [newSubRowDirection, setNewSubRowDirection] = useState<CashFlowDirection>(
    CashFlowDirection.INGRESO_EFECTIVO,
  );

  // Check if a row is visible based on parent collapse state
  const isRowVisible = useCallback(
    (row: BudgetMatrixRow) => {
      if (!row.parentId) return true;
      // If immediate parent is collapsed, hide
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

  // Selected cell tracking: { rowIndex, colIndex } (colIndex 0..periods.length - 1)
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
  const handleFillRight = useCallback(() => {
    if (!selectedCell) return;
    const { rowIndex, colIndex } = selectedCell;
    if (colIndex >= periods.length - 1) return;

    const row = allFlatRows[rowIndex];
    if (!row || row.isParent) return;
    const currentPeriod = periods[colIndex];
    const sourceAmount = row.amounts[currentPeriod.id] ?? 0;

    const updates: Array<{
      accountId: string;
      periodId: string;
      amount: number;
      subRowId?: string | null;
    }> = [];
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
  }, [selectedCell, periods, allFlatRows, onPasteBatch, onCellChange]);

  // Keyboard navigation & Shortcuts (Tab, Enter, Esc, Shift+Tab, Shift+Enter, Arrows)
  const handleKeyDown = (e: React.KeyboardEvent) => {
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

    if (e.ctrlKey && (e.key === 'd' || e.key === 'D')) {
      e.preventDefault();
      handleFillRight();
      return;
    }

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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-PY', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const handleConfirmAddSubRow = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addSubRowTarget || !newSubRowLabel.trim()) return;
    if (onAddSubRow) {
      onAddSubRow(addSubRowTarget.accountId, newSubRowLabel.trim(), newSubRowDirection);
    }
    setAddSubRowTarget(null);
    setNewSubRowLabel('');
    setNewSubRowDirection(CashFlowDirection.INGRESO_EFECTIVO);
  };

  // Compute live sticky footer summary metrics from leaf rows
  const summaryMetrics = useMemo(() => {
    const allLeafRows = (rows || []).filter((r) => !r.isParent);
    const totalInflows: Record<string, number> & { total: number } = { total: 0 };
    const totalOutflows: Record<string, number> & { total: number } = { total: 0 };
    const netMonthlyFlow: Record<string, number> & { total: number } = { total: 0 };
    const cumulativeNetFlow: Record<string, number> & { total: number } = { total: 0 };

    let runningCumulative = 0;

    for (const period of periods) {
      let periodInflows = 0;
      let periodOutflows = 0;

      for (const r of allLeafRows) {
        const val = r.amounts[period.id] || 0;
        if (
          r.cashFlowDirection === CashFlowDirection.INGRESO_EFECTIVO ||
          (r.accountType === 'INCOME' && !r.cashFlowDirection)
        ) {
          periodInflows += val;
        } else if (
          r.cashFlowDirection === CashFlowDirection.EGRESO_EFECTIVO ||
          (r.accountType === 'EXPENSE' && !r.cashFlowDirection)
        ) {
          periodOutflows += val;
        }
      }

      totalInflows[period.id] = periodInflows;
      totalInflows.total += periodInflows;

      totalOutflows[period.id] = periodOutflows;
      totalOutflows.total += periodOutflows;

      const periodNet = periodInflows - periodOutflows;
      netMonthlyFlow[period.id] = periodNet;
      netMonthlyFlow.total += periodNet;

      runningCumulative += periodNet;
      cumulativeNetFlow[period.id] = runningCumulative;
    }
    cumulativeNetFlow.total = runningCumulative;

    return {
      totalInflows,
      totalOutflows,
      netMonthlyFlow,
      cumulativeNetFlow,
    };
  }, [rows, periods]);

  // Section badge color helper
  const getSectionBadge = (key: BudgetMatrixSectionKey | string) => {
    switch (key) {
      case BudgetMatrixSectionKey.INGRESOS:
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case BudgetMatrixSectionKey.GASTOS_VIDA:
      case BudgetMatrixSectionKey.EGRESOS:
        return 'bg-rose-500/20 text-rose-400 border-rose-500/30';
      case BudgetMatrixSectionKey.AHORRO_INVERSIONES:
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case BudgetMatrixSectionKey.DEUDAS_FINANCIACION:
      case BudgetMatrixSectionKey.FINANCIAMIENTO_AHORRO:
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
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
        <tr className="bg-slate-950/95 font-bold text-slate-100 uppercase tracking-wider text-xs border-t-2 border-b border-slate-800">
          <td
            colSpan={periods.length + 3}
            className="p-3 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 text-slate-100 font-sans tracking-wide"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${getSectionBadge(sec.sectionKey)}`}
                >
                  {sec.sectionTitle}
                </span>
                <span className="text-[11px] text-slate-400 font-normal lowercase">
                  ({sec.rows.filter((r) => !r.isParent).length} cuenta(s) activas)
                </span>
              </div>

              {/* On-Demand Budgeting Action Buttons */}
              {sec.sectionKey === BudgetMatrixSectionKey.AHORRO_INVERSIONES && (
                <button
                  type="button"
                  onClick={() => setBalanceModalTarget('ASSET')}
                  className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 border border-blue-500/40 text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Presupuestar Activo</span>
                </button>
              )}

              {(sec.sectionKey === BudgetMatrixSectionKey.DEUDAS_FINANCIACION ||
                sec.sectionKey === 'FINANCIAMIENTO_AHORRO') && (
                <button
                  type="button"
                  onClick={() => setBalanceModalTarget('LIABILITY')}
                  className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 border border-purple-500/40 text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Presupuestar Deuda</span>
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
              className="p-6 text-center bg-slate-900/40 text-slate-400 font-sans text-xs border-b border-slate-800/60"
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
                      setBalanceModalTarget(
                        sec.sectionKey === BudgetMatrixSectionKey.AHORRO_INVERSIONES
                          ? 'ASSET'
                          : 'LIABILITY',
                      )
                    }
                    className="inline-flex items-center space-x-1 px-3 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>
                      {sec.sectionKey === BudgetMatrixSectionKey.AHORRO_INVERSIONES
                        ? '+ Presupuestar Activo'
                        : '+ Presupuestar Deuda'}
                    </span>
                  </button>
                )}
              </div>
            </td>
          </tr>
        )}

        {/* Section Rows */}
        {visibleSecRows.map((row) => {
          const absoluteFlatIdx = allFlatRows.findIndex(
            (r) => r.accountId === row.accountId && r.subRowId === row.subRowId,
          );
          const isAssetOrLiability =
            isBalanceSection || ['ASSET', 'LIABILITY', 'EQUITY'].includes(row.accountType);
          const isParent = row.isParent;
          const isChild = !!row.parentId;
          const isCollapsed = isParent && collapsedParentIds.has(row.accountId);

          return (
            <tr
              key={`${row.accountId}_${row.subRowId || 'main'}`}
              className={`transition-colors group ${
                isParent
                  ? 'bg-slate-950/70 font-semibold text-slate-100 hover:bg-slate-900'
                  : 'hover:bg-slate-800/30'
              }`}
            >
              {/* Account Label (Sticky left column for mobile) */}
              <td
                className={`p-3 border-r border-slate-800 font-sans sticky left-0 z-10 min-w-[240px] max-w-[320px] ${
                  isParent
                    ? 'bg-slate-950 group-hover:bg-slate-900 font-bold text-slate-100'
                    : 'bg-slate-900 group-hover:bg-slate-850 font-medium text-slate-200'
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
                          className="p-0.5 rounded text-indigo-400 hover:text-indigo-200 hover:bg-indigo-500/20 transition-colors cursor-pointer"
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
                            ? 'text-indigo-300 font-bold text-xs cursor-pointer'
                            : isChild
                              ? 'text-slate-300 text-xs'
                              : 'text-slate-100 text-xs'
                        }`}
                        title={row.accountName}
                        onClick={() => isParent && toggleParentCollapse(row.accountId)}
                      >
                        {row.subRowLabel
                          ? `${row.accountName} (${row.subRowLabel})`
                          : row.accountName}
                      </span>
                    </div>

                    {/* Balance Row or Dynamic Sub-Row Deletion button (FR-018) */}
                    {(isAssetOrLiability || row.subRowId) && !isParent && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
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
                        title="Eliminar fila presupuestaria"
                        className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] text-slate-500 font-mono">
                        {row.accountCode}
                      </span>
                      {isParent && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          Subtotal Grupo
                        </span>
                      )}
                    </div>

                    {/* Cash Flow Direction Switch Toggle & Badges for Asset/Liability */}
                    {!isParent && isAssetOrLiability && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const newDir =
                            row.cashFlowDirection === CashFlowDirection.INGRESO_EFECTIVO
                              ? CashFlowDirection.EGRESO_EFECTIVO
                              : CashFlowDirection.INGRESO_EFECTIVO;
                          if (onDirectionChange) {
                            onDirectionChange(row.accountId, row.subRowId || null, newDir);
                          }
                        }}
                        title="Haga clic para cambiar la dirección del flujo de caja"
                        className={`flex items-center space-x-1 text-[9px] font-semibold px-2 py-0.5 rounded cursor-pointer transition-all border ${
                          row.cashFlowDirection === CashFlowDirection.INGRESO_EFECTIVO
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                            : row.cashFlowDirection === CashFlowDirection.EGRESO_EFECTIVO
                              ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30'
                              : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                        }`}
                      >
                        {row.cashFlowDirection === CashFlowDirection.INGRESO_EFECTIVO ? (
                          <>
                            <ArrowUpRight className="w-3 h-3 text-emerald-400" />
                            <span>+ INGRESO EFECTIVO</span>
                          </>
                        ) : row.cashFlowDirection === CashFlowDirection.EGRESO_EFECTIVO ? (
                          <>
                            <ArrowDownRight className="w-3 h-3 text-rose-400" />
                            <span>- EGRESO EFECTIVO</span>
                          </>
                        ) : (
                          <span>Dirección Flujo</span>
                        )}
                      </button>
                    )}
                  </div>

                  {/* Add Sub-Row button for Asset/Liability accounts */}
                  {!isParent && isAssetOrLiability && (
                    <div className="pt-0.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setAddSubRowTarget({
                            accountId: row.accountId,
                            accountName: row.accountName,
                          });
                          setNewSubRowLabel('');
                          setNewSubRowDirection(CashFlowDirection.INGRESO_EFECTIVO);
                        }}
                        title="Agregar sub-línea de movimiento a esta cuenta"
                        className="inline-flex items-center space-x-1 text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold px-1.5 py-0.5 rounded bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 transition-colors cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>+ Agregar sub-línea</span>
                      </button>
                    </div>
                  )}
                </div>
              </td>

              {/* Driver Action Button */}
              <td
                className={`p-2 text-center border-r border-slate-800 w-12 ${isParent ? 'bg-slate-950' : 'bg-slate-900 group-hover:bg-slate-850'}`}
              >
                {!isParent ? (
                  <button
                    onClick={() => onOpenDriverModal && onOpenDriverModal(row)}
                    title="Aplicar Motor de Distribución Inteligente"
                    className="p-1.5 rounded-md hover:bg-indigo-500/20 text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
                  >
                    <Wand2 className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <span className="text-[10px] text-slate-600">—</span>
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
                    className={`p-2.5 text-right border-r border-slate-800/50 select-none transition-all ${
                      isClosed
                        ? 'bg-slate-950/60 text-slate-500 cursor-not-allowed'
                        : isParent
                          ? 'bg-slate-950/40 text-indigo-300 font-bold cursor-default'
                          : 'cursor-pointer'
                    } ${
                      isSelected ? 'ring-2 ring-indigo-500 bg-indigo-500/10 z-10' : ''
                    } ${isDirty ? 'bg-amber-500/15 font-bold text-amber-300' : ''}`}
                  >
                    {isEditing ? (
                      <input
                        ref={inputRef}
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={commitEdit}
                        className="w-full bg-slate-950 text-right font-mono text-xs text-white border border-indigo-500 rounded px-1.5 py-0.5 outline-none"
                      />
                    ) : (
                      <div className="flex items-center justify-end space-x-1">
                        {isClosed && <Lock className="w-3 h-3 text-slate-600 inline mr-1" />}
                        <span
                          className={
                            isParent
                              ? 'text-indigo-300 font-bold'
                              : amount === 0
                                ? 'text-slate-600'
                                : 'text-slate-200'
                          }
                        >
                          {formatCurrency(amount)}
                        </span>
                      </div>
                    )}
                  </td>
                );
              })}

              {/* Row Total */}
              <td
                className={`p-3 text-right font-bold ${
                  isParent ? 'text-indigo-300 bg-slate-950' : 'text-slate-100 bg-slate-900/80'
                }`}
              >
                {formatCurrency(row.rowTotal)}
              </td>
            </tr>
          );
        })}

        {/* Section Total Row */}
        <tr className="bg-slate-950 font-bold border-t border-b-2 border-slate-800">
          <td className="p-3 border-r border-slate-800 font-sans text-indigo-400 sticky left-0 z-10 bg-slate-950">
            Total {sec.sectionTitle}
          </td>
          <td className="p-3 border-r border-slate-800 bg-slate-950"></td>
          {periods.map((period) => (
            <td
              key={period.id}
              className="p-3 text-right border-r border-slate-800 text-indigo-300"
            >
              {formatCurrency(sec.sectionTotals[period.id] || 0)}
            </td>
          ))}
          <td className="p-3 text-right text-indigo-200 bg-slate-950">
            {formatCurrency(sec.sectionTotals.total || 0)}
          </td>
        </tr>
      </React.Fragment>
    );
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl relative">
      {/* Grid Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 bg-slate-900/80 backdrop-blur border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <span className="text-xs text-slate-400">
            Navegación por teclado (
            <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-300">Tab</kbd>,{' '}
            <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-300">Enter</kbd>,{' '}
            <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-300">Esc</kbd>),
            Copiar/Pegar Excel &{' '}
            <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-300">Ctrl+D</kbd>{' '}
            (Rellenar Derecha)
          </span>
        </div>

        <div className="flex items-center space-x-4">
          {dirtyCells.size > 0 && (
            <span className="text-xs text-amber-400 font-medium animate-pulse">
              ● {dirtyCells.size} celda(s) con cambios sin guardar
            </span>
          )}
          <button
            onClick={onSave}
            disabled={isSaving || dirtyCells.size === 0}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              dirtyCells.size > 0
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 cursor-pointer'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Guardando...' : 'Guardar Todo'}</span>
          </button>
        </div>
      </div>

      {/* Spreadsheet Table with Horizontal Touch Scroll & Sticky Account Column */}
      <div
        ref={gridRef}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        className="flex-1 overflow-auto outline-none"
      >
        <table className="w-full text-left border-collapse text-xs">
          <thead className="sticky top-0 z-20 bg-slate-950/95 backdrop-blur text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider">
            <tr>
              <th className="p-3 min-w-[240px] max-w-[320px] border-r border-slate-800 sticky left-0 z-30 bg-slate-950">
                Cuenta Contable / Sub-línea
              </th>
              <th className="p-3 w-12 text-center border-r border-slate-800 bg-slate-950">Motor</th>
              {periods.map((period) => (
                <th
                  key={period.id}
                  className={`p-3 min-w-[110px] text-right border-r border-slate-800 ${
                    period.status === 'CLOSED' ? 'bg-slate-900/50 text-slate-500' : ''
                  }`}
                >
                  <div className="flex flex-col items-end">
                    <span className="flex items-center gap-1">
                      {period.friendlyName || period.name}
                      {period.status === 'CLOSED' && <Lock className="w-3 h-3 text-rose-400" />}
                    </span>
                    {period.status === 'CLOSED' && (
                      <span className="text-[10px] text-rose-400/80 lowercase">cerrado</span>
                    )}
                  </div>
                </th>
              ))}
              <th className="p-3 min-w-[120px] text-right font-bold text-slate-200 bg-slate-950">
                Total Anual
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono">
            {sections && sections.length > 0
              ? sections.map((sec) => renderSection(sec))
              : // Fallback if sections empty
                (rows || []).map((row, rIdx) => (
                  <tr key={row.accountId} className="hover:bg-slate-800/30 transition-colors group">
                    <td className="p-3 border-r border-slate-800 font-sans font-medium text-slate-200 sticky left-0 z-10 bg-slate-900 group-hover:bg-slate-850">
                      <div className="flex flex-col">
                        <span className="text-slate-100 font-medium">{row.accountName}</span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {row.accountCode}
                        </span>
                      </div>
                    </td>
                    <td className="p-2 text-center border-r border-slate-800 bg-slate-900">
                      <button
                        onClick={() => onOpenDriverModal && onOpenDriverModal(row)}
                        title="Aplicar Motor de Distribución Inteligente"
                        className="p-1.5 rounded-md hover:bg-indigo-500/20 text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
                      >
                        <Wand2 className="w-3.5 h-3.5" />
                      </button>
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
                          className={`p-2.5 text-right border-r border-slate-800/50 cursor-pointer select-none ${
                            isClosed ? 'bg-slate-950/60 text-slate-500 cursor-not-allowed' : ''
                          } ${isSelected ? 'ring-2 ring-indigo-500 bg-indigo-500/10 z-10' : ''}`}
                        >
                          {isEditing ? (
                            <input
                              ref={inputRef}
                              type="text"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={commitEdit}
                              className="w-full bg-slate-950 text-right font-mono text-xs text-white border border-indigo-500 rounded px-1.5 py-0.5 outline-none"
                            />
                          ) : (
                            <div className="flex items-center justify-end">
                              {isClosed && <Lock className="w-3 h-3 text-slate-600 inline mr-1" />}
                              <span className={amount === 0 ? 'text-slate-600' : 'text-slate-200'}>
                                {formatCurrency(amount)}
                              </span>
                            </div>
                          )}
                        </td>
                      );
                    })}
                    <td className="p-3 text-right font-bold text-slate-100 bg-slate-900/80">
                      {formatCurrency(row.rowTotal)}
                    </td>
                  </tr>
                ))}
          </tbody>

          {/* Sticky Footer Summary Bar (FR-013: Total Entradas, Total Salidas, Flujo Neto del Mes, Flujo Neto Acumulado) */}
          <tfoot className="sticky bottom-0 z-20 bg-slate-950/98 backdrop-blur border-t-2 border-indigo-500/40 shadow-2xl font-mono">
            {/* Total Entradas (+) */}
            <tr className="border-b border-slate-800/60 bg-slate-950 text-emerald-400">
              <td className="p-3 border-r border-slate-800 font-sans font-bold sticky left-0 z-30 bg-slate-950 flex items-center space-x-2">
                <ArrowUpCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Total Entradas de Caja (+)</span>
              </td>
              <td className="p-3 border-r border-slate-800 bg-slate-950"></td>
              {periods.map((period) => (
                <td
                  key={period.id}
                  className="p-3 text-right border-r border-slate-800 font-bold text-emerald-300"
                >
                  {formatCurrency(summaryMetrics.totalInflows[period.id] || 0)}
                </td>
              ))}
              <td className="p-3 text-right font-bold text-emerald-200 bg-slate-950">
                {formatCurrency(summaryMetrics.totalInflows.total || 0)}
              </td>
            </tr>

            {/* Total Salidas (-) */}
            <tr className="border-b border-slate-800/60 bg-slate-950 text-rose-400">
              <td className="p-3 border-r border-slate-800 font-sans font-bold sticky left-0 z-30 bg-slate-950 flex items-center space-x-2">
                <ArrowDownCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>Total Salidas de Caja (-)</span>
              </td>
              <td className="p-3 border-r border-slate-800 bg-slate-950"></td>
              {periods.map((period) => (
                <td
                  key={period.id}
                  className="p-3 text-right border-r border-slate-800 font-bold text-rose-300"
                >
                  {formatCurrency(summaryMetrics.totalOutflows[period.id] || 0)}
                </td>
              ))}
              <td className="p-3 text-right font-bold text-rose-200 bg-slate-950">
                {formatCurrency(summaryMetrics.totalOutflows.total || 0)}
              </td>
            </tr>

            {/* Flujo Neto del Mes */}
            <tr className="border-b border-slate-800/60 bg-slate-950/90 text-slate-100">
              <td className="p-3 border-r border-slate-800 font-sans font-bold sticky left-0 z-30 bg-slate-950 flex items-center space-x-2">
                <Scale className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>Flujo Neto del Mes (Δ)</span>
              </td>
              <td className="p-3 border-r border-slate-800 bg-slate-950"></td>
              {periods.map((period) => {
                const net = summaryMetrics.netMonthlyFlow[period.id] || 0;
                return (
                  <td
                    key={period.id}
                    className={`p-3 text-right border-r border-slate-800 font-bold ${
                      net >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {formatCurrency(net)}
                  </td>
                );
              })}
              <td
                className={`p-3 text-right font-bold bg-slate-950 ${
                  summaryMetrics.netMonthlyFlow.total >= 0 ? 'text-emerald-300' : 'text-rose-300'
                }`}
              >
                {formatCurrency(summaryMetrics.netMonthlyFlow.total || 0)}
              </td>
            </tr>

            {/* Flujo Neto Acumulado */}
            <tr className="bg-slate-950 text-indigo-300">
              <td className="p-3 border-r border-slate-800 font-sans font-bold sticky left-0 z-30 bg-slate-950 flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>Flujo Neto Acumulado (12M)</span>
              </td>
              <td className="p-3 border-r border-slate-800 bg-slate-950"></td>
              {periods.map((period) => {
                const cum = summaryMetrics.cumulativeNetFlow[period.id] || 0;
                return (
                  <td
                    key={period.id}
                    className={`p-3 text-right border-r border-slate-800 font-bold ${
                      cum >= 0 ? 'text-indigo-300' : 'text-amber-400'
                    }`}
                  >
                    {formatCurrency(cum)}
                  </td>
                );
              })}
              <td
                className={`p-3 text-right font-bold bg-slate-950 ${
                  summaryMetrics.cumulativeNetFlow.total >= 0 ? 'text-indigo-200' : 'text-amber-300'
                }`}
              >
                {formatCurrency(summaryMetrics.cumulativeNetFlow.total || 0)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Add Sub-Row Modal Dialog */}
      {addSubRowTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4 font-sans">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Plus className="w-4 h-4 text-indigo-400" />
                <span>Agregar Sub-línea de Movimiento</span>
              </h3>
              <button
                onClick={() => setAddSubRowTarget(null)}
                className="text-slate-400 hover:text-slate-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmAddSubRow} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Cuenta Base:
                </label>
                <span className="block text-xs font-bold text-indigo-300 bg-slate-950 p-2 rounded border border-slate-800">
                  {addSubRowTarget.accountName}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nombre / Etiqueta de la Sub-línea:
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Compras Financiadas, Pago de Tarjeta..."
                  value={newSubRowLabel}
                  onChange={(e) => setNewSubRowLabel(e.target.value)}
                  className="w-full bg-slate-950 text-xs text-slate-100 border border-slate-700 rounded-lg p-2.5 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Dirección de Flujo de Caja:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewSubRowDirection(CashFlowDirection.INGRESO_EFECTIVO)}
                    className={`flex items-center justify-center space-x-1.5 p-2.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                      newSubRowDirection === CashFlowDirection.INGRESO_EFECTIVO
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-850'
                    }`}
                  >
                    <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
                    <span>+ INGRESO EFECTIVO</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewSubRowDirection(CashFlowDirection.EGRESO_EFECTIVO)}
                    className={`flex items-center justify-center space-x-1.5 p-2.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                      newSubRowDirection === CashFlowDirection.EGRESO_EFECTIVO
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-850'
                    }`}
                  >
                    <ArrowDownRight className="w-3.5 h-3.5 text-rose-400" />
                    <span>- EGRESO EFECTIVO</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setAddSubRowTarget(null)}
                  className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-colors cursor-pointer"
                >
                  Crear Sub-línea
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Balance Budget Modal (Assets / Liabilities on-demand) */}
      {balanceModalTarget && (
        <AddBalanceBudgetModal
          isOpen={!!balanceModalTarget}
          targetBlock={balanceModalTarget}
          onClose={() => setBalanceModalTarget(null)}
          onAdd={(account, label, direction) => {
            if (onAddBalanceRow) {
              onAddBalanceRow(account, label, direction);
            }
            setBalanceModalTarget(null);
          }}
        />
      )}
    </div>
  );
};
