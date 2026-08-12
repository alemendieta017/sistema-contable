'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BudgetMatrixResponse, BudgetMatrixRow } from '@sistema-contable/shared';
import { Wand2, Save } from 'lucide-react';

interface BudgetMatrixGridProps {
  matrixData: BudgetMatrixResponse;
  onCellChange: (accountId: string, periodId: string, value: number) => void;
  onPasteBatch?: (updates: Array<{ accountId: string; periodId: string; amount: number }>) => void;
  onSave: () => void;
  onOpenDriverModal?: (row: BudgetMatrixRow) => void;
  isSaving?: boolean;
  dirtyCells: Set<string>;
}

export const BudgetMatrixGrid: React.FC<BudgetMatrixGridProps> = ({
  matrixData,
  onCellChange,
  onPasteBatch,
  onSave,
  onOpenDriverModal,
  isSaving = false,
  dirtyCells,
}) => {
  const { periods, rows, categoryTotals } = matrixData;

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
    const row = rows[rowIndex];
    const period = periods[colIndex];
    if (row && period && period.status !== 'CLOSED') {
      const numVal = parseFloat(editValue.replace(/[^0-9.-]+/g, '')) || 0;
      onCellChange(row.accountId, period.id, Math.max(0, numVal));
    }
    setEditingCell(null);
  }, [editingCell, editValue, rows, periods, onCellChange]);

  const cancelEdit = useCallback(() => {
    setEditingCell(null);
  }, []);

  const startEditing = useCallback(
    (rowIndex: number, colIndex: number) => {
      const period = periods[colIndex];
      if (period && period.status === 'CLOSED') return;
      const row = rows[rowIndex];
      if (!row) return;
      const val = row.amounts[period.id] ?? 0;
      setEditingCell({ rowIndex, colIndex });
      setEditValue(val === 0 ? '' : String(val));
    },
    [periods, rows],
  );

  // Fill Right handler (Ctrl+D)
  const handleFillRight = useCallback(() => {
    if (!selectedCell) return;
    const { rowIndex, colIndex } = selectedCell;
    if (colIndex >= periods.length - 1) return; // already at rightmost

    const row = rows[rowIndex];
    const currentPeriod = periods[colIndex];
    const sourceAmount = row.amounts[currentPeriod.id] ?? 0;

    // Fill all periods to the right
    const updates: Array<{ accountId: string; periodId: string; amount: number }> = [];
    for (let c = colIndex + 1; c < periods.length; c++) {
      const targetPeriod = periods[c];
      if (targetPeriod.status !== 'CLOSED') {
        updates.push({
          accountId: row.accountId,
          periodId: targetPeriod.id,
          amount: sourceAmount,
        });
      }
    }

    if (updates.length > 0) {
      if (onPasteBatch) {
        onPasteBatch(updates);
      } else {
        updates.forEach((u) => onCellChange(u.accountId, u.periodId, u.amount));
      }
    }
  }, [selectedCell, periods, rows, onPasteBatch, onCellChange]);

  // Keyboard navigation & Shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (editingCell) {
      if (e.key === 'Enter') {
        e.preventDefault();
        commitEdit();
        if (selectedCell && selectedCell.rowIndex < rows.length - 1) {
          setSelectedCell({ rowIndex: selectedCell.rowIndex + 1, colIndex: selectedCell.colIndex });
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
            }
          } else {
            if (selectedCell.colIndex < periods.length - 1) {
              setSelectedCell({
                rowIndex: selectedCell.rowIndex,
                colIndex: selectedCell.colIndex + 1,
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
        if (selectedCell.rowIndex < rows.length - 1) {
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
          }
        } else {
          if (selectedCell.colIndex < periods.length - 1) {
            setSelectedCell({ ...selectedCell, colIndex: selectedCell.colIndex + 1 });
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

  // Clipboard paste parser
  const handlePaste = (e: React.ClipboardEvent) => {
    if (!selectedCell) return;
    const pasteData = e.clipboardData.getData('text');
    if (!pasteData) return;

    e.preventDefault();

    const pasteRows = pasteData
      .trim()
      .split(/\r?\n/)
      .map((line) => line.split('\t'));

    const updates: Array<{ accountId: string; periodId: string; amount: number }> = [];

    pasteRows.forEach((pRow, rOffset) => {
      const rIdx = selectedCell.rowIndex + rOffset;
      if (rIdx >= rows.length) return;
      const targetRow = rows[rIdx];

      pRow.forEach((valStr, cOffset) => {
        const cIdx = selectedCell.colIndex + cOffset;
        if (cIdx >= periods.length) return;
        const targetPeriod = periods[cIdx];

        if (targetPeriod.status !== 'CLOSED') {
          const cleanNum = parseFloat(valStr.replace(/[^0-9.-]+/g, '')) || 0;
          updates.push({
            accountId: targetRow.accountId,
            periodId: targetPeriod.id,
            amount: Math.max(0, cleanNum),
          });
        }
      });
    });

    if (updates.length > 0) {
      if (onPasteBatch) {
        onPasteBatch(updates);
      } else {
        updates.forEach((u) => onCellChange(u.accountId, u.periodId, u.amount));
      }
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-PY', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
      {/* Grid Toolbar */}
      <div className="flex items-center justify-between px-6 py-4 bg-slate-900/80 backdrop-blur border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <span className="text-xs text-slate-400">
            Navegación por teclado (
            <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-300">Tab</kbd>,{' '}
            <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-300">Enter</kbd>),
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
            <span>{isSaving ? 'Guardando...' : 'Guardar Cambios'}</span>
          </button>
        </div>
      </div>

      {/* Spreadsheet Table */}
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
              <th className="p-3 min-w-[200px] border-r border-slate-800 sticky left-0 z-30 bg-slate-950">
                Cuenta Contable
              </th>
              <th className="p-3 w-12 text-center border-r border-slate-800 sticky left-[200px] z-30 bg-slate-950">
                Motor
              </th>
              {periods.map((period) => (
                <th
                  key={period.id}
                  className={`p-3 min-w-[110px] text-right border-r border-slate-800 ${
                    period.status === 'CLOSED' ? 'bg-slate-900/50 text-slate-500' : ''
                  }`}
                >
                  <div className="flex flex-col items-end">
                    <span>{period.friendlyName || period.name}</span>
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
            {rows.map((row, rIdx) => (
              <tr key={row.accountId} className="hover:bg-slate-800/30 transition-colors group">
                {/* Account Label */}
                <td className="p-3 border-r border-slate-800 font-sans font-medium text-slate-200 sticky left-0 z-10 bg-slate-900 group-hover:bg-slate-850">
                  <div className="flex flex-col">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-slate-100 font-medium">{row.accountName}</span>
                      {row.accountType === 'LIABILITY' && (
                        <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          Pasivo (Pagar/Recibir)
                        </span>
                      )}
                      {row.accountType === 'ASSET' && (
                        <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Activo (Invertir/Ahorrar)
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">{row.accountCode}</span>
                  </div>
                </td>

                {/* Driver Action Button */}
                <td className="p-2 text-center border-r border-slate-800 sticky left-[200px] z-10 bg-slate-900 group-hover:bg-slate-850">
                  <button
                    onClick={() => onOpenDriverModal && onOpenDriverModal(row)}
                    title="Aplicar Motor de Distribución Inteligente"
                    className="p-1.5 rounded-md hover:bg-indigo-500/20 text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    <Wand2 className="w-3.5 h-3.5" />
                  </button>
                </td>

                {/* Monthly Period Amount Cells */}
                {periods.map((period, cIdx) => {
                  const isSelected =
                    selectedCell?.rowIndex === rIdx && selectedCell?.colIndex === cIdx;
                  const isEditing =
                    editingCell?.rowIndex === rIdx && editingCell?.colIndex === cIdx;
                  const isDirty = dirtyCells.has(`${period.id}_${row.accountId}`);
                  const isClosed = period.status === 'CLOSED';
                  const amount = row.amounts[period.id] ?? 0;
                  const intention = row.flowIntentions?.[period.id];

                  let flowBadge = null;
                  if (row.accountType === 'LIABILITY') {
                    const isPay = !intention || intention === 'PAY';
                    flowBadge = (
                      <span
                        className={`text-[9px] px-1 py-0.2 rounded ml-1 font-sans ${isPay ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'}`}
                      >
                        {isPay ? '- Cash' : '+ Cash'}
                      </span>
                    );
                  } else if (row.accountType === 'ASSET') {
                    const isInflow = intention === 'DIVEST';
                    flowBadge = (
                      <span
                        className={`text-[9px] px-1 py-0.2 rounded ml-1 font-sans ${isInflow ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}
                      >
                        {isInflow ? '+ Cash' : '- Cash'}
                      </span>
                    );
                  }

                  return (
                    <td
                      key={period.id}
                      onClick={() => {
                        setSelectedCell({ rowIndex: rIdx, colIndex: cIdx });
                      }}
                      onDoubleClick={() => startEditing(rIdx, cIdx)}
                      className={`p-2.5 text-right border-r border-slate-800/50 cursor-pointer select-none transition-all ${
                        isClosed ? 'bg-slate-950/40 text-slate-600 cursor-not-allowed' : ''
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
                        <div className="flex items-center justify-end">
                          <span className={amount === 0 ? 'text-slate-600' : 'text-slate-200'}>
                            {formatCurrency(amount)}
                          </span>
                          {amount > 0 && flowBadge}
                        </div>
                      )}
                    </td>
                  );
                })}

                {/* Row Total */}
                <td className="p-3 text-right font-bold text-slate-100 bg-slate-900/80">
                  {formatCurrency(row.rowTotal)}
                </td>
              </tr>
            ))}

            {/* Category Summary Aggregation Rows */}
            {Object.entries(categoryTotals).map(([catType, catData]) => {
              const catLabelMap: Record<string, string> = {
                EXPENSE: 'GASTOS',
                INCOME: 'INGRESOS',
                ASSET: 'ACTIVOS',
                LIABILITY: 'PASIVOS',
                EQUITY: 'PATRIMONIO NETO',
              };
              const displayCatName = catLabelMap[catType] || catType;
              return (
                <tr key={catType} className="bg-slate-950/90 font-bold border-t-2 border-slate-800">
                  <td className="p-3 border-r border-slate-800 font-sans text-indigo-400 sticky left-0 z-10 bg-slate-950">
                    TOTAL {displayCatName}
                  </td>
                  <td className="p-3 border-r border-slate-800 sticky left-[200px] z-10 bg-slate-950"></td>
                  {periods.map((period) => (
                    <td
                      key={period.id}
                      className="p-3 text-right border-r border-slate-800 text-indigo-300"
                    >
                      {formatCurrency(catData[period.id] || 0)}
                    </td>
                  ))}
                  <td className="p-3 text-right text-indigo-200 bg-slate-950">
                    {formatCurrency(catData.total || 0)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
