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
import { AutofillModal } from '../../../components/budgets/AutofillModal';
import { Calendar, Filter, RefreshCw, AlertCircle } from 'lucide-react';

export default function BudgetMatrixPage() {
  const [fiscalYears, setFiscalYears] = useState<any[]>([]);
  const [currencies, setCurrencies] = useState<any[]>([]);
  const [selectedFiscalYearId, setSelectedFiscalYearId] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [matrixData, setMatrixData] = useState<BudgetMatrixResponse | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

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

  // Autofill modal state
  const [activeAutofillRow, setActiveAutofillRow] = useState<BudgetMatrixRow | null>(null);
  const [isAutofillModalOpen, setIsAutofillModalOpen] = useState<boolean>(false);
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

  // Load Fiscal Years & Currencies on mount
  useEffect(() => {
    async function loadInitialData() {
      try {
        const [fyList, curList] = await Promise.all([
          api.fiscalYears.list(),
          api.currencies.list(),
        ]);
        const list = Array.isArray(fyList) ? fyList : fyList?.data || [];
        setFiscalYears(list);
        setCurrencies(curList || []);
        if (list.length > 0) {
          const currentYearStr = String(new Date().getFullYear());
          const activeFy =
            list.find(
              (fy: any) =>
                (fy.name === currentYearStr || String(fy.year) === currentYearStr) &&
                fy.status !== 'CLOSED',
            ) ||
            list.find((fy: any) => fy.status === 'OPEN') ||
            list[0];

          setSelectedFiscalYearId(activeFy.id);
        }
      } catch (err) {
        console.error('Error al cargar datos iniciales:', err);
      }
    }
    loadInitialData();
  }, []);

  const baseCurrency = currencies.find((c) => c.isBase) || {
    code: 'PYG',
    symbol: '₲',
    decimalPlaces: 0,
  };

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
    const targetRow = (matrixData.rows || []).find(
      (r) => r.accountId === accountId && (r.subRowId === subRowId || (!r.subRowId && !subRowId)),
    );

    // Update pending updates
    setPendingUpdates((prev) => {
      const next = new Map(prev);
      next.set(cellKey, {
        periodId,
        accountId,
        amount: value,
        subRowId: subRowId || null,
        subRowLabel: targetRow?.subRowLabel || null,
        cashFlowDirection: targetRow?.cashFlowDirection || null,
      });
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
    setSaveSuccessMessage(null);
    try {
      const updatesList = Array.from(pendingUpdates.values());
      await api.budgets.updateBudgetMatrix({
        fiscalYearId: selectedFiscalYearId,
        updates: updatesList,
      });
      setSaveSuccessMessage('¡Presupuesto guardado con éxito!');
      setTimeout(() => setSaveSuccessMessage(null), 3500);
      await fetchMatrixData();
    } catch (err: any) {
      alert(`Error al guardar cambios: ${err.message || 'Intente de nuevo.'}`);
    } finally {
      setIsSaving(false);
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

  // Handle editing an existing balance row (Label / Direction)
  const handleEditBalanceRow = (
    account: { id: string; name: string; code: string; type: string },
    label: string,
    direction: CashFlowDirection,
    subRowId?: string | null,
  ) => {
    if (!matrixData) return;

    setMatrixData((prev) => {
      if (!prev) return null;

      const updateRowList = (rowList: BudgetMatrixRow[]) =>
        rowList.map((row) => {
          if (
            row.accountId === account.id &&
            (row.subRowId === subRowId || (!row.subRowId && !subRowId))
          ) {
            return {
              ...row,
              subRowLabel: label,
              cashFlowDirection: direction,
            };
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

    // Mark updated row across periods
    for (const p of matrixData.periods) {
      if (p.status !== 'CLOSED') {
        const cellKey = `${p.id}_${account.id}${subRowId ? `_${subRowId}` : ''}`;
        const targetRow = (matrixData.rows || []).find(
          (r) =>
            r.accountId === account.id && (r.subRowId === subRowId || (!r.subRowId && !subRowId)),
        );
        const currentAmount = targetRow ? targetRow.amounts[p.id] || 0 : 0;

        setPendingUpdates((prev) => {
          const next = new Map(prev);
          next.set(cellKey, {
            periodId: p.id,
            accountId: account.id,
            subRowId: subRowId || null,
            subRowLabel: label,
            cashFlowDirection: direction,
            amount: currentAmount,
          });
          return next;
        });
        setDirtyCells((prev) => new Set(prev).add(cellKey));
      }
    }
  };

  // Handle deleting a balance row or sub-row
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
      await api.budgets.deleteBudgetMatrixRow(selectedFiscalYearId, accountId, subRowId);
    } catch (err) {
      console.warn('Fila eliminada localmente, se persistirá al guardar todo:', err);
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
    <div className="flex flex-col h-[calc(100vh-140px)] w-full space-y-3 font-sans">
      {/* Controls Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-sm dark:shadow-lg w-full">
        <div className="flex flex-wrap items-center gap-4">
          {/* Fiscal Year Selector */}
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Año:</span>
            <select
              value={selectedFiscalYearId}
              onChange={(e) => setSelectedFiscalYearId(e.target.value)}
              className="bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 text-xs font-semibold focus:border-indigo-500 outline-none"
            >
              {fiscalYears.map((fy) => {
                const isClosed = fy.status === 'CLOSED' || fy.isClosed;
                const displayName = fy.name || fy.year || 'Año Fiscal';
                return (
                  <option key={fy.id} value={fy.id}>
                    {displayName} {isClosed ? '(Cerrado)' : ''}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Category Filter */}
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Categoría:
            </span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 text-xs font-semibold focus:border-indigo-500 outline-none"
            >
              <option value="">Todas las categorías</option>
              <option value="INGRESOS">Ingresos</option>
              <option value="GASTOS_VIDA">Gastos de Vida</option>
              <option value="AHORRO_INVERSIONES">Ahorro e Inversiones</option>
              <option value="DEUDAS_FINANCIACION">Deudas y Financiación</option>
            </select>
          </div>

          {/* Save Success Alert */}
          {saveSuccessMessage && (
            <div className="flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-semibold animate-in fade-in duration-150">
              <span>✓ {saveSuccessMessage}</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-3">
          <button
            onClick={handleLoadPriorYearActuals}
            disabled={isBaselineLoading || !selectedFiscalYearId}
            className="flex items-center space-x-2 px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 disabled:opacity-50 text-slate-700 dark:text-slate-300 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isBaselineLoading ? 'animate-spin' : ''}`} />
            <span>Traer Real del Año Anterior</span>
          </button>
        </div>
      </div>

      {/* 100% Full-Width Grid Content */}
      <div className="flex-1 w-full min-h-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
            <div className="flex flex-col items-center space-y-3">
              <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Cargando matriz presupuestaria...
              </span>
            </div>
          </div>
        ) : matrixData ? (
          <BudgetMatrixGrid
            matrixData={matrixData}
            baseCurrency={baseCurrency}
            onCellChange={handleCellChange}
            onPasteBatch={handlePasteBatch}
            onSave={handleSave}
            onOpenAutofill={(row) => {
              setActiveAutofillRow(row);
              setIsAutofillModalOpen(true);
            }}
            onOpenDriverModal={(row) => {
              setActiveAutofillRow(row);
              setIsAutofillModalOpen(true);
            }}
            onAddBalanceRow={handleAddBalanceRow}
            onEditBalanceRow={handleEditBalanceRow}
            onDeleteRow={handleDeleteRow}
            isSaving={isSaving}
            dirtyCells={dirtyCells}
          />
        ) : (
          <div className="flex items-center justify-center h-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
            <div className="flex items-center space-x-2 text-sm text-slate-500 dark:text-slate-400">
              <AlertCircle className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
              <span>Seleccione un año fiscal para visualizar la matriz.</span>
            </div>
          </div>
        )}
      </div>

      {/* Autofill Modal (Simplified natural language auto-fill) */}
      {isAutofillModalOpen && activeAutofillRow && selectedFiscalYearId && matrixData && (
        <AutofillModal
          fiscalYearId={selectedFiscalYearId}
          account={activeAutofillRow}
          periods={matrixData.periods}
          baseCurrency={baseCurrency}
          isOpen={isAutofillModalOpen}
          onClose={() => {
            setIsAutofillModalOpen(false);
            setActiveAutofillRow(null);
          }}
          onSuccess={async () => {
            setIsAutofillModalOpen(false);
            setActiveAutofillRow(null);
            await fetchMatrixData();
          }}
        />
      )}
    </div>
  );
}
