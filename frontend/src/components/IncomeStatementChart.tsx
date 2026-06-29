"use client";

import React from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from "recharts";
import { useTheme } from "../lib/theme-context";

interface MonthlyBalance {
  monthName: string;
  income: number;
  expense: number;
}

interface IncomeStatementChartProps {
  data: MonthlyBalance[];
}

export default function IncomeStatementChart({ data }: IncomeStatementChartProps) {
  const { theme } = useTheme();

  if (data.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm text-center py-12 text-xs text-slate-400">
        Insuficientes datos para graficar la comparativa de ingresos y gastos.
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm space-y-4">
      <div>
        <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">
          Comparativa Mensual
        </h3>
        <p className="text-4xs text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-0.5">
          Ingresos vs Gastos
        </p>
      </div>

      <div className="w-full h-44">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <XAxis
              dataKey="monthName"
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
              formatter={(value: any) => [`$${value.toLocaleString()}`]}
            />
            <Legend
              verticalAlign="bottom"
              height={36}
              iconType="circle"
              iconSize={6}
              wrapperStyle={{
                fontSize: "8px",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                fontWeight: "bold",
                paddingTop: "12px",
              }}
            />
            <Bar
              dataKey="income"
              name="Ingreso"
              fill="#10b981"
              radius={[4, 4, 0, 0]}
              maxBarSize={16}
            />
            <Bar
              dataKey="expense"
              name="Gasto"
              fill="#ef4444"
              radius={[4, 4, 0, 0]}
              maxBarSize={16}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
