"use client";

import React, { useState } from "react";

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

export default function PieChart({ data, type }: PieChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

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

  const total = data.reduce((sum, item) => sum + item.amount, 0);

  // Circumference of our SVG circle (radius = 50)
  const radius = 50;
  const circumference = 2 * Math.PI * radius; // ~314.159

  let accumulatedPercentage = 0;

  return (
    <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col md:flex-row items-center gap-6">
      {/* SVG Doughnut */}
      <div className="relative w-40 h-40 shrink-0">
        <svg viewBox="0 0 120 120" className="w-full h-full transform -rotate-90">
          {data.length === 0 ? (
            <circle
              cx="60"
              cy="60"
              r={radius}
              fill="transparent"
              stroke="#e2e8f0"
              strokeWidth="12"
            />
          ) : (
            data.map((item, index) => {
              const strokeLength = (item.percentage / 100) * circumference;
              const strokeOffset = circumference - (accumulatedPercentage / 100) * circumference;
              accumulatedPercentage += item.percentage;
              const color = colors[index % colors.length];
              const isHovered = hoveredIndex === index;

              return (
                <circle
                  key={item.accountId}
                  cx="60"
                  cy="60"
                  r={radius}
                  fill="transparent"
                  stroke={color}
                  strokeWidth={isHovered ? "16" : "12"}
                  strokeDasharray={`${strokeLength} ${circumference}`}
                  strokeDashoffset={strokeOffset}
                  strokeLinecap="round"
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  className="transition-all duration-300 cursor-pointer"
                />
              );
            })
          )}
        </svg>

        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
          <span className="text-5xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none">
            {hoveredIndex !== null ? data[hoveredIndex].accountName : `Total ${type === "EXPENSE" ? "Gasto" : "Ingreso"}`}
          </span>
          <span className={`font-extrabold text-sm mt-1 leading-none ${type === "EXPENSE" ? "text-red-500" : "text-green-500"}`}>
            ${(hoveredIndex !== null ? data[hoveredIndex].amount : total).toLocaleString(undefined, {
              minimumFractionDigits: 2,
            })}
          </span>
          {hoveredIndex !== null && (
            <span className="text-4xs text-slate-400 font-semibold mt-0.5">
              {data[hoveredIndex].percentage}%
            </span>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex-1 w-full space-y-2 text-2xs">
        {data.map((item, index) => {
          const color = colors[index % colors.length];
          const isHovered = hoveredIndex === index;
          return (
            <div
              key={item.accountId}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
              className={`flex items-center justify-between p-1.5 rounded-lg transition duration-150 cursor-pointer ${
                isHovered ? "bg-slate-50 dark:bg-slate-900/60 font-bold" : "hover:bg-slate-50/40"
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: color }}
                />
                <span className="text-slate-700 dark:text-slate-350">{item.accountName}</span>
              </div>
              <span className="font-semibold text-slate-400">
                ${item.amount.toLocaleString(undefined, { minimumFractionDigits: 1 })} ({item.percentage}%)
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
