'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../../services/api';
import { BudgetMatrixResponse, BudgetMatrixRow } from '@sistema-contable/shared';
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
    Map<string, { periodId: string; accountId: string; amount: number }>
  >(new Map());

  // Driver action modal state
  const [activeDriverRow, setActiveDriverRow] = useState<BudgetMatrixRow | null>(null);
  const [isDriverModalOpen, setIsDriverModalOpen] = useState<boolean>(false);
  const [isBaselineLoading, setIsBaselineLoading] = useState<boolean>(false);

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
        console.error('Failed to load fiscal years:', err);
      }
    }
    loadFiscalYears();
  }, []);

  // Fetch Matrix Data when Fiscal Year or Category changes
  const fetchMatrixData = useCallback(async () => {
    if (!selectedFiscalYearId) return;
    setIsLoading(true);
    try {
      const data = await api.budgets.getMatrix(selectedFiscalYearId, selectedCategory || undefined);
      setMatrixData(data);
      setDirtyCells(new Set());
      setPendingUpdates(new Map());
    } catch (err) {
      console.error('Failed to fetch budget matrix:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedFiscalYearId, selectedCategory]);

  useEffect(() => {
    fetchMatrixData();
  }, [fetchMatrixData]);

  // Handle cell change from grid
  const handleCellChange = (accountId: string, periodId: string, value: number) => {
    if (!matrixData) return;

    const cellKey = `${periodId}_${accountId}`;

    // Update pending updates
    setPendingUpdates((prev) => {
      const next = new Map(prev);
      next.set(cellKey, { periodId, accountId, amount: value });
      return next;
    });

    // Mark dirty
    setDirtyCells((prev) => new Set(prev).add(cellKey));

    // Optimistically update local grid matrixData
    setMatrixData((prev) => {
      if (!prev) return null;
      const updatedRows = prev.rows.map((row) => {
        if (row.accountId === accountId) {
          const newAmounts = { ...row.amounts, [periodId]: value };
          const newRowTotal = Object.values(newAmounts).reduce((sum, v) => sum + v, 0);
          return { ...row, amounts: newAmounts, rowTotal: newRowTotal };
        }
        return row;
      });

      // Recalculate category totals
      const newCategoryTotals: Record<string, Record<string, number> & { total: number }> = {};
      for (const row of updatedRows) {
        if (!newCategoryTotals[row.accountType]) {
          newCategoryTotals[row.accountType] = { total: 0 };
        }
        for (const p of prev.periods) {
          const v = row.amounts[p.id] || 0;
          if (!newCategoryTotals[row.accountType][p.id]) {
            newCategoryTotals[row.accountType][p.id] = 0;
          }
          newCategoryTotals[row.accountType][p.id] += v;
          newCategoryTotals[row.accountType].total += v;
        }
      }

      return {
        ...prev,
        rows: updatedRows,
        categoryTotals: newCategoryTotals,
      };
    });
  };

  // Handle paste batch
  const handlePasteBatch = (
    updates: Array<{ accountId: string; periodId: string; amount: number }>,
  ) => {
    updates.forEach((u) => handleCellChange(u.accountId, u.periodId, u.amount));
  };

  // Save changes to backend
  const handleSave = async () => {
    if (!selectedFiscalYearId || pendingUpdates.size === 0) return;
    setIsSaving(true);
    try {
      const updatesList = Array.from(pendingUpdates.values());
      await api.budgets.updateMatrixBatch({
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
          {/* Fiscal Year Selector */}
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

          {/* Category Filter */}
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-semibold text-slate-300">Categoría:</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-slate-950 text-slate-200 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-semibold focus:border-indigo-500 outline-none"
            >
              <option value="">Todas las categorías</option>
              <option value="EXPENSE">Gastos</option>
              <option value="INCOME">Ingresos</option>
              <option value="ASSET">Activos</option>
              <option value="LIABILITY">Pasivos</option>
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

      {/* Driver Action Modal (Phase 4 integration) */}
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
