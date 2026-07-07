"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "../../../../services/api";
import { ArrowLeft, Save, Repeat, ShieldAlert, CheckCircle2 } from "lucide-react";

type BudgetItem = {
  accountId: string;
  accountName: string;
  accountType: "ASSET" | "LIABILITY" | "EQUITY" | "INCOME" | "EXPENSE";
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

export default function EditBudgetPage() {
  const params = useParams();
  const router = useRouter();
  const periodId = params.periodId as string;

  const [budget, setBudget] = useState<BudgetDetail | null>(null);
  const [items, setItems] = useState<BudgetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [replicatingId, setReplicatingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    loadBudget();
  }, [periodId]);

  const loadBudget = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await api.budgets.getByPeriod(periodId);
      setBudget(data);
      setItems(data.items || []);
    } catch (err: any) {
      setError(err.message || "Error al cargar los detalles del presupuesto.");
    } finally {
      setLoading(false);
    }
  };

  const handleAmountChange = (accountId: string, value: string) => {
    const numericValue = value === "" ? 0 : parseFloat(value);
    setItems((prev) =>
      prev.map((item) =>
        item.accountId === accountId ? { ...item, amount: numericValue } : item
      )
    );
    setSuccess("");
  };

  const handleAssetDirectionChange = (accountId: string, direction: "SAVE" | "WITHDRAW", absVal: number) => {
    const amount = direction === "SAVE" ? -Math.abs(absVal) : Math.abs(absVal);
    setItems((prev) =>
      prev.map((item) =>
        item.accountId === accountId ? { ...item, amount } : item
      )
    );
    setSuccess("");
  };

  const handleLiabilityDirectionChange = (accountId: string, direction: "PAY" | "BORROW", absVal: number) => {
    const amount = direction === "PAY" ? -Math.abs(absVal) : Math.abs(absVal);
    setItems((prev) =>
      prev.map((item) =>
        item.accountId === accountId ? { ...item, amount } : item
      )
    );
    setSuccess("");
  };

  const handleSave = async () => {
    if (!budget) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const payload = items.map((item) => ({
        accountId: item.accountId,
        amount: item.amount,
      }));
      await api.budgets.updateItems(periodId, { items: payload });
      setSuccess("¡Presupuesto guardado con éxito!");
      loadBudget();
    } catch (err: any) {
      setError(err.message || "Error al guardar el presupuesto.");
    } finally {
      setSaving(false);
    }
  };

  const handleReplicate = async (accountId: string, amount: number) => {
    setReplicatingId(accountId);
    setError("");
    setSuccess("");
    try {
      await api.budgets.replicate({
        periodId,
        accountId,
        amount,
      });
      setSuccess("¡Monto replicado a todo el Ejercicio Fiscal!");
      loadBudget();
    } catch (err: any) {
      setError(err.message || "Error al replicar el monto.");
    } finally {
      setReplicatingId(null);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <span className="text-xs text-slate-400 font-semibold">Cargando presupuesto...</span>
      </div>
    );
  }

  const consumos = items.filter((x) => x.accountType === "INCOME" || x.accountType === "EXPENSE");
  const savings = items.filter((x) => x.accountType === "ASSET");
  const debts = items.filter((x) => x.accountType === "LIABILITY");

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 bg-white dark:bg-slate-800 rounded-xl hover:bg-slate-100 border border-slate-100 dark:border-slate-700 transition"
          >
            <ArrowLeft className="w-4 h-4 text-slate-600 dark:text-slate-300" />
          </button>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-800 dark:text-slate-100">
              Planificar Presupuesto
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Período: <span className="font-bold text-slate-750 dark:text-slate-205">{budget?.friendlyName}</span> ({budget?.startDate} al {budget?.endDate})
            </p>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving || budget?.isLocked}
          className="flex items-center justify-center gap-1.5 py-2.5 px-5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-md transition disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? "Guardando..." : "Guardar Presupuesto"}</span>
        </button>
      </div>

      {error && (
        <div className="p-3.5 text-xs text-red-700 bg-red-50 dark:bg-red-950/30 dark:text-red-400 rounded-2xl border border-red-150 flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-3.5 text-xs text-green-700 bg-green-50 dark:bg-green-950/30 dark:text-green-400 rounded-2xl border border-green-150 flex items-start gap-2.5">
          <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {budget?.isLocked && (
        <div className="p-3.5 text-xs text-amber-700 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400 rounded-2xl border border-amber-150 flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
          <span>Este período está CERRADO y no admite cambios de presupuesto.</span>
        </div>
      )}

      <div className="space-y-8">
        <section className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-100 dark:border-slate-700 shadow-sm space-y-4">
          <div className="border-b border-slate-100 dark:border-slate-700 pb-3">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Consumos (Ingresos y Gastos)</h3>
            <p className="text-3xs text-slate-400 mt-0.5">Planificación regular de entradas y salidas de resultados</p>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {consumos.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No hay cuentas de ingresos o egresos definidas.</p>
            ) : (
              consumos.map((item) => (
                <div key={item.accountId} className="flex flex-col sm:flex-row sm:items-center justify-between py-3.5 gap-3">
                  <div className="flex flex-col">
                    <span className="font-semibold text-xs text-slate-700 dark:text-slate-200">{item.accountName}</span>
                    <span className="text-5xs uppercase tracking-wider text-slate-400 font-bold">{item.accountType === "INCOME" ? "Ingreso" : "Gasto"}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={item.amount === 0 ? "" : item.amount}
                      placeholder="0"
                      onChange={(e) => handleAmountChange(item.accountId, e.target.value)}
                      disabled={budget?.isLocked}
                      className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-xs font-bold w-36 outline-none text-right focus:border-indigo-500"
                    />

                    <button
                      type="button"
                      onClick={() => handleReplicate(item.accountId, item.amount)}
                      disabled={budget?.isLocked || replicatingId === item.accountId}
                      className="flex items-center gap-1 py-2 px-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-4xs uppercase tracking-wider font-extrabold text-slate-500 hover:text-indigo-650 transition disabled:opacity-40"
                      title="Replicar a todo el año"
                    >
                      <Repeat className={`w-3 h-3 ${replicatingId === item.accountId ? "animate-spin" : ""}`} />
                      <span className="hidden md:inline">Replicar</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-100 dark:border-slate-700 shadow-sm space-y-4">
          <div className="border-b border-slate-100 dark:border-slate-700 pb-3">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Ahorros e Inversiones (Activos)</h3>
            <p className="text-3xs text-slate-400 mt-0.5">Destinar dinero para acumulación. Se guarda como valor negativo (salida de caja).</p>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {savings.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No hay cuentas de activos no líquidos elegibles.</p>
            ) : (
              savings.map((item) => {
                const absVal = Math.abs(item.amount);
                const isSave = item.amount <= 0;

                return (
                  <div key={item.accountId} className="flex flex-col sm:flex-row sm:items-center justify-between py-3.5 gap-3">
                    <div className="flex flex-col">
                      <span className="font-semibold text-xs text-slate-700 dark:text-slate-200">{item.accountName}</span>
                      <span className="text-5xs uppercase tracking-wider text-indigo-500 font-bold">Activo</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={isSave ? "SAVE" : "WITHDRAW"}
                        onChange={(e) => handleAssetDirectionChange(item.accountId, e.target.value as any, absVal)}
                        disabled={budget?.isLocked}
                        className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-4xs uppercase tracking-wider font-extrabold focus:border-indigo-500"
                      >
                        <option value="SAVE">Ahorrar / Invertir (-)</option>
                        <option value="WITHDRAW">Retirar / Liquidar (+)</option>
                      </select>

                      <input
                        type="number"
                        value={absVal === 0 ? "" : absVal}
                        placeholder="0"
                        onChange={(e) => {
                          const direction = isSave ? "SAVE" : "WITHDRAW";
                          const val = e.target.value === "" ? 0 : parseFloat(e.target.value);
                          if (direction === "SAVE") {
                            handleAssetDirectionChange(item.accountId, "SAVE", val);
                          } else {
                            handleAssetDirectionChange(item.accountId, "WITHDRAW", val);
                          }
                        }}
                        disabled={budget?.isLocked}
                        className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-xs font-bold w-32 outline-none text-right focus:border-indigo-500"
                      />

                      <button
                        type="button"
                        onClick={() => handleReplicate(item.accountId, item.amount)}
                        disabled={budget?.isLocked || replicatingId === item.accountId}
                        className="flex items-center gap-1 py-2 px-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-4xs uppercase tracking-wider font-extrabold text-slate-500 hover:text-indigo-650 transition disabled:opacity-40"
                        title="Replicar a todo el año"
                      >
                        <Repeat className={`w-3 h-3 ${replicatingId === item.accountId ? "animate-spin" : ""}`} />
                        <span className="hidden md:inline">Replicar</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        <section className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-100 dark:border-slate-700 shadow-sm space-y-4">
          <div className="border-b border-slate-100 dark:border-slate-700 pb-3">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Deudas y Tarjetas (Pasivos)</h3>
            <p className="text-3xs text-slate-400 mt-0.5">Financiación externa. Pagar deudas es salida de dinero (negativo); recibir créditos es entrada (positivo).</p>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {debts.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No hay cuentas de pasivos definidas.</p>
            ) : (
              debts.map((item) => {
                const absVal = Math.abs(item.amount);
                const isPay = item.amount <= 0;

                return (
                  <div key={item.accountId} className="flex flex-col sm:flex-row sm:items-center justify-between py-3.5 gap-3">
                    <div className="flex flex-col">
                      <span className="font-semibold text-xs text-slate-700 dark:text-slate-200">{item.accountName}</span>
                      <span className="text-5xs uppercase tracking-wider text-red-500 font-bold">Pasivo</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={isPay ? "PAY" : "BORROW"}
                        onChange={(e) => handleLiabilityDirectionChange(item.accountId, e.target.value as any, absVal)}
                        disabled={budget?.isLocked}
                        className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-4xs uppercase tracking-wider font-extrabold focus:border-indigo-500"
                      >
                        <option value="PAY">Pagar Deuda / Cuota (-)</option>
                        <option value="BORROW">Financiar / Recibir Préstamo (+)</option>
                      </select>

                      <input
                        type="number"
                        value={absVal === 0 ? "" : absVal}
                        placeholder="0"
                        onChange={(e) => {
                          const direction = isPay ? "PAY" : "BORROW";
                          const val = e.target.value === "" ? 0 : parseFloat(e.target.value);
                          if (direction === "PAY") {
                            handleLiabilityDirectionChange(item.accountId, "PAY", val);
                          } else {
                            handleLiabilityDirectionChange(item.accountId, "BORROW", val);
                          }
                        }}
                        disabled={budget?.isLocked}
                        className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-xs font-bold w-32 outline-none text-right focus:border-indigo-500"
                      />

                      <button
                        type="button"
                        onClick={() => handleReplicate(item.accountId, item.amount)}
                        disabled={budget?.isLocked || replicatingId === item.accountId}
                        className="flex items-center gap-1 py-2 px-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-4xs uppercase tracking-wider font-extrabold text-slate-500 hover:text-indigo-655 transition disabled:opacity-40"
                        title="Replicar a todo el año"
                      >
                        <Repeat className={`w-3 h-3 ${replicatingId === item.accountId ? "animate-spin" : ""}`} />
                        <span className="hidden md:inline">Replicar</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
