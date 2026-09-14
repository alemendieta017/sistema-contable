'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogOut, Moon, Sun, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTheme } from '../lib/theme-context';
import { api } from '../services/api';
import { navigationRegistry, isNavGroup, isNavItem, isNavGroupActive } from '../config/navigation';
import { SidebarNavItem } from './navigation/SidebarNavItem';
import { SidebarNavGroup } from './navigation/SidebarNavGroup';
import { SidebarFlyout } from './navigation/SidebarFlyout';
import BrandLogo from './brand/BrandLogo';

export default function Sidebar() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [flyoutGroupId, setFlyoutGroupId] = useState<string | null>(null);
  const flyoutCloseTimer = useRef<NodeJS.Timeout | null>(null);

  // Restore collapsed state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('sidebar_collapsed');
    if (saved !== null) {
      setIsCollapsed(saved === 'true');
    }
  }, []);

  // Cleanup flyout close timer on unmount
  useEffect(() => {
    return () => {
      if (flyoutCloseTimer.current) {
        clearTimeout(flyoutCloseTimer.current);
      }
    };
  }, []);

  // Auto-expand groups when pathname matches an active child (US3)
  useEffect(() => {
    navigationRegistry.forEach((entry) => {
      if (isNavGroup(entry)) {
        if (isNavGroupActive(entry, pathname)) {
          setExpandedGroups((prev) => ({
            ...prev,
            [entry.id]: true,
          }));
        }
      }
    });
  }, [pathname]);

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('sidebar_collapsed', String(next));
      if (next) {
        setFlyoutGroupId(null);
      }
      return next;
    });
  };

  const handleToggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  const handleLogout = () => {
    api.auth.logout();
    window.location.href = '/';
  };

  const handleFlyoutOpen = (groupId: string) => {
    if (flyoutCloseTimer.current) {
      clearTimeout(flyoutCloseTimer.current);
      flyoutCloseTimer.current = null;
    }
    setFlyoutGroupId(groupId);
  };

  const handleFlyoutClose = () => {
    setFlyoutGroupId(null);
  };

  const handleFlyoutHoverLeave = () => {
    flyoutCloseTimer.current = setTimeout(() => {
      setFlyoutGroupId(null);
    }, 150);
  };

  return (
    <aside
      aria-label="Barra lateral principal"
      className={`hidden sm:flex flex-col ${
        isCollapsed ? 'w-20 p-3' : 'w-64 p-5'
      } bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800 min-h-screen justify-between transition-all duration-300 ease-in-out shrink-0`}
    >
      <div className="space-y-6">
        {/* Header / Logo & Collapse Toggle */}
        <div
          className={`flex items-center ${
            isCollapsed ? 'justify-center flex-col gap-3 py-1' : 'justify-between px-1 py-1.5'
          }`}
        >
          <Link
            href="/transactions"
            className="flex items-center overflow-hidden focus:outline-none"
          >
            {isCollapsed ? (
              <BrandLogo variant="icon" className="w-8 h-8" />
            ) : (
              <BrandLogo variant="horizontal" className="h-7 w-auto max-w-[170px]" />
            )}
          </Link>
          <button
            type="button"
            onClick={toggleCollapse}
            aria-label={isCollapsed ? 'Expandir barra lateral' : 'Contraer barra lateral'}
            title={isCollapsed ? 'Expandir barra lateral' : 'Contraer barra lateral'}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
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
            className={`flex items-center justify-center bg-brand-gradient hover:opacity-95 text-white font-bold rounded-xl shadow-brand-glow-sm hover:shadow-brand-glow transition-all duration-150 active:scale-95 cursor-pointer ${
              isCollapsed ? 'w-10 h-10 p-0' : 'w-full gap-2 py-2.5 px-4 text-xs'
            }`}
          >
            <Plus className="w-4 h-4 stroke-[2.5] shrink-0" />
            {!isCollapsed && <span>Nueva Transacción</span>}
          </Link>
        </div>

        {/* Navigation Items / Groups */}
        <nav className="space-y-1" aria-label="Navegación del sistema">
          {navigationRegistry.map((entry) => {
            if (isNavGroup(entry)) {
              if (isCollapsed) {
                return (
                  <div
                    key={entry.id}
                    className="relative"
                    onMouseEnter={() => handleFlyoutOpen(entry.id)}
                    onMouseLeave={handleFlyoutHoverLeave}
                  >
                    <SidebarNavGroup
                      group={entry}
                      isSidebarCollapsed={true}
                      isExpanded={flyoutGroupId === entry.id}
                      onToggleExpand={() =>
                        setFlyoutGroupId((prev) => (prev === entry.id ? null : entry.id))
                      }
                      pathname={pathname}
                    />
                    <SidebarFlyout
                      group={entry}
                      pathname={pathname}
                      isOpen={flyoutGroupId === entry.id}
                      onClose={handleFlyoutClose}
                    />
                  </div>
                );
              }

              return (
                <SidebarNavGroup
                  key={entry.id}
                  group={entry}
                  isSidebarCollapsed={false}
                  isExpanded={!!expandedGroups[entry.id]}
                  onToggleExpand={handleToggleGroup}
                  pathname={pathname}
                />
              );
            }

            if (isNavItem(entry)) {
              return (
                <SidebarNavItem
                  key={entry.id}
                  item={entry}
                  pathname={pathname}
                  isCollapsed={isCollapsed}
                />
              );
            }

            return null;
          })}
        </nav>
      </div>

      <div className="space-y-2">
        {/* Theme Toggle Button */}
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={theme === 'light' ? 'Activar modo oscuro' : 'Activar modo claro'}
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
          type="button"
          onClick={handleLogout}
          aria-label="Cerrar sesión"
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
