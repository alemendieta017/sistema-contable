'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { X, AlertCircle, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';
import {
  TransactionMode,
  AccountType,
  type CreateTransactionRequest,
} from '@sistema-contable/shared';
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
  const router = useRouter();
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
    initialType?: AccountType;
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
        try {
          router.refresh();
        } catch {
          // Ignore if router is not available
        }
        onClose();
      }, 1000);
    } catch (err: any) {
      const msg = err?.message || 'Error al guardar el asiento contable.';
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
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center sm:p-4 animate-in fade-in duration-200"
    >
      <div className="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl w-full sm:max-w-3xl max-h-[92vh] sm:max-h-[88vh] flex flex-col shadow-2xl border border-slate-200/90 dark:border-slate-800 animate-in slide-in-from-bottom sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200 overflow-hidden">
        {/* Mobile Pull Bar */}
        <div className="sm:hidden w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto my-2 shrink-0" />

        {/* Modal Header */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 px-4 sm:px-6 py-3.5 border-b border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
          <div className="flex items-center justify-between w-full sm:w-auto">
            <div>
              <h2
                data-testid="modal-title"
                className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-50 tracking-tight"
              >
                Registrar Asiento Contable
              </h2>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                Seleccione el tipo de registro deseado
              </p>
            </div>
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
              className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition text-slate-500 dark:text-slate-400 cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Content Scroll Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
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

          {mode === TransactionMode.QUICK ? (
            <QuickTransactionForm
              accounts={accounts}
              baseCurrency={baseCurrency}
              initialValues={quickInitialValues}
              onSubmit={handleSubmit}
              onCancel={onClose}
              loading={loading}
              onQuickCreateAccount={(initialName, targetField, suggestedType) =>
                setQuickCreateState({ initialName, targetField, initialType: suggestedType })
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
              onQuickCreateAccount={(initialName, lineIndex, suggestedType) =>
                setQuickCreateState({ initialName, lineIndex, initialType: suggestedType })
              }
            />
          )}
        </div>

        {/* Quick Account Creation Modal */}
        {quickCreateState && (
          <AccountModal
            initialName={quickCreateState.initialName}
            initialType={quickCreateState.initialType}
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
