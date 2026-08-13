'use client';

import React, { useState } from 'react';
import { api } from '../../services/api';
import { BudgetDriverType, BudgetMatrixPeriod, BudgetMatrixRow } from '@sistema-contable/shared';
import { Wand2, X, AlertCircle } from 'lucide-react';

interface DriverActionModalProps {
  fiscalYearId: string;
  account: BudgetMatrixRow;
  periods: BudgetMatrixPeriod[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const DriverActionModal: React.FC<DriverActionModalProps> = ({
  fiscalYearId,
  account,
  periods,
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

  if (!isOpen) return null;

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
      setErrorMsg(err.message || 'Error al aplicar el motor de distribución.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Wand2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">
                Motor de Distribución Inteligente
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                {account.accountName} ({account.accountType})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {errorMsg && (
            <div className="flex items-center space-x-2.5 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Rule Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Regla de Distribución Automática:
            </label>
            <select
              value={driverType}
              onChange={(e) => setDriverType(e.target.value as BudgetDriverType)}
              className="w-full bg-slate-950 text-slate-100 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-medium focus:border-indigo-500 outline-none"
            >
              <option value={BudgetDriverType.FLAT_PRORATE}>
                Prorrateo Anual Equitativo (Mismo monto cada mes)
              </option>
              <option value={BudgetDriverType.FORWARD_FILL}>
                Rellenar hacia la Derecha (Forward Fill desde mes origen)
              </option>
              <option value={BudgetDriverType.PERCENTAGE_GROWTH}>
                Crecimiento Porcentual Mensual (MoM %)
              </option>
              <option value={BudgetDriverType.WEIGHTED_HISTORICAL}>
                Distribución Ponderada Histórica (Basada en año anterior)
              </option>
              <option value={BudgetDriverType.PRIOR_YEAR_ACTUAL}>
                Traer Ejecucción Real del Año Anterior (+ Ajuste %)
              </option>
            </select>
          </div>

          {/* Conditional Inputs based on Driver Type */}
          {(driverType === BudgetDriverType.FLAT_PRORATE ||
            driverType === BudgetDriverType.WEIGHTED_HISTORICAL) && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Presupuesto Total Anual:
              </label>
              <input
                type="number"
                step="any"
                required
                value={annualTotal}
                onChange={(e) => setAnnualTotal(e.target.value)}
                placeholder="Ej: 120000"
                className="w-full bg-slate-950 text-slate-100 border border-slate-800 rounded-xl px-3.5 py-2 text-xs font-mono focus:border-indigo-500 outline-none"
              />
            </div>
          )}

          {(driverType === BudgetDriverType.FORWARD_FILL ||
            driverType === BudgetDriverType.PERCENTAGE_GROWTH) && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Periodo Mes Origen (Baseline):
              </label>
              <select
                value={sourcePeriodId}
                onChange={(e) => setSourcePeriodId(e.target.value)}
                className="w-full bg-slate-950 text-slate-100 border border-slate-800 rounded-xl px-3.5 py-2 text-xs font-medium focus:border-indigo-500 outline-none"
              >
                {periods.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.friendlyName || p.name} ({p.status})
                  </option>
                ))}
              </select>
            </div>
          )}

          {(driverType === BudgetDriverType.PERCENTAGE_GROWTH ||
            driverType === BudgetDriverType.PRIOR_YEAR_ACTUAL) && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Porcentaje de Crecimiento / Ajuste (%):
              </label>
              <input
                type="number"
                step="any"
                required
                value={growthPercentage}
                onChange={(e) => setGrowthPercentage(e.target.value)}
                placeholder="Ej: 5"
                className="w-full bg-slate-950 text-slate-100 border border-slate-800 rounded-xl px-3.5 py-2 text-xs font-mono focus:border-indigo-500 outline-none"
              />
            </div>
          )}

          {/* Modal Footer Actions */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
            >
              <Wand2 className="w-3.5 h-3.5" />
              <span>{isLoading ? 'Calculando...' : 'Aplicar Distribución'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
