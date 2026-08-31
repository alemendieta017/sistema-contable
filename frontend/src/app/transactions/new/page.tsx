'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowLeft, AlertCircle, CheckCircle2 } from 'lucide-react';
import { api } from '../../../services/api';
import {
  TransactionMode,
  QuickOperationType,
  AccountType,
  type CreateTransactionRequest,
} from '@sistema-contable/shared';
import {
  ModeSelector,
  QuickTransactionForm,
  FreeJournalEntryGrid,
  type QuickTransactionFormValues,
  type FreeJournalFormValues,
} from '../../../components/transactions';
import AccountModal from '../../../components/AccountModal';
import { AccountOption as Account } from '../../../types/account';

function toPureDateString(dateInput?: Date | string | null): string {
  if (!dateInput) return '';
  if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
    return dateInput;
  }
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getTodayString(): string {
  return toPureDateString(new Date());
}

function mapTransactionToQuickValues(
  tx: any,
  accounts: Account[],
): QuickTransactionFormValues | null {
  if (!tx.entries || tx.entries.length !== 2) return null;
  const [entry1, entry2] = tx.entries;

  const debitEntry = entry1.entryType === 'DEBIT' ? entry1 : entry2;
  const creditEntry = entry1.entryType === 'CREDIT' ? entry1 : entry2;

  if (!debitEntry || !creditEntry) return null;

  const debitAcc = accounts.find((a) => a.id === debitEntry.accountId);
  const creditAcc = accounts.find((a) => a.id === creditEntry.accountId);

  const amount = Number(debitEntry.amount);
  const accountingDate = toPureDateString(tx.accountingDate || tx.date) || getTodayString();
  const description = tx.description || '';

  // Expense: DEBIT Expense, CREDIT Asset / Liability
  if (
    debitAcc?.type === AccountType.EXPENSE &&
    (creditAcc?.type === AccountType.ASSET || creditAcc?.type === AccountType.LIABILITY)
  ) {
    return {
      accountingDate,
      operationType: QuickOperationType.EXPENSE,
      primaryAccountId: creditEntry.accountId, // Payment account
      secondaryAccountId: debitEntry.accountId, // Expense category
      amount,
      description,
    };
  }

  // Income: DEBIT Asset / Liability, CREDIT Income
  if (
    (debitAcc?.type === AccountType.ASSET || debitAcc?.type === AccountType.LIABILITY) &&
    creditAcc?.type === AccountType.INCOME
  ) {
    return {
      accountingDate,
      operationType: QuickOperationType.INCOME,
      primaryAccountId: debitEntry.accountId, // Deposit account
      secondaryAccountId: creditEntry.accountId, // Income category
      amount,
      description,
    };
  }

  // Transfer: DEBIT Asset, CREDIT Asset
  if (debitAcc?.type === AccountType.ASSET && creditAcc?.type === AccountType.ASSET) {
    return {
      accountingDate,
      operationType: QuickOperationType.TRANSFER,
      primaryAccountId: creditEntry.accountId, // Source account
      secondaryAccountId: debitEntry.accountId, // Destination account
      amount,
      description,
    };
  }

  return null;
}

function mapTransactionToFreeValues(tx: any): FreeJournalFormValues {
  return {
    accountingDate: toPureDateString(tx.accountingDate || tx.date) || getTodayString(),
    description: tx.description || '',
    lines: (tx.entries || []).map((e: any, idx: number) => ({
      id: e.id || `line-${idx}-${Date.now()}`,
      accountId: e.accountId,
      debitAmount: e.entryType === 'DEBIT' ? Number(e.amount) : '',
      creditAmount: e.entryType === 'CREDIT' ? Number(e.amount) : '',
    })),
  };
}

function TransactionPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const editId = searchParams.get('edit');
  const cloneId = searchParams.get('cloneFrom');
  const isEditMode = !!editId;
  const isCloneMode = !!cloneId;

  // Determine initial mode from URL param
  const modeParam = searchParams.get('mode');
  const initialMode =
    modeParam?.toUpperCase() === 'FREE_JOURNAL'
      ? TransactionMode.FREE_JOURNAL
      : TransactionMode.QUICK;

  const [mode, setMode] = useState<TransactionMode>(initialMode);
  const [pendingMode, setPendingMode] = useState<TransactionMode | null>(null);
  const [showModeSwitchConfirm, setShowModeSwitchConfirm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [currencies, setCurrencies] = useState<any[]>([]);
  const [quickInitialValues, setQuickInitialValues] = useState<Partial<QuickTransactionFormValues>>(
    {
      accountingDate: getTodayString(),
    },
  );
  const [freeJournalInitialValues, setFreeJournalInitialValues] = useState<
    Partial<FreeJournalFormValues>
  >({
    accountingDate: getTodayString(),
  });

  const [quickCreateState, setQuickCreateState] = useState<{
    initialName: string;
    initialType?: AccountType;
    targetField?: 'primary' | 'secondary';
    lineIndex?: number;
  } | null>(null);

  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Track if user has modified anything
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, [editId, cloneId]);

  // Prevent accidental navigation if form is dirty
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const fetchInitialData = async () => {
    try {
      const [accData, curData] = await Promise.all([
        api.accounts.summary
          ? api.accounts.summary().catch(() => api.accounts.list('ACTIVE'))
          : api.accounts.list('ACTIVE'),
        api.currencies.list(),
      ]);
      const rawAccounts: Account[] = Array.isArray(accData) ? accData : accData?.accounts || [];
      const activeAccs = rawAccounts.filter((a) => a.status !== 'INACTIVE');
      setAccounts(activeAccs);
      setCurrencies(curData || []);

      if (isEditMode || isCloneMode) {
        await loadTransactionDetails(editId || cloneId || '', activeAccs);
      }
    } catch {
      setError('Error al cargar cuentas y monedas de respaldo.');
    }
  };

  const loadTransactionDetails = async (id: string, availableAccounts?: Account[]) => {
    setFetchLoading(true);
    setError('');
    const targetAccounts = availableAccounts || accounts;
    try {
      const tx = await api.transactions.get(id);
      if (tx) {
        if (isEditMode) {
          if (tx.status === 'REVERSED') {
            setError('Los asientos revertidos no pueden ser editados.');
            return;
          }
          if (tx.reversalOfId) {
            setError('Los asientos de reversión no pueden ser editados.');
            return;
          }
        }

        const dateToUse = isEditMode
          ? toPureDateString(tx.accountingDate || tx.date) || getTodayString()
          : getTodayString();

        const quickVals = mapTransactionToQuickValues(tx, targetAccounts);
        const freeVals = mapTransactionToFreeValues({
          ...tx,
          accountingDate: dateToUse,
        });

        if (quickVals && modeParam?.toUpperCase() !== 'FREE_JOURNAL') {
          setQuickInitialValues({
            ...quickVals,
            accountingDate: dateToUse,
          });
          setMode(TransactionMode.QUICK);
        } else {
          setFreeJournalInitialValues(freeVals);
          setMode(TransactionMode.FREE_JOURNAL);
        }

        setIsDirty(false);
      }
    } catch {
      setError('Error al recuperar los datos del asiento contable.');
    } finally {
      setFetchLoading(false);
    }
  };

  const handleModeChangeRequest = (newMode: TransactionMode) => {
    if (newMode === mode) return;
    if (isDirty) {
      setPendingMode(newMode);
      setShowModeSwitchConfirm(true);
    } else {
      setMode(newMode);
    }
  };

  const confirmModeSwitch = () => {
    if (pendingMode) {
      setMode(pendingMode);
      setPendingMode(null);
      setIsDirty(false);
    }
    setShowModeSwitchConfirm(false);
  };

  const cancelModeSwitch = () => {
    setPendingMode(null);
    setShowModeSwitchConfirm(false);
  };

  const handleCancelClick = () => {
    if (isDirty) {
      setShowCancelConfirm(true);
    } else {
      router.push('/transactions');
    }
  };

  const handleSubmit = async (payload: CreateTransactionRequest) => {
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (isEditMode) {
        await api.transactions.update(editId!, payload);
        setSuccess('Asiento contable actualizado exitosamente.');
      } else {
        await api.transactions.create(payload);
        setSuccess('Asiento contable registrado exitosamente.');
      }

      setIsDirty(false);

      setTimeout(() => {
        router.push('/transactions');
      }, 1000);
    } catch (err: any) {
      const msg = err?.message || 'Error al procesar la solicitud.';
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

  if (fetchLoading) {
    return (
      <div className="flex flex-1 min-h-0 items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs text-slate-400 font-semibold">Cargando asiento contable...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-slate-50/80 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Top Header Row with Responsive Breadcrumbs, Title, and ModeSelector */}
      <header className="flex flex-col sm:flex-row justify-between items-center gap-3 px-4 sm:px-6 py-3.5 border-b border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md sticky top-0 z-30 shrink-0">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            type="button"
            onClick={handleCancelClick}
            className="p-2 -ml-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition text-slate-600 dark:text-slate-300 active:scale-95 cursor-pointer"
            title="Volver"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                Transacciones /
              </span>
              {isEditMode && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-mono font-medium">
                  ID: {editId}
                </span>
              )}
            </div>
            <h1 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-50 tracking-tight">
              {isEditMode
                ? 'Editar Asiento Contable'
                : isCloneMode
                  ? 'Clonar Asiento Contable'
                  : 'Nuevo Asiento Contable'}
            </h1>
          </div>
        </div>

        {/* Mode Selector */}
        <div className="w-full sm:w-auto flex justify-center">
          <ModeSelector
            currentMode={mode}
            onModeChange={handleModeChangeRequest}
            disabled={loading}
          />
        </div>
      </header>

      {/* Main Content Area (Responsive Container with full-width scrollbar) */}
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
            {mode === TransactionMode.QUICK ? (
              <QuickTransactionForm
                accounts={accounts}
                baseCurrency={baseCurrency}
                initialValues={quickInitialValues}
                onSubmit={handleSubmit}
                onCancel={handleCancelClick}
                loading={loading}
                onQuickCreateAccount={(initialName, targetField, suggestedType) => {
                  setIsDirty(true);
                  setQuickCreateState({ initialName, targetField, initialType: suggestedType });
                }}
              />
            ) : (
              <FreeJournalEntryGrid
                accounts={accounts}
                baseCurrency={baseCurrency}
                initialValues={freeJournalInitialValues}
                onSubmit={handleSubmit}
                onCancel={handleCancelClick}
                loading={loading}
                onQuickCreateAccount={(initialName, lineIndex, suggestedType) => {
                  setIsDirty(true);
                  setQuickCreateState({ initialName, lineIndex, initialType: suggestedType });
                }}
              />
            )}
          </div>
        </main>
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

      {/* Mode Switch Discard Confirmation Dialog */}
      {showModeSwitchConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-sm p-5 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wide">
              ¿Cambiar Modo de Transacción?
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Al cambiar de modo, se perderán los datos que hayas ingresado en el formulario actual.
            </p>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={cancelModeSwitch}
                className="flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs hover:bg-slate-200 dark:hover:bg-slate-600 transition"
              >
                Seguir en este modo
              </button>
              <button
                type="button"
                onClick={confirmModeSwitch}
                className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition shadow-sm"
              >
                Cambiar de Modo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Accidental Navigation Cancel Confirmation Overlay Dialog */}
      {showCancelConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-sm p-5 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wide">
              ¿Descartar Cambios?
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Tienes cambios sin guardar en este asiento contable. Si sales ahora, perderás todo el
              borrador actual.
            </p>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCancelConfirm(false)}
                className="flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs hover:bg-slate-200 dark:hover:bg-slate-600 transition"
              >
                Seguir Editando
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCancelConfirm(false);
                  setIsDirty(false);
                  router.push('/transactions');
                }}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs transition shadow-sm"
              >
                Salir de Todos Modos
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function NewTransactionPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 min-h-0 items-center justify-center bg-slate-50 dark:bg-slate-950">
          <div className="flex flex-col items-center space-y-4">
            <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-xs text-slate-400 font-semibold">Cargando...</span>
          </div>
        </div>
      }
    >
      <TransactionPageContent />
    </Suspense>
  );
}
