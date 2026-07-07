"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "../../../../services/api";
import { ArrowLeft, ShieldAlert, Calendar, BarChart3, TrendingUp, DollarSign } from "lucide-react";

type ForecastMonth = {
  periodId: string;
  periodName: string;
  status: "OPEN" | "CLOSED";
  income: number;
  expense: number;
  netProfit: number;
  isReal: boolean;
};

type ForecastReport = {
  fiscalYearName: string;
  months: ForecastMonth[];
};

export default function IncomeStatementForecastPage() {
  const router = useRouter();
  const [fiscalYears, setFiscalYears] = useState<any[]>([]);
  const [selectedYearId, setSelectedYearId] = useState("");
  const [report, setReport] = useState<ForecastReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadFiscalYears();
  }, []);

  useEffect(() => {
    if (selectedYearId) {
      loadForecast();
    }
  }, [selectedYearId]);

  const loadFiscalYears = async () => {
    try {
      setLoading(true);
      const years = await api.fiscalYears.list();
      setFiscalYears(years || []);
      if (years && years.length > 0) {
        // Select first open year or the first one available
        const active = years.find((y: any) => y.status === "OPEN") || years[0];
        setSelectedYearId(active.id);
      } else {
        setLoading(false);
      }
    } catch (err: any) {
      setError(err.message || "Error al cargar los ejercicios fiscales.");
      setLoading(false);
    }
  };

  const loadForecast = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await api.reports.realVsProjectedIncomeStatement(selectedYearId);
      setReport(data);
    } catch (err: any) {
      setError(err.message || "Error al calcular el reporte proyectado.");
    } finally {
      setLoading(false);
    }
  };

  const formatNum = (num: number) => {
    return num.toLocaleString("es-PY", { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + " ₲";
  };

  if (loading && fiscalYears.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <span className="text-xs text-slate-400 font-semibold">Cargando reporte...</span>
      </div>
    );
  }

  const months = report?.months || [];
  const totalIncome = months.reduce((sum, m) => sum + m.income, 0);
  const totalExpense = months.reduce((sum, m) => sum + m.expense, 0);
  const totalNet = totalIncome - totalExpense;

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      
      {/* Top Header */}
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
              Estado de Resultados Proyectado
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Visualización mensualizada de Ingresos y Egresos (Real vs. Presupuesto)
            </p>
          </div>
        </div>

        {/* Year Selector */}
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400" />
          <select
            value={selectedYearId}
            onChange={(e) => setSelectedYearId(e.target.value)}
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-xs font-bold focus:border-indigo-500"
          >
            {fiscalYears.map((y) => (
              <option key={y.id} value={y.id}>
                {y.name} {y.status === "CLOSED" ? "(Cerrado)" : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="p-3.5 text-xs text-red-700 bg-red-50 dark:bg-red-950/30 dark:text-red-400 rounded-2xl border border-red-150 flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {fiscalYears.length === 0 && (
        <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm text-center">
          <p className="text-sm font-semibold text-slate-500">No hay ejercicios fiscales definidos. Debes inicializar uno para ver reportes.</p>
        </div>
      )}

      {report && (
        <>
          {/* Summary Dashboard Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-150 dark:border-slate-700/60 shadow-sm flex items-center gap-4">
              <div className="p-3.5 bg-green-50 dark:bg-green-950/30 text-green-500 rounded-2xl">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <span className="text-4xs font-bold uppercase tracking-wider text-slate-400">Total Ingresos Anual</span>
                <p className="text-lg font-black mt-0.5 text-slate-800 dark:text-slate-100">{formatNum(totalIncome)}</p>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-150 dark:border-slate-700/60 shadow-sm flex items-center gap-4">
              <div className="p-3.5 bg-red-50 dark:bg-red-950/30 text-red-500 rounded-2xl">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <span className="text-4xs font-bold uppercase tracking-wider text-slate-400">Total Gastos Anual</span>
                <p className="text-lg font-black mt-0.5 text-slate-800 dark:text-slate-100">{formatNum(totalExpense)}</p>
              </div>
            </div>

            <div className="bg-gradient-to-tr from-indigo-600 to-indigo-700 text-white p-5 rounded-3xl shadow-md flex items-center gap-4 relative overflow-hidden">
              <div className="absolute right-2 bottom-0 opacity-10">
                <DollarSign className="w-20 h-20" />
              </div>
              <div className="p-3.5 bg-white/10 text-white rounded-2xl z-10">
                <DollarSign className="w-5 h-5" />
              </div>
              <div className="z-10">
                <span className="text-4xs font-bold uppercase tracking-wider text-indigo-200">Resultado Neto del Ejercicio</span>
                <p className="text-lg font-black mt-0.5">{formatNum(totalNet)}</p>
              </div>
            </div>
          </div>

          {/* Forecast Grid Table */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-150 dark:border-slate-700/80 shadow-sm space-y-4">
            <div className="border-b border-slate-100 dark:border-slate-700 pb-3">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Resultados Mensuales</h3>
              <p className="text-3xs text-slate-400 mt-0.5">Control de meses ejecutados (reales) vs. proyectados (presupuestos de meses futuros)</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-150 dark:border-slate-700 text-slate-400 text-3xs font-bold uppercase tracking-wider">
                    <th className="py-2.5">Mes</th>
                    <th className="py-2.5">Origen de Datos</th>
                    <th className="py-2.5 text-right">Ingresos</th>
                    <th className="py-2.5 text-right">Gastos</th>
                    <th className="py-2.5 text-right">Resultado Neto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                  {months.map((m) => (
                    <tr
                      key={m.periodId}
                      className={m.isReal ? "" : "bg-slate-50/30 dark:bg-slate-900/10 font-medium"}
                    >
                      <td className="py-3 font-bold text-slate-700 dark:text-slate-350">{m.periodName}</td>
                      <td className="py-3">
                        {m.isReal ? (
                          <span className="inline-flex py-0.5 px-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 text-5xs font-extrabold uppercase rounded-md tracking-wider">
                            Real Histórico
                          </span>
                        ) : (
                          <span className="inline-flex py-0.5 px-2 bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 text-5xs font-extrabold uppercase rounded-md tracking-wider">
                            Proyectado (Presupuesto)
                          </span>
                        )}
                      </td>
                      <td className="py-3 text-right text-slate-650 dark:text-slate-300 font-semibold">{formatNum(m.income)}</td>
                      <td className="py-3 text-right text-slate-650 dark:text-slate-300 font-semibold">{formatNum(m.expense)}</td>
                      <td className={`py-3 text-right font-black ${m.netProfit >= 0 ? "text-green-600 dark:text-green-400" : "text-red-500"}`}>
                        {formatNum(m.netProfit)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
