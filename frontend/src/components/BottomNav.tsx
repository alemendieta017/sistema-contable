'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ReceiptText, BarChart3, Menu, Wallet, Plus } from 'lucide-react';
import { useTheme } from '../lib/theme-context';
import { api } from '../services/api';
import { MobileNavDrawer } from './navigation/MobileNavDrawer';
import { mobileDrawerSections, isNavItemActive } from '../config/navigation';

export default function BottomNav() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = () => {
    api.auth.logout();
    window.location.href = '/';
  };

  const isMoreActive =
    isMenuOpen ||
    mobileDrawerSections.some((section) =>
      section.items.some((item) => isNavItemActive(item, pathname)),
    );

  return (
    <>
      {/* Bottom Bar */}
      <nav
        aria-label="Navegación inferior móvil"
        className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-around px-2 z-40 shadow-lg animate-in fade-in duration-200"
      >
        <Link
          href="/transactions"
          aria-label="Registro de transacciones"
          className={`flex flex-col items-center justify-center flex-1 py-1 min-h-[48px] transition-colors ${
            pathname.startsWith('/transactions')
              ? 'text-indigo-600 dark:text-indigo-400 font-bold'
              : 'text-slate-400 dark:text-slate-500 hover:text-slate-600'
          }`}
        >
          <ReceiptText className="w-5 h-5" />
          <span className="text-[10px] mt-1">Registro</span>
        </Link>

        <Link
          href="/accounts"
          aria-label="Gestión de cuentas"
          className={`flex flex-col items-center justify-center flex-1 py-1 min-h-[48px] transition-colors ${
            pathname.startsWith('/accounts')
              ? 'text-indigo-600 dark:text-indigo-400 font-bold'
              : 'text-slate-400 dark:text-slate-500 hover:text-slate-600'
          }`}
        >
          <Wallet className="w-5 h-5" />
          <span className="text-[10px] mt-1">Cuentas</span>
        </Link>

        {/* Center Quick Add Elevated Button */}
        <div className="flex items-center justify-center px-1">
          <Link
            href="/transactions/new"
            aria-label="Nueva transacción rápida"
            title="Nueva Transacción"
            className="w-12 h-12 -mt-5 rounded-full bg-brand-gradient text-white flex items-center justify-center shadow-brand-glow hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer border-2 border-white dark:border-slate-900 focus:outline-none"
          >
            <Plus className="w-6 h-6 stroke-[2.5]" />
          </Link>
        </div>

        <Link
          href="/stats"
          aria-label="Estadísticas financieras"
          className={`flex flex-col items-center justify-center flex-1 py-1 min-h-[48px] transition-colors ${
            pathname.startsWith('/stats')
              ? 'text-indigo-600 dark:text-indigo-400 font-bold'
              : 'text-slate-400 dark:text-slate-500 hover:text-slate-600'
          }`}
        >
          <BarChart3 className="w-5 h-5" />
          <span className="text-[10px] mt-1">Estadísticas</span>
        </Link>

        <button
          type="button"
          aria-label="Abrir más opciones de menú"
          aria-expanded={isMenuOpen}
          onClick={() => setIsMenuOpen(true)}
          className={`flex flex-col items-center justify-center flex-1 py-1 min-h-[48px] cursor-pointer transition-colors ${
            isMoreActive
              ? 'text-indigo-600 dark:text-indigo-400 font-bold'
              : 'text-slate-400 dark:text-slate-500 hover:text-slate-600'
          }`}
        >
          <Menu className="w-5 h-5" />
          <span className="text-[10px] mt-1">Más</span>
        </button>
      </nav>

      {/* Categorized Mobile Navigation Drawer Sheet */}
      <MobileNavDrawer
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        pathname={pathname}
        theme={theme}
        onThemeToggle={toggleTheme}
        onLogout={handleLogout}
      />
    </>
  );
}
