'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '../../../../services/api';
import {
  ArrowLeft,
  Save,
  Repeat,
  Trash2,
  Plus,
  Copy,
  ShieldAlert,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Scale,
} from 'lucide-react';

type BudgetItem = {
  accountId: string;
  accountName: string;
  accountType: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE';
  parentId: string | null;
  isCashOrBank: boolean;
  amount: number;
};

type BudgetDetail = {
  id: string;
  periodId: string;
  periodName: string;
  friendlyName: string;
  startDate: string;
  endDate: string;
  isLocked: boolean;
  items: BudgetItem[];
};

type TabType = 'INCOME' | 'EXPENSE' | 'BALANCE';

export default function EditBudgetPage() {
  const params = useParams();
  const router = useRouter();
  const periodId = params.periodId as string;

  const [budget, setBudget] = useState<BudgetDetail | null>(null);
  const [activeItems, setActiveItems] = useState<BudgetItem[]>([]);
  const [eligibleItems, setEligibleItems] = useState<BudgetItem[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('INCOME');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copying, setCopying] = useState(false);
  const [replicatingId, setReplicatingId] = useState<string | null>(null);

  const [selectedAccountIdToAdd, setSelectedAccountIdToAdd] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadBudget();
  }, [periodId]);

  const loadBudget = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await api.budgets.getByPeriod(periodId);
      setBudget(data);

      const allItems: BudgetItem[] = data.items || [];
      // Active items are those with a non-zero budget
      setActiveItems(allItems.filter((item) => item.amount !== 0));
      // Eligible items are those with a zero budget
      setEligibleItems(allItems.filter((item) => item.amount === 0));
    } catch (err: any) {
      setError(err.message || 'Error al cargar los detalles del presupuesto.');
    } finally {
      setLoading(false);
    }
  };

  const handleAmountChange = (accountId: string, amount: number) => {
    setActiveItems((prev) =>
      prev.map((item) => (item.accountId === accountId ? { ...item, amount } : item)),
    );
    setSuccess('');
  };

  const handleAssetDirectionChange = (
    accountId: string,
    direction: 'SAVE' | 'WITHDRAW',
    absVal: number,
  ) => {
    const amount = direction === 'SAVE' ? -Math.abs(absVal) : Math.abs(absVal);
    handleAmountChange(accountId, amount);
  };

  const handleLiabilityDirectionChange = (
    accountId: string,
    direction: 'PAY' | 'BORROW',
    absVal: number,
  ) => {
    const amount = direction === 'PAY' ? -Math.abs(absVal) : Math.abs(absVal);
    handleAmountChange(accountId, amount);
  };

  const handleAddItem = () => {
    if (!selectedAccountIdToAdd) return;

    const itemToAdd = eligibleItems.find((x) => x.accountId === selectedAccountIdToAdd);
    if (!itemToAdd) return;

    // Default amount: regular income/expense is 0, assets/liabilities default to negative (saving/repayment)
    let defaultAmount = 0;
    if (itemToAdd.accountType === 'ASSET' || itemToAdd.accountType === 'LIABILITY') {
      defaultAmount = -1000; // default starter value to prevent being cleaned immediately
    }

    const newItem = { ...itemToAdd, amount: defaultAmount };

    setActiveItems((prev) => [...prev, newItem]);
    setEligibleItems((prev) => prev.filter((x) => x.accountId !== selectedAccountIdToAdd));
    setSelectedAccountIdToAdd('');
    setSuccess('');
  };

  const handleDeleteItem = (accountId: string) => {
    const itemToDelete = activeItems.find((x) => x.accountId === accountId);
    if (!itemToDelete) return;

    setActiveItems((prev) => prev.filter((x) => x.accountId !== accountId));
    setEligibleItems((prev) => [...prev, { ...itemToDelete, amount: 0 }]);
    setSuccess('');
  };

  const handleSave = async () => {
    if (!budget) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      // Send active items only (non-zero budget limits)
      const payload = activeItems.map((item) => ({
        accountId: item.accountId,
        amount: item.amount,
      }));
      await api.budgets.updateItems(periodId, { items: payload });
      setSuccess('¡Presupuesto guardado con éxito!');
      loadBudget();
    } catch (err: any) {
      setError(err.message || 'Error al guardar el presupuesto.');
    } finally {
      setSaving(false);
    }
  };

  const handleCopyPrevious = async () => {
    if (!budget) return;
    setCopying(true);
    setError('');
    setSuccess('');
    try {
      const res = await api.budgets.copyPrevious(periodId);
      if (res.copiedCount > 0) {
        setSuccess(
          `¡Copiado con éxito! Se importaron ${res.copiedCount} partidas del mes anterior.`,
        );
      } else {
        setSuccess('No se encontraron partidas del mes anterior para copiar.');
      }
      loadBudget();
    } catch (err: any) {
      setError(err.message || 'Error al copiar el presupuesto del mes anterior.');
    } finally {
      setCopying(false);
    }
  };

  const handleReplicate = async (accountId: string, amount: number) => {
    setReplicatingId(accountId);
    setError('');
    setSuccess('');
    try {
      await api.budgets.replicate({
        periodId,
        accountId,
        amount,
      });
      setSuccess('¡Monto replicado a todo el Ejercicio Fiscal!');
      loadBudget();
    } catch (err: any) {
      setError(err.message || 'Error al replicar el monto.');
    } finally {
      setReplicatingId(null);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-24">
        <div className="w-10 h-10 border-4 border-indigo-650 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <span className="text-sm text-slate-500 font-semibold dark:text-slate-400">
          Cargando presupuesto...
        </span>
      </div>
    );
  }

  // Filter items based on active tab
  const getTabItems = () => {
    if (activeTab === 'INCOME') return activeItems.filter((x) => x.accountType === 'INCOME');
    if (activeTab === 'EXPENSE') return activeItems.filter((x) => x.accountType === 'EXPENSE');
    return activeItems.filter((x) => x.accountType === 'ASSET' || x.accountType === 'LIABILITY');
  };

  // Get eligible accounts for the active tab selector
  const getTabEligible = () => {
    if (activeTab === 'INCOME') return eligibleItems.filter((x) => x.accountType === 'INCOME');
    if (activeTab === 'EXPENSE') return eligibleItems.filter((x) => x.accountType === 'EXPENSE');
    return eligibleItems.filter((x) => x.accountType === 'ASSET' || x.accountType === 'LIABILITY');
  };

  const currentTabItems = getTabItems();
  const currentTabEligible = getTabEligible();

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header section */}
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800/80 shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-2xl hover:bg-slate-100 border border-slate-150/50 dark:border-slate-700 transition"
          >
            <ArrowLeft className="w-4 h-4 text-slate-650 dark:text-slate-350" />
          </button>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">
              Planificar Presupuesto
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Período:{' '}
              <span className="font-bold text-indigo-650 dark:text-indigo-400">
                {budget?.friendlyName}
              </span>{' '}
              ({budget?.startDate} al {budget?.endDate})
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleCopyPrevious}
            disabled={copying || budget?.isLocked}
            className="flex items-center justify-center gap-2 py-2.5 px-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-slate-700 dark:text-slate-200 font-bold rounded-2xl text-xs shadow-sm transition disabled:opacity-50"
          >
            <Copy className="w-3.5 h-3.5 text-slate-500" />
            <span>{copying ? 'Copiando...' : 'Copiar del anterior'}</span>
          </button>

          <button
            onClick={handleSave}
            disabled={saving || budget?.isLocked}
            className="flex items-center justify-center gap-2 py-2.5 px-5 bg-indigo-650 hover:bg-indigo-700 text-white font-bold rounded-2xl text-xs shadow-md shadow-indigo-650/10 hover:shadow-indigo-700/20 transition disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? 'Guardando...' : 'Guardar Presupuesto'}</span>
          </button>
        </div>
      </div>

      {/* Message alerts */}
      {error && (
        <div className="p-4 text-xs text-red-700 bg-red-50/80 dark:bg-red-950/20 dark:text-red-450 rounded-2xl border border-red-150/40 dark:border-red-900/30 flex items-start gap-3">
          <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 text-xs text-green-700 bg-green-50/85 dark:bg-green-950/20 dark:text-green-450 rounded-2xl border border-green-150/40 dark:border-green-900/30 flex items-start gap-3">
          <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {budget?.isLocked && (
        <div className="p-4 text-xs text-amber-700 bg-amber-50/80 dark:bg-amber-950/20 dark:text-amber-450 rounded-2xl border border-amber-150/40 dark:border-amber-900/30 flex items-start gap-3">
          <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
          <span>Este período está CERRADO y no admite cambios de presupuesto.</span>
        </div>
      )}

      {/* Tabs navigation */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-1">
        <button
          onClick={() => setActiveTab('INCOME')}
          className={`flex items-center gap-2 py-3 px-5 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'INCOME'
              ? 'border-indigo-650 text-indigo-650 dark:text-indigo-400 dark:border-indigo-400 font-extrabold'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-355'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Ingresos</span>
        </button>
        <button
          onClick={() => setActiveTab('EXPENSE')}
          className={`flex items-center gap-2 py-3 px-5 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'EXPENSE'
              ? 'border-indigo-650 text-indigo-650 dark:text-indigo-400 dark:border-indigo-400 font-extrabold'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-355'
          }`}
        >
          <TrendingDown className="w-4 h-4" />
          <span>Egresos</span>
        </button>
        <button
          onClick={() => setActiveTab('BALANCE')}
          className={`flex items-center gap-2 py-3 px-5 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'BALANCE'
              ? 'border-indigo-650 text-indigo-650 dark:text-indigo-400 dark:border-indigo-400 font-extrabold'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-355'
          }`}
        >
          <Scale className="w-4 h-4" />
          <span>Ahorros y Deudas</span>
        </button>
      </div>

      {/* Table grid */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800/80 shadow-sm overflow-hidden">
        {/* Table Head */}
        <div className="grid grid-cols-12 bg-slate-50 dark:bg-slate-850 px-6 py-3 border-b border-slate-100 dark:border-slate-800 text-[10px] uppercase tracking-wider font-extrabold text-slate-500">
          <div className="col-span-4 sm:col-span-5">Cuenta</div>
          <div className="col-span-5 sm:col-span-4 text-right">Monto Presupuestado</div>
          <div className="col-span-3 sm:col-span-3 text-right">Acciones</div>
        </div>

        {/* Table Body */}
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {currentTabItems.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-450 dark:text-slate-500">
              No hay partidas configuradas en esta categoría para este mes.
            </div>
          ) : (
            currentTabItems.map((item) => {
              const absVal = Math.abs(item.amount);

              return (
                <div
                  key={item.accountId}
                  className="grid grid-cols-12 items-center px-6 py-4 gap-2 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all"
                >
                  {/* Account Name */}
                  <div className="col-span-4 sm:col-span-5">
                    <span className="font-semibold text-xs text-slate-850 dark:text-slate-200">
                      {item.accountName}
                    </span>
                    {activeTab === 'BALANCE' && (
                      <span className="block text-[9px] uppercase font-bold text-slate-400 mt-0.5">
                        {item.accountType === 'ASSET' ? 'Activo (Ahorro)' : 'Pasivo (Préstamo)'}
                      </span>
                    )}
                  </div>

                  {/* Input and Direction selectors */}
                  <div className="col-span-5 sm:col-span-4 flex items-center justify-end gap-1.5">
                    {/* Asset direction dropdown */}
                    {item.accountType === 'ASSET' && (
                      <select
                        value={item.amount <= 0 ? 'SAVE' : 'WITHDRAW'}
                        onChange={(e) =>
                          handleAssetDirectionChange(item.accountId, e.target.value as any, absVal)
                        }
                        disabled={budget?.isLocked}
                        className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-1.5 text-[10px] uppercase font-bold focus:border-indigo-500 outline-none text-slate-650 dark:text-slate-300"
                      >
                        <option value="SAVE">Ahorrar (-)</option>
                        <option value="WITHDRAW">Retirar (+)</option>
                      </select>
                    )}

                    {/* Liability direction dropdown */}
                    {item.accountType === 'LIABILITY' && (
                      <select
                        value={item.amount <= 0 ? 'PAY' : 'BORROW'}
                        onChange={(e) =>
                          handleLiabilityDirectionChange(
                            item.accountId,
                            e.target.value as any,
                            absVal,
                          )
                        }
                        disabled={budget?.isLocked}
                        className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-1.5 text-[10px] uppercase font-bold focus:border-indigo-500 outline-none text-slate-650 dark:text-slate-300"
                      >
                        <option value="PAY">Pagar (-)</option>
                        <option value="BORROW">Recibir (+)</option>
                      </select>
                    )}

                    <input
                      type="number"
                      value={
                        activeTab === 'BALANCE'
                          ? absVal === 0
                            ? ''
                            : absVal
                          : item.amount === 0
                            ? ''
                            : item.amount
                      }
                      placeholder="0"
                      onChange={(e) => {
                        const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                        if (item.accountType === 'ASSET') {
                          const direction = item.amount <= 0 ? 'SAVE' : 'WITHDRAW';
                          handleAssetDirectionChange(item.accountId, direction, val);
                        } else if (item.accountType === 'LIABILITY') {
                          const direction = item.amount <= 0 ? 'PAY' : 'BORROW';
                          handleLiabilityDirectionChange(item.accountId, direction, val);
                        } else {
                          handleAmountChange(item.accountId, val);
                        }
                      }}
                      disabled={budget?.isLocked}
                      className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-xs font-bold w-28 sm:w-36 outline-none text-right focus:border-indigo-500 text-slate-800 dark:text-slate-100"
                    />
                  </div>

                  {/* Replicate & Delete */}
                  <div className="col-span-3 sm:col-span-3 flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => handleReplicate(item.accountId, item.amount)}
                      disabled={budget?.isLocked || replicatingId === item.accountId}
                      className="flex items-center gap-1 py-1.5 px-2 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-650 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl text-[10px] font-bold text-slate-500 dark:text-slate-400 transition disabled:opacity-40"
                      title="Replicar monto a todo el año"
                    >
                      <Repeat
                        className={`w-3.5 h-3.5 ${replicatingId === item.accountId ? 'animate-spin' : ''}`}
                      />
                      <span className="hidden sm:inline">Replicar</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteItem(item.accountId)}
                      disabled={budget?.isLocked}
                      className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition"
                      title="Eliminar partida"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Add item footer interface */}
        {currentTabEligible.length > 0 && !budget?.isLocked && (
          <div className="bg-slate-50/50 dark:bg-slate-850/50 p-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center gap-3">
            <span className="text-3xs uppercase tracking-wider font-extrabold text-slate-450 dark:text-slate-500">
              Agregar Partida:
            </span>
            <div className="flex flex-1 w-full sm:w-auto items-center gap-2">
              <select
                value={selectedAccountIdToAdd}
                onChange={(e) => setSelectedAccountIdToAdd(e.target.value)}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-semibold focus:border-indigo-500 outline-none flex-1 max-w-sm text-slate-800 dark:text-slate-100"
              >
                <option value="">-- Seleccionar cuenta --</option>
                {currentTabEligible.map((acc) => (
                  <option key={acc.accountId} value={acc.accountId}>
                    {acc.accountName}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={handleAddItem}
                disabled={!selectedAccountIdToAdd}
                className="flex items-center gap-1.5 py-2.5 px-4 bg-indigo-650 hover:bg-indigo-700 disabled:opacity-40 disabled:hover:bg-indigo-650 text-white font-bold rounded-xl text-xs shadow-sm hover:shadow transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Agregar</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
