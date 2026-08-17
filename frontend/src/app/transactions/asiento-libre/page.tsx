'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, AlertCircle, CheckCircle2 } from 'lucide-react';
import { api } from '../../../services/api';
import { type CreateTransactionRequest } from '@sistema-contable/shared';
import { FreeJournalEntryGrid, type FreeJournalFormValues } from '../../../components/transactions';
import AccountModal from '../../../components/AccountModal';
import { AccountOption as Account } from '../../../types/account';

export default function AsientoLibrePage() {
  const router = useRouter();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [currencies, setCurrencies] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [freeJournalInitialValues, setFreeJournalInitialValues] = useState<
    Partial<FreeJournalFormValues>
  >({});

  const [quickCreateState, setQuickCreateState] = useState<{
    initialName: string;
    lineIndex: number;
  } | null>(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [accData, curData] = await Promise.all([
        api.accounts.summary
          ? api.accounts.summary().catch(() => api.accounts.list('ACTIVE'))
          : api.accounts.list('ACTIVE'),
        api.currencies.list(),
      ]);
      const rawAccounts: Account[] = Array.isArray(accData) ? accData : accData?.accounts || [];
      setAccounts(rawAccounts.filter((a) => a.status !== 'INACTIVE'));
      setCurrencies(curData || []);
    } catch {
      setError('Error al cargar datos iniciales.');
    }
  };

  const handleSubmit = async (payload: CreateTransactionRequest) => {
    setLoading(true);
    setSuccess('');
    setError('');

    try {
      await api.transactions.create(payload);
      setSuccess('Asiento contable registrado con éxito.');

      setTimeout(() => {
        router.push('/transactions');
      }, 1000);
    } catch (err: any) {
      const msg = err?.message || 'Error al registrar el asiento contable.';
      if (msg.includes('No accounting period found')) {
        setError(
          'No existe un período contable configurado para la fecha seleccionada. Debe crear el ejercicio fiscal correspondiente en Configuración > Períodos Contables.',
        );
      } else if (msg.includes('The accounting period for the transaction date is closed')) {
        setError(
          'El período contable correspondiente a la fecha seleccionada se encuentra cerrado.',
        );
      } else if (
        msg.includes('The accounting period for the transaction date is in planning status')
      ) {
        setError('El período contable para la fecha seleccionada está en estado de planificación.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const baseCurrency = useMemo(() => {
    return (
      currencies.find((c) => c.isBase) || {
        code: 'PYG',
        symbol: '₲',
        decimalPlaces: 0,
      }
    );
  }, [currencies]);

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-slate-50/80 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Top Header Row */}
      <header className="flex justify-between items-center px-4 sm:px-6 py-3.5 border-b border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md sticky top-0 z-30 shrink-0">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push('/transactions')}
            className="p-2 -ml-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition text-slate-600 dark:text-slate-300 active:scale-95 cursor-pointer"
            title="Volver"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              Transacciones /
            </div>
            <h1 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-50 tracking-tight">
              Asiento Contable Libre
            </h1>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
              Editor contable multilínea para partidas dobles
            </p>
          </div>
        </div>
      </header>

      {/* Main Content Scroll Area */}
      <div className="flex-1 overflow-y-auto w-full">
        <main className="p-3.5 sm:p-6 lg:p-8 space-y-4 max-w-4xl mx-auto w-full">
          {error && (
            <div className="p-3.5 text-xs text-red-700 bg-red-50 dark:bg-red-950/40 dark:text-red-300 rounded-2xl flex items-start gap-2.5 border border-red-200 dark:border-red-900/60 shadow-xs animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span className="font-medium">{error}</span>
            </div>
          )}
          {success && (
            <div className="p-3.5 text-xs text-green-700 bg-green-50 dark:bg-green-950/40 dark:text-green-300 rounded-2xl flex items-start gap-2.5 border border-green-200 dark:border-green-900/60 shadow-xs animate-in fade-in duration-150">
              <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
              <span className="font-medium">{success}</span>
            </div>
          )}

          <div className="bg-white dark:bg-slate-900 p-4 sm:p-7 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm transition-all">
            <FreeJournalEntryGrid
              accounts={accounts}
              baseCurrency={baseCurrency}
              initialValues={freeJournalInitialValues}
              onSubmit={handleSubmit}
              onCancel={() => router.push('/transactions')}
              loading={loading}
              onQuickCreateAccount={(initialName, lineIndex) =>
                setQuickCreateState({ initialName, lineIndex })
              }
            />
          </div>
        </main>
      </div>

      {/* Quick Account Creation Modal */}
      {quickCreateState && (
        <AccountModal
          initialName={quickCreateState.initialName}
          parentCandidates={accounts}
          onClose={() => setQuickCreateState(null)}
          onSuccess={(newAccount) => {
            if (newAccount) {
              setAccounts((prev) =>
                prev.some((a) => a.id === newAccount.id) ? prev : [...prev, newAccount],
              );

              setFreeJournalInitialValues((prev) => {
                const nextLines = [
                  ...(prev?.lines || [
                    { id: '1', accountId: '', debitAmount: '', creditAmount: '' },
                    { id: '2', accountId: '', debitAmount: '', creditAmount: '' },
                  ]),
                ];
                if (nextLines[quickCreateState.lineIndex]) {
                  nextLines[quickCreateState.lineIndex] = {
                    ...nextLines[quickCreateState.lineIndex],
                    accountId: newAccount.id,
                  };
                }
                return { ...prev, lines: nextLines };
              });
            }
            setQuickCreateState(null);
          }}
        />
      )}
    </div>
  );
}
