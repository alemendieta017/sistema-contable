'use client';

import React, { useState, useMemo } from 'react';
import {
  BudgetMatrixResponse,
  BudgetMatrixRow,
  BudgetMatrixSectionKey,
  CashFlowDirection,
} from '@sistema-contable/shared';
import { formatCurrency } from '../../lib/utils';
import { BudgetAccountModal } from './BudgetAccountModal';
import {
  ChevronDown,
  ChevronUp,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  CreditCard,
  PiggyBank,
  Check,
  X,
  FastForward,
  Lock,
} from 'lucide-react';

export interface BudgetMobileViewProps {
  matrixData: BudgetMatrixResponse;
  summaryTotals?: {
    ingresos: number;
    egresos: number;
    resultado: number;
    ahorros: number;
    deudas: number;
    margenLibre: number;
  };
  activePeriodId: string;
  onSelectPeriod: (periodId: string) => void;
  baseCurrency?: any;
  onCellChange: (
    accountId: string,
    periodId: string,
    value: number,
    subRowId?: string | null,
  ) => void;
  onSave: () => void | Promise<void>;
  onDiscard?: () => void;
  onOpenAutofill?: (row: BudgetMatrixRow) => void;
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
  saveSuccessMessage?: string | null;
  fiscalYearId?: string;
}

interface SectionConfig {
  key: BudgetMatrixSectionKey | string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  badgeColor: string;
  textColor: string;
  borderColor: string;
  isBalance: boolean;
  balanceType?: 'ASSET' | 'LIABILITY';
  addBtnText?: string;
}

const SECTION_CONFIGS: SectionConfig[] = [
  {
    key: BudgetMatrixSectionKey.INGRESOS,
    title: 'Ingresos',
    icon: ArrowUpRight,
    badgeColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    textColor: 'text-emerald-600 dark:text-emerald-400',
    borderColor: 'border-emerald-500/30',
    isBalance: false,
  },
  {
    key: BudgetMatrixSectionKey.EGRESOS,
    title: 'Egresos',
    icon: ArrowDownRight,
    badgeColor: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
    textColor: 'text-rose-600 dark:text-rose-400',
    borderColor: 'border-rose-500/30',
    isBalance: false,
  },
  {
    key: BudgetMatrixSectionKey.AHORRO_INVERSIONES,
    title: 'Ahorros e Inversiones',
    icon: PiggyBank,
    badgeColor: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    textColor: 'text-blue-600 dark:text-blue-400',
    borderColor: 'border-blue-500/30',
    isBalance: true,
    balanceType: 'ASSET',
    addBtnText: 'Presupuestar Activo',
  },
  {
    key: BudgetMatrixSectionKey.DEUDAS_FINANCIACION,
    title: 'Deudas y Financiación',
    icon: CreditCard,
    badgeColor: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
    textColor: 'text-purple-600 dark:text-purple-400',
    borderColor: 'border-purple-500/30',
    isBalance: true,
    balanceType: 'LIABILITY',
    addBtnText: 'Presupuestar Deuda',
  },
];

