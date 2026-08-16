'use client';

import React, { useState, useMemo } from 'react';
import {
  BudgetMatrixResponse,
  BudgetMatrixRow,
  BudgetMatrixSectionKey,
  CashFlowDirection,
} from '@sistema-contable/shared';
import { formatCurrency } from '../../lib/utils';
import { BudgetMonthStrip } from './BudgetMonthStrip';
import { BudgetAccountCard } from './BudgetAccountCard';
import { BudgetDeepDiveDrawer } from './BudgetDeepDiveDrawer';
import { BudgetStickyActionBar } from './BudgetStickyActionBar';
import { BudgetAccountModal } from './BudgetAccountModal';
import {
  ChevronDown,
  ChevronUp,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  CreditCard,
  PiggyBank,
} from 'lucide-react';

export interface BudgetMobileViewProps {
  matrixData: BudgetMatrixResponse;
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
    key: BudgetMatrixSectionKey.GASTOS_VIDA,
    title: 'Gastos de Vida / Egresos',
    icon: ArrowDownRight,
    badgeColor: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
    textColor: 'text-rose-600 dark:text-rose-400',
    borderColor: 'border-rose-500/30',
    isBalance: false,
  },
  {
    key: BudgetMatrixSectionKey.AHORRO_INVERSIONES,
    title: 'Ahorro e Inversiones',
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
  activePeriodId,
  onSelectPeriod,
  baseCurrency,
  onCellChange,
  onSave,
  onDiscard,
  onOpenAutofill,
  onAddBalanceRow,
  onEditBalanceRow,
  onDeleteRow,
  isSaving = false,
  dirtyCells,
  saveSuccessMessage,
  fiscalYearId,
}) => {
  const { periods, sections, rows } = matrixData;

  // Accordion open/collapse states (default: all 4 expanded)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    () =>
      new Set([
        BudgetMatrixSectionKey.INGRESOS,
        BudgetMatrixSectionKey.GASTOS_VIDA,
        BudgetMatrixSectionKey.AHORRO_INVERSIONES,
        BudgetMatrixSectionKey.DEUDAS_FINANCIACION,
        'EGRESOS',
        'FINANCIAMIENTO_AHORRO',
      ]),
  );

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

  // Deep-Dive Drawer state
  const [deepDiveRow, setDeepDiveRow] = useState<BudgetMatrixRow | null>(null);
  const [isDeepDiveOpen, setIsDeepDiveOpen] = useState<boolean>(false);

  // Budget Account Modal state
  const [accountModalState, setAccountModalState] = useState<{
    isOpen: boolean;
    targetSection?: 'ASSET' | 'LIABILITY' | null;
    editRow?: BudgetMatrixRow | null;
  }>({
    isOpen: false,
    targetSection: null,
    editRow: null,
  });

  const openAddAccountModal = (target: 'ASSET' | 'LIABILITY') => {
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

  // Calculate dirty period IDs set for BudgetMonthStrip indicators
  const dirtyPeriodIds = useMemo(() => {
    const dirtySet = new Set<string>();
    for (const cellKey of dirtyCells) {
      const periodId = cellKey.split('_')[0];
      if (periodId) {
        dirtySet.add(periodId);
      }
    }
    return dirtySet;
  }, [dirtyCells]);

  // Current active period object
  const activePeriod = useMemo(() => {
    return (
      periods.find((p) => p.id === activePeriodId) ||
      periods[0] || { id: '', name: '', friendlyName: '', status: 'OPEN' }
    );
  }, [periods, activePeriodId]);

  const isPeriodLocked = activePeriod.status === 'CLOSED';

  // Group rows by the 4 standard sections
  const sectionDataMap = useMemo(() => {
    const map = new Map<
      string,
      {
        config: SectionConfig;
        rows: BudgetMatrixRow[];
        monthlySum: number;
      }
    >();

    SECTION_CONFIGS.forEach((config) => {
      // Find rows from matrixData.sections or fallback to matrixData.rows
      let secRows: BudgetMatrixRow[] = [];

      if (sections && sections.length > 0) {
        const foundSec = sections.find(
          (s) =>
            s.sectionKey === config.key ||
            (config.key === BudgetMatrixSectionKey.GASTOS_VIDA && s.sectionKey === 'EGRESOS') ||
            (config.key === BudgetMatrixSectionKey.DEUDAS_FINANCIACION &&
              s.sectionKey === 'FINANCIAMIENTO_AHORRO'),
        );
        if (foundSec) {
          secRows = foundSec.rows.filter((r) => !r.isParent);
        }
      } else if (rows) {
        secRows = rows.filter((r) => {
          if (r.isParent) return false;
          if (config.key === BudgetMatrixSectionKey.INGRESOS) return r.accountType === 'INCOME';
          if (config.key === BudgetMatrixSectionKey.GASTOS_VIDA) return r.accountType === 'EXPENSE';
          if (config.key === BudgetMatrixSectionKey.AHORRO_INVERSIONES)
            return r.accountType === 'ASSET';
          if (config.key === BudgetMatrixSectionKey.DEUDAS_FINANCIACION)
            return ['LIABILITY', 'EQUITY'].includes(r.accountType);
          return false;
        });
      }

      // Calculate monthly sum for active period
      let sum = 0;
      secRows.forEach((r) => {
        const amount = r.amounts[activePeriodId] || 0;
        if (
          (config.key === BudgetMatrixSectionKey.AHORRO_INVERSIONES ||
            config.key === BudgetMatrixSectionKey.DEUDAS_FINANCIACION) &&
          r.cashFlowDirection === CashFlowDirection.EGRESO_EFECTIVO
        ) {
          sum -= amount;
        } else {
          sum += amount;
        }
      });

      map.set(config.key, {
        config,
        rows: secRows,
        monthlySum: sum,
      });
    });

    return map;
  }, [sections, rows, activePeriodId]);

  return (
    <div className="flex flex-col w-full min-h-full pb-24 bg-slate-50 dark:bg-slate-950 select-none">
      {/* 1. Swipeable / Clickable Month Strip Navigation Bar */}
      <div className="sticky top-0 z-30 shadow-sm">
        <BudgetMonthStrip
          periods={periods}
          activePeriodId={activePeriodId}
          onSelectPeriod={onSelectPeriod}
          dirtyPeriodIds={dirtyPeriodIds}
          baseCurrency={baseCurrency}
        />
      </div>

      {/* 2. Main Container with the 4 Block Accordions */}
      <div className="flex flex-col space-y-3 p-3 w-full max-w-xl mx-auto">
        {SECTION_CONFIGS.map((config) => {
          const secData = sectionDataMap.get(config.key) || {
            config,
            rows: [],
            monthlySum: 0,
          };
          const isExpanded = expandedSections.has(config.key);
          const Icon = config.icon;

          return (
            <div
              key={config.key}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden transition-all duration-200"
            >
              {/* Accordion Header Bar (Touch-friendly >= 48px) */}
              <button
                type="button"
                onClick={() => toggleSection(config.key)}
                className="w-full flex items-center justify-between px-4 py-3.5 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors text-left cursor-pointer select-none"
              >
                <div className="flex items-center space-x-2.5 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center border shrink-0 ${config.badgeColor}`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                      {config.title}
                    </h3>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      {secData.rows.length} cuenta{secData.rows.length === 1 ? '' : 's'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  {/* Monthly Sum in Header */}
                  <span
                    className={`font-mono text-xs font-bold ${
                      secData.monthlySum < 0
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-slate-900 dark:text-slate-100'
                    }`}
                  >
                    {formatCurrency(secData.monthlySum, baseCurrency)}
                  </span>

                  {/* Collapse / Expand Chevron */}
                  <div className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </div>
                </div>
              </button>

              {/* Accordion Content */}
              {isExpanded && (
                <div className="px-3 pb-3 pt-1 border-t border-slate-100 dark:border-slate-800/80 space-y-2.5">
                  {/* List of Account Cards */}
                  {secData.rows.length > 0 ? (
                    secData.rows.map((row) => {
                      const cellKey = `${activePeriodId}_${row.accountId}${
                        row.subRowId ? `_${row.subRowId}` : ''
                      }`;
                      const isCellDirty = dirtyCells.has(cellKey);

                      return (
                        <BudgetAccountCard
                          key={`${row.accountId}_${row.subRowId || 'main'}`}
                          account={row}
                          activePeriodId={activePeriodId}
                          baseCurrency={baseCurrency}
                          onAmountChange={onCellChange}
                          onOpenDeepDive={(r) => {
                            setDeepDiveRow(r);
                            setIsDeepDiveOpen(true);
                          }}
                          onOpenAutofill={onOpenAutofill}
                          onEditBalanceRow={openEditAccountModal}
                          onDeleteRow={onDeleteRow}
                          isDirty={isCellDirty}
                          isLocked={isPeriodLocked}
                        />
                      );
                    })
                  ) : (
                    <div className="py-6 px-4 text-center text-xs text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-950/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                      No hay cuentas presupuestadas en esta sección.
                    </div>
                  )}

                  {/* "+ Presupuestar Activo/Deuda" Button for Balance Sections */}
                  {config.isBalance && config.balanceType && (
                    <button
                      type="button"
                      onClick={() => openAddAccountModal(config.balanceType!)}
                      className={`w-full min-h-[44px] flex items-center justify-center space-x-1.5 px-4 py-2.5 rounded-xl border border-dashed font-semibold text-xs transition-all cursor-pointer ${
                        config.balanceType === 'ASSET'
                          ? 'border-blue-300 dark:border-blue-500/40 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/20 hover:bg-blue-100 dark:hover:bg-blue-900/30'
                          : 'border-purple-300 dark:border-purple-500/40 text-purple-600 dark:text-purple-400 bg-purple-50/50 dark:bg-purple-950/20 hover:bg-purple-100 dark:hover:bg-purple-900/30'
                      }`}
                    >
                      <Plus className="w-4 h-4" />
                      <span>{config.addBtnText}</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 3. Deep-Dive Drawer (12-Month Breakdown Sheet) */}
      {isDeepDiveOpen && deepDiveRow && (
        <BudgetDeepDiveDrawer
          isOpen={isDeepDiveOpen}
          onClose={() => {
            setIsDeepDiveOpen(false);
            setDeepDiveRow(null);
          }}
          account={deepDiveRow}
          periods={periods}
          baseCurrency={baseCurrency}
          fiscalYearId={fiscalYearId}
          onAmountChange={onCellChange}
        />
      )}

      {/* 4. Unified Budget Account Modal (Create / Edit Balance Rows) */}
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

      {/* 5. Sticky Bottom Action Bar (Discard / Save Todo) */}
      <BudgetStickyActionBar
        isDirty={dirtyCells.size > 0}
        dirtyCount={dirtyCells.size}
        isSaving={isSaving}
        onSave={onSave}
        onDiscard={onDiscard || (() => {})}
        saveSuccessMessage={saveSuccessMessage}
      />
    </div>
  );
};
