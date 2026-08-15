'use client';

import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { formatCurrency } from '../../lib/utils';
import { BudgetDriverType, BudgetMatrixPeriod, BudgetMatrixRow } from '@sistema-contable/shared';
import {
  Sparkles,
  X,
  AlertCircle,
  TrendingUp,
  FastForward,
  History,
  CalendarClock,
  Calculator,
  Percent,
  Calendar,
  Check,
  DollarSign,
  Info,
} from 'lucide-react';

export interface AutofillModalProps {
  fiscalYearId: string;
  account: BudgetMatrixRow;
  periods: BudgetMatrixPeriod[];
  baseCurrency?: any;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface DistributionOption {
  type: BudgetDriverType;
  title: string;
  shortDescription: string;
  details: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  borderColor: string;
  bgColor: string;
}

const DISTRIBUTION_OPTIONS: DistributionOption[] = [
  {
    type: BudgetDriverType.FLAT_PRORATE,
    title: 'Distribuir monto anual parejo',
    shortDescription: 'Monto total dividido equitativamente entre los 12 meses',
    details:
      'Ingresa un presupuesto anual total y el sistema lo distribuirá en partes iguales entre todos los meses abiertos.',
    icon: Calculator,
    color: 'text-emerald-500 dark:text-emerald-400',
    borderColor: 'border-emerald-500/30 peer-checked:border-emerald-500',
    bgColor: 'bg-emerald-500/10',
  },
  {
    type: BudgetDriverType.FORWARD_FILL,
    title: 'Replicar valor hacia adelante',
    shortDescription: 'Copia el valor del mes base a todos los meses siguientes',
    details:
      'Toma el monto presupuestado del mes seleccionado y lo replica en todos los meses posteriores que estén abiertos.',
    icon: FastForward,
    color: 'text-cyan-500 dark:text-cyan-400',
    borderColor: 'border-cyan-500/30 peer-checked:border-cyan-500',
    bgColor: 'bg-cyan-500/10',
  },
  {
    type: BudgetDriverType.PERCENTAGE_GROWTH,
    title: 'Incremento porcentual mensual',
    shortDescription: 'Crecimiento compuesto mes a mes (MoM %)',
    details:
      'Aplica una tasa de variación porcentual mensual compuesta a partir del valor presupuestado en el mes base.',
    icon: TrendingUp,
    color: 'text-amber-500 dark:text-amber-400',
    borderColor: 'border-amber-500/30 peer-checked:border-amber-500',
    bgColor: 'bg-amber-500/10',
  },
  {
    type: BudgetDriverType.WEIGHTED_HISTORICAL,
    title: 'Ponderación histórica',
    shortDescription: 'Distribución basada en el patrón estacional del año anterior',
    details:
      'Distribuye un monto total anual respetando los picos y valles de gasto o ingreso reales del año pasado.',
    icon: History,
    color: 'text-indigo-500 dark:text-indigo-400',
    borderColor: 'border-indigo-500/30 peer-checked:border-indigo-500',
    bgColor: 'bg-indigo-500/10',
  },
  {
    type: BudgetDriverType.PRIOR_YEAR_ACTUAL,
    title: 'Traer real del año anterior con ajuste %',
    shortDescription: 'Importa la contabilidad real del año pasado + % opcional',
    details:
      'Trae mes a mes los movimientos reales asentados en el libro diario del año anterior y les aplica un ajuste porcentual.',
    icon: CalendarClock,
    color: 'text-purple-500 dark:text-purple-400',
    borderColor: 'border-purple-500/30 peer-checked:border-purple-500',
    bgColor: 'bg-purple-500/10',
  },
];

export const AutofillModal: React.FC<AutofillModalProps> = ({
  fiscalYearId,
  account,
  periods,
  baseCurrency,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [driverType, setDriverType] = useState<BudgetDriverType>(BudgetDriverType.FLAT_PRORATE);
  const [annualTotal, setAnnualTotal] = useState<string>(
    account.rowTotal > 0 ? String(account.rowTotal) : '120000',
  );
  const [growthPercentage, setGrowthPercentage] = useState<string>('5');
  const [sourcePeriodId, setSourcePeriodId] = useState<string>(periods[0]?.id || '');

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Set default period if sourcePeriodId is empty
  useEffect(() => {
    if (periods.length > 0 && !sourcePeriodId) {
      setSourcePeriodId(periods[0].id);
    }
  }, [periods, sourcePeriodId]);

  // Update initial annual total when account changes
  useEffect(() => {
    if (account.rowTotal > 0) {
      setAnnualTotal(String(account.rowTotal));
    }
  }, [account]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const openPeriods = periods.filter((p) => p.status !== 'CLOSED');

  // Helper preview calculation
  const getPreviewText = (): string => {
    const totalNum = parseFloat(annualTotal) || 0;
    const growthNum = parseFloat(growthPercentage) || 0;
    const sourcePeriod = periods.find((p) => p.id === sourcePeriodId);
    const sourceName = sourcePeriod?.friendlyName || sourcePeriod?.name || 'Mes base';
    const sourceAmount = sourcePeriod ? (account.amounts[sourcePeriod.id] ?? 0) : 0;

    switch (driverType) {
      case BudgetDriverType.FLAT_PRORATE: {
        const perMonth = openPeriods.length > 0 ? totalNum / openPeriods.length : 0;
        return `Se asignarán aproximadamente ${formatCurrency(perMonth, baseCurrency)} a cada uno de los ${openPeriods.length} meses abiertos.`;
      }
      case BudgetDriverType.FORWARD_FILL: {
        return `Se copiará el valor de ${sourceName} (${formatCurrency(sourceAmount, baseCurrency)}) a todos los meses siguientes.`;
      }
      case BudgetDriverType.PERCENTAGE_GROWTH: {
        return `Partiendo de ${formatCurrency(sourceAmount, baseCurrency)} en ${sourceName}, cada mes posterior se incrementará un ${growthNum}%.`;
      }
      case BudgetDriverType.WEIGHTED_HISTORICAL: {
        return `Se distribuirá el total de ${formatCurrency(totalNum, baseCurrency)} respetando la proporción mensual real del año previo.`;
      }
      case BudgetDriverType.PRIOR_YEAR_ACTUAL: {
        const sign = growthNum >= 0 ? `+${growthNum}%` : `${growthNum}%`;
        return `Se cargarán los montos reales del año anterior con un ajuste del ${sign}.`;
      }
      default:
        return '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);

    try {
      if (driverType === BudgetDriverType.PRIOR_YEAR_ACTUAL) {
        await api.budgets.baselineActuals({
          fiscalYearId,
          adjustmentPercentage: parseFloat(growthPercentage) || 0,
          accountIds: [account.accountId],
        });
      } else {
        await api.budgets.applyDriver({
          fiscalYearId,
          accountId: account.accountId,
          subRowId: account.subRowId || undefined,
          driverType,
          annualTotal: annualTotal ? parseFloat(annualTotal) : undefined,
          growthPercentage: growthPercentage ? parseFloat(growthPercentage) : undefined,
          sourcePeriodId: sourcePeriodId || undefined,
        });
      }
      onSuccess();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al aplicar el autorelleno presupuestario.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                Autorellenar Presupuesto
              </h2>
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                <span className="font-mono text-slate-700 dark:text-slate-300 font-semibold">
                  {account.accountCode}
                </span>
                <span>•</span>
                <span className="font-medium text-slate-800 dark:text-slate-200 truncate max-w-[280px]">
                  {account.accountName}
                  {account.subRowLabel ? ` (${account.subRowLabel})` : ''}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                  {account.accountType}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
          {errorMsg && (
            <div className="flex items-center space-x-2.5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Section: Select Distribution Rule */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2.5">
              Seleccione una regla de distribución automática:
            </label>
            <div className="grid grid-cols-1 gap-2.5">
              {DISTRIBUTION_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const isSelected = driverType === opt.type;

                return (
                  <div
                    key={opt.type}
                    onClick={() => setDriverType(opt.type)}
                    className={`relative flex items-start space-x-3.5 p-3.5 rounded-xl border cursor-pointer transition-all duration-150 ${
                      isSelected
                        ? `bg-indigo-50/50 dark:bg-slate-800/90 border-indigo-500 shadow-md shadow-indigo-500/5 ring-1 ring-indigo-500/40`
                        : 'bg-slate-50/50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div
                      className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                        isSelected
                          ? `${opt.bgColor} ${opt.color}`
                          : 'bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-xs font-bold ${
                            isSelected
                              ? 'text-slate-900 dark:text-slate-100'
                              : 'text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {opt.title}
                        </span>
                        {isSelected && (
                          <div className="w-4 h-4 rounded-full bg-indigo-600 flex items-center justify-center text-white text-[10px]">
                            <Check className="w-3 h-3" />
                          </div>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                        {opt.shortDescription}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section: Dynamic Parameters for Selected Option */}
          <div className="bg-slate-50/70 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-4">
            <div className="flex items-center space-x-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
              <Info className="w-4 h-4" />
              <span>Parámetros de Configuración</span>
            </div>

            {/* Flat Prorate or Weighted Historical: Annual Total Input */}
            {(driverType === BudgetDriverType.FLAT_PRORATE ||
              driverType === BudgetDriverType.WEIGHTED_HISTORICAL) && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
                  <span>Monto Total Anual Presupuestado:</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    required
                    value={annualTotal}
                    onChange={(e) => setAnnualTotal(e.target.value)}
                    placeholder="Ej: 120000"
                    className="w-full bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-mono focus:border-indigo-500 outline-none"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Monto global que será repartido en el ejercicio fiscal.
                </p>
              </div>
            )}

            {/* Forward Fill or Percentage Growth: Source Period Selector */}
            {(driverType === BudgetDriverType.FORWARD_FILL ||
              driverType === BudgetDriverType.PERCENTAGE_GROWTH) && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                  <span>Mes Base de Origen:</span>
                </label>
                <select
                  value={sourcePeriodId}
                  onChange={(e) => setSourcePeriodId(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-medium focus:border-indigo-500 outline-none"
                >
                  {periods.map((p) => {
                    const monthAmount = account.amounts[p.id] ?? 0;
                    return (
                      <option key={p.id} value={p.id}>
                        {p.friendlyName || p.name} ({p.status}) — Actual:{' '}
                        {formatCurrency(monthAmount, baseCurrency)}
                      </option>
                    );
                  })}
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  Mes desde el cual se tomará el valor para replicar o proyectar.
                </p>
              </div>
            )}

            {/* Percentage Growth: Monthly Growth % */}
            {driverType === BudgetDriverType.PERCENTAGE_GROWTH && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Percent className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                  <span>Porcentaje de Crecimiento Mensual (% MoM):</span>
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  value={growthPercentage}
                  onChange={(e) => setGrowthPercentage(e.target.value)}
                  placeholder="Ej: 5"
                  className="w-full bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-mono focus:border-indigo-500 outline-none"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Porcentaje compuesto que aumentará (o disminuirá si es negativo) cada mes respecto
                  al anterior.
                </p>
              </div>
            )}

            {/* Prior Year Actual: Adjustment % */}
            {driverType === BudgetDriverType.PRIOR_YEAR_ACTUAL && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Percent className="w-3.5 h-3.5 text-purple-500 dark:text-purple-400" />
                  <span>Porcentaje de Ajuste / Inflación sobre Real (%):</span>
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  value={growthPercentage}
                  onChange={(e) => setGrowthPercentage(e.target.value)}
                  placeholder="0 para mantener exacto, ej: 5 para +5%"
                  className="w-full bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-mono focus:border-indigo-500 outline-none"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Ajuste porcentual aplicado a los números reales del año anterior (0 = copia
                  exacta).
                </p>
              </div>
            )}

            {/* Real-time Calculation Summary / Preview */}
            <div className="mt-2 p-3 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-500/20 text-xs text-indigo-900 dark:text-indigo-200">
              <span className="font-semibold text-indigo-700 dark:text-indigo-300">
                Resultado esperado:{' '}
              </span>
              {getPreviewText()}
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Sparkles className="w-4 h-4 animate-spin" />
                  <span>Aplicando distribución...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Aplicar Distribución</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
