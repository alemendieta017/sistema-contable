'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../../services/api';
import { BudgetControlResponse, BudgetGaugeStatus } from '@sistema-contable/shared';
import { BudgetTransferModal } from '../../../components/budgets/BudgetTransferModal';
import {
  Calendar,
  ShieldAlert,
  ArrowLeftRight,
  RefreshCw,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
} from 'lucide-react';

export default function BudgetControlPage() {
  const [periods, setPeriods] = useState<any[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('');
  const [controlData, setControlData] = useState<BudgetControlResponse | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState<boolean>(false);

  // Load periods on mount
  useEffect(() => {
    async function loadPeriods() {
      try {
        const periodList = await api.periods.list();
        setPeriods(periodList || []);
        if (periodList && periodList.length > 0) {
          const currentMonthStr = new Date().toISOString().substring(0, 7);
          const activeP =
            periodList.find((p: any) => p.name === currentMonthStr) ||
            periodList.find((p: any) => p.status === 'OPEN') ||
            periodList[0];
          setSelectedPeriodId(activeP.id);
        }
      } catch (err) {
        console.error('Failed to load periods:', err);
      }
    }
    loadPeriods();
  }, []);

  // Fetch Control Data when period changes
  const fetchControlData = useCallback(async () => {
    if (!selectedPeriodId) return;
    setIsLoading(true);
    try {
      const data = await api.budgets.getControl(selectedPeriodId);
      setControlData(data);
    } catch (err) {
      console.error('Failed to fetch budget control data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedPeriodId]);

  useEffect(() => {
    fetchControlData();
  }, [fetchControlData]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-PY', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(val);
  };

  const getGaugeBadge = (status: BudgetGaugeStatus, pct: number) => {
    switch (status) {
      case BudgetGaugeStatus.NORMAL:
        return (
          <span className="flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Normal ({pct}%)</span>
          </span>
        );
      case BudgetGaugeStatus.WARNING:
        return (
          <span className="flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Alerta ({pct}%)</span>
          </span>
        );
      case BudgetGaugeStatus.OVERBUDGET:
        return (
          <span className="flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20 animate-pulse">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Excedido ({pct}%)</span>
          </span>
        );
    }
  };

  const getProgressBarColor = (status: BudgetGaugeStatus) => {
    switch (status) {
      case BudgetGaugeStatus.NORMAL:
        return 'bg-emerald-500';
      case BudgetGaugeStatus.WARNING:
        return 'bg-amber-500';
      case BudgetGaugeStatus.OVERBUDGET:
        return 'bg-rose-500';
    }
  };

  return (
    <div className="flex flex-col space-y-6">
      {/* Controls Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg">
        <div className="flex items-center space-x-3">
          <Calendar className="w-4 h-4 text-indigo-400" />
          <span className="text-xs font-semibold text-slate-300">Periodo Activo:</span>
          <select
            value={selectedPeriodId}
            onChange={(e) => setSelectedPeriodId(e.target.value)}
            className="bg-slate-950 text-slate-200 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-semibold focus:border-indigo-500 outline-none"
          >
            {periods.map((p) => (
              <option key={p.id} value={p.id}>
                {p.friendlyName || p.name} ({p.status})
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={() => setIsTransferModalOpen(true)}
          disabled={!controlData || controlData.isLocked}
          className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
        >
          <ArrowLeftRight className="w-4 h-4" />
          <span>Reasignar Presupuesto Entre Cuentas</span>
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-12 bg-slate-900 border border-slate-800 rounded-xl">
          <div className="flex flex-col items-center space-y-3">
            <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
            <span className="text-sm font-medium text-slate-400">
              Cargando tablero de control...
            </span>
          </div>
        </div>
      ) : controlData ? (
        <>
          {/* Executive Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">Presupuestado Total</span>
                <DollarSign className="w-4 h-4 text-slate-500" />
              </div>
              <p className="text-xl font-bold text-slate-100 font-mono mt-2">
                {formatCurrency(controlData.summary.totalBudgeted)}
              </p>
            </div>

            <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">Ejecutado Real</span>
                <TrendingUp className="w-4 h-4 text-indigo-400" />
              </div>
              <p className="text-xl font-bold text-slate-100 font-mono mt-2">
                {formatCurrency(controlData.summary.totalExecuted)}
              </p>
            </div>

            <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">Disponible Residuo</span>
                <span
                  className={`text-xs font-bold ${
                    controlData.summary.totalAvailable >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {controlData.summary.totalAvailable >= 0 ? 'Superávit' : 'Déficit'}
                </span>
              </div>
              <p
                className={`text-xl font-bold font-mono mt-2 ${
                  controlData.summary.totalAvailable >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {formatCurrency(controlData.summary.totalAvailable)}
              </p>
            </div>

            <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">Consumo Global</span>
                {getGaugeBadge(
                  controlData.summary.overallGaugeStatus,
                  controlData.summary.overallConsumptionPercentage,
                )}
              </div>
              <div className="w-full bg-slate-950 rounded-full h-2.5 mt-4 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${getProgressBarColor(
                    controlData.summary.overallGaugeStatus,
                  )}`}
                  style={{
                    width: `${Math.min(100, controlData.summary.overallConsumptionPercentage)}%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Breakdown Categories & Account Tables */}
          <div className="space-y-6">
            {controlData.categories.map((category) => (
              <div
                key={category.accountType}
                className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg"
              >
                {/* Category Header */}
                <div className="flex flex-wrap items-center justify-between px-6 py-4 bg-slate-950/80 border-b border-slate-800">
                  <div className="flex items-center space-x-3">
                    <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
                      {category.categoryName}
                    </h3>
                    {getGaugeBadge(category.gaugeStatus, category.consumptionPercentage)}
                  </div>

                  <div className="flex items-center space-x-6 text-xs font-mono">
                    <span className="text-slate-400">
                      Presupuesto:{' '}
                      <strong className="text-slate-200">
                        {formatCurrency(category.budgeted)}
                      </strong>
                    </span>
                    <span className="text-slate-400">
                      Ejecutado:{' '}
                      <strong className="text-slate-200">
                        {formatCurrency(category.executed)}
                      </strong>
                    </span>
                    <span className="text-slate-400">
                      Disponible:{' '}
                      <strong
                        className={category.available >= 0 ? 'text-emerald-400' : 'text-rose-400'}
                      >
                        {formatCurrency(category.available)}
                      </strong>
                    </span>
                  </div>
                </div>

                {/* Account Items Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-900 text-slate-400 font-semibold border-b border-slate-800">
                      <tr>
                        <th className="p-3">Cuenta</th>
                        <th className="p-3 text-right">Presupuestado</th>
                        <th className="p-3 text-right">Ejecutado</th>
                        <th className="p-3 text-right">Disponible</th>
                        <th className="p-3 min-w-[180px]">Indicador de Consumo (%)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {category.items.map((item) => (
                        <tr
                          key={item.accountId}
                          className="hover:bg-slate-800/30 transition-colors"
                        >
                          <td className="p-3 font-sans font-medium text-slate-200">
                            {item.accountName}
                          </td>
                          <td className="p-3 text-right text-slate-300">
                            {formatCurrency(item.budgeted)}
                          </td>
                          <td className="p-3 text-right text-slate-300">
                            {formatCurrency(item.executed)}
                          </td>
                          <td
                            className={`p-3 text-right font-bold ${
                              item.available >= 0 ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {formatCurrency(item.available)}
                          </td>
                          <td className="p-3">
                            <div className="flex items-center space-x-3">
                              <div className="flex-1 bg-slate-950 rounded-full h-2 overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${getProgressBarColor(
                                    item.gaugeStatus,
                                  )}`}
                                  style={{
                                    width: `${Math.min(100, item.consumptionPercentage)}%`,
                                  }}
                                />
                              </div>
                              <span className="text-[11px] font-bold text-slate-300 w-12 text-right">
                                {item.consumptionPercentage}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : null}

      {/* Transfer Modal */}
      {isTransferModalOpen && selectedPeriodId && controlData && (
        <BudgetTransferModal
          periodId={selectedPeriodId}
          categories={controlData.categories}
          isOpen={isTransferModalOpen}
          onClose={() => setIsTransferModalOpen(false)}
          onSuccess={async () => {
            setIsTransferModalOpen(false);
            await fetchControlData();
          }}
        />
      )}
    </div>
  );
}
