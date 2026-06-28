"use client";

import React from "react";

interface HistoryPoint {
  date: string;
  balance: number;
}

interface NetWorthChartProps {
  data: HistoryPoint[];
}

export default function NetWorthChart({ data }: NetWorthChartProps) {
  if (data.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm text-center py-12 text-xs text-slate-400">
        Insuficientes transacciones para graficar la evolución del patrimonio.
      </div>
    );
  }

  // Sort data by date ascending
  const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date));

  // If there's only 1 point, duplicate it to show a flat line
  if (sorted.length === 1) {
    const single = sorted[0];
    const prevDate = new Date(single.date);
    prevDate.setDate(prevDate.getDate() - 7);
    sorted.unshift({ date: prevDate.toISOString().substring(0, 10), balance: single.balance });
  }

  // Dimensions
  const width = 500;
  const height = 180;
  const padding = 20;

  // Find min/max values for scaling
  const balances = sorted.map((p) => p.balance);
  const minBalance = Math.min(...balances, 0); // Include 0
  const maxBalance = Math.max(...balances, 100) * 1.1; // Add 10% headroom

  const dateObjs = sorted.map((p) => new Date(p.date).getTime());
  const minTime = Math.min(...dateObjs);
  const maxTime = Math.max(...dateObjs);

  const timeRange = maxTime - minTime || 1;
  const balanceRange = maxBalance - minBalance || 1;

  // Map data to SVG coordinates
  const points = sorted.map((p) => {
    const t = new Date(p.date).getTime();
    const x = padding + ((t - minTime) / timeRange) * (width - 2 * padding);
    const y = height - padding - ((p.balance - minBalance) / balanceRange) * (height - 2 * padding);
    return { x, y, raw: p };
  });

  // Build the line path command (d)
  const linePath = points.reduce((path, pt, idx) => {
    if (idx === 0) return `M ${pt.x} ${pt.y}`;
    return `${path} L ${pt.x} ${pt.y}`;
  }, "");

  // Build the area path command (d) that closes at the bottom
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

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
          ${sorted[sorted.length - 1].balance.toLocaleString(undefined, { minimumFractionDigits: 1 })}
        </span>
      </div>

      <div className="w-full relative">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
          <defs>
            {/* Gradient for area fill */}
            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0.00" />
            </linearGradient>
          </defs>

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
          <line
            x1={padding}
            y1={padding}
            x2={width - padding}
            y2={padding}
            stroke="#f1f5f9"
            className="dark:stroke-slate-700/30"
            strokeDasharray="4 4"
            strokeWidth="1"
          />

          {/* Area Fill */}
          <path d={areaPath} fill="url(#areaGrad)" />

          {/* Line Path */}
          <path
            d={linePath}
            fill="none"
            stroke="#6366f1"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Nodes */}
          {points.map((pt, idx) => (
            <circle
              key={idx}
              cx={pt.x}
              cy={pt.y}
              r="4.5"
              fill="#ffffff"
              stroke="#6366f1"
              strokeWidth="2.5"
              className="hover:r-6 cursor-pointer transition-all duration-150"
            >
              <title>
                {new Date(pt.raw.date).toLocaleDateString()}: ${pt.raw.balance.toLocaleString()}
              </title>
            </circle>
          ))}
        </svg>
      </div>

      {/* Axis Dates */}
      <div className="flex justify-between items-center text-4xs text-slate-400 dark:text-slate-500 px-2 font-semibold">
        <span>{new Date(sorted[0].date).toLocaleDateString()}</span>
        <span>{new Date(sorted[sorted.length - 1].date).toLocaleDateString()}</span>
      </div>
    </div>
  );
}
