'use client';

import React, { useState, useEffect } from 'react';
import { api } from '../../../services/api';
import AccountModal from '../../../components/AccountModal';
import AdjustBalanceModal from '../../../components/AdjustBalanceModal';
import {
  ArrowLeft,
  Plus,
  Check,
  AlertTriangle,
  RotateCcw,
  Pencil,
  SlidersHorizontal,
} from 'lucide-react';
import Link from 'next/link';
import { formatCurrency } from '../../../lib/utils';
import { useSearch } from '../../../lib/search-context';
import { AccountStatus } from '@sistema-contable/shared';

interface AccountSummary {
  id: string;
  name: string;
  type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE';
  balance: number;
  currencyCode?: string;
  currencySymbol?: string;
  decimalPlaces?: number;
  parentId?: string | null;
  status?: 'ACTIVE' | 'INACTIVE';
  systemRole?: string | null;
}

export default function AccountsManagePage() {
  const { searchQuery } = useSearch();
  const [accounts, setAccounts] = useState<AccountSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [suggestedDeactivateId, setSuggestedDeactivateId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [accountToEdit, setAccountToEdit] = useState<AccountSummary | null>(null);
  const [accountToAdjust, setAccountToAdjust] = useState<AccountSummary | null>(null);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      setError('');
      setSuggestedDeactivateId(null);
      const data = await api.accounts.summary();
      setAccounts(data?.accounts || []);
    } catch (err: any) {
      setError(err.message || 'Error al cargar las cuentas.');
    } finally {
      setLoading(false);
    }
  };

  const handleReactivate = async (id: string) => {
    setUpdatingId(id);
    setError('');
    setSuggestedDeactivateId(null);
    try {
      await api.accounts.update(id, { status: AccountStatus.ACTIVE });
      await fetchAccounts();
    } catch (err: any) {
      setError(err.message || 'Error al reactivar la cuenta.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDeactivate = async (id: string) => {
    if (
      typeof window !== 'undefined' &&
      !window.confirm('¿Está seguro de que desea desactivar esta cuenta?')
    ) {
      return;
    }
    setUpdatingId(id);
    setError('');
    setSuggestedDeactivateId(null);
    try {
      await api.accounts.update(id, { status: AccountStatus.INACTIVE });
      await fetchAccounts();
    } catch (err: any) {
      const isProtected =
        err.status === 400 ||
        /deactivate|desactivar|existing transactions|movimientos|historial/i.test(
          err.message || '',
        );
      if (isProtected) {
        setSuggestedDeactivateId(id);
        setError(
          err.message ||
            'Esta cuenta tiene movimientos contables históricos y no puede eliminarse físicamente. Puede desactivarla para restringir nuevas operaciones.',
        );
      } else {
        setError(err.message || 'Error al desactivar la cuenta.');
      }
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <span className="text-xs text-slate-400 font-semibold">Cargando gestor...</span>
      </div>
    );
  }

  const filteredAccounts = accounts.filter((a) => {
    if (!searchQuery.trim()) return true;
    return a.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const accountMap = new Map<string, string>();
  accounts.forEach((acc) => accountMap.set(acc.id, acc.name));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center space-x-3.5">
          <Link
            href="/accounts"
            className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 text-slate-600 hover:text-slate-800 dark:hover:text-slate-200 transition hover:bg-slate-50 shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-800 dark:text-slate-100">
              Administración de Rubros
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Administrar catálogos de cuentas y categorías
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-md shadow-indigo-500/10 transition"
        >
          <Plus className="w-4 h-4" />
          <span>Nuevo Rubro</span>
        </button>
      </div>

      {error && (
        <div className="p-3.5 text-xs text-red-700 bg-red-50 dark:bg-red-950/30 dark:text-red-400 rounded-2xl border border-red-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
          {suggestedDeactivateId && (
            <button
              onClick={() => handleDeactivate(suggestedDeactivateId)}
              className="self-start sm:self-auto shrink-0 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-3xs transition shadow-sm"
            >
              Desactivar cuenta
            </button>
          )}
        </div>
      )}

      {/* Grid List */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider">
              <th className="p-4">Nombre</th>
              <th className="p-4">Tipo</th>
              <th className="p-4 text-right">Saldo</th>
              <th className="p-4 text-center">Estado</th>
              <th className="p-4 text-center">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700 font-medium">
            {filteredAccounts.map((a) => {
              const isInactive = a.status === 'INACTIVE';
              const parentName = a.parentId
                ? accountMap.get(a.parentId) || a.parentId.substring(0, 8)
                : null;
              return (
                <tr
                  key={a.id}
                  className={`hover:bg-slate-50/50 dark:hover:bg-slate-700/20 transition ${
                    isInactive ? 'opacity-60 bg-slate-50/20 dark:bg-slate-900/10' : ''
                  }`}
                >
                  <td className="p-4">
                    <span className="font-bold text-slate-800 dark:text-slate-200">{a.name}</span>
                    {parentName && (
                      <span className="block text-4xs text-slate-400 dark:text-slate-500 font-normal mt-0.5">
                        Subcategoría de: {parentName}
                      </span>
                    )}
                  </td>
                  <td className="p-4">
                    <span className="text-3xs font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 px-2 py-0.5 rounded-md">
                      {a.type}
                    </span>
                  </td>
                  <td className="p-4 text-right font-extrabold">
                    {formatCurrency(a.balance, {
                      code: a.currencyCode,
                      symbol: a.currencySymbol,
                      decimalPlaces: a.decimalPlaces,
                    })}
                  </td>
                  <td className="p-4 text-center">
                    {isInactive ? (
                      <span className="inline-flex items-center gap-1 text-red-500 font-bold text-3xs uppercase tracking-wider bg-red-50 dark:bg-red-950/20 px-2 py-0.5 rounded-full">
                        Inactiva
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400 font-bold text-3xs uppercase tracking-wider bg-green-50 dark:bg-green-950/20 px-2 py-0.5 rounded-full">
                        <Check className="w-3 h-3" />
                        Activa
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex items-center justify-center gap-1.5 flex-wrap">
                      {!a.systemRole &&
                        !isInactive &&
                        (a.type === 'ASSET' || a.type === 'LIABILITY') && (
                          <button
                            onClick={() => setAccountToAdjust(a)}
                            className="text-3xs font-bold py-1 px-2.5 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded-lg transition inline-flex items-center gap-1"
                          >
                            <SlidersHorizontal className="w-3 h-3 text-indigo-500" />
                            <span>Modificar Saldo</span>
                          </button>
                        )}
                      {!a.systemRole && (
                        <button
                          onClick={() => {
                            setAccountToEdit(a);
                            setShowAddModal(true);
                          }}
                          className="text-3xs font-bold py-1 px-2.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition inline-flex items-center gap-1"
                        >
                          <Pencil className="w-3 h-3 text-slate-400" />
                          <span>Editar</span>
                        </button>
                      )}
                      {a.systemRole ? (
                        <span
                          className="text-3xs text-slate-400 font-bold"
                          title="Cuenta especial reservada por el sistema"
                        >
                          Sistema
                        </span>
                      ) : isInactive ? (
                        <button
                          onClick={() => handleReactivate(a.id)}
                          disabled={updatingId === a.id}
                          className="text-3xs font-bold py-1 px-3 border border-emerald-200 dark:border-emerald-900 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-lg transition inline-flex items-center gap-1 disabled:opacity-50"
                        >
                          {updatingId === a.id ? (
                            <span className="w-3 h-3 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <RotateCcw className="w-3 h-3" />
                          )}
                          <span>Reactivar</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleDeactivate(a.id)}
                          disabled={updatingId === a.id}
                          className="text-3xs font-bold py-1 px-3 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition inline-flex items-center gap-1 disabled:opacity-50"
                        >
                          {updatingId === a.id ? (
                            <span className="w-3 h-3 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                          ) : null}
                          <span>Desactivar</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {filteredAccounts.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-500 dark:text-slate-400">
                  No se encontraron cuentas que coincidan con &quot;{searchQuery}&quot;
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showAddModal && (
        <AccountModal
          onClose={() => {
            setShowAddModal(false);
            setAccountToEdit(null);
          }}
          onSuccess={fetchAccounts}
          parentCandidates={accounts}
          accountToEdit={
            accountToEdit
              ? {
                  id: accountToEdit.id,
                  name: accountToEdit.name,
                  type: accountToEdit.type,
                }
              : undefined
          }
        />
      )}

      {/* Adjust Balance Modal */}
      {accountToAdjust && (
        <AdjustBalanceModal
          isOpen={!!accountToAdjust}
          onClose={() => setAccountToAdjust(null)}
          onSuccess={fetchAccounts}
          account={accountToAdjust}
          allAccounts={accounts}
        />
      )}
    </div>
  );
}
