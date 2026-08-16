'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ReceiptText,
  BarChart3,
  Wallet,
  Settings,
  LogOut,
  Moon,
  Sun,
  Plus,
  Calendar,
  FileText,
  Table,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useTheme } from '../lib/theme-context';
import { api } from '../services/api';

export default function Sidebar() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  useEffect(() => {
    const saved = localStorage.getItem('sidebar_collapsed');
    if (saved !== null) {
      setIsCollapsed(saved === 'true');
    }
  }, []);

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('sidebar_collapsed', String(next));
      return next;
    });
  };

  const handleLogout = () => {
    api.auth.logout();
    window.location.href = '/';
  };

  const navItems = [
    { name: 'Transacciones', href: '/transactions', icon: ReceiptText },
    { name: 'Cuentas', href: '/accounts', icon: Wallet },
    { name: 'Planificación Presupuestaria', href: '/budgets/matrix', icon: Table },
    { name: 'Control de Ejecución', href: '/budgets/control', icon: ShieldAlert },
    { name: 'Balance General', href: '/reports/balance-sheet', icon: FileText },
    { name: 'Estado de Resultados', href: '/reports/income-statement', icon: FileText },
    { name: 'Resultados Proyectados', href: '/reports/income-statement/forecast', icon: FileText },
    { name: 'Caja Proyectada', href: '/reports/cash-flow', icon: FileText },
    { name: 'Estadísticas', href: '/stats', icon: BarChart3 },
    { name: 'Períodos', href: '/periods', icon: Calendar },
    { name: 'Ajustes', href: '/settings', icon: Settings },
  ];

  return (
    <aside
      className={`hidden sm:flex flex-col ${
        isCollapsed ? 'w-20 p-3' : 'w-64 p-5'
      } bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 min-h-screen justify-between transition-all duration-300 ease-in-out shrink-0`}
    >
      <div className="space-y-6">
        {/* Header / Logo & Collapse Toggle */}
        <div
          className={`flex items-center ${
            isCollapsed ? 'justify-center flex-col gap-3 py-1' : 'justify-between px-1 py-1.5'
          }`}
        >
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="flex items-center justify-center w-9 h-9 shrink-0 bg-indigo-500 text-white rounded-xl shadow-md shadow-indigo-500/20">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.5"
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            {!isCollapsed && (
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-indigo-500 to-indigo-600 bg-clip-text text-transparent truncate">
                Contabilidad
              </span>
            )}
          </div>
          <button
            onClick={toggleCollapse}
            title={isCollapsed ? 'Expandir barra lateral' : 'Contraer barra lateral'}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
          >
            {isCollapsed ? (
              <ChevronRight className="w-5 h-5" />
            ) : (
              <ChevronLeft className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Desktop Quick Add Transaction Button */}
        <div className={isCollapsed ? 'px-0 pt-1 pb-3 flex justify-center' : 'px-2 pt-1 pb-3'}>
          <Link
            href="/transactions/new"
            title="Nueva Transacción"
            className={`flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md shadow-indigo-500/10 transition duration-150 active:scale-95 cursor-pointer ${
              isCollapsed ? 'w-10 h-10 p-0' : 'w-full gap-2 py-2.5 px-4 text-xs'
            }`}
          >
            <Plus className="w-4 h-4 stroke-[2.5] shrink-0" />
            {!isCollapsed && <span>Nueva Transacción</span>}
          </Link>
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              pathname.startsWith(item.href + '/') ||
              (item.href === '/budgets/matrix' && pathname === '/budgets');
            return (
              <Link
                key={item.href}
                href={item.href}
                title={isCollapsed ? item.name : undefined}
                className={`flex items-center rounded-xl text-sm font-semibold transition-all duration-200 ${
                  isCollapsed ? 'justify-center p-3' : 'space-x-3 px-4 py-3'
                } ${
                  isActive
                    ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? 'text-indigo-600 dark:text-indigo-400' : ''
                  }`}
                />
                {!isCollapsed && <span className="truncate">{item.name}</span>}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="space-y-2">
        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          title={isCollapsed ? (theme === 'light' ? 'Modo Oscuro' : 'Modo Claro') : undefined}
          className={`flex items-center w-full rounded-xl text-sm font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:text-slate-800 dark:hover:text-slate-200 transition duration-200 cursor-pointer ${
            isCollapsed ? 'justify-center p-3' : 'space-x-3 px-4 py-2.5'
          }`}
        >
          {theme === 'light' ? (
            <Moon className="w-4 h-4 shrink-0" />
          ) : (
            <Sun className="w-4 h-4 shrink-0" />
          )}
          {!isCollapsed && <span>{theme === 'light' ? 'Modo Oscuro' : 'Modo Claro'}</span>}
        </button>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          title={isCollapsed ? 'Cerrar Sesión' : undefined}
          className={`flex items-center w-full rounded-xl text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition duration-200 cursor-pointer ${
            isCollapsed ? 'justify-center p-3' : 'space-x-3 px-4 py-2.5'
          }`}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!isCollapsed && <span>Cerrar Sesión</span>}
        </button>
      </div>
    </aside>
  );
}
