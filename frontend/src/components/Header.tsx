'use client';

import React, { useEffect } from 'react';
import { Search, Sun, Moon } from 'lucide-react';
import { useSearch } from '../lib/search-context';
import { useTheme } from '../lib/theme-context';
import { usePathname } from 'next/navigation';
import HeaderProfileMenu from './layout/HeaderProfileMenu';

export default function Header() {
  const { searchQuery, setSearchQuery } = useSearch();
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();

  // Reset search query when navigating between pages
  useEffect(() => {
    setSearchQuery('');
  }, [pathname, setSearchQuery]);

  const isAccountsSection = pathname.startsWith('/accounts');

  return (
    <header className="h-16 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-between px-6 sticky top-0 z-30 shadow-sm">
      {/* Search Input Box */}
      <div className="flex-1 max-w-md">
        <div className="relative flex items-center">
          <Search className="absolute left-3 w-4 h-4 text-slate-400 dark:text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              isAccountsSection ? 'Buscar cuentas por nombre...' : 'Buscar transacciones...'
            }
            className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 transition-all duration-200 text-slate-800 dark:text-slate-100 placeholder-slate-400"
          />
        </div>
      </div>

      {/* User Session Info / Controls */}
      <div className="flex items-center space-x-4">
        {/* Toggle Theme in Header (Mobile/Tablet Friendly Shortcut) */}
        <button
          onClick={toggleTheme}
          className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
        >
          {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
        </button>

        {/* Top-Right Header Profile Dropdown */}
        <HeaderProfileMenu />
      </div>
    </header>
  );
}
