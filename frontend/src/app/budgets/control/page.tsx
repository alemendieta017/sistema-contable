'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../../services/api';
import { formatCurrency } from '../../../lib/utils';
import {
  BudgetControlResponse,
  BudgetGaugeStatus,
  BudgetMatrixSectionKey,
  CashFlowDirection,
} from '@sistema-contable/shared';
import { BudgetTransferModal } from '../../../components/budgets/BudgetTransferModal';
import {
  Calendar,
  ShieldAlert,
  ArrowLeftRight,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  Lock,
  PieChart,
  Wallet,
  CreditCard,
  PiggyBank,
  Info,
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

function getSpanishFriendlyPeriodName(name: string): string {
  if (!name) return '';
  const match = name.match(/^(\d{4})-(\d{2})/);
  if (match) {
    const year = match[1];
    const monthIndex = parseInt(match[2], 10) - 1;
    if (monthIndex >= 0 && monthIndex < 12) {
      return `${SPANISH_MONTHS[monthIndex]} ${year}`;
    }
  }
  return name;
}

export default function BudgetControlPage() {
  const [periods, setPeriods] = useState<any[]>([]);
  const [currencies, setCurrencies] = useState<any[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('');
  const [controlData, setControlData] = useState<BudgetControlResponse | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState<boolean>(false);
  const [transferSourceAccountId, setTransferSourceAccountId] = useState<string | undefined>(
    undefined,
  );

  // Load periods & currencies on mount
  useEffect(() => {
    async function loadData() {
      try {
        const [periodList, curList] = await Promise.all([
          api.periods.list(),
          api.currencies.list(),
        ]);
        const list = Array.isArray(periodList) ? periodList : periodList?.data || [];
        setPeriods(list);
        setCurrencies(curList || []);
        if (list && list.length > 0) {
          const currentMonthStr = new Date().toISOString().substring(0, 7);
          const activeP =
            list.find((p: any) => p.name === currentMonthStr) ||
            list.find((p: any) => p.status === 'OPEN') ||
            list[0];
          setSelectedPeriodId(activeP.id);
        } else {
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Error al cargar datos iniciales:', err);
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const baseCurrency = currencies.find((c) => c.isBase) || {
    code: 'PYG',
    symbol: '₲',
    decimalPlaces: 0,
  };

  // Fetch Control Data when period changes
  const fetchControlData = useCallback(async () => {
    if (!selectedPeriodId) return;
    setIsLoading(true);
    try {
      const data = await api.budgets.getControl(selectedPeriodId);
      setControlData(data);
    } catch (err) {
      console.error('Error al obtener datos de control presupuestario:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedPeriodId]);

  useEffect(() => {
    fetchControlData();
  }, [fetchControlData]);

  const getGaugeBadge = (status: BudgetGaugeStatus, pct: number, isIncome: boolean = false) => {
    if (isIncome) {
      const isReached = pct >= 75;
      return (
        <span
          className={`flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${
            isReached
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
          }`}
        >
          {isReached ? (
            <CheckCircle2 className="w-3.5 h-3.5" />
          ) : (
            <AlertTriangle className="w-3.5 h-3.5" />
          )}
          <span>Ejecutado ({pct}%)</span>
        </span>
      );
    }

    switch (status) {
      case BudgetGaugeStatus.NORMAL:
        return (
          <span className="flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Normal ({pct}%)</span>
          </span>
        );
      case BudgetGaugeStatus.WARNING:
        return (
          <span className="flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Alerta ({pct}%)</span>
          </span>
        );
      case BudgetGaugeStatus.OVERBUDGET:
        return (
          <span className="flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30 animate-pulse">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Excedido ({pct}%)</span>
          </span>
        );
    }
  };

  const getProgressBarColor = (status: BudgetGaugeStatus, isIncome: boolean = false) => {
    if (isIncome) {
      return 'bg-emerald-500';
    }
    switch (status) {
      case BudgetGaugeStatus.NORMAL:
        return 'bg-emerald-500';
      case BudgetGaugeStatus.WARNING:
        return 'bg-amber-500';
      case BudgetGaugeStatus.OVERBUDGET:
        return 'bg-rose-500';
    }
  };

  const getSectionIcon = (sectionKey: string) => {
    switch (sectionKey) {
      case BudgetMatrixSectionKey.INGRESOS:
        return <TrendingUp className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />;
      case BudgetMatrixSectionKey.GASTOS_VIDA:
        return <Wallet className="w-4 h-4 text-rose-500 dark:text-rose-400" />;
      case BudgetMatrixSectionKey.AHORRO_INVERSIONES:
        return <PiggyBank className="w-4 h-4 text-blue-500 dark:text-blue-400" />;
      case BudgetMatrixSectionKey.DEUDAS_FINANCIACION:
      case 'FINANCIAMIENTO_AHORRO':
        return <CreditCard className="w-4 h-4 text-purple-500 dark:text-purple-400" />;
      default:
        return <PieChart className="w-4 h-4 text-slate-400" />;
    }
  };

  const getSectionColorClass = (sectionKey: string) => {
    switch (sectionKey) {
      case BudgetMatrixSectionKey.INGRESOS:
        return 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10';
      case BudgetMatrixSectionKey.GASTOS_VIDA:
        return 'border-rose-500/30 text-rose-600 dark:text-rose-400 bg-rose-500/10';
      case BudgetMatrixSectionKey.AHORRO_INVERSIONES:
        return 'border-blue-500/30 text-blue-600 dark:text-blue-400 bg-blue-500/10';
      case BudgetMatrixSectionKey.DEUDAS_FINANCIACION:
      case 'FINANCIAMIENTO_AHORRO':
        return 'border-purple-500/30 text-purple-600 dark:text-purple-400 bg-purple-500/10';
      default:
        return 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800';
    }
  };

  const handleOpenTransferModal = (sourceAccountId?: string) => {
    setTransferSourceAccountId(sourceAccountId);
    setIsTransferModalOpen(true);
  };

  // Get active sections list from response
  const activeSections = controlData?.sections || [];

  return (
    <div className="flex flex-col space-y-6 font-sans">
      {/* Controls Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm dark:shadow-lg">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Periodo Activo:
            </span>
            <select
              value={selectedPeriodId}
              onChange={(e) => setSelectedPeriodId(e.target.value)}
              disabled={periods.length === 0}
              className="bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold focus:border-indigo-500 outline-none min-h-[40px] disabled:opacity-50"
            >
              {periods.length === 0 ? (
                <option value="">Sin Períodos</option>
              ) : (
                periods.map((p) => (
                  <option key={p.id} value={p.id}>
                    {getSpanishFriendlyPeriodName(p.name)} (
                    {p.status === 'CLOSED' ? 'Cerrado' : 'Abierto'})
                  </option>
                ))
              )}
            </select>
          </div>

          <button
            onClick={fetchControlData}
            title="Recargar datos de control"
            disabled={isLoading}
            className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          {controlData?.isLocked && (
            <span className="flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <Lock className="w-3.5 h-3.5" />
              <span>Periodo Cerrado (Solo Lectura)</span>
            </span>
          )}
        </div>

        <button
          onClick={() => handleOpenTransferModal(undefined)}
          disabled={!controlData || controlData.isLocked}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all cursor-pointer min-h-[44px]"
        >
          <ArrowLeftRight className="w-4 h-4" />
          <span>Reasignar Presupuesto Entre Cuentas</span>
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm dark:shadow-lg">
          <div className="flex flex-col items-center space-y-3">
            <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Cargando tablero de control ejecutivo...
            </span>
          </div>
        </div>
      ) : controlData ? (
        <>
          {/* Executive Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm dark:shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Presupuestado Total
                </span>
                <DollarSign className="w-4 h-4 text-slate-400 dark:text-slate-500" />
              </div>
              <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 font-mono mt-2">
                {formatCurrency(controlData.summary.totalBudgeted, baseCurrency)}
              </p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                Límite global asignado
              </p>
            </div>

            <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm dark:shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Ejecutado Real
                </span>
                <TrendingUp className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
              </div>
              <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 font-mono mt-2">
                {formatCurrency(controlData.summary.totalExecuted, baseCurrency)}
              </p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                Asientos contables devengados
              </p>
            </div>

            <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm dark:shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Disponible Residuo
                </span>
                <span
                  className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                    controlData.summary.totalAvailable >= 0
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                  }`}
                >
                  {controlData.summary.totalAvailable >= 0 ? 'Superávit' : 'Déficit'}
                </span>
              </div>
              <p
                className={`text-2xl font-bold font-mono mt-2 ${
                  controlData.summary.totalAvailable >= 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {formatCurrency(controlData.summary.totalAvailable, baseCurrency)}
              </p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 font-mono">
                Disponible = Presupuesto − Real − Comprometido
              </p>
            </div>

            <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm dark:shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Consumo Global
                </span>
                {getGaugeBadge(
                  controlData.summary.overallGaugeStatus,
                  controlData.summary.overallConsumptionPercentage,
                )}
              </div>
              <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 font-mono mt-2">
                {controlData.summary.overallConsumptionPercentage}%
              </p>
              <div className="w-full bg-slate-100 dark:bg-slate-950 rounded-full h-2 mt-2 overflow-hidden border border-slate-200/50 dark:border-slate-800">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${getProgressBarColor(
                    controlData.summary.overallGaugeStatus,
                  )}`}
                  style={{
                    width: `${Math.min(100, controlData.summary.overallConsumptionPercentage)}%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Formula Context Banner */}
          <div className="flex items-center space-x-2.5 px-4 py-3 bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 rounded-2xl text-xs text-indigo-700 dark:text-indigo-300">
            <Info className="w-4 h-4 shrink-0 text-indigo-500" />
            <span>
              <strong>Fórmula de Disponibilidad:</strong> Saldo Disponible = Presupuestado Total −
              Ejecutado Real − Comprometido. Los límites operan en tiempo real vinculados al libro
              mayor y cuentas patrimoniales.
            </span>
          </div>

          {/* 4 Executive Financial Blocks */}
          <div className="space-y-6">
            {activeSections.map((section) => {
              const isIncome = section.sectionKey === BudgetMatrixSectionKey.INGRESOS;
              const isBalanceSection =
                section.sectionKey === BudgetMatrixSectionKey.AHORRO_INVERSIONES ||
                section.sectionKey === BudgetMatrixSectionKey.DEUDAS_FINANCIACION ||
                section.sectionKey === BudgetMatrixSectionKey.FINANCIAMIENTO_AHORRO ||
                section.sectionKey === 'FINANCIAMIENTO_AHORRO';
              return (
                <div
                  key={section.sectionKey}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm dark:shadow-lg"
                >
                  {/* Section Header */}
                  <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex items-center space-x-3">
                      <div
                        className={`p-2 rounded-xl border ${getSectionColorClass(
                          section.sectionKey,
                        )}`}
                      >
                        {getSectionIcon(section.sectionKey)}
                      </div>
                      <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                        {section.sectionTitle}
                      </h3>
                      {getGaugeBadge(section.gaugeStatus, section.consumptionPercentage, isIncome)}
                    </div>

                    <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs font-mono">
                      <span className="text-slate-500 dark:text-slate-400">
                        Presupuesto:{' '}
                        <strong className="text-slate-800 dark:text-slate-200 font-semibold">
                          {formatCurrency(section.budgeted, baseCurrency)}
                        </strong>
                      </span>
                      <span className="text-slate-500 dark:text-slate-400">
                        Ejecutado:{' '}
                        <strong className="text-slate-800 dark:text-slate-200 font-semibold">
                          {formatCurrency(section.executed, baseCurrency)}
                        </strong>
                      </span>
                      <span className="text-slate-500 dark:text-slate-400">
                        Disponible:{' '}
                        <strong
                          className={
                            section.available >= 0
                              ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                              : 'text-rose-600 dark:text-rose-400 font-semibold'
                          }
                        >
                          {formatCurrency(section.available, baseCurrency)}
                        </strong>
                      </span>
                    </div>
                  </div>

                  {/* Account Items Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-100 dark:bg-slate-900/80 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                        <tr>
                          <th className="p-3.5">Cuenta / Concepto</th>
                          {isBalanceSection && (
                            <th className="p-3.5 text-center">Dirección Flujo</th>
                          )}
                          <th className="p-3.5 text-right">Presupuestado</th>
                          <th className="p-3.5 text-right">Ejecutado</th>
                          <th className="p-3.5 text-right">Disponible</th>
                          <th className="p-3.5 min-w-[200px]">Indicador de Consumo (%)</th>
                          <th className="p-3.5 text-center w-16">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
                        {section.items.length === 0 ? (
                          <tr>
                            <td
                              colSpan={isBalanceSection ? 7 : 6}
                              className="p-6 text-center text-slate-400 dark:text-slate-500 font-sans"
                            >
                              No hay cuentas presupuestadas en esta sección para este periodo.
                            </td>
                          </tr>
                        ) : (
                          section.items.map((item, idx) => {
                            const isItemOutflow =
                              item.cashFlowDirection === CashFlowDirection.EGRESO_EFECTIVO;
                            const canTransferFrom = item.available > 0 && !controlData?.isLocked;

                            return (
                              <tr
                                key={`${item.accountId}_${item.subRowId || idx}`}
                                className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                              >
                                <td className="p-3.5 font-sans font-medium text-slate-800 dark:text-slate-200">
                                  {item.accountName}
                                </td>
                                {isBalanceSection && (
                                  <td className="p-3.5 text-center font-sans">
                                    {isItemOutflow ? (
                                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                                        <TrendingDown className="w-3 h-3" />
                                        <span>(-) Salida</span>
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                        <TrendingUp className="w-3 h-3" />
                                        <span>(+) Entrada</span>
                                      </span>
                                    )}
                                  </td>
                                )}
                                <td className="p-3.5 text-right text-slate-700 dark:text-slate-300">
                                  {formatCurrency(item.budgeted, baseCurrency)}
                                </td>
                                <td className="p-3.5 text-right text-slate-700 dark:text-slate-300">
                                  {formatCurrency(item.executed, baseCurrency)}
                                </td>
                                <td
                                  className={`p-3.5 text-right font-bold ${
                                    item.available >= 0
                                      ? 'text-emerald-600 dark:text-emerald-400'
                                      : 'text-rose-600 dark:text-rose-400'
                                  }`}
                                >
                                  {formatCurrency(item.available, baseCurrency)}
                                </td>
                                <td className="p-3.5">
                                  <div className="flex items-center space-x-3">
                                    <div className="flex-1 bg-slate-100 dark:bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-200/50 dark:border-slate-800">
                                      <div
                                        className={`h-full rounded-full transition-all duration-300 ${getProgressBarColor(
                                          item.gaugeStatus,
                                          !isItemOutflow,
                                        )}`}
                                        style={{
                                          width: `${Math.min(100, item.consumptionPercentage)}%`,
                                        }}
                                      />
                                    </div>
                                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 w-12 text-right">
                                      {item.consumptionPercentage}%
                                    </span>
                                  </div>
                                </td>
                                <td className="p-3.5 text-center font-sans">
                                  {canTransferFrom ? (
                                    <button
                                      onClick={() => handleOpenTransferModal(item.accountId)}
                                      title="Reasignar disponible de esta cuenta"
                                      className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition cursor-pointer min-h-[36px] min-w-[36px] inline-flex items-center justify-center"
                                    >
                                      <ArrowLeftRight className="w-4 h-4" />
                                    </button>
                                  ) : (
                                    <span className="text-slate-300 dark:text-slate-700">-</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : periods.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm text-center space-y-4 max-w-lg mx-auto">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 rounded-2xl text-indigo-500">
            <Calendar className="w-8 h-8" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">
              No hay períodos contables registrados
            </h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
              Crea un ejercicio fiscal y registra períodos contables para habilitar el control
              ejecutivo de ejecución presupuestaria.
            </p>
          </div>
          <a
            href="/periods"
            className="inline-flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
          >
            <span>Ir a Períodos Contables</span>
          </a>
        </div>
      ) : (
        <div className="flex items-center justify-center p-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
          <span className="text-xs text-slate-400">
            Seleccione un periodo para visualizar el control de ejecución.
          </span>
        </div>
      )}

      {/* Transfer Modal */}
      {isTransferModalOpen && selectedPeriodId && controlData && (
        <BudgetTransferModal
          periodId={selectedPeriodId}
          sections={controlData.sections}
          categories={controlData.categories}
          initialSourceAccountId={transferSourceAccountId}
          baseCurrency={baseCurrency}
          isOpen={isTransferModalOpen}
          onClose={() => {
            setIsTransferModalOpen(false);
            setTransferSourceAccountId(undefined);
          }}
          onSuccess={async () => {
            setIsTransferModalOpen(false);
            setTransferSourceAccountId(undefined);
            await fetchControlData();
          }}
        />
      )}
    </div>
  );
}
