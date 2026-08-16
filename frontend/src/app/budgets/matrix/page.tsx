'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../../../services/api';
import {
  BudgetMatrixResponse,
  BudgetMatrixRow,
  CashFlowDirection,
  BudgetMatrixSectionKey,
} from '@sistema-contable/shared';
import { BudgetMatrixGrid } from '../../../components/budgets/BudgetMatrixGrid';
import { BudgetMobileView } from '../../../components/budgets/BudgetMobileView';
import { AutofillModal } from '../../../components/budgets/AutofillModal';
import { useIsMobile } from '../../../hooks/useMediaQuery';
import { Calendar, Filter, RefreshCw, AlertCircle, Keyboard, Save, History } from 'lucide-react';

export default function BudgetMatrixPage() {
  const isMobile = useIsMobile();

  const [fiscalYears, setFiscalYears] = useState<any[]>([]);
  const [currencies, setCurrencies] = useState<any[]>([]);
  const [selectedFiscalYearId, setSelectedFiscalYearId] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [matrixData, setMatrixData] = useState<BudgetMatrixResponse | null>(null);
  const [activePeriodId, setActivePeriodId] = useState<string>('');

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState<boolean>(false);
  const shortcutsRef = useRef<HTMLDivElement>(null);

  // Close shortcuts popover on outside click or Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (shortcutsRef.current && !shortcutsRef.current.contains(e.target as Node)) {
        setIsShortcutsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsShortcutsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

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

      // Set initial active period for mobile view if not set or invalid
      if (data?.periods && data.periods.length > 0) {
        const openPeriod = data.periods.find((p) => p.status !== 'CLOSED');
        setActivePeriodId((prev) => {
          if (prev && data.periods.some((p) => p.id === prev)) {
            return prev;
          }
          return openPeriod ? openPeriod.id : data.periods[0].id;
        });
      }
    } catch (err) {
      console.error('Error al obtener la matriz presupuestaria:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedFiscalYearId, selectedCategory]);

  useEffect(() => {
    fetchMatrixData();
  }, [fetchMatrixData]);

  // Handle cell change from grid or mobile view
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

  // Discard pending changes
  const handleDiscard = async () => {
    if (pendingUpdates.size === 0) return;
    if (confirm('¿Desea descartar todos los cambios pendientes sin guardar?')) {
      setPendingUpdates(new Map());
      setDirtyCells(new Set());
      await fetchMatrixData();
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
    <div className="flex flex-col h-full w-full p-2 sm:p-3 space-y-2 font-sans overflow-hidden">
      {/* Unified Single-Row Controls Header Bar */}
      <div className="flex items-center justify-between gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2 rounded-xl shadow-sm dark:shadow-md w-full shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          {/* Fiscal Year Selector */}
          <div className="flex items-center space-x-1 shrink-0">
            <Calendar className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400 shrink-0" />
            <select
              value={selectedFiscalYearId}
              onChange={(e) => setSelectedFiscalYearId(e.target.value)}
              className="bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 text-xs font-semibold focus:border-indigo-500 outline-none cursor-pointer max-w-[130px] sm:max-w-none truncate"
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
          <div className="flex items-center space-x-1 shrink-0">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 text-xs font-semibold focus:border-indigo-500 outline-none cursor-pointer max-w-[120px] sm:max-w-none truncate"
            >
              <option value="">Todas</option>
              <option value="INGRESOS">Ingresos</option>
              <option value="GASTOS_VIDA">Egresos</option>
              <option value="AHORRO_INVERSIONES">Ahorro</option>
              <option value="DEUDAS_FINANCIACION">Deudas</option>
            </select>
          </div>

          {/* Keyboard Shortcuts Popover (Desktop only, compact tooltip/popover) */}
          <div className="relative hidden md:block shrink-0" ref={shortcutsRef}>
            <button
              type="button"
              onClick={() => setIsShortcutsOpen((prev) => !prev)}
              className="flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/80 transition-colors cursor-pointer"
              title="Ver atajos de teclado y navegación"
            >
              <Keyboard className="w-3.5 h-3.5 text-indigo-500" />
              <span>Atajos</span>
            </button>

            {isShortcutsOpen && (
              <div className="absolute left-0 top-8 z-50 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl p-3 text-xs text-slate-700 dark:text-slate-300 animate-in fade-in zoom-in-95 duration-100">
                <div className="font-semibold text-slate-900 dark:text-slate-100 pb-1.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span>Atajos de Teclado</span>
                  <span className="text-[10px] text-slate-400">Esc para cerrar</span>
                </div>
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Navegar celdas:</span>
                    <div className="space-x-1 font-mono">
                      <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
                        Tab
                      </kbd>
                      <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
                        Flechas
                      </kbd>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Editar / Confirmar:</span>
                    <div className="space-x-1 font-mono">
                      <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
                        Enter
                      </kbd>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Cancelar edición:</span>
                    <div className="space-x-1 font-mono">
                      <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
                        Esc
                      </kbd>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400">
                      Rellenar a la derecha:
                    </span>
                    <div className="space-x-1 font-mono">
                      <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
                        Ctrl+D
                      </kbd>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400">
                      Copiar / Pegar Excel:
                    </span>
                    <div className="space-x-1 font-mono">
                      <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
                        Ctrl+C / V
                      </kbd>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Save Success Alert */}
          {saveSuccessMessage && (
            <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-semibold animate-in fade-in duration-150 shrink-0">
              <span>✓ {saveSuccessMessage}</span>
            </div>
          )}
        </div>

        {/* Action Buttons: Traer Real + Changes counter + Guardar Todo */}
        <div className="flex items-center space-x-2 shrink-0">
          {dirtyCells.size > 0 && (
            <span className="text-xs text-amber-600 dark:text-amber-400 font-semibold animate-pulse hidden sm:inline">
              ● {dirtyCells.size} sin guardar
            </span>
          )}

          <button
            onClick={handleLoadPriorYearActuals}
            disabled={isBaselineLoading || !selectedFiscalYearId}
            className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 disabled:opacity-50 text-slate-700 dark:text-slate-300 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
            title="Importar y heredar los valores reales ejecutados del año anterior"
          >
            <History
              className={`w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400 ${isBaselineLoading ? 'animate-spin' : ''}`}
            />
            <span className="hidden sm:inline">Traer Real del Año Anterior</span>
            <span className="sm:hidden">Real Año Anterior</span>
          </button>

          {/* Save Button in desktop unified header */}
          {!isMobile && (
            <button
              onClick={handleSave}
              disabled={isSaving || dirtyCells.size === 0}
              className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                dirtyCells.size > 0
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm shadow-emerald-600/30 cursor-pointer animate-in fade-in'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed border border-slate-200 dark:border-slate-700'
              }`}
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Guardando...' : 'Guardar Todo'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Responsive Grid / Mobile View Content */}
      <div className="flex-1 w-full min-h-0 overflow-y-auto">
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
          isMobile ? (
            <BudgetMobileView
              matrixData={matrixData}
              activePeriodId={activePeriodId}
              onSelectPeriod={setActivePeriodId}
              baseCurrency={baseCurrency}
              onCellChange={handleCellChange}
              onSave={handleSave}
              onDiscard={handleDiscard}
              onOpenAutofill={(row) => {
                setActiveAutofillRow(row);
                setIsAutofillModalOpen(true);
              }}
              onAddBalanceRow={handleAddBalanceRow}
              onEditBalanceRow={handleEditBalanceRow}
              onDeleteRow={handleDeleteRow}
              isSaving={isSaving}
              dirtyCells={dirtyCells}
              saveSuccessMessage={saveSuccessMessage}
              fiscalYearId={selectedFiscalYearId}
            />
          ) : (
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
          )
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
