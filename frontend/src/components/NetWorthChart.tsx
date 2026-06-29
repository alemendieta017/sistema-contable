"use client";

import React from "react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from "recharts";
import { useTheme } from "../lib/theme-context";

interface HistoryPoint {
  date: string;
  balance: number;
}

interface NetWorthChartProps {
  data: HistoryPoint[];
}

export default function NetWorthChart({ data }: NetWorthChartProps) {
  const { theme } = useTheme();

  if (data.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm text-center py-12 text-xs text-slate-400">
        Insuficientes transacciones para graficar la evolución del patrimonio.
      </div>
    );
  }

  // Sort and format data
  const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date));
  const chartData = sorted.map((p) => ({
    date: new Date(p.date).toLocaleDateString("es-ES", { day: "numeric", month: "short" }),
    balance: p.balance,
  }));

  const lastBalance = sorted[sorted.length - 1].balance;

  return (
    <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm space-y-4">
      <div className="flex justify-between items-center px-1">
        <div>
          <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">
            Evolución del Patrimonio
          </h3>
          <p className="text-4xs text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-0.5">
            Histórico Neto Activos vs Pasivos
          </p>
        </div>
        <span className="text-3xs font-bold text-indigo-500 bg-indigo-50 dark:bg-indigo-950/20 px-2.5 py-1 rounded-lg">
          ${lastBalance.toLocaleString(undefined, { minimumFractionDigits: 1 })}
        </span>
      </div>

      <div className="w-full h-44">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="netWorthGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="date"
              stroke="#94a3b8"
              fontSize={8}
              tickLine={false}
              axisLine={false}
              dy={8}
            />
            <YAxis
              stroke="#94a3b8"
              fontSize={8}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `$${value}`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: theme === "dark" ? "#1e293b" : "#ffffff",
                border: theme === "dark" ? "1px solid #334155" : "1px solid #e2e8f0",
                borderRadius: "12px",
                fontSize: "10px",
                color: theme === "dark" ? "#f8fafc" : "#0f172a",
              }}
              formatter={(value: any) => [`$${value.toLocaleString()}`, "Patrimonio"]}
            />
            <Area
              type="monotone"
              dataKey="balance"
              stroke="#6366f1"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#netWorthGrad)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
