"use client";

import React, { useState } from "react";
import { ResponsiveContainer, PieChart as RePieChart, Pie, Cell, Sector } from "recharts";
import { useTheme } from "../lib/theme-context";

interface StatItem {
  accountId: string;
  accountName: string;
  amount: number;
  percentage: number;
}

interface PieChartProps {
  data: StatItem[];
  type: "EXPENSE" | "INCOME";
}

const colors = [
  "#6366f1", // Indigo
  "#10b981", // Emerald
  "#f59e0b", // Amber
  "#ec4899", // Pink
  "#0ea5e9", // Sky
  "#8b5cf6", // Violet
  "#ef4444", // Red
  "#14b8a6", // Teal
];

export default function PieChart({ data, type }: PieChartProps) {
  const { theme } = useTheme();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const total = data.reduce((sum, item) => sum + item.amount, 0);

  if (data.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm text-center py-12 text-xs text-slate-400">
        No hay datos para graficar.
      </div>
    );
  }

  // Active shape rendering for a clean look
  const renderActiveShape = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
    return (
      <g>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius + 4}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
        />
      </g>
    );
  };

  const activeItem = activeIndex !== null ? data[activeIndex] : null;

  return (
    <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col md:flex-row items-center gap-6">
      {/* Recharts Container */}
      <div className="relative w-40 h-40 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <RePieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={36}
              outerRadius={50}
              dataKey="amount"
              onMouseEnter={(_, index) => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
              paddingAngle={2}
              {...({
                activeIndex: activeIndex ?? undefined,
                activeShape: renderActiveShape,
              } as any)}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} stroke="transparent" />
              ))}
            </Pie>
          </RePieChart>
        </ResponsiveContainer>

        {/* Center label inside Doughnut */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-3">
          <span className="text-5xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none truncate max-w-full">
            {activeItem ? activeItem.accountName : `Total ${type === "EXPENSE" ? "Gasto" : "Ingreso"}`}
          </span>
          <span className={`font-extrabold text-xs sm:text-sm mt-1 leading-none truncate max-w-full ${type === "EXPENSE" ? "text-red-500" : "text-green-500"}`}>
            ${(activeItem ? activeItem.amount : total).toLocaleString(undefined, {
              minimumFractionDigits: 2,
            })}
          </span>
          {activeItem && (
            <span className="text-5xs text-slate-450 dark:text-slate-500 font-bold mt-0.5">
              {activeItem.percentage}%
            </span>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex-1 w-full space-y-2 text-2xs">
        {data.map((item, index) => {
          const color = colors[index % colors.length];
          const isHovered = activeIndex === index;
          return (
            <div
              key={item.accountId}
              onMouseEnter={() => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
              className={`flex items-center justify-between p-1.5 rounded-lg transition duration-150 cursor-pointer ${
                isHovered ? "bg-slate-50 dark:bg-slate-900/60 font-bold" : "hover:bg-slate-50/40"
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: color }}
                />
                <span className="text-slate-700 dark:text-slate-350 truncate">{item.accountName}</span>
              </div>
              <span className="font-semibold text-slate-400 dark:text-slate-550 shrink-0 ml-2">
                ${item.amount.toLocaleString(undefined, { minimumFractionDigits: 1 })} ({item.percentage}%)
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
