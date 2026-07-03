'use client';

import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import {
  Plus,
  Calendar,
  Lock,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

type Period = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: 'OPEN' | 'CLOSED';
};

type FiscalYear = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: 'OPEN' | 'CLOSED';
  periods?: Period[];
};

type Account = {
  id: string;
  name: string;
  type: string;
};

export default function PeriodsPage() {
  const [fiscalYears, setFiscalYears] = useState<FiscalYear[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modal State for New Fiscal Year
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newFyYear, setNewFyYear] = useState(new Date().getFullYear());

  // Modal State for Closing Fiscal Year
  const [closingFy, setClosingFy] = useState<FiscalYear | null>(null);
  const [selectedEarningsAccountId, setSelectedEarningsAccountId] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      const [fyData, periodData, accountData] = await Promise.all([
        api.fiscalYears.list(),
        api.periods.list(),
        api.accounts.list(),
      ]);

      setFiscalYears(fyData || []);
      setPeriods(periodData || []);
      setAccounts(accountData || []);
    } catch (err: any) {
      setError(err.message || 'Error al cargar la información de períodos.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFiscalYear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFyYear) {
      setError('El año del ejercicio fiscal es obligatorio.');
      return;
    }

    try {
      setActionLoading(true);
      setError('');
      setSuccess('');

      const startDateISO = newFyYear + '-01-01';
      const endDateISO = newFyYear + '-12-31';

      await api.fiscalYears.create({
        year: Number(newFyYear),
        startDate: startDateISO,
        endDate: endDateISO,
      });

      setSuccess(`Ejercicio fiscal ${newFyYear} creado con éxito.`);
      setShowCreateModal(false);

      // Reset form
      setNewFyYear(new Date().getFullYear());

      await loadData();
    } catch (err: any) {
      setError(err.message || 'Error al crear el ejercicio fiscal.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCloseFiscalYearSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!closingFy || !selectedEarningsAccountId) {
      setError('Debe seleccionar una cuenta de Resultados Acumulados.');
      return;
    }

    try {
      setActionLoading(true);
      setError('');
      setSuccess('');

      await api.fiscalYears.close(closingFy.id, {
        retainedEarningsAccountId: selectedEarningsAccountId,
      });

      setSuccess(
        `El ejercicio fiscal "${closingFy.name}" ha sido cerrado con éxito. Se generó el asiento de cierre.`,
      );
      setClosingFy(null);
      setSelectedEarningsAccountId('');
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Error al cerrar el ejercicio fiscal.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReconstructBalances = async () => {
    if (
      !confirm(
        '¿Está seguro de reconstruir los saldos acumulados de todas las cuentas? Esto podría tardar unos segundos.',
      )
    ) {
      return;
    }

    try {
      setActionLoading(true);
      setError('');
      setSuccess('');
      await api.reports.reconstructBalances();
      setSuccess('Saldos contables reconstruidos con éxito.');
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Error al reconstruir saldos.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleTogglePeriod = async (periodId: string, currentStatus: 'OPEN' | 'CLOSED') => {
    try {
      setActionLoading(true);
      setError('');
      setSuccess('');
      const newStatus = currentStatus === 'OPEN' ? 'CLOSED' : 'OPEN';
      await api.periods.update(periodId, { status: newStatus });
      setSuccess(`Período actualizado a ${newStatus === 'OPEN' ? 'Abierto' : 'Cerrado'} con éxito.`);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Error al actualizar el estado del período.');
    } finally {
      setActionLoading(false);
    }
  };

  const equityAccounts = accounts.filter((acc) => acc.type === 'EQUITY');

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
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-800 dark:text-slate-100">
            Períodos y Ejercicios Fiscales
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-455 mt-0.5">
            Gestione años fiscales, cierres mensuales y bloqueos de transacciones
          </p>
        </div>

        <div className="flex gap-2.5">
          <button
            onClick={handleReconstructBalances}
            disabled={actionLoading}
            className="flex items-center justify-center gap-1.5 py-2 px-3.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-250 font-bold rounded-xl text-xs transition duration-150 cursor-pointer"
            title="Recalcula el histórico de saldos período por período"
          >
            <RefreshCw className={`w-4.5 h-4.5 ${actionLoading ? 'animate-spin' : ''}`} />
            <span>Reconstruir Saldos</span>
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 py-2 px-4 bg-indigo-600 hover:bg-indigo-750 text-white font-bold rounded-xl text-xs shadow-md shadow-indigo-500/10 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Crear Ejercicio</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3.5 text-xs text-red-700 bg-red-50 dark:bg-red-950/30 dark:text-red-400 rounded-2xl border border-red-150 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-3.5 text-xs text-green-700 bg-green-50 dark:bg-green-950/30 dark:text-green-400 rounded-2xl border border-green-150 flex items-start gap-2.5">
          <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Main List of Fiscal Years */}
      {fiscalYears.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm text-center space-y-4 max-w-lg mx-auto">
          <Calendar className="w-12 h-12 text-slate-350 dark:text-slate-550 mx-auto" />
          <div>
            <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">
              No hay ejercicios fiscales creados
            </h3>
            <p className="text-xs text-slate-450 dark:text-slate-550 mt-1 max-w-sm mx-auto leading-relaxed">
              Debe registrar un ejercicio fiscal (por ejemplo, el año actual) para que los períodos
              mensuales comiencen a registrar saldos acumulados.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="w-full max-w-xs py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer"
          >
            Crear Primer Ejercicio Fiscal
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {fiscalYears.map((fy) => {
            const filteredPeriodsForFy = periods.filter((p: any) => p.fiscalYearId === fy.id);

            return (
              <div
                key={fy.id}
                className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-3xl shadow-sm overflow-hidden"
              >
                {/* Fiscal Year Info Header */}
                <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-slate-50/50 dark:bg-slate-900/30">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-slate-800 dark:text-slate-150 text-base">
                        {fy.name}
                      </h3>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          fy.status === 'OPEN'
                            ? 'bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-400'
                            : 'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400'
                        }`}
                      >
                        {fy.status === 'OPEN' ? 'Abierto' : 'Cerrado'}
                      </span>
                    </div>
                    <p className="text-4xs font-semibold text-slate-400 dark:text-slate-550">
                      Rango:{' '}
                      {new Date(fy.startDate).toLocaleDateString('es-ES', { timeZone: 'UTC' })} al{' '}
                      {new Date(fy.endDate).toLocaleDateString('es-ES', { timeZone: 'UTC' })}
                    </p>
                  </div>

                  {fy.status === 'OPEN' && (
                    <button
                      onClick={() => setClosingFy(fy)}
                      disabled={actionLoading}
                      className="flex items-center gap-1.5 py-2 px-3.5 text-xs font-bold rounded-xl transition duration-150 bg-red-600 hover:bg-red-700 text-white cursor-pointer disabled:opacity-50"
                      title="Cerrar definitivamente el ejercicio y generar asiento de cierre"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>Cerrar Ejercicio</span>
                    </button>
                  )}
                </div>

                {/* Monthly Periods Grid */}
                <div className="p-5 sm:p-6">
                  <h4 className="text-3xs font-extrabold text-slate-450 dark:text-slate-550 uppercase tracking-widest mb-4">
                    Períodos Mensuales
                  </h4>

                  {filteredPeriodsForFy.length === 0 ? (
                    <p className="text-xs text-slate-450 italic">
                      No se encontraron meses en este ejercicio.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {filteredPeriodsForFy.map((period) => (
                        <div
                          key={period.id}
                          className="p-4 rounded-2xl border border-slate-100 dark:border-slate-750 bg-white dark:bg-slate-800 flex flex-col justify-between h-28"
                        >
                          <div>
                            <p className="font-extrabold text-xs text-slate-700 dark:text-slate-300">
                              {period.name}
                            </p>
                            <p className="text-[10px] text-slate-400 dark:text-slate-550 mt-0.5">
                              {new Date(period.startDate).toLocaleDateString('es-ES', {
                                month: 'short',
                                year: 'numeric',
                                timeZone: 'UTC',
                              })}
                            </p>
                          </div>
                          <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-50 dark:border-slate-700/50">
                            <span className={`text-[10px] font-bold ${period.status === 'OPEN' ? 'text-green-600 dark:text-green-400' : 'text-slate-450 dark:text-slate-500'}`}>
                              {period.status === 'OPEN' ? 'Abierto' : 'Cerrado'}
                            </span>
                            <button
                              onClick={() => handleTogglePeriod(period.id, period.status)}
                              disabled={actionLoading}
                              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                period.status === 'OPEN' ? 'bg-indigo-650' : 'bg-slate-200 dark:bg-slate-700'
                              }`}
                            >
                              <span
                                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                  period.status === 'OPEN' ? 'translate-x-4' : 'translate-x-0'
                                }`}
                              />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE FISCAL YEAR MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 w-full max-w-md shadow-xl border border-slate-100 dark:border-slate-700 animate-in zoom-in-95 duration-200">
            <h3 className="font-extrabold text-slate-800 dark:text-slate-150 text-base mb-2">
              Crear Nuevo Ejercicio Fiscal
            </h3>
            <p className="text-3xs text-slate-400 dark:text-slate-550 mb-4">
              Se creará el año fiscal seleccionado junto con sus 12 períodos mensuales para
              registrar balances contables.
            </p>

            <form onSubmit={handleCreateFiscalYear} className="space-y-4">
              <div>
                <label className="block text-3xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                  Año del Ejercicio
                </label>
                <select
                  value={newFyYear}
                  onChange={(e) => setNewFyYear(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  {Array.from({ length: 11 }, (_, i) => new Date().getFullYear() - 5 + i).map(
                    (y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ),
                  )}
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs transition duration-150"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-750 text-white font-bold rounded-xl text-xs transition duration-150 disabled:opacity-50"
                >
                  {actionLoading ? 'Creando...' : 'Crear Ejercicio'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CLOSE FISCAL YEAR MODAL */}
      {closingFy && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 w-full max-w-md shadow-xl border border-slate-100 dark:border-slate-700 animate-in zoom-in-95 duration-200">
            <h3 className="font-extrabold text-slate-800 dark:text-slate-150 text-base mb-2">
              Cierre de Ejercicio: {closingFy.name}
            </h3>

            <div className="p-3 bg-amber-50 dark:bg-amber-955/20 border border-amber-250 rounded-2xl flex items-start gap-2.5 mb-4 text-amber-700 dark:text-amber-400">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="text-[10px] leading-normal font-semibold">
                Este proceso es <strong>definitivo</strong> e irreversible. Se generará un asiento
                de cierre que reseteará a cero las cuentas temporales de Ingresos y Gastos, y
                registrará la utilidad o pérdida del ejercicio en la cuenta de Resultados
                Acumulados.
              </p>
            </div>

            <form onSubmit={handleCloseFiscalYearSubmit} className="space-y-4">
              <div>
                <label className="block text-3xs font-bold text-slate-500 dark:text-slate-455 uppercase tracking-wider mb-1">
                  Cuenta de Resultados Acumulados
                </label>

                {equityAccounts.length === 0 ? (
                  <div className="text-4xs font-semibold text-red-500 bg-red-50 dark:bg-red-950/20 p-3 rounded-xl border border-red-100">
                    No se encontró ninguna cuenta de tipo <strong>Patrimonio Neto (EQUITY)</strong>.
                    Cree una cuenta de patrimonio primero.
                  </div>
                ) : (
                  <select
                    required
                    value={selectedEarningsAccountId}
                    onChange={(e) => setSelectedEarningsAccountId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="" disabled>
                      Seleccione una cuenta de Patrimonio...
                    </option>
                    {equityAccounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setClosingFy(null);
                    setSelectedEarningsAccountId('');
                  }}
                  className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs transition duration-150"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || !selectedEarningsAccountId}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs transition duration-150 disabled:opacity-50"
                >
                  {actionLoading ? 'Cerrando...' : 'Confirmar Cierre'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {actionLoading && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex flex-col items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 flex flex-col items-center max-w-xs shadow-xl border border-slate-100 dark:border-slate-700 text-center space-y-4">
            <div className="w-10 h-10 border-4 border-indigo-550 border-t-transparent rounded-full animate-spin"></div>
            <div>
              <p className="font-extrabold text-slate-800 dark:text-slate-150 text-sm">
                Actualizando saldos históricos...
              </p>
              <p className="text-4xs text-slate-400 dark:text-slate-550 mt-1 font-semibold">
                Por favor espere mientras se recalcula la contabilidad.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
