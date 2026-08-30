'use client';

import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { TrendingUp, TrendingDown, Wallet, CreditCard, ShieldCheck } from 'lucide-react';
import { useTheme } from '../../lib/theme-context';
import { NetWorthEvolutionResponse, NetWorthEvolutionPoint } from '@sistema-contable/shared';
import { cn } from '../../lib/utils';

export interface LegacyHistoryPoint {
  date: string;
  balance: number;
}

export interface NetWorthChartProps {
  data: NetWorthEvolutionResponse | LegacyHistoryPoint[];
  isLoading?: boolean;
  currencySymbol?: string;
}

export default function NetWorthChart({
  data,
  isLoading = false,
  currencySymbol = '$',
}: NetWorthChartProps) {
  let theme = 'light';
  try {
    const themeCtx = useTheme();
    if (themeCtx?.theme) {
      theme = themeCtx.theme;
    }
  } catch {
    theme = 'light';
  }

  // Normalize incoming data structure
  let points: NetWorthEvolutionPoint[] = [];
  let latest = { assets: 0, liabilities: 0, netWorth: 0 };
  let change12Months = 0;
  let changePercentage = 0;

  if (Array.isArray(data)) {
    // Legacy array format
    points = data.map((p) => ({
      period: p.date.substring(0, 7),
      date: p.date,
      assets: p.balance > 0 ? p.balance : 0,
      liabilities: p.balance < 0 ? Math.abs(p.balance) : 0,
      netWorth: p.balance,
    }));
    if (points.length > 0) {
      const last = points[points.length - 1];
      latest = { assets: last.assets, liabilities: last.liabilities, netWorth: last.netWorth };
      const first = points[0];
      change12Months = latest.netWorth - first.netWorth;
      changePercentage =
        first.netWorth !== 0
          ? Number(((change12Months / Math.abs(first.netWorth)) * 100).toFixed(2))
          : 0;
    }
  } else if (data && Array.isArray(data.history)) {
    // Standard NetWorthEvolutionResponse
    points = data.history;
    latest = data.latest || { assets: 0, liabilities: 0, netWorth: 0 };
    change12Months = data.change12Months || 0;
    changePercentage = data.changePercentage || 0;
  }

  if (isLoading) {
    return (
      <div className="bg-card text-card-foreground p-6 rounded-3xl border border-border shadow-sm animate-pulse space-y-4">
        <div className="h-6 bg-muted rounded-xl w-1/3"></div>
        <div className="h-48 bg-muted/60 rounded-2xl w-full"></div>
      </div>
    );
  }

  if (!points || points.length === 0) {
    return (
      <div className="bg-card text-card-foreground p-8 rounded-3xl border border-border shadow-sm text-center py-14">
        <ShieldCheck className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
        <p className="text-sm font-semibold text-foreground">
          Sin registros históricos suficientes
        </p>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
          Insuficientes transacciones para graficar la evolución del patrimonio. Registre
          movimientos contables para visualizar el gráfico evolutivo.
        </p>
      </div>
    );
  }

  // Format points for Recharts
  const chartData = points.map((p) => {
    const d = new Date(p.date + 'T00:00:00');
    const label = isNaN(d.getTime())
      ? p.period
      : d.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' });

    return {
      period: p.period,
      label,
      netWorth: p.netWorth,
      assets: p.assets,
      liabilities: p.liabilities,
    };
  });

  const isPositiveChange = change12Months >= 0;

  return (
    <div className="bg-card text-card-foreground p-5 sm:p-6 rounded-3xl border border-border shadow-sm space-y-5">
      {/* Header & Main Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-foreground">Evolución del Patrimonio</h3>
            <span
              data-testid="net-worth-change-badge"
              className={cn(
                'inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-lg border',
                isPositiveChange
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
              )}
            >
              {isPositiveChange ? (
                <TrendingUp className="w-3.5 h-3.5" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5" />
              )}
              {isPositiveChange ? '+' : ''}
              {changePercentage.toFixed(1)}% (12m)
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Histórico Neto Activos vs Pasivos (Balance General consolidado)
          </p>
        </div>

        <div className="flex items-baseline gap-2 bg-muted/40 dark:bg-muted/20 border border-border px-4 py-2 rounded-2xl">
          <span className="text-xs text-muted-foreground font-medium">Patrimonio Actual:</span>
          <span
            data-testid="latest-net-worth"
            className="text-lg sm:text-xl font-black text-primary tabular-nums tracking-tight"
          >
            {currencySymbol}
            {latest.netWorth.toLocaleString('es-PY', { minimumFractionDigits: 0 })}
          </span>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 bg-muted/30 dark:bg-muted/10 border border-border rounded-2xl flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <Wallet className="w-4 h-4" />
          </div>
          <div>
            <span className="text-3xs font-semibold text-muted-foreground uppercase tracking-wider block">
              Activos Totales
            </span>
            <span
              data-testid="kpi-total-assets"
              className="text-sm font-bold text-foreground tabular-nums"
            >
              {currencySymbol}
              {latest.assets.toLocaleString('es-PY', { minimumFractionDigits: 0 })}
            </span>
          </div>
        </div>

        <div className="p-3.5 bg-muted/30 dark:bg-muted/10 border border-border rounded-2xl flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
            <CreditCard className="w-4 h-4" />
          </div>
          <div>
            <span className="text-3xs font-semibold text-muted-foreground uppercase tracking-wider block">
              Pasivos Totales
            </span>
            <span
              data-testid="kpi-total-liabilities"
              className="text-sm font-bold text-foreground tabular-nums"
            >
              {currencySymbol}
              {latest.liabilities.toLocaleString('es-PY', { minimumFractionDigits: 0 })}
            </span>
          </div>
        </div>

        <div className="p-3.5 bg-muted/30 dark:bg-muted/10 border border-border rounded-2xl flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <span className="text-3xs font-semibold text-muted-foreground uppercase tracking-wider block">
              Patrimonio Neto
            </span>
            <span
              data-testid="kpi-net-worth"
              className="text-sm font-bold text-foreground tabular-nums"
            >
              {currencySymbol}
              {latest.netWorth.toLocaleString('es-PY', { minimumFractionDigits: 0 })}
            </span>
          </div>
        </div>
      </div>

      {/* Chart Area */}
      <div className="w-full h-64 sm:h-72 pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="netWorthGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.3} vertical={false} />
            <XAxis
              dataKey="label"
              stroke="#94a3b8"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              dy={6}
            />
            <YAxis
              stroke="#94a3b8"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) =>
                `${currencySymbol}${value >= 1000000 ? `${(value / 1000000).toFixed(1)}M` : value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value}`
              }
            />
            <Tooltip
              contentStyle={{
                backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff',
                border: theme === 'dark' ? '1px solid #334155' : '1px solid #e2e8f0',
                borderRadius: '16px',
                fontSize: '12px',
                color: theme === 'dark' ? '#f8fafc' : '#0f172a',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                padding: '12px',
              }}
              formatter={(value: any, name: any) => {
                const num = Number(value) || 0;
                const formatted = `${currencySymbol}${num.toLocaleString('es-PY', { minimumFractionDigits: 0 })}`;
                if (name === 'netWorth') return [formatted, 'Patrimonio Neto'];
                if (name === 'assets') return [formatted, 'Activos'];
                if (name === 'liabilities') return [formatted, 'Pasivos'];
                return [formatted, name];
              }}
              labelFormatter={(label, items) => {
                const item = items && items[0] ? items[0].payload : null;
                return item ? `Período ${item.period} (${label})` : label;
              }}
            />
            <Area
              type="monotone"
              dataKey="netWorth"
              name="netWorth"
              stroke="#6366f1"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#netWorthGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