export const BudgetMobileView: React.FC<BudgetMobileViewProps> = ({
  matrixData,
  summaryTotals,
  activePeriodId,
  onSelectPeriod: _onSelectPeriod,
  baseCurrency,
  onCellChange,
  onSave,
  onDiscard,
  onOpenAutofill,
  onAddBalanceRow,
  onEditBalanceRow,
  onDeleteRow: _onDeleteRow,
  isSaving = false,
  dirtyCells,
  saveSuccessMessage: _saveSuccessMessage,
}) => {
  const { periods, sections, rows } = matrixData;

  // Selected row for bottom sheet editing
  const [selectedRow, setSelectedRow] = useState<BudgetMatrixRow | null>(null);
  const [editAmountStr, setEditAmountStr] = useState<string>('');

  // Accordion expanded state (default all open)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    () =>
      new Set([
        BudgetMatrixSectionKey.INGRESOS,
        BudgetMatrixSectionKey.EGRESOS,
        BudgetMatrixSectionKey.GASTOS_VIDA,
        BudgetMatrixSectionKey.AHORRO_INVERSIONES,
        BudgetMatrixSectionKey.DEUDAS_FINANCIACION,
      ]),
  );

  const [accountModalState, setAccountModalState] = useState<{
    isOpen: boolean;
    targetSection: BudgetMatrixSectionKey | null;
    editRow: BudgetMatrixRow | null;
  }>({
    isOpen: false,
    targetSection: null,
    editRow: null,
  });

  const toggleSection = (sectionKey: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionKey)) {
        next.delete(sectionKey);
      } else {
        next.add(sectionKey);
      }
      return next;
    });
  };

  const activePeriod = periods.find((p) => p.id === activePeriodId) || periods[0];
  const isClosed = activePeriod?.status === 'CLOSED';

  // Compute 6 Quadrants & KPI Totals for active month if not provided by parent
  const computedTotals = useMemo(() => {
    if (!activePeriod) {
      return {
        ingresos: 0,
        egresos: 0,
        resultado: 0,
        ahorros: 0,
        deudas: 0,
        margenLibre: 0,
      };
    }

    const pId = activePeriod.id;
    let ing = 0;
    let egr = 0;
    let aho = 0;
    let deu = 0;

    if (sections && sections.length > 0) {
      for (const sec of sections) {
        const val = sec.sectionTotals[pId] || 0;
        if (sec.sectionKey === BudgetMatrixSectionKey.INGRESOS) ing = val;
        else if (
          sec.sectionKey === BudgetMatrixSectionKey.EGRESOS ||
          sec.sectionKey === BudgetMatrixSectionKey.GASTOS_VIDA
        )
          egr = val;
        else if (sec.sectionKey === BudgetMatrixSectionKey.AHORRO_INVERSIONES) aho = val;
        else if (sec.sectionKey === BudgetMatrixSectionKey.DEUDAS_FINANCIACION) deu = val;
      }
    } else {
      for (const r of rows || []) {
        if (r.isParent) continue;
        const val = r.amounts[pId] || 0;
        if (r.accountType === 'INCOME') ing += val;
        else if (r.accountType === 'EXPENSE') egr += val;
        else if (r.accountType === 'ASSET') aho += val;
        else deu += val;
      }
    }

    const resultado = ing - egr;
    const margenLibre = resultado - aho - deu;

    return {
      ingresos: ing,
      egresos: egr,
      resultado,
      ahorros: aho,
      deudas: deu,
      margenLibre,
    };
  }, [activePeriod, sections, rows]);

  const activeTotals = summaryTotals || computedTotals;

  // Filter visible section configs matching the sections present in matrixData
  const visibleConfigs = useMemo(() => {
    if (!sections || sections.length === 0) return SECTION_CONFIGS;
    return SECTION_CONFIGS.filter((config) =>
      sections.some(
        (s) =>
          s.sectionKey === config.key ||
          (config.key === BudgetMatrixSectionKey.EGRESOS &&
            s.sectionKey === BudgetMatrixSectionKey.GASTOS_VIDA),
      ),
    );
  }, [sections]);

  // Open Bottom Sheet Editor for a row
  const handleOpenRowEditor = (row: BudgetMatrixRow) => {
    if (isClosed) return;
    setSelectedRow(row);
    const currentVal = row.amounts[activePeriodId] ?? 0;
    setEditAmountStr(currentVal === 0 ? '' : String(currentVal));
  };

  // Commit Bottom Sheet Edit
  const handleCommitEdit = () => {
    if (!selectedRow || !activePeriod) return;
    const cleanNum = parseFloat(editAmountStr) || 0;
    onCellChange(selectedRow.accountId, activePeriod.id, cleanNum, selectedRow.subRowId || null);
    setSelectedRow(null);
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-50 dark:bg-slate-950 overflow-y-auto font-sans">
      {/* 1. Top Summary Card with all 6 KPIs */}
      <div className="p-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 shadow-sm space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-baseline space-x-1.5 min-w-0">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 shrink-0">
                Planificación
              </span>
              <span className="text-xs font-medium text-slate-400 dark:text-slate-500 truncate">
                • {activePeriod?.friendlyName || activePeriod?.name}
              </span>
            </div>
            {isClosed ? (
              <span className="flex items-center space-x-1 text-[10px] font-semibold text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-md shrink-0">
                <Lock className="w-3 h-3" />
                <span>Cerrado</span>
              </span>
            ) : (
              <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-md shrink-0">
                Presupuesto
              </span>
            )}
          </div>

          {/* Key Metrics Grid (6 clean metric tiles in 2 columns) */}
          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 dark:border-slate-800 text-xs">
            {/* Ingresos */}
            <div className="p-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
              <span className="text-[11px] text-slate-500">Ingresos</span>
              <p className="font-bold text-emerald-600 dark:text-emerald-400 font-mono text-xs sm:text-sm truncate">
                {formatCurrency(activeTotals.ingresos, baseCurrency)}
              </p>
            </div>

            {/* Egresos */}
            <div className="p-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
              <span className="text-[11px] text-slate-500">Egresos</span>
              <p className="font-bold text-slate-800 dark:text-slate-200 font-mono text-xs sm:text-sm truncate">
                {formatCurrency(activeTotals.egresos, baseCurrency)}
              </p>
            </div>

            {/* = Resultado */}
            <div className="p-2 bg-indigo-50/60 dark:bg-indigo-950/30 rounded-xl">
              <span className="text-[11px] text-indigo-700 dark:text-indigo-300 font-semibold">
                = Resultado
              </span>
              <p
                className={`font-bold font-mono text-xs sm:text-sm truncate ${
                  activeTotals.resultado >= 0
                    ? 'text-indigo-700 dark:text-indigo-300'
                    : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {formatCurrency(activeTotals.resultado, baseCurrency)}
              </p>
            </div>

            {/* Ahorros e Inversiones */}
            <div className="p-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
              <span className="text-[11px] text-slate-500">Ahorros e Inversiones</span>
              <p className="font-bold text-blue-600 dark:text-blue-400 font-mono text-xs sm:text-sm truncate">
                {formatCurrency(activeTotals.ahorros, baseCurrency)}
              </p>
            </div>

            {/* Deudas y Financiación */}
            <div className="p-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
              <span className="text-[11px] text-slate-500">Deudas y Financiación</span>
              <p className="font-bold text-purple-600 dark:text-purple-400 font-mono text-xs sm:text-sm truncate">
                {formatCurrency(activeTotals.deudas, baseCurrency)}
              </p>
            </div>

            {/* = Margen Libre */}
            <div className="p-2 bg-emerald-50/60 dark:bg-emerald-950/30 rounded-xl">
              <span className="text-[11px] text-emerald-700 dark:text-emerald-300 font-semibold">
                = Margen Libre
              </span>
              <p
                className={`font-bold font-mono text-xs sm:text-sm truncate ${
                  activeTotals.margenLibre >= 0
                    ? 'text-emerald-700 dark:text-emerald-300'
                    : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {formatCurrency(activeTotals.margenLibre, baseCurrency)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Quadrant Sections Accordions */}
      <div className="px-3 space-y-3">
        {visibleConfigs.map((config) => {
          const matchingSection = sections?.find(
            (s) =>
              s.sectionKey === config.key ||
              (config.key === BudgetMatrixSectionKey.EGRESOS &&
                s.sectionKey === BudgetMatrixSectionKey.GASTOS_VIDA),
          );

          const sectionRows = matchingSection
            ? matchingSection.rows
            : (rows || []).filter((r) => {
                if (config.key === BudgetMatrixSectionKey.INGRESOS)
                  return r.accountType === 'INCOME';
                if (config.key === BudgetMatrixSectionKey.EGRESOS)
                  return r.accountType === 'EXPENSE';
                if (config.key === BudgetMatrixSectionKey.AHORRO_INVERSIONES)
                  return r.accountType === 'ASSET';
                return ['LIABILITY', 'EQUITY'].includes(r.accountType);
              });

          const isExpanded = expandedSections.has(config.key as string);
          const totalAmount = matchingSection
            ? matchingSection.sectionTotals[activePeriodId] || 0
            : sectionRows
                .filter((r) => !r.isParent)
                .reduce((sum, r) => sum + (r.amounts[activePeriodId] || 0), 0);

          return (
            <div
              key={config.key}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm"
            >
              {/* Accordion Header */}
              <div
                onClick={() => toggleSection(config.key as string)}
                className="flex items-center justify-between p-3.5 cursor-pointer select-none bg-slate-50/60 dark:bg-slate-800/30"
              >
                <div className="flex items-center space-x-2.5">
                  <span
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${config.badgeColor}`}
                  >
                    {config.title}
                  </span>
                  <span className="text-xs text-slate-400">({sectionRows.length})</span>
                </div>

                <div className="flex items-center space-x-2 font-mono">
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    {formatCurrency(totalAmount, baseCurrency)}
                  </span>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </div>
              </div>

              {/* Accordion Content */}
              {isExpanded && (
                <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
                  {sectionRows.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400">
                      No hay cuentas en este cuadrante.
                    </div>
                  ) : (
                    sectionRows.map((row) => {
                      const amount = row.amounts[activePeriodId] ?? 0;
                      const cellKey = `${activePeriodId}_${row.accountId}${row.subRowId ? `_${row.subRowId}` : ''}`;
                      const isDirty = dirtyCells.has(cellKey);

                      return (
                        <div
                          key={`${row.accountId}_${row.subRowId || 'main'}`}
                          onClick={() => !row.isParent && handleOpenRowEditor(row)}
                          className={`flex items-center justify-between p-3.5 ${
                            row.isParent
                              ? 'bg-slate-50/80 dark:bg-slate-800/40 font-bold'
                              : 'active:bg-slate-100 dark:active:bg-slate-800 cursor-pointer'
                          } transition-colors`}
                        >
                          <div className="flex-1 pr-2 min-w-0">
                            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block truncate">
                              {row.subRowLabel || row.accountName}
                            </span>
                            {row.subRowLabel && (
                              <span className="text-[10px] text-slate-400 block truncate">
                                {row.accountName}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center space-x-2 shrink-0 font-mono">
                            <span
                              className={`text-xs px-2.5 py-1 rounded-lg font-bold ${
                                isDirty
                                  ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 ring-1 ring-indigo-500/20'
                                  : amount === 0
                                    ? 'text-slate-400 bg-slate-100/60 dark:bg-slate-800/60'
                                    : 'text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800'
                              }`}
                            >
                              {formatCurrency(amount, baseCurrency)}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}

                  {/* Add balance account button */}
                  {config.isBalance && onAddBalanceRow && (
                    <div className="p-3 bg-slate-50/40 dark:bg-slate-800/20 text-center">
                      <button
                        type="button"
                        onClick={() =>
                          setAccountModalState({
                            isOpen: true,
                            targetSection: config.key as BudgetMatrixSectionKey,
                            editRow: null,
                          })
                        }
                        className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{config.addBtnText}</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Balanced Gap Spacer at bottom so the last accordion is cleanly visible above BottomNav */}
        <div className="h-16 w-full" aria-hidden="true" />
      </div>

      {/* 3. Bottom Sheet Rapid Cell Editor */}
      {selectedRow && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="absolute inset-0"
            onClick={() => setSelectedRow(null)}
            aria-hidden="true"
          />

          <div
            className="relative w-full max-w-lg bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 rounded-t-3xl shadow-2xl p-5 space-y-4 z-10 animate-in slide-in-from-bottom duration-200"
            style={{
              paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))',
            }}
          >
            {/* Pull handle */}
            <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto" />

            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {selectedRow.subRowLabel || selectedRow.accountName}
                </h4>
                <p className="text-xs text-slate-500">
                  Presupuesto para {activePeriod?.friendlyName || activePeriod?.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRow(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Input with Currency */}
            <div className="relative">
              <input
                type="number"
                inputMode="decimal"
                autoFocus
                placeholder="0"
                value={editAmountStr}
                onChange={(e) => setEditAmountStr(e.target.value)}
                className="w-full text-center text-2xl font-bold font-mono bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-2xl py-3 px-4 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            {/* Fast Quick Buttons */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  const prevIdx = periods.findIndex((p) => p.id === activePeriodId) - 1;
                  if (prevIdx >= 0) {
                    const prevVal = selectedRow.amounts[periods[prevIdx].id] ?? 0;
                    setEditAmountStr(String(prevVal));
                  }
                }}
                className="py-2 px-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 active:bg-slate-200"
              >
                = Mes Anterior
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onOpenAutofill) {
                    const r = selectedRow;
                    setSelectedRow(null);
                    onOpenAutofill(r);
                  }
                }}
                className="py-2 px-2 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1"
              >
                <FastForward className="w-3.5 h-3.5" />
                <span>Rellenar</span>
              </button>
              <button
                type="button"
                onClick={() => setEditAmountStr('0')}
                className="py-2 px-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-semibold text-slate-500"
              >
                Limpiar
              </button>
            </div>

            {/* Confirm button */}
            <button
              type="button"
              onClick={handleCommitEdit}
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold text-sm shadow-lg shadow-indigo-600/30 active:scale-[0.98] transition-all flex items-center justify-center space-x-2 cursor-pointer"
            >
              <Check className="w-5 h-5" />
              <span>Confirmar Monto</span>
            </button>
          </div>
        </div>
      )}

      {/* 4. Sticky Bottom Action Bar when there are unsaved changes */}
      {dirtyCells.size > 0 && (
        <div
          className="fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-4 py-3 shadow-2xl flex items-center justify-between"
          style={{
            paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))',
          }}
        >
          <div className="flex items-center space-x-2">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {dirtyCells.size} {dirtyCells.size === 1 ? 'cambio pendiente' : 'cambios pendientes'}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            {onDiscard && (
              <button
                type="button"
                onClick={onDiscard}
                disabled={isSaving}
                className="px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer flex items-center space-x-1"
              >
                <X className="w-3.5 h-3.5" />
                <span>Cancelar</span>
              </button>
            )}

            <button
              type="button"
              onClick={onSave}
              disabled={isSaving}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/30 flex items-center space-x-1.5 transition-all cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{isSaving ? 'Guardando...' : 'Guardar'}</span>
            </button>
          </div>
        </div>
      )}

      {/* 5. Account Modal for Balance Rows */}
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
