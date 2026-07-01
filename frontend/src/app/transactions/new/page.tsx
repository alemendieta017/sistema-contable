"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft, Save, AlertCircle, CheckCircle2, Plus } from "lucide-react";
import { api } from "../../../services/api";
import JournalEntryRow from "../../../components/JournalEntryRow";
import { formatCurrency, formatLocalDateTimeWithOffset } from "../../../lib/utils";

interface Account {
  id: string;
  name: string;
  type: "ASSET" | "LIABILITY" | "EQUITY" | "INCOME" | "EXPENSE";
  currencyId: string;
  parentId?: string | null;
}

interface Entry {
  accountId: string;
  entryType: "DEBIT" | "CREDIT";
  amount: number | "";
}

function toLocalDateTimeString(dateInput: Date | string): string {
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function TransactionForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const editId = searchParams.get("edit");
  const cloneId = searchParams.get("cloneFrom");
  const isEditMode = !!editId;
  const isCloneMode = !!cloneId;

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [currencies, setCurrencies] = useState<any[]>([]);
  
  // Set default datetime to local current date-time
  const getInitialDateTimeString = () => {
    return toLocalDateTimeString(new Date());
  };

  const [dateTime, setDateTime] = useState(getInitialDateTimeString());
  const [description, setDescription] = useState("");
  const [entries, setEntries] = useState<Entry[]>([
    { accountId: "", entryType: "DEBIT", amount: "" },
    { accountId: "", entryType: "CREDIT", amount: "" },
  ]);
  const [isDirty, setIsDirty] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (isEditMode || isCloneMode) {
      loadTransactionDetails(editId || cloneId || "");
    }
  }, [editId, cloneId]);

  // Prevent accidental tab closing if form is modified
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  const fetchInitialData = async () => {
    try {
      const [accData, curData] = await Promise.all([
        api.accounts.list(),
        api.currencies.list(),
      ]);
      setAccounts(accData || []);
      setCurrencies(curData || []);
    } catch (err: any) {
      setError("Error al cargar cuentas y monedas de respaldo.");
    }
  };

  const loadTransactionDetails = async (id: string) => {
    setFetchLoading(true);
    setError("");
    try {
      const tx = await api.transactions.get(id);
      if (tx) {
        if (isEditMode) {
          if (tx.status === "REVERSED") {
            setError("Los asientos revertidos no pueden ser editados.");
            return;
          }
          if (tx.reversalOfId) {
            setError("Los asientos de reversión no pueden ser editados.");
            return;
          }
          setDateTime(toLocalDateTimeString(tx.date));
        } else {
          // Clone mode resets the date to now
          setDateTime(getInitialDateTimeString());
        }
        setDescription(tx.description);
        setEntries(
          tx.entries.map((e: any) => ({
            accountId: e.accountId,
            entryType: e.entryType,
            amount: Number(e.amount),
          }))
        );
        setIsDirty(false);
      }
    } catch (err: any) {
      setError("Error al recuperar los datos del asiento contable.");
    } finally {
      setFetchLoading(false);
    }
  };

  const handleUpdateEntry = (index: number, updatedFields: Partial<Entry>) => {
    const updated = [...entries];
    updated[index] = { ...updated[index], ...updatedFields };
    setEntries(updated);
    setIsDirty(true);
  };

  // Balancing logic
  const totalDebits = useMemo(() => {
    return entries
      .filter((e) => e.entryType === "DEBIT")
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  }, [entries]);

  const totalCredits = useMemo(() => {
    return entries
      .filter((e) => e.entryType === "CREDIT")
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  }, [entries]);

  const difference = Math.abs(totalDebits - totalCredits);
  const isBalanced = difference < 0.001 && totalDebits > 0;

  const handleAddEntry = () => {
    const lastType = entries[entries.length - 1]?.entryType || "DEBIT";
    const nextType = lastType === "DEBIT" ? "CREDIT" : "DEBIT";
    const prefillAmount = difference > 0 ? Number(difference.toFixed(2)) : "";
    
    setEntries([...entries, { accountId: "", entryType: nextType, amount: prefillAmount }]);
    setIsDirty(true);
  };

  const handleRemoveEntry = (index: number) => {
    if (entries.length <= 2) return;
    setEntries(entries.filter((_, i) => i !== index));
    setIsDirty(true);
  };

  const handleCancelClick = () => {
    if (isDirty) {
      setShowCancelConfirm(true);
    } else {
      router.push("/transactions");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!description.trim()) {
      setError("Por favor, ingrese una descripción / glosa para el asiento.");
      return;
    }

    // Verify all fields completed
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      if (!entry.accountId) {
        setError(`El apunte #${i + 1} no tiene una cuenta seleccionada.`);
        return;
      }
      if (entry.amount === "" || Number(entry.amount) <= 0) {
        setError(`El apunte #${i + 1} debe poseer un monto positivo.`);
        return;
      }
    }

    const baseCurrency = currencies.find((c) => c.isBase) || { code: "PYG", symbol: "₲", decimalPlaces: 0 };

    if (!isBalanced) {
      setError(
        `El asiento está descuadrado por ${formatCurrency(difference, baseCurrency)}. Las columnas del Debe y Haber deben coincidir.`
      );
      return;
    }

    setLoading(true);

    try {
      const payload = {
        date: formatLocalDateTimeWithOffset(dateTime),
        description,
        entries: entries.map((e) => ({
          accountId: e.accountId,
          entryType: e.entryType,
          amount: Number(e.amount),
        })),
      };

      if (isEditMode) {
        await api.transactions.update(editId!, payload);
        setSuccess("Asiento contable actualizado exitosamente.");
      } else {
        await api.transactions.create(payload);
        setSuccess("Asiento contable registrado exitosamente.");
      }
      
      setIsDirty(false);

      setTimeout(() => {
        router.push("/transactions");
      }, 1000);
    } catch (err: any) {
      setError(err.message || "Error al procesar la solicitud.");
    } finally {
      setLoading(false);
    }
  };

  const baseCurrency = currencies.find((c) => c.isBase) || { code: "PYG", symbol: "₲", decimalPlaces: 0 };

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
    <div className="flex flex-col flex-1 min-h-0 bg-slate-50 dark:bg-slate-950">
      {/* Top Header Row */}
      <header className="flex justify-between items-center px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleCancelClick}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition"
            title="Volver"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-350" />
          </button>
          <div>
            <h1 className="text-sm sm:text-base font-bold text-slate-850 dark:text-slate-100 uppercase tracking-wide">
              {isEditMode ? "Editar Asiento" : isCloneMode ? "Clonar Asiento" : "Nuevo Asiento Contable"}
            </h1>
            {isEditMode && <span className="text-[10px] text-indigo-500 font-mono font-medium">ID: {editId}</span>}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleCancelClick}
            className="hidden sm:block px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold rounded-sm text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={loading || !isBalanced}
            className={`px-4 py-2 text-white font-bold rounded-sm text-xs transition duration-150 flex items-center gap-1.5 shadow-sm ${
              isBalanced
                ? "bg-indigo-600 hover:bg-indigo-700"
                : "bg-slate-350 dark:bg-slate-800 text-slate-450 cursor-not-allowed shadow-none"
            }`}
          >
            <Save className="w-3.5 h-3.5" />
            <span>{loading ? "Guardando..." : "Guardar"}</span>
          </button>
        </div>
      </header>

      {/* Main Form Scroll Area */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {error && (
          <div className="p-3 text-xs text-red-700 bg-red-50 dark:bg-red-950/30 dark:text-red-400 rounded-sm flex items-start gap-2.5 max-w-4xl mx-auto border border-red-100 dark:border-red-900/50">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="p-3 text-xs text-green-700 bg-green-50 dark:bg-green-950/30 dark:text-green-400 rounded-sm flex items-start gap-2.5 max-w-4xl mx-auto border border-green-100 dark:border-green-900/50">
            <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="max-w-4xl mx-auto space-y-6">
          {/* Header Info Block */}
          <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-sm border border-slate-200 dark:border-slate-800 shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-1">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
                Fecha y Hora del Asiento
              </label>
              <input
                type="datetime-local"
                value={dateTime}
                required
                onChange={(e) => {
                  setDateTime(e.target.value);
                  setIsDirty(true);
                }}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-sm p-2 text-xs outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-200 font-semibold"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
                Descripción / Glosa
              </label>
              <input
                type="text"
                value={description}
                required
                onChange={(e) => {
                  setDescription(e.target.value);
                  setIsDirty(true);
                }}
                placeholder="Ej. Pago de alquiler de oficina principal"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-sm p-2 text-xs outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-200 font-semibold"
              />
            </div>
          </div>

          {/* Journal Entries List Block */}
          <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-sm border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-xs font-bold uppercase text-slate-450 dark:text-slate-400 tracking-wider">
                Detalle de Asientos (Debe / Haber)
              </h3>
              <button
                type="button"
                onClick={handleAddEntry}
                className="flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition"
              >
                <Plus className="w-4 h-4" />
                <span>Agregar Apunte</span>
              </button>
            </div>

            <div className="space-y-3">
              {entries.map((entry, index) => (
                <JournalEntryRow
                  key={index}
                  index={index}
                  entry={entry}
                  accounts={accounts}
                  onUpdate={handleUpdateEntry}
                  onRemove={handleRemoveEntry}
                  canRemove={entries.length > 2}
                  baseCurrency={baseCurrency}
                />
              ))}
            </div>
          </div>
        </form>
      </main>

      {/* Sticky Bottom Summary Panel */}
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-4 shrink-0 shadow-lg">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-6 w-full sm:w-auto text-xs justify-around sm:justify-start">
            <div>
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Total Debe
              </p>
              <p className="font-extrabold text-sm sm:text-base text-rose-600 dark:text-rose-400 mt-0.5">
                {formatCurrency(totalDebits, baseCurrency)}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Total Haber
              </p>
              <p className="font-extrabold text-sm sm:text-base text-emerald-600 dark:text-emerald-450 mt-0.5">
                {formatCurrency(totalCredits, baseCurrency)}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Diferencia
              </p>
              <div
                className={`flex items-center gap-1 font-extrabold text-sm sm:text-base mt-0.5 transition-colors duration-500 ${
                  isBalanced ? "text-indigo-600 dark:text-indigo-400" : "text-amber-500"
                }`}
              >
                {isBalanced && <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 animate-in fade-in zoom-in-50 duration-300" />}
                <span>{formatCurrency(difference, baseCurrency)}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-2 w-full sm:w-auto shrink-0">
            <button
              type="button"
              onClick={handleCancelClick}
              className="flex-1 sm:hidden px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold rounded-sm text-xs hover:bg-slate-200 transition"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              type="submit"
              disabled={loading || !isBalanced}
              className={`flex-1 sm:flex-none px-6 py-2.5 text-white font-bold rounded-sm text-xs transition duration-150 flex items-center justify-center gap-1.5 shadow-sm ${
                isBalanced
                  ? "bg-indigo-600 hover:bg-indigo-700"
                  : "bg-slate-200 dark:bg-slate-800 text-slate-450 cursor-not-allowed shadow-none"
              }`}
            >
              <Save className="w-4 h-4" />
              <span>{loading ? "Guardando..." : "Guardar Asiento"}</span>
            </button>
          </div>
        </div>
      </footer>

      {/* Accidental Navigation Cancel Confirmation Overlay Dialog */}
      {showCancelConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-850 rounded-sm w-full max-w-sm p-5 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wide">
              ¿Descartar Cambios?
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Tienes cambios sin guardar en este asiento contable. Si sales ahora, perderás todo el borrador actual.
            </p>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCancelConfirm(false)}
                className="flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold rounded-sm text-xs hover:bg-slate-200 transition"
              >
                Seguir Editando
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCancelConfirm(false);
                  setIsDirty(false);
                  router.push("/transactions");
                }}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-750 text-white font-bold rounded-sm text-xs transition shadow-sm"
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
    <Suspense fallback={
      <div className="flex flex-1 min-h-0 items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs text-slate-400 font-semibold">Cargando...</span>
        </div>
      </div>
    }>
      <TransactionForm />
    </Suspense>
  );
}
