'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../services/api';
import AccountsList, { AccountSummary } from '../../components/AccountsList';
import AccountModal from '../../components/AccountModal';
import AdjustBalanceModal from '../../components/AdjustBalanceModal';
import {
  Plus,
  Wallet,
  ShieldAlert,
  BadgeAlert,
  Eye,
  EyeOff,
  Briefcase,
  Tags,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { formatCurrency } from '../../lib/utils';
import { useSearch } from '../../lib/search-context';
import { AccountStatus } from '@sistema-contable/shared';

type SummaryData = {
  netWorth: number;
  totalAssets: number;
  totalLiabilities: number;
  accounts: AccountSummary[];
};

export default function AccountsPage() {
  const router = useRouter();
  const { searchQuery } = useSearch();
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [currencies, setCurrencies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deactivateSuggestedId, setDeactivateSuggestedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [accountToEdit, setAccountToEdit] = useState<AccountSummary | null>(null);
  const [accountToAdjust, setAccountToAdjust] = useState<AccountSummary | null>(null);
  const [subaccountParent, setSubaccountParent] = useState<AccountSummary | null>(null);
  const [activeTab, setActiveTab] = useState<'FINANCIAL' | 'CATEGORIES'>('FINANCIAL');
  const [showInactive, setShowInactive] = useState(false);
  const [deletingId, setDeletingId] = useState('');
  const [reactivatingId, setReactivatingId] = useState('');
  const [deactivatingId, setDeactivatingId] = useState('');

  useEffect(() => {
    loadSummary();
  }, []);

  const loadSummary = async () => {
    try {
      setLoading(true);
      setError('');
      setDeactivateSuggestedId(null);
      const [data, curs] = await Promise.all([api.accounts.summary(), api.currencies.list()]);
      setSummary(data);
      setCurrencies(curs || []);
    } catch (err: any) {
      setError(err.message || 'Error al cargar resumen de cuentas.');
    } finally {
      setLoading(false);
    }
  };

  const handleReactivateAccount = async (id: string) => {
    setReactivatingId(id);
    setError('');
    setDeactivateSuggestedId(null);
    try {
      await api.accounts.update(id, { status: AccountStatus.ACTIVE });
      await loadSummary();
    } catch (err: any) {
      setError(err.message || 'Error al reactivar la cuenta.');
    } finally {
      setReactivatingId('');
    }
  };

  const handleDeactivateAccount = async (id: string) => {
    setDeactivatingId(id);
    setError('');
    setDeactivateSuggestedId(null);
    try {
      await api.accounts.update(id, { status: AccountStatus.INACTIVE });
      await loadSummary();
    } catch (err: any) {
      setError(err.message || 'Error al desactivar la cuenta.');
    } finally {
      setDeactivatingId('');
    }
  };

  const handleDeleteAccount = async (id: string) => {
    if (!confirm('¿Está seguro de que desea eliminar permanentemente esta cuenta?')) {
      return;
    }
    setSaving(true);
    setDeletingId(id);
    setError('');
    setDeactivateSuggestedId(null);
    try {
      await api.accounts.delete(id);
      alert('La cuenta ha sido eliminada con éxito.');
      loadSummary();
    } catch (err: any) {
      const isProtected =
        err.status === 400 ||
        /deactivate|desactivar|existing transactions|movimientos|historial/i.test(
          err.message || '',
        );
      if (isProtected) {
        setDeactivateSuggestedId(id);
        setError(
          'Esta cuenta posee asientos históricos registrados y no puede eliminarse físicamente para proteger la integridad contable. Puede desactivarla para restringir nuevas operaciones.',
        );
      } else {
        setError(err.message || 'Error al eliminar la cuenta.');
      }
    } finally {
      setSaving(false);
      setDeletingId('');
    }
  };

  const handleCreateDefaultAccounts = async () => {
    setSaving(true);
    setError('');
    try {
      const currencies = await api.currencies.list();
      const defaultCurrencyId =
        currencies?.find((c: any) => c.isBase)?.id || '00000000-0000-0000-0000-000000000000';

      const defaults = [
        { name: 'Efectivo', type: 'ASSET', isCashOrBank: true },
        { name: 'Cuenta Bancaria', type: 'ASSET', isCashOrBank: true },
        { name: 'Tarjeta de Crédito', type: 'LIABILITY', isCashOrBank: false },
        { name: 'Sueldo', type: 'INCOME', isCashOrBank: false },
        { name: 'Otros Ingresos', type: 'INCOME', isCashOrBank: false },
        { name: 'Comida', type: 'EXPENSE', isCashOrBank: false },
        { name: 'Transporte', type: 'EXPENSE', isCashOrBank: false },
        { name: 'Servicios', type: 'EXPENSE', isCashOrBank: false },
        { name: 'Ropa', type: 'EXPENSE', isCashOrBank: false },
      ];

      for (const item of defaults) {
        await api.accounts.create({
          name: item.name,
          type: item.type as any,
          currencyId: defaultCurrencyId,
          isCashOrBank: item.isCashOrBank,
        });
      }
      loadSummary();
    } catch (err: any) {
      setError(err.message || 'Error al generar cuentas por defecto.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleCashOrBank = async (id: string, isCashOrBank: boolean) => {
    setSaving(true);
    setError('');
    try {
      await api.accounts.update(id, { isCashOrBank });
      loadSummary();
    } catch (err: any) {
      setError(err.message || 'Error al actualizar tipo de cuenta líquida.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <span className="text-xs text-slate-400 font-semibold">Cargando saldos...</span>
      </div>
    );
  }

  const inactiveCount = summary?.accounts.filter((a) => a.status === 'INACTIVE').length || 0;

  const filteredAccounts =
    summary?.accounts.filter((a) => {
      // 1. Search Query Filter
      if (searchQuery.trim() && !a.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      // 2. Inactive Filter
      if (!showInactive && a.status === 'INACTIVE') {
        return false;
      }
      // 3. Tab Filter
      if (activeTab === 'CATEGORIES') {
        return a.type === 'INCOME' || a.type === 'EXPENSE';
      }
      return a.type === 'ASSET' || a.type === 'LIABILITY';
    }) || [];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-800 dark:text-slate-100">
            Cuentas y Rubros
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Saldos agregados de activos, pasivos y patrimonio
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {inactiveCount > 0 && (
            <button
              type="button"
              onClick={() => setShowInactive(!showInactive)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-3xs font-bold border transition ${
                showInactive
                  ? 'bg-slate-200 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-100'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 shadow-sm'
              }`}
            >
              {showInactive ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{showInactive ? 'Ocultar inactivas' : `Ver inactivas (${inactiveCount})`}</span>
            </button>
          )}

          <button
            onClick={() => {
              setAccountToEdit(null);
              setSubaccountParent(null);
              setShowAddModal(true);
            }}
            className="flex items-center gap-1.5 py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-md shadow-indigo-500/10 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Agregar</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3.5 text-xs text-red-700 bg-red-50 dark:bg-red-950/30 dark:text-red-400 rounded-2xl border border-red-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
          {deactivateSuggestedId && (
            <button
              onClick={() => handleDeactivateAccount(deactivateSuggestedId)}
              className="self-start sm:self-auto shrink-0 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-3xs transition shadow-sm"
            >
              Desactivar cuenta ahora
            </button>
          )}
        </div>
      )}

      {/* KPI Summary Cards Grid */}
      {(() => {
        const baseCurrency = currencies.find((c) => c.isBase) || {
          code: 'PYG',
          symbol: '₲',
          decimalPlaces: 0,
        };

        return (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Patrimonio Neto */}
            <div className="bg-gradient-to-tr from-indigo-600 to-indigo-700 text-white rounded-2xl p-5 shadow-sm relative overflow-hidden flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-3xs font-extrabold uppercase tracking-widest text-indigo-200">
                  Patrimonio Neto
                </span>
                <div className="w-7 h-7 rounded-lg bg-indigo-500/30 flex items-center justify-center">
                  <Wallet className="w-4 h-4 text-indigo-100" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-2xl font-bold tracking-tight tabular-nums">
                  {formatCurrency(summary?.netWorth || 0, baseCurrency)}
                </span>
                <p className="text-4xs text-indigo-200 mt-0.5">Activos menos Pasivos</p>
              </div>
            </div>

            {/* Total Activos */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-3xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  Total Activos
                </span>
                <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center">
                  <ArrowUpRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-2xl font-bold tracking-tight tabular-nums text-slate-800 dark:text-slate-100">
                  {formatCurrency(summary?.totalAssets || 0, baseCurrency)}
                </span>
                <p className="text-4xs text-emerald-600 dark:text-emerald-400 mt-0.5 font-semibold">
                  Bienes, bancos y efectivo
                </p>
              </div>
            </div>

            {/* Total Pasivos */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-3xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  Total Pasivos
                </span>
                <div className="w-7 h-7 rounded-lg bg-rose-50 dark:bg-rose-950/50 flex items-center justify-center">
                  <ArrowDownRight className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-2xl font-bold tracking-tight tabular-nums text-slate-800 dark:text-slate-100">
                  {formatCurrency(summary?.totalLiabilities || 0, baseCurrency)}
                </span>
                <p className="text-4xs text-rose-500 dark:text-rose-400 mt-0.5 font-semibold">
                  Deudas y obligaciones
                </p>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Tabs Filter Bar */}
      {summary && summary.accounts.length > 0 && (
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-700/80 pb-3">
          <button
            type="button"
            onClick={() => setActiveTab('FINANCIAL')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'FINANCIAL'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/20'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60 border border-slate-200/80 dark:border-slate-700'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>Cuentas de Dinero</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('CATEGORIES')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'CATEGORIES'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/20'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60 border border-slate-200/80 dark:border-slate-700'
            }`}
          >
            <Tags className="w-3.5 h-3.5" />
            <span>Categorías</span>
          </button>
        </div>
      )}

      {/* If no accounts exist */}
      {summary?.accounts.length === 0 && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm text-center space-y-4 max-w-lg mx-auto">
          <BadgeAlert className="w-10 h-10 text-amber-500 mx-auto" />
          <div>
            <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">
              No hay cuentas configuradas
            </h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
              Comienza generando un plan predeterminado de cuentas (Efectivo, Tarjetas, Sueldo,
              Comida, Transporte, etc.) con un solo clic.
            </p>
          </div>
          <button
            type="button"
            onClick={handleCreateDefaultAccounts}
            disabled={saving}
            className="w-full max-w-xs py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition disabled:opacity-50"
          >
            {saving ? 'Generando cuentas...' : 'Generar Cuentas Predeterminadas'}
          </button>
        </div>
      )}

      {/* Grouped Account Tables */}
      {summary &&
        summary.accounts.length > 0 &&
        (filteredAccounts.length > 0 ? (
          <AccountsList
            accounts={filteredAccounts}
            activeTab={activeTab}
            onDelete={handleDeleteAccount}
            deletingId={deletingId}
            onToggleCashOrBank={handleToggleCashOrBank}
            onReactivate={handleReactivateAccount}
            onDeactivate={handleDeactivateAccount}
            reactivatingId={reactivatingId}
            deactivatingId={deactivatingId}
            onAccountClick={(acc) => {
              router.push(`/transactions?accountId=${acc.id}`);
            }}
            onEdit={(acc) => {
              setAccountToEdit(acc);
              setShowAddModal(true);
            }}
            onAdjustBalance={(acc) => {
              setAccountToAdjust(acc);
            }}
            onAddSubaccount={(parent) => {
              setSubaccountParent(parent);
              setShowAddModal(true);
            }}
          />
        ) : (
          <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm">
            <p className="text-sm font-bold text-slate-600 dark:text-slate-300">
              No se encontraron cuentas que coincidan con &quot;{searchQuery}&quot;
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              Prueba buscando con otros términos o cambia de pestaña
            </p>
          </div>
        ))}

      {/* Account Add / Edit Modal */}
      {showAddModal && (
        <AccountModal
          onClose={() => {
            setShowAddModal(false);
            setAccountToEdit(null);
            setSubaccountParent(null);
          }}
          onSuccess={(created) => {
            loadSummary();
            if (created) {
              if (created.type === 'INCOME' || created.type === 'EXPENSE') {
                setActiveTab('CATEGORIES');
              } else if (
                created.type === 'ASSET' ||
                created.type === 'LIABILITY' ||
                created.type === 'EQUITY'
              ) {
                setActiveTab('FINANCIAL');
              }
            }
          }}
          parentCandidates={summary?.accounts || []}
          accountToEdit={
            accountToEdit
              ? {
                  id: accountToEdit.id,
                  name: accountToEdit.name,
                  type: accountToEdit.type,
                  isCashOrBank: accountToEdit.isCashOrBank,
                }
              : undefined
          }
          initialType={
            subaccountParent
              ? subaccountParent.type
              : activeTab === 'CATEGORIES'
                ? 'EXPENSE'
                : 'ASSET'
          }
          initialParentId={subaccountParent?.id}
        />
      )}

      {/* Adjust Balance Modal */}
      {accountToAdjust && (
        <AdjustBalanceModal
          isOpen={!!accountToAdjust}
          onClose={() => setAccountToAdjust(null)}
          onSuccess={loadSummary}
          account={accountToAdjust}
          allAccounts={summary?.accounts || []}
        />
      )}
    </div>
  );
}
