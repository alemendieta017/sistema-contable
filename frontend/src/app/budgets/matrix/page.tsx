'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { api } from '../../../services/api';
import {
  RollingBudgetMatrixResponse,
  BudgetMatrixRow,
  CashFlowDirection,
  BudgetMatrixSectionKey,
} from '@sistema-contable/shared';
import { BudgetMatrixGrid } from '../../../components/budgets/BudgetMatrixGrid';
import { BudgetMobileView } from '../../../components/budgets/BudgetMobileView';
import { AutofillModal } from '../../../components/budgets/AutofillModal';
import { useIsMobile } from '../../../hooks/useMediaQuery';
import { formatCurrency } from '../../../lib/utils';
import {
  Filter,
  RefreshCw,
  Save,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Wallet,
  PiggyBank,
  ShieldCheck,
  X,
} from 'lucide-react';

const SPANISH_MONTHS = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

function getSpanishMonthName(yearMonth: string): string {
  const match = yearMonth.match(/^(\d{4})-(\d{2})/);
  if (!match) return yearMonth;
  const year = match[1];
  const monthIdx = parseInt(match[2], 10) - 1;
  return `${SPANISH_MONTHS[monthIdx] || ''} ${year}`;
}

export default function BudgetMatrixPage() {
  const isMobile = useIsMobile();

  const [currencies, setCurrencies] = useState<any[]>([]);
  const [currentYearMonth, setCurrentYearMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // View Mode: 'monthly' (1 mes), 'four_months' (4 meses - DEFAULT desktop), 'six_months' (6 meses), 'annual' (12 meses)
  const [viewMode, setViewMode] = useState<'monthly' | 'four_months' | 'six_months' | 'annual'>(
    'four_months',
  );
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [matrixData, setMatrixData] = useState<RollingBudgetMatrixResponse | null>(null);
  const [activePeriodId, setActivePeriodId] = useState<string>('');

  // Auto-switch to monthly view immediately if mobile viewport is detected
  useEffect(() => {
    if (isMobile && viewMode !== 'monthly') {
      setViewMode('monthly');
    }
  }, [isMobile, viewMode]);

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

  // Warn user on unload if dirty changes exist
  const dirtyCellsRef = useRef(dirtyCells);
  dirtyCellsRef.current = dirtyCells;

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dirtyCellsRef.current.size > 0) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Load Currencies on mount
  useEffect(() => {
    async function loadCurrencies() {
      try {
        const curList = await api.currencies.list();
        setCurrencies(curList || []);
      } catch (err) {
        console.error('Error al cargar monedas:', err);
      }
    }
    loadCurrencies();
  }, []);

  const baseCurrency = currencies.find((c) => c.isBase) || {
    code: 'PYG',
    symbol: '₲',
    decimalPlaces: 0,
  };

  // Determine startPeriod and months count based on viewMode
  const { queryStartPeriod, queryMonths } = useMemo(() => {
    const [yearStr] = currentYearMonth.split('-');
    const year = parseInt(yearStr, 10);

    if (viewMode === 'monthly') {
      return { queryStartPeriod: currentYearMonth, queryMonths: 1 };
    } else if (viewMode === 'four_months') {
      // 4 months window (current month is first on left)
      return { queryStartPeriod: currentYearMonth, queryMonths: 4 };
    } else if (viewMode === 'six_months') {
      // 6 months window
      return { queryStartPeriod: currentYearMonth, queryMonths: 6 };
    } else {
      // Annual: 12 months (Ene - Dic)
      return { queryStartPeriod: `${year}-01`, queryMonths: 12 };
    }
  }, [currentYearMonth, viewMode]);

  // Fetch Matrix Data (always loads complete matrix so summary metrics are never broken by quadrant filters)
  const fetchMatrixData = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.budgets.getRollingMatrix(queryStartPeriod, queryMonths);
      setMatrixData(data);
      setDirtyCells(new Set());
      setPendingUpdates(new Map());

      // Set active period id matching currentYearMonth
      if (data?.periods && data.periods.length > 0) {
        const matchingP = data.periods.find((p) => p.name === currentYearMonth);
        setActivePeriodId(matchingP ? matchingP.id : data.periods[0].id);
      }
    } catch (err) {
      console.error('Error al obtener datos presupuestarios:', err);
    } finally {
      setIsLoading(false);
    }
  }, [queryStartPeriod, queryMonths, currentYearMonth]);

  useEffect(() => {
    fetchMatrixData();
  }, [fetchMatrixData]);

  // Filtered matrix data for UI rendering
  const displayMatrixData = useMemo(() => {
    if (!matrixData) return null;
    if (!selectedCategory) return matrixData;

    const filteredSections = (matrixData.sections || []).filter((s) => {
      if (selectedCategory === 'INGRESOS') return s.sectionKey === BudgetMatrixSectionKey.INGRESOS;
      if (selectedCategory === 'EGRESOS')
        return (
          s.sectionKey === BudgetMatrixSectionKey.EGRESOS ||
          s.sectionKey === BudgetMatrixSectionKey.GASTOS_VIDA
        );
      if (selectedCategory === 'AHORRO_INVERSIONES')
        return s.sectionKey === BudgetMatrixSectionKey.AHORRO_INVERSIONES;
      if (selectedCategory === 'DEUDAS_FINANCIACION')
        return s.sectionKey === BudgetMatrixSectionKey.DEUDAS_FINANCIACION;
      return true;
    });

    return {
      ...matrixData,
      sections: filteredSections,
    };
  }, [matrixData, selectedCategory]);

  // Navigation helpers
  const handlePrev = () => {
    const [year, month] = currentYearMonth.split('-').map(Number);
    if (viewMode === 'annual') {
      setCurrentYearMonth(`${year - 1}-01`);
    } else if (viewMode === 'six_months') {
      let newMonth = month - 6;
      let newYear = year;
      if (newMonth <= 0) {
        newMonth += 12;
        newYear -= 1;
      }
      setCurrentYearMonth(`${newYear}-${String(newMonth).padStart(2, '0')}`);
    } else if (viewMode === 'four_months') {
      let newMonth = month - 4;
      let newYear = year;
      if (newMonth <= 0) {
        newMonth += 12;
        newYear -= 1;
      }
      setCurrentYearMonth(`${newYear}-${String(newMonth).padStart(2, '0')}`);
    } else {
      if (month === 1) {
        setCurrentYearMonth(`${year - 1}-12`);
      } else {
        setCurrentYearMonth(`${year}-${String(month - 1).padStart(2, '0')}`);
      }
    }
  };

  const handleNext = () => {
    const [year, month] = currentYearMonth.split('-').map(Number);
    if (viewMode === 'annual') {
      setCurrentYearMonth(`${year + 1}-01`);
    } else if (viewMode === 'six_months') {
      let newMonth = month + 6;
      let newYear = year;
      if (newMonth > 12) {
        newMonth -= 12;
        newYear += 1;
      }
      setCurrentYearMonth(`${newYear}-${String(newMonth).padStart(2, '0')}`);
    } else if (viewMode === 'four_months') {
      let newMonth = month + 4;
      let newYear = year;
      if (newMonth > 12) {
        newMonth -= 12;
        newYear += 1;
      }
      setCurrentYearMonth(`${newYear}-${String(newMonth).padStart(2, '0')}`);
    } else {
      if (month === 12) {
        setCurrentYearMonth(`${year + 1}-01`);
      } else {
        setCurrentYearMonth(`${year}-${String(month + 1).padStart(2, '0')}`);
      }
    }
  };

  const handleGoToday = () => {
    const now = new Date();
    setCurrentYearMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  };

  // Navigator text label
  const navigatorLabel = useMemo(() => {
    if (viewMode === 'annual') {
      return currentYearMonth.substring(0, 4);
    }
    if (viewMode === 'four_months' || viewMode === 'six_months') {
      if (matrixData?.periods && matrixData.periods.length >= 2) {
        const pFirst = matrixData.periods[0];
        const pLast = matrixData.periods[matrixData.periods.length - 1];
        return `${getSpanishMonthName(pFirst.name)} — ${getSpanishMonthName(pLast.name)}`;
      }
    }
    return getSpanishMonthName(currentYearMonth);
  }, [viewMode, currentYearMonth, matrixData]);

  // Compute Hero Summary KPI Totals dynamically from full matrixData with accurate flow direction
  const heroSummary = useMemo(() => {
    if (!matrixData) {
      return {
        ingresos: 0,
        egresos: 0,
        resultado: 0,
        ahorros: 0,
        deudas: 0,
        margenLibre: 0,
      };
    }

    let ing = 0;
    let egr = 0;
    let ahorroOutflows = 0;
    let ahorroInflows = 0;
    let deudaOutflows = 0;
    let deudaInflows = 0;

    const targetPeriodIds =
      viewMode === 'monthly'
        ? [
            matrixData.periods.find((p) => p.name === currentYearMonth)?.id ||
              matrixData.periods[0]?.id,
          ].filter(Boolean)
        : matrixData.periods.map((p) => p.id);

    if (matrixData.sections && matrixData.sections.length > 0) {
      for (const sec of matrixData.sections) {
        for (const r of sec.rows) {
          if (r.isParent) continue;
          let rowSum = 0;
          for (const pId of targetPeriodIds) {
            if (pId) rowSum += r.amounts[pId] || 0;
          }

          if (sec.sectionKey === BudgetMatrixSectionKey.INGRESOS) {
            ing += rowSum;
          } else if (
            sec.sectionKey === BudgetMatrixSectionKey.EGRESOS ||
            sec.sectionKey === BudgetMatrixSectionKey.GASTOS_VIDA
          ) {
            egr += rowSum;
          } else if (sec.sectionKey === BudgetMatrixSectionKey.AHORRO_INVERSIONES) {
            if (r.cashFlowDirection === CashFlowDirection.INGRESO_EFECTIVO) {
              ahorroInflows += rowSum;
            } else {
              ahorroOutflows += rowSum;
            }
          } else if (sec.sectionKey === BudgetMatrixSectionKey.DEUDAS_FINANCIACION) {
            if (r.cashFlowDirection === CashFlowDirection.INGRESO_EFECTIVO) {
              deudaInflows += rowSum;
            } else {
              deudaOutflows += rowSum;
            }
          }
        }
      }
    }

    const resultado = ing - egr;
    // Net cash dedicated to savings (Aportes - Rescates)
    const netAhorros = ahorroOutflows - ahorroInflows;
    // Net cash dedicated to debt repayment (Pagos - Financiación recibida)
    const netDeudas = deudaOutflows - deudaInflows;
    // Margen Libre: real available cash = Total Inflows - Total Outflows
    const totalInflows = ing + ahorroInflows + deudaInflows;
    const totalOutflows = egr + ahorroOutflows + deudaOutflows;
    const margenLibre = totalInflows - totalOutflows;

    return {
      ingresos: ing,
      egresos: egr,
      resultado,
      ahorros: netAhorros,
      deudas: netDeudas,
      margenLibre,
    };
  }, [matrixData, currentYearMonth, viewMode]);

  // Handle cell change
  const handleCellChange = (
    accountId: string,
    periodId: string,
    value: number,
    subRowId?: string | null,
  ) => {
    if (!matrixData) return;

    const cellKey = `${periodId}_${accountId}${subRowId ? `_${subRowId}` : ''}`;
    const allRows = matrixData.sections?.flatMap((s) => s.rows) || [];
    const targetRow = allRows.find(
      (r) => r.accountId === accountId && (r.subRowId === subRowId || (!r.subRowId && !subRowId)),
    );

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

    setDirtyCells((prev) => new Set(prev).add(cellKey));

    // Optimistically update matrixData
    setMatrixData((prev) => {
      if (!prev) return null;
      const updatedSections = (prev.sections || []).map((sec) => {
        const updatedRows = sec.rows.map((row) => {
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

        const newSecTotals: Record<string, number> & { total: number } = { total: 0 };
        const leafRows = updatedRows.filter((r) => !r.isParent);
        for (const p of prev.periods) {
          let pTot = 0;
          for (const r of leafRows) pTot += r.amounts[p.id] || 0;
          newSecTotals[p.id] = pTot;
          newSecTotals.total += pTot;
        }

        return { ...sec, rows: updatedRows, sectionTotals: newSecTotals };
      });

      return { ...prev, sections: updatedSections };
    });
  };

  // Discard all pending changes and reset to persisted state
  const handleDiscard = async () => {
    setDirtyCells(new Set());
    setPendingUpdates(new Map());
    await fetchMatrixData();
  };

  // Save changes
  const handleSave = async () => {
    if (pendingUpdates.size === 0) return;
    setIsSaving(true);
    setSaveSuccessMessage(null);
    try {
      const updatesList = Array.from(pendingUpdates.values());
      await api.budgets.updateBudgetMatrix({ updates: updatesList });
      setSaveSuccessMessage('¡Guardado con éxito!');
      setTimeout(() => setSaveSuccessMessage(null), 3000);
      await fetchMatrixData();
    } catch (err: any) {
      alert(`Error al guardar cambios: ${err.message || 'Intente nuevamente'}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Add on-demand balance row
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
      const newSections = (prev.sections || []).map((sec) => {
        const isTarget =
          (account.type === 'ASSET' &&
            sec.sectionKey === BudgetMatrixSectionKey.AHORRO_INVERSIONES) ||
          (['LIABILITY', 'EQUITY'].includes(account.type) &&
            sec.sectionKey === BudgetMatrixSectionKey.DEUDAS_FINANCIACION);

        if (isTarget) return { ...sec, rows: [...sec.rows, newRow] };
        return sec;
      });
      return { ...prev, sections: newSections };
    });

    // Register into pending updates for active period so it can be saved
    if (matrixData.periods && matrixData.periods.length > 0) {
      const pId = activePeriodId || matrixData.periods[0].id;
      const cellKey = `${pId}_${account.id}_${newSubRowId}`;
      setPendingUpdates((prev) => {
        const next = new Map(prev);
        next.set(cellKey, {
          periodId: pId,
          accountId: account.id,
          amount: 0,
          subRowId: newSubRowId,
          subRowLabel: label,
          cashFlowDirection: direction,
        });
        return next;
      });
      setDirtyCells((prev) => new Set(prev).add(cellKey));
    }
  };

  const handleEditBalanceRow = (
    account: { id: string; name: string; code: string; type: string },
    label: string,
    direction: CashFlowDirection,
    subRowId?: string | null,
  ) => {
    if (!matrixData) return;
    setMatrixData((prev) => {
      if (!prev) return null;
      const newSections = (prev.sections || []).map((sec) => {
        const newRows = sec.rows.map((row) => {
          if (
            row.accountId === account.id &&
            (row.subRowId === subRowId || (!row.subRowId && !subRowId))
          ) {
            return { ...row, subRowLabel: label, cashFlowDirection: direction };
          }
          return row;
        });
        return { ...sec, rows: newRows };
      });
      return { ...prev, sections: newSections };
    });

    // Register all periods for this row in pendingUpdates and dirtyCells
    if (matrixData.periods && matrixData.periods.length > 0) {
      const allRows = matrixData.sections?.flatMap((s) => s.rows) || [];
      const targetRow = allRows.find(
        (r) =>
          r.accountId === account.id && (r.subRowId === subRowId || (!r.subRowId && !subRowId)),
      );

      setPendingUpdates((prev) => {
        const next = new Map(prev);
        matrixData.periods.forEach((p) => {
          const cellKey = `${p.id}_${account.id}${subRowId ? `_${subRowId}` : ''}`;
          const existing = next.get(cellKey);
          const currentAmt = targetRow?.amounts[p.id] ?? 0;
          next.set(cellKey, {
            periodId: p.id,
            accountId: account.id,
            amount: existing ? existing.amount : currentAmt,
            subRowId: subRowId || null,
            subRowLabel: label,
            cashFlowDirection: direction,
          });
        });
        return next;
      });

      setDirtyCells((prev) => {
        const next = new Set(prev);
        matrixData.periods.forEach((p) => {
          next.add(`${p.id}_${account.id}${subRowId ? `_${subRowId}` : ''}`);
        });
        return next;
      });
    }
  };

  const handleDeleteRow = async (accountId: string, subRowId?: string | null) => {
    if (!matrixData) return;
    setMatrixData((prev) => {
      if (!prev) return null;
      const newSections = (prev.sections || []).map((sec) => {
        const newRows = sec.rows.filter(
          (r) =>
            !(r.accountId === accountId && (r.subRowId === subRowId || (!r.subRowId && !subRowId))),
        );
        return { ...sec, rows: newRows };
      });
      return { ...prev, sections: newSections };
    });
    try {
      await api.budgets.deleteBudgetMatrixRow('rolling', accountId, subRowId);
    } catch (err) {
      console.warn('Fila eliminada localmente:', err);
    }
  };

  return (
    <div className="flex flex-col h-full w-full p-2 sm:p-4 space-y-3 font-sans overflow-hidden">
      {/* 1. Header Navigation & Mode Bar */}
      <div className="flex items-center justify-between gap-1.5 sm:gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2.5 sm:px-4 py-2 rounded-2xl shadow-xs shrink-0 flex-nowrap w-full">
        {/* Temporal Navigator */}
        <div className="flex items-center space-x-1 sm:space-x-2 shrink-0">
          <div className="flex items-center bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-0.5 sm:p-1">
            <button
              type="button"
              onClick={handlePrev}
              className="p-1 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Anterior"
            >
              <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>

            <span className="px-1.5 sm:px-3 text-xs font-bold text-slate-900 dark:text-slate-100 font-mono tracking-tight select-none truncate text-center min-w-20 sm:min-w-32">
              {navigatorLabel}
            </span>

            <button
              type="button"
              onClick={handleNext}
              className="p-1 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Siguiente"
            >
              <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={handleGoToday}
            className="px-2 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 transition-colors cursor-pointer shrink-0"
          >
            Actual
          </button>
        </div>

        {/* View Mode Switcher (Desktop Only) */}
        {!isMobile && (
          <div className="flex items-center bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-1 space-x-1 shrink-0">
            <button
              type="button"
              onClick={() => setViewMode('monthly')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'monthly'
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-300 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Mensual
            </button>
            <button
              type="button"
              onClick={() => setViewMode('four_months')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'four_months'
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-300 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Cuatrimestral
            </button>
            <button
              type="button"
              onClick={() => setViewMode('six_months')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'six_months'
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-300 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Semestral
            </button>
            <button
              type="button"
              onClick={() => setViewMode('annual')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'annual'
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-300 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Anual
            </button>
          </div>
        )}

        {/* Category Filter & Save / Discard Actions */}
        <div className="flex items-center space-x-1.5 sm:space-x-2 shrink min-w-0">
          <div className="flex items-center space-x-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-2 py-1 shrink min-w-0">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none cursor-pointer truncate max-w-24 sm:max-w-none"
            >
              <option value="">{isMobile ? 'Todas' : 'Todas las Partidas'}</option>
              <option value="INGRESOS">Ingresos</option>
              <option value="EGRESOS">Egresos</option>
              <option value="AHORRO_INVERSIONES">Ahorros</option>
              <option value="DEUDAS_FINANCIACION">Deudas</option>
            </select>
          </div>

          {!isMobile && (
            <div className="flex items-center space-x-1.5 shrink-0">
              {dirtyCells.size > 0 && (
                <button
                  type="button"
                  onClick={handleDiscard}
                  disabled={isSaving}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Cancelar</span>
                </button>
              )}

              <button
                onClick={handleSave}
                disabled={isSaving || dirtyCells.size === 0}
                className={`flex items-center space-x-1.5 px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                  dirtyCells.size > 0
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/30 animate-pulse'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-200 dark:border-slate-700'
                }`}
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSaving ? 'Guardando...' : 'Guardar Todo'}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 2. Hero Summary Bar (Desktop Only - Always shows all 6 KPIs regardless of quadrant filter) */}
      {!isMobile && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 shrink-0">
          {/* Ingresos */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>Ingresos</span>
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
            </div>
            <p className="text-sm sm:text-base font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1 truncate">
              {formatCurrency(heroSummary.ingresos, baseCurrency)}
            </p>
          </div>

          {/* Egresos */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>Egresos</span>
              <TrendingDown className="w-3.5 h-3.5 text-rose-500" />
            </div>
            <p className="text-sm sm:text-base font-bold font-mono text-slate-900 dark:text-slate-100 mt-1 truncate">
              {formatCurrency(heroSummary.egresos, baseCurrency)}
            </p>
          </div>

          {/* = Resultado */}
          <div className="bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-900/60 rounded-2xl p-3 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-indigo-700 dark:text-indigo-300 text-xs font-semibold">
              <span>= Resultado</span>
              <Wallet className="w-3.5 h-3.5" />
            </div>
            <p
              className={`text-sm sm:text-base font-bold font-mono mt-1 truncate ${
                heroSummary.resultado >= 0
                  ? 'text-indigo-700 dark:text-indigo-300'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {formatCurrency(heroSummary.resultado, baseCurrency)}
            </p>
          </div>

          {/* Ahorros e Inversiones */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>Ahorros e Inversiones</span>
              <PiggyBank className="w-3.5 h-3.5 text-blue-500" />
            </div>
            <p className="text-sm sm:text-base font-bold font-mono text-blue-600 dark:text-blue-400 mt-1 truncate">
              {formatCurrency(heroSummary.ahorros, baseCurrency)}
            </p>
          </div>

          {/* Deudas y Financiación */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>Deudas y Financiación</span>
              <Wallet className="w-3.5 h-3.5 text-purple-500" />
            </div>
            <p className="text-sm sm:text-base font-bold font-mono text-purple-600 dark:text-purple-400 mt-1 truncate">
              {formatCurrency(heroSummary.deudas, baseCurrency)}
            </p>
          </div>

          {/* = Margen Libre */}
          <div className="bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-900/60 rounded-2xl p-3 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
              <span>= Margen Libre</span>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            </div>
            <p
              className={`text-sm sm:text-base font-bold font-mono mt-1 truncate ${
                heroSummary.margenLibre >= 0
                  ? 'text-emerald-700 dark:text-emerald-300'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {formatCurrency(heroSummary.margenLibre, baseCurrency)}
            </p>
          </div>
        </div>
      )}

      {/* 3. Main Content: Mobile View or Desktop Grid */}
      <div className="flex-1 w-full min-h-0 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
            <div className="flex flex-col items-center space-y-2">
              <RefreshCw className="w-6 h-6 text-indigo-500 animate-spin" />
              <span className="text-xs font-semibold text-slate-400">Cargando presupuesto...</span>
            </div>
          </div>
        ) : displayMatrixData ? (
          isMobile ? (
            <BudgetMobileView
              matrixData={displayMatrixData as any}
              summaryTotals={heroSummary}
              activePeriodId={activePeriodId}
              onSelectPeriod={(pId) => {
                setActivePeriodId(pId);
                const p = displayMatrixData.periods.find((x) => x.id === pId);
                if (p) setCurrentYearMonth(p.name);
              }}
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
            />
          ) : (
            <BudgetMatrixGrid
              matrixData={displayMatrixData as any}
              viewMode={viewMode}
              activePeriodId={activePeriodId}
              baseCurrency={baseCurrency}
              onCellChange={handleCellChange}
              onOpenAutofill={(row) => {
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
          <div className="flex items-center justify-center h-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
            <span className="text-xs text-slate-400">
              No hay datos presupuestarios disponibles.
            </span>
          </div>
        )}
      </div>

      {/* 4. Desktop Bottom Navigation Bar (Paginador) */}
      {!isMobile && (
        <div className="flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-4 py-2 rounded-2xl shadow-xs shrink-0">
          <button
            type="button"
            onClick={handlePrev}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>
              Anterior (
              {viewMode === 'annual'
                ? 'Año'
                : viewMode === 'six_months'
                  ? 'Semestre'
                  : viewMode === 'four_months'
                    ? 'Cuatrimestre'
                    : 'Mes'}
              )
            </span>
          </button>

          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 font-mono">
            {navigatorLabel}
          </span>

          <button
            type="button"
            onClick={handleNext}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
          >
            <span>
              Siguiente (
              {viewMode === 'annual'
                ? 'Año'
                : viewMode === 'six_months'
                  ? 'Semestre'
                  : viewMode === 'four_months'
                    ? 'Cuatrimestre'
                    : 'Mes'}
              )
            </span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Simplified Autofill Modal */}
      {isAutofillModalOpen && activeAutofillRow && (
        <AutofillModal
          isOpen={isAutofillModalOpen}
          onClose={() => setIsAutofillModalOpen(false)}
          account={activeAutofillRow}
          periods={matrixData?.periods || []}
          baseCurrency={baseCurrency}
          onSuccess={() => {
            setIsAutofillModalOpen(false);
            fetchMatrixData();
          }}
        />
      )}
    </div>
  );
}
