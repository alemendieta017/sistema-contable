"use client";

import React from "react";

interface MonthlyBalance {
  monthName: string;
  income: number;
  expense: number;
}

interface IncomeStatementChartProps {
  data: MonthlyBalance[];
}

export default function IncomeStatementChart({ data }: IncomeStatementChartProps) {
  if (data.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm text-center py-12 text-xs text-slate-400">
        Insuficientes datos para graficar la comparativa de ingresos y gastos.
      </div>
    );
  }

  // Dimensions
  const width = 500;
  const height = 180;
  const padding = 20;

  // Max value for scaling
  const maxVal = Math.max(
    ...data.flatMap((d) => [d.income, d.expense]),
    100
  ) * 1.15; // 15% headroom

  const chartWidth = width - 2 * padding;
  const chartHeight = height - 2 * padding;

  const barWidth = 14;
  const groupSpacing = chartWidth / data.length;

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

      <div className="w-full">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
          {/* Grid lines */}
          <line
            x1={padding}
            y1={height - padding}
            x2={width - padding}
            y2={height - padding}
            stroke="#f1f5f9"
            className="dark:stroke-slate-700/60"
            strokeWidth="1.5"
          />

          {data.map((m, idx) => {
            const groupX = padding + idx * groupSpacing + groupSpacing / 2;

            // Coordinates for Income Bar
            const incBarHeight = (m.income / maxVal) * chartHeight;
            const incX = groupX - barWidth - 2;
            const incY = height - padding - incBarHeight;

            // Coordinates for Expense Bar
            const expBarHeight = (m.expense / maxVal) * chartHeight;
            const expX = groupX + 2;
            const expY = height - padding - expBarHeight;

            return (
              <g key={m.monthName}>
                {/* Income Bar (Green) */}
                {m.income > 0 && (
                  <rect
                    x={incX}
                    y={incY}
                    width={barWidth}
                    height={incBarHeight}
                    fill="#10b981"
                    rx="3.5"
                    className="hover:opacity-90 transition duration-150 cursor-pointer"
                  >
                    <title>{m.monthName} - Ingreso: ${m.income.toLocaleString()}</title>
                  </rect>
                )}

                {/* Expense Bar (Red) */}
                {m.expense > 0 && (
                  <rect
                    x={expX}
                    y={expY}
                    width={barWidth}
                    height={expBarHeight}
                    fill="#ef4444"
                    rx="3.5"
                    className="hover:opacity-90 transition duration-150 cursor-pointer"
                  >
                    <title>{m.monthName} - Gasto: ${m.expense.toLocaleString()}</title>
                  </rect>
                )}

                {/* Month Name label */}
                <text
                  x={groupX}
                  y={height - padding + 14}
                  textAnchor="middle"
                  className="fill-slate-400 dark:fill-slate-500 font-semibold"
                  style={{ fontSize: "7px" }}
                >
                  {m.monthName}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 text-4xs font-bold uppercase tracking-wider text-slate-450 dark:text-slate-500">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 bg-green-500 rounded" />
          <span>Ingreso</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 bg-red-500 rounded" />
          <span>Gasto</span>
        </div>
      </div>
    </div>
  );
}
