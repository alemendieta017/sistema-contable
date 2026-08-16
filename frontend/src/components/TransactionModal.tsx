'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { X, AlertCircle, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';
import { TransactionMode, type CreateTransactionRequest } from '@sistema-contable/shared';
import {
  ModeSelector,
  QuickTransactionForm,
  FreeJournalEntryGrid,
  type QuickTransactionFormValues,
  type FreeJournalFormValues,
} from './transactions';
import AccountModal from './AccountModal';
import { AccountOption as Account } from '../types/account';

interface TransactionModalProps {
  onClose: () => void;
  onSaveSuccess?: () => void;
  defaultMode?: TransactionMode;
}

export default function TransactionModal({
  onClose,
  onSaveSuccess,
  defaultMode = TransactionMode.QUICK,
}: TransactionModalProps) {
  const [mode, setMode] = useState<TransactionMode>(defaultMode);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [currencies, setCurrencies] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [quickInitialValues, setQuickInitialValues] = useState<Partial<QuickTransactionFormValues>>(
    {},
  );
  const [freeJournalInitialValues, setFreeJournalInitialValues] = useState<
    Partial<FreeJournalFormValues>
  >({});

  const [quickCreateState, setQuickCreateState] = useState<{
    initialName: string;
    targetField?: 'primary' | 'secondary';
    lineIndex?: number;
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
      setError('Error al cargar cuentas y monedas.');
    }
  };

  const handleSubmit = async (payload: CreateTransactionRequest) => {
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await api.transactions.create(payload);
      setSuccess('Asiento contable registrado con éxito.');

      setTimeout(() => {
        if (onSaveSuccess) onSaveSuccess();
        if (typeof window !== 'undefined') {
          if (
            window.location.pathname.startsWith('/transactions') ||
            window.location.pathname.startsWith('/accounts')
          ) {
            window.location.reload();
          }
        }
        onClose();
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Error al guardar el asiento contable.');
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
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 px-5 py-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2
              data-testid="modal-title"
              className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wide"
            >
              Registrar Asiento Contable
            </h2>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
              Seleccione el tipo de registro deseado
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
            <ModeSelector
              currentMode={mode}
              onModeChange={(newMode) => setMode(newMode)}
              disabled={loading}
            />

            <button
              onClick={onClose}
              aria-label="Cerrar modal"
              className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition text-slate-500 dark:text-slate-400"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Content Scroll Area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {error && (
            <div className="p-3 text-xs text-red-700 bg-red-50 dark:bg-red-950/30 dark:text-red-400 rounded-xl flex items-start gap-2 border border-red-100 dark:border-red-900/50 shadow-xs">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="p-3 text-xs text-green-700 bg-green-50 dark:bg-green-950/30 dark:text-green-400 rounded-xl flex items-start gap-2 border border-green-100 dark:border-green-900/50 shadow-xs">
              <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {mode === TransactionMode.QUICK ? (
            <QuickTransactionForm
              accounts={accounts}
              baseCurrency={baseCurrency}
              initialValues={quickInitialValues}
              onSubmit={handleSubmit}
              onCancel={onClose}
              loading={loading}
              onQuickCreateAccount={(initialName, targetField) =>
                setQuickCreateState({ initialName, targetField })
              }
            />
          ) : (
            <FreeJournalEntryGrid
              accounts={accounts}
              baseCurrency={baseCurrency}
              initialValues={freeJournalInitialValues}
              onSubmit={handleSubmit}
              onCancel={onClose}
              loading={loading}
              onQuickCreateAccount={(initialName, lineIndex) =>
                setQuickCreateState({ initialName, lineIndex })
              }
            />
          )}
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

                if (quickCreateState.targetField === 'primary') {
                  setQuickInitialValues((prev) => ({
                    ...prev,
                    primaryAccountId: newAccount.id,
                  }));
                } else if (quickCreateState.targetField === 'secondary') {
                  setQuickInitialValues((prev) => ({
                    ...prev,
                    secondaryAccountId: newAccount.id,
                  }));
                } else if (quickCreateState.lineIndex !== undefined) {
                  setFreeJournalInitialValues((prev) => {
                    const nextLines = [
                      ...(prev?.lines || [
                        { id: '1', accountId: '', debitAmount: '', creditAmount: '' },
                        { id: '2', accountId: '', debitAmount: '', creditAmount: '' },
                      ]),
                    ];
                    if (nextLines[quickCreateState.lineIndex!]) {
                      nextLines[quickCreateState.lineIndex!] = {
                        ...nextLines[quickCreateState.lineIndex!],
                        accountId: newAccount.id,
                      };
                    }
                    return { ...prev, lines: nextLines };
                  });
                }
              }
              setQuickCreateState(null);
            }}
          />
        )}
      </div>
    </div>
  );
}
