"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "../../../../services/api";
import { ArrowLeft, Edit3, ShieldAlert, BadgeAlert, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight } from "lucide-react";

type ExecutionItem = {
  accountId: string;
  accountName: string;
  budgeted: number;
  real: number;
  available?: number;
  deviation: number;
  isNegativeDeviation: boolean;
};

type ExecutionData = {
  periodName: string;
  friendlyName: string;
  startDate: string;
  endDate: string;
  consumos: {
    income: ExecutionItem[];
    expense: ExecutionItem[];
    totalBudgetedIncome: number;
    totalRealIncome: number;
    totalBudgetedExpense: number;
    totalRealExpense: number;
  };
  ahorrosInversiones: ExecutionItem[];
  deudasTarjetas: ExecutionItem[];
  resumenLiquidez: {
    saldoCajaInicialReal: number;
    flujoNetoConsumos: { budgeted: number; real: number };
    flujoNetoFinanciero: { budgeted: number; real: number };
    flujoCajaNetoMes: { budgeted: number; real: number };
    saldoCajaFinal: { projected: number; real: number };
  };
};

export default function BudgetExecutionPage() {
  const params = useParams();
  const router = useRouter();
  const periodId = params.periodId as string;

  const [data, setData] = useState<ExecutionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadExecution();
  }, [periodId]);

  const loadExecution = async () => {
    try {
      setLoading(true);
      setError("");
      const report = await api.budgets.executionReport(periodId);
      setData(report);
    } catch (err: any) {
      setError(err.message || "Error al cargar la ejecución presupuestaria.");
    } finally {
      setLoading(false);
    }
  };

  const formatNum = (num: number) => {
    return num.toLocaleString("es-PY", { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + " ₲";
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <span className="text-xs text-slate-400 font-semibold">Cargando ejecución...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-4 max-w-md mx-auto py-8">
        <div className="p-4 text-xs text-red-700 bg-red-50 dark:bg-red-950/30 dark:text-red-400 rounded-2xl border border-red-150 flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error || "No se pudieron obtener datos del informe."}</span>
        </div>
        <button
          onClick={() => router.back()}
          className="w-full py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl"
        >
          Volver atrás
        </button>
      </div>
    );
  }

  const { consumos, ahorrosInversiones: savings = [], deudasTarjetas: debts = [], resumenLiquidez } = data;

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      
      {/* Header */}
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
              Ejecución Presupuestaria
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Control Real vs. Planificado: <span className="font-bold text-slate-700 dark:text-slate-200">{data.friendlyName}</span> ({data.startDate} al {data.endDate})
            </p>
          </div>
        </div>

        <button
          onClick={() => router.push(`/budgets/${periodId}/edit`)}
          className="flex items-center justify-center gap-1.5 py-2.5 px-5 bg-indigo-650 hover:bg-indigo-750 text-indigo-600 dark:text-indigo-400 hover:text-white dark:hover:text-white bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-150 dark:border-indigo-900 font-bold rounded-xl text-xs shadow-sm transition"
        >
          <Edit3 className="w-4 h-4" />
          <span>Editar Planificación</span>
        </button>
      </div>

      {/* 3 Main Categories Panels */}
      <div className="space-y-8">
        
        {/* CATEGORY 1: CONSUMOS */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-100 dark:border-slate-700 shadow-sm space-y-6">
          <div className="border-b border-slate-100 dark:border-slate-700 pb-3">
            <h3 className="text-sm font-bold text-slate-850 dark:text-slate-200">Consumos (Devengados)</h3>
            <p className="text-3xs text-slate-400 mt-0.5">Comparación de Ingresos y Gastos acumulados</p>
          </div>

          {/* Income Grid */}
          <div className="space-y-3">
            <h4 className="text-3xs font-extrabold uppercase tracking-wider text-slate-400">Ingresos</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-700 text-slate-400 text-3xs font-bold uppercase tracking-wider">
                    <th className="py-2">Categoría</th>
                    <th className="py-2 text-right">Planificado</th>
                    <th className="py-2 text-right">Real</th>
                    <th className="py-2 text-right">Desviación</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                  {consumos.income.map((item) => (
                    <tr key={item.accountId}>
                      <td className="py-2.5 font-medium text-slate-700 dark:text-slate-350">{item.accountName}</td>
                      <td className="py-2.5 text-right font-semibold">{formatNum(item.budgeted)}</td>
                      <td className="py-2.5 text-right font-semibold text-indigo-600 dark:text-indigo-400">{formatNum(item.real)}</td>
                      <td className={`py-2.5 text-right font-bold ${item.isNegativeDeviation ? "text-red-500" : "text-green-500"}`}>
                        {item.deviation > 0 ? "+" : ""}{formatNum(item.deviation)}
                      </td>
                    </tr>
                  ))}
                  <tr className="font-extrabold border-t-2 border-slate-100 dark:border-slate-700">
                    <td className="py-2.5">Total Ingresos</td>
                    <td className="py-2.5 text-right">{formatNum(consumos.totalBudgetedIncome)}</td>
                    <td className="py-2.5 text-right text-indigo-600 dark:text-indigo-400">{formatNum(consumos.totalRealIncome)}</td>
                    <td className={`py-2.5 text-right ${consumos.totalRealIncome < consumos.totalBudgetedIncome ? "text-red-500" : "text-green-500"}`}>
                      {formatNum(consumos.totalRealIncome - consumos.totalBudgetedIncome)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Expense Grid */}
          <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-700/60">
            <h4 className="text-3xs font-extrabold uppercase tracking-wider text-slate-400">Gastos</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-700 text-slate-400 text-3xs font-bold uppercase tracking-wider">
                    <th className="py-2">Categoría</th>
                    <th className="py-2 text-right">Presupuestado</th>
                    <th className="py-2 text-right">Real</th>
                    <th className="py-2 text-right">Disponible</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                  {consumos.expense.map((item) => {
                    const avail = item.available ?? (item.budgeted - item.real);
                    return (
                      <tr key={item.accountId}>
                        <td className="py-2.5 font-medium text-slate-700 dark:text-slate-350">{item.accountName}</td>
                        <td className="py-2.5 text-right font-semibold">{formatNum(item.budgeted)}</td>
                        <td className="py-2.5 text-right font-semibold text-slate-600 dark:text-slate-400">{formatNum(item.real)}</td>
                        <td className={`py-2.5 text-right font-bold ${item.isNegativeDeviation ? "text-red-550 bg-red-50 dark:bg-red-950/20 px-1.5 py-0.5 rounded-lg" : "text-green-500"}`}>
                          {formatNum(avail)}
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="font-extrabold border-t-2 border-slate-100 dark:border-slate-700">
                    <td className="py-2.5">Total Gastos</td>
                    <td className="py-2.5 text-right">{formatNum(consumos.totalBudgetedExpense)}</td>
                    <td className="py-2.5 text-right text-slate-650 dark:text-slate-350">{formatNum(consumos.totalRealExpense)}</td>
                    <td className={`py-2.5 text-right ${consumos.totalRealExpense > consumos.totalBudgetedExpense ? "text-red-550 font-black" : "text-green-550"}`}>
                      {formatNum(consumos.totalBudgetedExpense - consumos.totalRealExpense)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* CATEGORY 2: AHORROS E INVERSIONES */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-100 dark:border-slate-700 shadow-sm space-y-4">
          <div className="border-b border-slate-100 dark:border-slate-700 pb-3">
            <h3 className="text-sm font-bold text-slate-850 dark:text-slate-200">Ahorros e Inversiones (Activos)</h3>
            <p className="text-3xs text-slate-400 mt-0.5">Control de movimientos de capital invertido o ahorrado</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700 text-slate-400 text-3xs font-bold uppercase tracking-wider">
                  <th className="py-2">Cuenta</th>
                  <th className="py-2 text-right">Planificado</th>
                  <th className="py-2 text-right">Real</th>
                  <th className="py-2 text-right">Desviación de Caja</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                {savings.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-slate-400">No hay planificación de activos para este mes.</td>
                  </tr>
                ) : (
                  savings.map((item) => (
                    <tr key={item.accountId}>
                      <td className="py-2.5 font-medium text-slate-700 dark:text-slate-350">{item.accountName}</td>
                      <td className="py-2.5 text-right font-semibold">{formatNum(item.budgeted)}</td>
                      <td className="py-2.5 text-right font-semibold">{formatNum(item.real)}</td>
                      <td className={`py-2.5 text-right font-bold ${item.isNegativeDeviation ? "text-red-550 bg-red-50 dark:bg-red-950/20 px-1.5 py-0.5 rounded-lg" : "text-green-500"}`}>
                        {formatNum(item.real - item.budgeted)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* CATEGORY 3: DEUDAS Y TARJETAS */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-100 dark:border-slate-700 shadow-sm space-y-4">
          <div className="border-b border-slate-100 dark:border-slate-700 pb-3">
            <h3 className="text-sm font-bold text-slate-850 dark:text-slate-200">Deudas y Tarjetas (Pasivos)</h3>
            <p className="text-3xs text-slate-400 mt-0.5">Control de pagos de cuotas y toma de préstamos</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700 text-slate-400 text-3xs font-bold uppercase tracking-wider">
                  <th className="py-2">Cuenta</th>
                  <th className="py-2 text-right">Planificado</th>
                  <th className="py-2 text-right">Real</th>
                  <th className="py-2 text-right">Desviación de Caja</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                {debts.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-slate-400">No hay planificación de pasivos para este mes.</td>
                  </tr>
                ) : (
                  debts.map((item) => (
                    <tr key={item.accountId}>
                      <td className="py-2.5 font-medium text-slate-700 dark:text-slate-350">{item.accountName}</td>
                      <td className="py-2.5 text-right font-semibold">{formatNum(item.budgeted)}</td>
                      <td className="py-2.5 text-right font-semibold">{formatNum(item.real)}</td>
                      <td className={`py-2.5 text-right font-bold ${item.isNegativeDeviation ? "text-red-550 bg-red-50 dark:bg-red-950/20 px-1.5 py-0.5 rounded-lg" : "text-green-500"}`}>
                        {formatNum(item.real - item.budgeted)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* BOTTOM CONSOLIDATED LIQUIDITY CARD */}
      <div className="bg-gradient-to-tr from-slate-800 to-slate-900 dark:from-slate-900 dark:to-slate-950 text-white rounded-3xl p-6 shadow-xl border border-slate-700/40 space-y-6">
        <div>
          <span className="text-4xs font-extrabold uppercase tracking-widest text-indigo-350">Consolidado Mensual</span>
          <h3 className="text-lg font-extrabold mt-0.5">Resumen de Liquidez Efectiva</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 border-b border-slate-700/50 pb-5 text-xs">
          <div>
            <p className="text-slate-400 font-semibold text-3xs uppercase tracking-wider">Saldo Inicial de Caja</p>
            <p className="font-extrabold text-base mt-1 text-slate-200">{formatNum(resumenLiquidez.saldoCajaInicialReal)}</p>
          </div>
          <div>
            <p className="text-slate-400 font-semibold text-3xs uppercase tracking-wider">Flujo Neto Consumos (P&L)</p>
            <div className="flex gap-4 mt-1 font-bold text-xs">
              <div>
                <span className="text-3xs text-slate-450 block">Plan:</span>
                <span className={resumenLiquidez.flujoNetoConsumos.budgeted >= 0 ? "text-indigo-400" : "text-red-400"}>
                  {formatNum(resumenLiquidez.flujoNetoConsumos.budgeted)}
                </span>
              </div>
              <div>
                <span className="text-3xs text-slate-450 block">Real:</span>
                <span className={resumenLiquidez.flujoNetoConsumos.real >= 0 ? "text-indigo-400" : "text-red-400"}>
                  {formatNum(resumenLiquidez.flujoNetoConsumos.real)}
                </span>
              </div>
            </div>
          </div>
          <div>
            <p className="text-slate-400 font-semibold text-3xs uppercase tracking-wider">Flujo Financiero (Patrimonial)</p>
            <div className="flex gap-4 mt-1 font-bold text-xs">
              <div>
                <span className="text-3xs text-slate-450 block">Plan:</span>
                <span className={resumenLiquidez.flujoNetoFinanciero.budgeted >= 0 ? "text-indigo-400" : "text-red-400"}>
                  {formatNum(resumenLiquidez.flujoNetoFinanciero.budgeted)}
                </span>
              </div>
              <div>
                <span className="text-3xs text-slate-450 block">Real:</span>
                <span className={resumenLiquidez.flujoNetoFinanciero.real >= 0 ? "text-indigo-400" : "text-red-400"}>
                  {formatNum(resumenLiquidez.flujoNetoFinanciero.real)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-1 text-xs">
          <div>
            <p className="text-indigo-300 font-bold text-3xs uppercase tracking-wider flex items-center gap-1">
              <span>Flujo de Caja Neto del Mes</span>
            </p>
            <div className="grid grid-cols-2 gap-4 mt-2">
              <div className="bg-slate-800/40 p-2.5 rounded-xl border border-slate-700/30">
                <span className="text-3xs text-slate-450 block">Planificado</span>
                <span className="font-extrabold text-sm">{formatNum(resumenLiquidez.flujoCajaNetoMes.budgeted)}</span>
              </div>
              <div className="bg-slate-800/40 p-2.5 rounded-xl border border-slate-700/30">
                <span className="text-3xs text-slate-450 block">Real Ejecutado</span>
                <span className="font-extrabold text-sm flex items-center gap-1">
                  {resumenLiquidez.flujoCajaNetoMes.real >= 0 ? (
                    <TrendingUp className="w-3.5 h-3.5 text-green-400" />
                  ) : (
                    <TrendingDown className="w-3.5 h-3.5 text-red-400" />
                  )}
                  {formatNum(resumenLiquidez.flujoCajaNetoMes.real)}
                </span>
              </div>
            </div>
          </div>

          <div>
            <p className="text-indigo-300 font-bold text-3xs uppercase tracking-wider">Saldo Final de Caja Proyectado vs Real</p>
            <div className="grid grid-cols-2 gap-4 mt-2">
              <div className="bg-slate-800/40 p-2.5 rounded-xl border border-slate-700/30">
                <span className="text-3xs text-slate-455 block">Proyectado (Budget)</span>
                <span className="font-extrabold text-sm">{formatNum(resumenLiquidez.saldoCajaFinal.projected)}</span>
              </div>
              <div className="bg-indigo-950/40 p-2.5 rounded-xl border border-indigo-900/40">
                <span className="text-3xs text-indigo-300 block">Caja Real Cierre</span>
                <span className="font-extrabold text-sm text-green-400">{formatNum(resumenLiquidez.saldoCajaFinal.real)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
