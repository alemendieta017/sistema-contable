'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Table, ShieldAlert } from 'lucide-react';

export default function BudgetsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isMatrix = pathname.includes('/budgets/matrix');
  const isControl = pathname.includes('/budgets/control');

  return (
    <div className="flex flex-col h-full space-y-6">
      {/* View Switcher Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg">
        <div>
          <h1 className="text-xl font-bold text-slate-100 tracking-tight">
            Gestión y Control Presupuestario
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Planificación matricial a 12 meses y control ejecutivo de ejecución mensual en tiempo
            real.
          </p>
        </div>

        <div className="flex items-center p-1 bg-slate-950 rounded-lg border border-slate-800">
          <Link
            href="/budgets/matrix"
            className={`flex items-center space-x-2 px-4 py-2 rounded-md text-xs font-semibold transition-all ${
              isMatrix
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Table className="w-3.5 h-3.5" />
            <span>Matriz Anual 12 Meses</span>
          </Link>

          <Link
            href="/budgets/control"
            className={`flex items-center space-x-2 px-4 py-2 rounded-md text-xs font-semibold transition-all ${
              isControl
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Control Ejecución Mensual</span>
          </Link>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1">{children}</div>
    </div>
  );
}
