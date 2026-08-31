'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../../services/api';
import { PeriodResponse } from '@sistema-contable/shared';
import {
  Plus,
  Calendar,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';

const MONTH_NAMES = [
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

function formatPeriodLabel(periodName: string): string {
  if (!periodName || !periodName.includes('-')) return periodName;
  const [yearStr, monthStr] = periodName.split('-');
  const monthIdx = parseInt(monthStr, 10) - 1;
  if (monthIdx >= 0 && monthIdx < 12) {
    return `${MONTH_NAMES[monthIdx]} ${yearStr}`;
  }
  return periodName;
}

export default function PeriodsPage() {
  const [periods, setPeriods] = useState<PeriodResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modal State for Ensure Period
  const [showEnsureModal, setShowEnsureModal] = useState(false);
  const currentMonthString = new Date().toISOString().substring(0, 7);
  const [targetMonth, setTargetMonth] = useState(currentMonthString);

  // Accordion state: Set of expanded year strings
  const [expandedYears, setExpandedYears] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadData(true);
  }, []);

  // Group periods by Year (e.g. "2026")
  const periodsByYear = useMemo(() => {
    const groups: Record<string, PeriodResponse[]> = {};
    for (const p of periods) {
      const year = p.startDate ? p.startDate.substring(0, 4) : p.name.substring(0, 4);
      if (!groups[year]) {
        groups[year] = [];
      }
      groups[year].push(p);
    }
    // Sort each group by startDate ascending
    for (const year of Object.keys(groups)) {
      groups[year].sort((a, b) => a.startDate.localeCompare(b.startDate));
    }
    return groups;
  }, [periods]);

  const years = useMemo(() => {
    return Object.keys(periodsByYear).sort((a, b) => b.localeCompare(a));
  }, [periodsByYear]);

  // Expand the latest year by default
  useEffect(() => {
    if (years.length > 0) {
      setExpandedYears((prev) => {
        if (Object.keys(prev).length === 0) {
          const currentYear = new Date().getFullYear().toString();
          const target = years.includes(currentYear) ? currentYear : years[0];
          return { [target]: true };
        }
        return prev;
      });
    }
  }, [years]);

  const toggleYear = (year: string) => {
    setExpandedYears((prev) => ({
      ...prev,
      [year]: !prev[year],
    }));
  };

  const loadData = async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      setError('');
      const data = await api.periods.list();
      setPeriods(data || []);
    } catch (err: any) {
      setError(err.message || 'Error al cargar la información de períodos.');
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  const handleEnsurePeriod = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!targetMonth) {
      setError('Debe seleccionar un mes válido.');
      return;
    }

    try {
      setActionLoading(true);
      setError('');
      setSuccess('');

      const res = await api.periods.ensure(targetMonth);
      setSuccess(`Período ${formatPeriodLabel(res.name)} asegurado y disponible.`);
      setShowEnsureModal(false);

      // Auto expand the year of the ensured period
      const year = res.name.substring(0, 4);
      setExpandedYears((prev) => ({ ...prev, [year]: true }));

      await loadData(false);
    } catch (err: any) {
      setError(err.message || 'Error al asegurar el período contable.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReconstructBalances = async () => {
    if (
      !confirm(
        '¿Está seguro de reconstruir los saldos acumulados de todas las cuentas? Esto recalculará la continuidad histórica período por período.',
      )
    ) {
      return;
    }

    try {
      setActionLoading(true);
      setError('');
      setSuccess('');
      await api.reports.reconstructBalances();
      setSuccess('Saldos contables continuos reconstruidos con éxito.');
      await loadData(false);
    } catch (err: any) {
      setError(err.message || 'Error al reconstruir saldos.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <span className="text-xs text-slate-400 font-semibold">Cargando períodos contables...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-800 dark:text-slate-100">
            Períodos Contables
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Línea temporal continua de meses contables y control de bloqueos
          </p>
        </div>

        <div className="flex gap-2.5">
          <button
            onClick={handleReconstructBalances}
            disabled={actionLoading}
            className="flex items-center justify-center gap-1.5 py-2 px-3.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs transition duration-150 cursor-pointer"
            title="Recalcula el histórico continuo de saldos mes a mes"
          >
            <RefreshCw className={`w-4 h-4 ${actionLoading ? 'animate-spin' : ''}`} />
            <span>Reconstruir Saldos</span>
          </button>

          <button
            onClick={() => {
              setTargetMonth(currentMonthString);
              setShowEnsureModal(true);
            }}
            className="flex items-center gap-1.5 py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-md shadow-indigo-500/10 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Asegurar Período</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3.5 text-xs text-red-700 bg-red-50 dark:bg-red-950/30 dark:text-red-400 rounded-2xl border border-red-200 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-3.5 text-xs text-green-700 bg-green-50 dark:bg-green-950/30 dark:text-green-400 rounded-2xl border border-green-200 flex items-start gap-2.5">
          <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Main List of Periods Grouped by Year */}
      {periods.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm text-center space-y-4 max-w-lg mx-auto">
          <Calendar className="w-12 h-12 text-slate-300 dark:text-slate-500 mx-auto" />
          <div>
            <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">
              No hay períodos contables inicializados
            </h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
              El sistema genera períodos mensuales automáticamente al registrar transacciones o
              presupuestos. También puede asegurar el período actual directamente.
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleEnsurePeriod()}
            disabled={actionLoading}
            className="w-full max-w-xs py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer"
          >
            Asegurar Período Actual ({formatPeriodLabel(currentMonthString)})
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {years.map((year) => {
            const yearPeriods = periodsByYear[year] || [];
            const isExpanded = !!expandedYears[year];

            return (
              <div
                key={year}
                className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-3xl shadow-sm overflow-hidden"
              >
                {/* Year Header */}
                <div
                  onClick={() => toggleYear(year)}
                  className="p-4 sm:p-5 flex justify-between items-center bg-slate-50/70 dark:bg-slate-900/40 hover:bg-slate-100/60 dark:hover:bg-slate-900/70 transition duration-150 cursor-pointer select-none"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-slate-400 dark:text-slate-500 shrink-0">
                      {isExpanded ? (
                        <ChevronDown className="w-5 h-5 text-indigo-600 dark:text-indigo-400 transition-transform duration-200" />
                      ) : (
                        <ChevronRight className="w-5 h-5 transition-transform duration-200" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2.5">
                        <h3 className="font-extrabold text-slate-800 dark:text-slate-200 text-base">
                          Año {year}
                        </h3>
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 tabular-nums">
                          {yearPeriods.length} {yearPeriods.length === 1 ? 'mes' : 'meses'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Monthly Periods List */}
                {isExpanded && (
                  <div className="border-t border-slate-100 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700">
                    {yearPeriods.map((period) => (
                      <div
                        key={period.id}
                        className="flex items-center justify-between p-3.5 sm:px-6 hover:bg-slate-50/80 dark:hover:bg-slate-700/40 transition-colors"
                      >
                        <div className="flex items-center gap-3.5">
                          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
                            <Calendar className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-extrabold text-xs text-slate-800 dark:text-slate-200">
                                {formatPeriodLabel(period.name)}
                              </p>
                              <span className="text-xs text-slate-400 dark:text-slate-500 font-medium tabular-nums">
                                ({period.name})
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 font-medium tabular-nums">
                              {period.startDate} al {period.endDate}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-full text-2xs font-bold bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40">
                            Continuo
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ENSURE PERIOD MODAL */}
      {showEnsureModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 w-full max-w-md shadow-xl border border-slate-100 dark:border-slate-700 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-2.5 mb-2">
              <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h3 className="font-extrabold text-slate-800 dark:text-slate-200 text-base">
                Asegurar Período Contable
              </h3>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 mb-4 leading-relaxed">
              Seleccione el mes a aprovisionar. Si existen meses intermedios faltantes, el sistema
              los creará automáticamente preservando la continuidad de saldos contables y
              presupuestos.
            </p>

            <form onSubmit={handleEnsurePeriod} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                  Mes Objetivo (AAAA-MM)
                </label>
                <input
                  type="month"
                  value={targetMonth}
                  onChange={(e) => setTargetMonth(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                  required
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEnsureModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs transition duration-150 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || !targetMonth}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition duration-150 disabled:opacity-50 cursor-pointer"
                >
                  {actionLoading ? 'Asegurando...' : 'Asegurar Período'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {actionLoading && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 flex flex-col items-center max-w-xs shadow-xl border border-slate-100 dark:border-slate-700 text-center space-y-4">
            <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            <div>
              <p className="font-extrabold text-slate-800 dark:text-slate-200 text-sm">
                Procesando períodos contables...
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 font-semibold">
                Por favor espere un momento.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
