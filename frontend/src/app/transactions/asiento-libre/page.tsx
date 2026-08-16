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
      setError(err.message || 'Error al registrar el asiento contable.');
      throw err;
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
    <div className="flex flex-col flex-1 min-h-0 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Top Header Row */}
      <header className="flex justify-between items-center px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push('/transactions')}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition"
            title="Volver"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-300" />
          </button>
          <div>
            <h1 className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wide">
              Asiento Contable Libre
            </h1>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
              Editor contable multilínea para partidas dobles
            </p>
          </div>
        </div>
      </header>

      {/* Main Content Scroll Area */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 max-w-4xl mx-auto w-full">
        {error && (
          <div className="p-3 text-xs text-red-700 bg-red-50 dark:bg-red-950/30 dark:text-red-400 rounded-xl flex items-start gap-2.5 border border-red-100 dark:border-red-900/50 shadow-xs">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="p-3 text-xs text-green-700 bg-green-50 dark:bg-green-950/30 dark:text-green-400 rounded-xl flex items-start gap-2.5 border border-green-100 dark:border-green-900/50 shadow-xs">
            <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
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
