'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../../services/api';
import {
  BudgetMatrixResponse,
  BudgetMatrixRow,
  CashFlowDirection,
  BudgetMatrixSectionKey,
} from '@sistema-contable/shared';
import { BudgetMatrixGrid } from '../../../components/budgets/BudgetMatrixGrid';
import { DriverActionModal } from '../../../components/budgets/DriverActionModal';
import { Calendar, Filter, RefreshCw } from 'lucide-react';

export default function BudgetMatrixPage() {
  const [fiscalYears, setFiscalYears] = useState<any[]>([]);
  const [selectedFiscalYearId, setSelectedFiscalYearId] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [matrixData, setMatrixData] = useState<BudgetMatrixResponse | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Dirty tracking state
  const [dirtyCells, setDirtyCells] = useState<Set<string>>(new Set());
  const [pendingUpdates, setPendingUpdates] = useState<
    Map<
      string,
      {
        periodId: string;
        accountId: string;
        amount: number;
        subRowId?: string | null;
        subRowLabel?: string | null;
        cashFlowDirection?: any;
      }
    >
  >(new Map());

  // Driver action modal state
  const [activeDriverRow, setActiveDriverRow] = useState<BudgetMatrixRow | null>(null);
  const [isDriverModalOpen, setIsDriverModalOpen] = useState<boolean>(false);
  const [isBaselineLoading, setIsBaselineLoading] = useState<boolean>(false);

  // Warn user on page navigation/unload if dirty changes exist (FR-019)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dirtyCells.size > 0) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [dirtyCells.size]);

  // Load Fiscal Years on mount
  useEffect(() => {
    async function loadFiscalYears() {
      try {
        const fyList = await api.fiscalYears.list();
        setFiscalYears(fyList || []);
        if (fyList && fyList.length > 0) {
          const currentYear = new Date().getFullYear();
          const activeFy = fyList.find((fy: any) => fy.year === currentYear) || fyList[0];
          setSelectedFiscalYearId(activeFy.id);
        }
      } catch (err) {
        console.error('Error al cargar años fiscales:', err);
      }
    }
    loadFiscalYears();
  }, []);

  // Fetch Matrix Data when Fiscal Year or Category changes
  const fetchMatrixData = useCallback(async () => {
    if (!selectedFiscalYearId) return;
    setIsLoading(true);
    try {
      const data = await api.budgets.getBudgetMatrix(
        selectedFiscalYearId,
        selectedCategory || undefined,
      );
      setMatrixData(data);
      setDirtyCells(new Set());
      setPendingUpdates(new Map());
    } catch (err) {
      console.error('Error al obtener la matriz presupuestaria:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedFiscalYearId, selectedCategory]);

  useEffect(() => {
    fetchMatrixData();
  }, [fetchMatrixData]);

  // Handle cell change from grid
  const handleCellChange = (
    accountId: string,
    periodId: string,
    value: number,
    subRowId?: string | null,
  ) => {
    if (!matrixData) return;

    const cellKey = `${periodId}_${accountId}${subRowId ? `_${subRowId}` : ''}`;

    // Update pending updates
    setPendingUpdates((prev) => {
      const next = new Map(prev);
      next.set(cellKey, { periodId, accountId, amount: value, subRowId: subRowId || null });
      return next;
    });

    // Mark dirty
    setDirtyCells((prev) => new Set(prev).add(cellKey));

    // Optimistically update local matrixData including parent rollup and section totals
    setMatrixData((prev) => {
      if (!prev) return null;

      // 1. Update leaf rows
      const updateLeafRowList = (rowList: BudgetMatrixRow[]) =>
        rowList.map((row) => {
          if (
            row.accountId === accountId &&
            (row.subRowId === subRowId || (!row.subRowId && !subRowId))
          ) {
            const newAmounts = { ...row.amounts, [periodId]: value };
            const newRowTotal = Object.values(newAmounts).reduce((sum, v) => sum + v, 0);
            return { ...row, amounts: newAmounts, rowTotal: newRowTotal };
          }
          return row;
        });

      let updatedRows = updateLeafRowList(prev.rows || []);

      // 2. Roll up parent accounts dynamically
      const parentIds = new Set(updatedRows.filter((r) => r.isParent).map((r) => r.accountId));
      if (parentIds.size > 0) {
        updatedRows = updatedRows.map((row) => {
          if (row.isParent) {
            const childRows = updatedRows.filter(
              (r) => r.parentId === row.accountId && !r.isParent,
            );
            const parentAmounts: Record<string, number> = {};
            let parentRowTotal = 0;
            for (const p of prev.periods) {
              const pSum = childRows.reduce((sum, c) => sum + (c.amounts[p.id] || 0), 0);
              parentAmounts[p.id] = pSum;
              parentRowTotal += pSum;
            }
            return { ...row, amounts: parentAmounts, rowTotal: parentRowTotal };
          }
          return row;
        });
      }

      // 3. Rebuild sections and section totals (only summing leaf rows)
      const updatedSections = (prev.sections || []).map((sec) => {
        const secRows = updatedRows.filter((r) => {
          if (sec.sectionKey === BudgetMatrixSectionKey.INGRESOS) return r.accountType === 'INCOME';
          if (
            sec.sectionKey === BudgetMatrixSectionKey.GASTOS_VIDA ||
            sec.sectionKey === 'EGRESOS'
          ) {
            return r.accountType === 'EXPENSE';
          }
          if (sec.sectionKey === BudgetMatrixSectionKey.AHORRO_INVERSIONES) {
            return r.accountType === 'ASSET';
          }
          if (
            sec.sectionKey === BudgetMatrixSectionKey.DEUDAS_FINANCIACION ||
            sec.sectionKey === 'FINANCIAMIENTO_AHORRO'
          ) {
            return ['LIABILITY', 'EQUITY'].includes(r.accountType);
          }
          return false;
        });

        const newSecTotals: Record<string, number> & { total: number } = { total: 0 };
        const leafSecRows = secRows.filter((r) => !r.isParent);

        for (const p of prev.periods) {
          let pTot = 0;
          for (const r of leafSecRows) {
            const v = r.amounts[p.id] || 0;
            if (
              (sec.sectionKey === BudgetMatrixSectionKey.AHORRO_INVERSIONES ||
                sec.sectionKey === BudgetMatrixSectionKey.DEUDAS_FINANCIACION ||
                sec.sectionKey === 'FINANCIAMIENTO_AHORRO') &&
              r.cashFlowDirection === CashFlowDirection.EGRESO_EFECTIVO
            ) {
              pTot -= v;
            } else {
              pTot += v;
            }
          }
          newSecTotals[p.id] = pTot;
          newSecTotals.total += pTot;
        }
        return { ...sec, rows: secRows, sectionTotals: newSecTotals };
      });

      return {
        ...prev,
        rows: updatedRows,
        sections: updatedSections,
      };
    });
  };

  // Handle paste batch
  const handlePasteBatch = (
    updates: Array<{
      accountId: string;
      periodId: string;
      amount: number;
      subRowId?: string | null;
    }>,
  ) => {
    updates.forEach((u) => handleCellChange(u.accountId, u.periodId, u.amount, u.subRowId));
  };

  // Save changes to backend atomically via [ 💾 Guardar Todo ]
  const handleSave = async () => {
    if (!selectedFiscalYearId || pendingUpdates.size === 0) return;
    setIsSaving(true);
    try {
      const updatesList = Array.from(pendingUpdates.values());
      await api.budgets.updateBudgetMatrix({
        fiscalYearId: selectedFiscalYearId,
        updates: updatesList,
      });
      await fetchMatrixData();
    } catch (err: any) {
      alert(`Error al guardar cambios: ${err.message || 'Intente de nuevo.'}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle cash flow direction toggle
  const handleDirectionChange = (accountId: string, subRowId: string | null, direction: any) => {
    if (!matrixData) return;

    setMatrixData((prev) => {
      if (!prev) return null;

      const updateRowList = (rowList: BudgetMatrixRow[]) =>
        rowList.map((row) => {
          if (
            row.accountId === accountId &&
            (row.subRowId === subRowId || (!row.subRowId && !subRowId))
          ) {
            return { ...row, cashFlowDirection: direction };
          }
          return row;
        });

      const updatedRows = updateRowList(prev.rows || []);
      const updatedSections = (prev.sections || []).map((sec) => {
        const secRows = updateRowList(sec.rows);
        const newSecTotals: Record<string, number> & { total: number } = { total: 0 };
        const leafRows = secRows.filter((r) => !r.isParent);
        for (const p of prev.periods) {
          let pTot = 0;
          for (const r of leafRows) {
            const v = r.amounts[p.id] || 0;
            if (
              (sec.sectionKey === 'AHORRO_INVERSIONES' ||
                sec.sectionKey === 'DEUDAS_FINANCIACION' ||
                sec.sectionKey === 'FINANCIAMIENTO_AHORRO') &&
              r.cashFlowDirection === CashFlowDirection.EGRESO_EFECTIVO
            ) {
              pTot -= v;
            } else {
              pTot += v;
            }
          }
          newSecTotals[p.id] = pTot;
          newSecTotals.total += pTot;
        }
        return { ...sec, rows: secRows, sectionTotals: newSecTotals };
      });

      return {
        ...prev,
        rows: updatedRows,
        sections: updatedSections,
      };
    });

    for (const p of matrixData.periods) {
      if (p.status !== 'CLOSED') {
        const cellKey = `${p.id}_${accountId}${subRowId ? `_${subRowId}` : ''}`;
        const targetRow = (matrixData.rows || []).find(
          (r) => r.accountId === accountId && r.subRowId === subRowId,
        );
        const currentAmount = targetRow ? targetRow.amounts[p.id] || 0 : 0;
        const subRowLabel = targetRow ? targetRow.subRowLabel : null;

        setPendingUpdates((prev) => {
          const next = new Map(prev);
          next.set(cellKey, {
            periodId: p.id,
            accountId,
            subRowId: subRowId || null,
            subRowLabel,
            cashFlowDirection: direction,
            amount: currentAmount,
          });
          return next;
        });
        setDirtyCells((prev) => new Set(prev).add(cellKey));
      }
    }
  };

  // Handle adding a dynamic sub-row
  const handleAddSubRow = (accountId: string, label: string, direction: any) => {
    if (!matrixData) return;
    const targetRow = (matrixData.rows || []).find((r) => r.accountId === accountId);
    if (!targetRow) return;

    const newSubRowId = `sub_${Date.now()}`;
    const initialAmounts: Record<string, number> = {};
    matrixData.periods.forEach((p) => {
      initialAmounts[p.id] = 0;
    });

    const newRow: BudgetMatrixRow = {
      accountId,
      accountCode: targetRow.accountCode,
      accountName: targetRow.accountName,
      accountType: targetRow.accountType,
      subRowId: newSubRowId,
      subRowLabel: label,
      cashFlowDirection: direction,
      amounts: initialAmounts,
      rowTotal: 0,
    };

    setMatrixData((prev) => {
      if (!prev) return null;
      const newRows = [...(prev.rows || []), newRow];
      const newSections = (prev.sections || []).map((sec) => {
        if (
          sec.sectionKey === BudgetMatrixSectionKey.AHORRO_INVERSIONES ||
          sec.sectionKey === BudgetMatrixSectionKey.DEUDAS_FINANCIACION ||
          sec.sectionKey === 'FINANCIAMIENTO_AHORRO' ||
          ['ASSET', 'LIABILITY', 'EQUITY'].includes(targetRow.accountType)
        ) {
          return { ...sec, rows: [...sec.rows, newRow] };
        }
        return sec;
      });

      return {
        ...prev,
        rows: newRows,
        sections: newSections,
      };
    });

    if (matrixData.periods.length > 0) {
      const p1 = matrixData.periods[0];
      const cellKey = `${p1.id}_${accountId}_${newSubRowId}`;
      setPendingUpdates((prev) => {
        const next = new Map(prev);
        next.set(cellKey, {
          periodId: p1.id,
          accountId,
          subRowId: newSubRowId,
          subRowLabel: label,
          cashFlowDirection: direction,
          amount: 0,
        });
        return next;
      });
      setDirtyCells((prev) => new Set(prev).add(cellKey));
    }
  };

  // Handle adding an on-demand balance row (Assets / Liabilities)
  const handleAddBalanceRow = (
    account: { id: string; name: string; code: string; type: string },
    label: string,
    direction: CashFlowDirection,
  ) => {
    if (!matrixData) return;

    const newSubRowId = `sub_${Date.now()}`;
    const initialAmounts: Record<string, number> = {};
    matrixData.periods.forEach((p) => {
      initialAmounts[p.id] = 0;
    });

    const newRow: BudgetMatrixRow = {
      accountId: account.id,
      accountCode: account.code,
      accountName: account.name,
      accountType: account.type,
      subRowId: newSubRowId,
      subRowLabel: label,
      cashFlowDirection: direction,
      amounts: initialAmounts,
      rowTotal: 0,
    };

    setMatrixData((prev) => {
      if (!prev) return null;
      const newRows = [...(prev.rows || []), newRow];
      const newSections = (prev.sections || []).map((sec) => {
        const isTargetSec =
          (account.type === 'ASSET' &&
            sec.sectionKey === BudgetMatrixSectionKey.AHORRO_INVERSIONES) ||
          (['LIABILITY', 'EQUITY'].includes(account.type) &&
            (sec.sectionKey === BudgetMatrixSectionKey.DEUDAS_FINANCIACION ||
              sec.sectionKey === 'FINANCIAMIENTO_AHORRO'));

        if (isTargetSec) {
          return { ...sec, rows: [...sec.rows, newRow] };
        }
        return sec;
      });

      return {
        ...prev,
        rows: newRows,
        sections: newSections,
      };
    });

    // Mark newly created sub-row as pending update across periods
    for (const p of matrixData.periods) {
      if (p.status !== 'CLOSED') {
        const cellKey = `${p.id}_${account.id}_${newSubRowId}`;
        setPendingUpdates((prev) => {
          const next = new Map(prev);
          next.set(cellKey, {
            periodId: p.id,
            accountId: account.id,
            subRowId: newSubRowId,
            subRowLabel: label,
            cashFlowDirection: direction,
            amount: 0,
          });
          return next;
        });
        setDirtyCells((prev) => new Set(prev).add(cellKey));
      }
    }
  };

  // Handle deleting a dynamic sub-row or on-demand balance row
  const handleDeleteRow = async (accountId: string, subRowId?: string | null) => {
    if (!matrixData || !selectedFiscalYearId) return;

    setMatrixData((prev) => {
      if (!prev) return null;
      const filteredRows = (prev.rows || []).filter(
        (r) =>
          !(r.accountId === accountId && (r.subRowId === subRowId || (!r.subRowId && !subRowId))),
      );
      const filteredSections = (prev.sections || []).map((sec) => {
        const secRows = sec.rows.filter(
          (r) =>
            !(r.accountId === accountId && (r.subRowId === subRowId || (!r.subRowId && !subRowId))),
        );
        const newSecTotals: Record<string, number> & { total: number } = { total: 0 };
        const leafRows = secRows.filter((r) => !r.isParent);
        for (const p of prev.periods) {
          let pTot = 0;
          for (const r of leafRows) {
            const v = r.amounts[p.id] || 0;
            if (
              (sec.sectionKey === BudgetMatrixSectionKey.AHORRO_INVERSIONES ||
                sec.sectionKey === BudgetMatrixSectionKey.DEUDAS_FINANCIACION ||
                sec.sectionKey === 'FINANCIAMIENTO_AHORRO') &&
              r.cashFlowDirection === CashFlowDirection.EGRESO_EFECTIVO
            ) {
              pTot -= v;
            } else {
              pTot += v;
            }
          }
          newSecTotals[p.id] = pTot;
          newSecTotals.total += pTot;
        }
        return { ...sec, rows: secRows, sectionTotals: newSecTotals };
      });

      return {
        ...prev,
        rows: filteredRows,
        sections: filteredSections,
      };
    });

    try {
      await api.budgets.deleteMatrixRow(selectedFiscalYearId, accountId, subRowId);
    } catch (err) {
      console.warn('Fila eliminada en memoria, se persistirá al guardar todo:', err);
    }

    // Clean up dirty cells for this row
    setPendingUpdates((prev) => {
      const next = new Map(prev);
      for (const p of matrixData.periods) {
        const cellKey = `${p.id}_${accountId}${subRowId ? `_${subRowId}` : ''}`;
        next.delete(cellKey);
      }
      return next;
    });
    setDirtyCells((prev) => {
      const next = new Set(prev);
      for (const p of matrixData.periods) {
        const cellKey = `${p.id}_${accountId}${subRowId ? `_${subRowId}` : ''}`;
        next.delete(cellKey);
      }
      return next;
    });
  };

  const handleDeleteSubRow = (accountId: string, subRowId: string) => {
    handleDeleteRow(accountId, subRowId);
  };

  // Handle prior year baseline loading
  const handleLoadPriorYearActuals = async () => {
    if (!selectedFiscalYearId) return;
    if (
      !confirm(
        '¿Desea cargar los valores reales del año anterior con ajuste? Esto sobrescribirá la planilla actual.',
      )
    ) {
      return;
    }
    setIsBaselineLoading(true);
    try {
      await api.budgets.baselineActuals({
        fiscalYearId: selectedFiscalYearId,
        adjustmentPercentage: 0,
      });
      await fetchMatrixData();
    } catch (err: any) {
      alert(`Error al cargar datos históricos: ${err.message || 'Intente de nuevo.'}`);
    } finally {
      setIsBaselineLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] space-y-4">
      {/* Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg">
        <div className="flex flex-wrap items-center gap-4">
          {/* Fiscal Year Selector (FR-014: Label simple "Año") */}
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-semibold text-slate-300">Año:</span>
            <select
              value={selectedFiscalYearId}
              onChange={(e) => setSelectedFiscalYearId(e.target.value)}
              className="bg-slate-950 text-slate-200 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-semibold focus:border-indigo-500 outline-none"
            >
              {fiscalYears.map((fy) => (
                <option key={fy.id} value={fy.id}>
                  {fy.year} {fy.isClosed ? '(Cerrado)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter (100% Spanish labels) */}
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-semibold text-slate-300">Categoría:</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-slate-950 text-slate-200 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-semibold focus:border-indigo-500 outline-none"
            >
              <option value="">Todas las categorías</option>
              <option value="INGRESOS">Ingresos</option>
              <option value="GASTOS_VIDA">Gastos de Vida</option>
              <option value="AHORRO_INVERSIONES">Ahorro e Inversiones</option>
              <option value="DEUDAS_FINANCIACION">Deudas y Financiación</option>
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-3">
          <button
            onClick={handleLoadPriorYearActuals}
            disabled={isBaselineLoading || !selectedFiscalYearId}
            className="flex items-center space-x-2 px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isBaselineLoading ? 'animate-spin' : ''}`} />
            <span>Traer Real del Año Anterior</span>
          </button>
        </div>
      </div>

      {/* Grid Content */}
      <div className="flex-1 min-h-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-full bg-slate-900 border border-slate-800 rounded-xl">
            <div className="flex flex-col items-center space-y-3">
              <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
              <span className="text-sm font-medium text-slate-400">
                Cargando matriz presupuestaria...
              </span>
            </div>
          </div>
        ) : matrixData ? (
          <BudgetMatrixGrid
            matrixData={matrixData}
            onCellChange={handleCellChange}
            onPasteBatch={handlePasteBatch}
            onSave={handleSave}
            onOpenDriverModal={(row) => {
              setActiveDriverRow(row);
              setIsDriverModalOpen(true);
            }}
            onDirectionChange={handleDirectionChange}
            onAddSubRow={handleAddSubRow}
            onDeleteSubRow={handleDeleteSubRow}
            onAddBalanceRow={handleAddBalanceRow}
            onDeleteRow={handleDeleteRow}
            isSaving={isSaving}
            dirtyCells={dirtyCells}
          />
        ) : (
          <div className="flex items-center justify-center h-full bg-slate-900 border border-slate-800 rounded-xl">
            <span className="text-sm text-slate-400">
              Seleccione un año fiscal para visualizar la matriz.
            </span>
          </div>
        )}
      </div>

      {/* Driver Action Modal */}
      {isDriverModalOpen && activeDriverRow && selectedFiscalYearId && matrixData && (
        <DriverActionModal
          fiscalYearId={selectedFiscalYearId}
          account={activeDriverRow}
          periods={matrixData.periods}
          isOpen={isDriverModalOpen}
          onClose={() => {
            setIsDriverModalOpen(false);
            setActiveDriverRow(null);
          }}
          onSuccess={async () => {
            setIsDriverModalOpen(false);
            setActiveDriverRow(null);
            await fetchMatrixData();
          }}
        />
      )}
    </div>
  );
}
