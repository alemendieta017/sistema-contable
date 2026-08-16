'use client';

import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import { X, Moon, Sun, LogOut } from 'lucide-react';
import { mobileDrawerSections, isNavItemActive } from '../../config/navigation';

export interface MobileNavDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  pathname: string;
  onThemeToggle?: () => void;
  theme?: string;
  onLogout?: () => void;
}

export const MobileNavDrawer: React.FC<MobileNavDrawerProps> = ({
  isOpen,
  onClose,
  pathname,
  onThemeToggle,
  theme,
  onLogout,
}) => {
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      // Prevent body scrolling when drawer is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="lg:hidden fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex flex-col justify-end animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-label="Menú de navegación"
    >
      {/* Backdrop dismiss touch area */}
      <div className="flex-1" onClick={onClose} aria-hidden="true" />

      {/* Drawer Sheet */}
      <div
        ref={drawerRef}
        className="bg-white dark:bg-slate-800 rounded-t-3xl p-5 sm:p-6 space-y-5 shadow-2xl border-t border-slate-100 dark:border-slate-700 max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom-full duration-300"
      >
        {/* Header */}
        <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-700">
          <h3 className="font-bold text-base text-slate-800 dark:text-slate-100">Menú</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar menú"
            className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition cursor-pointer"
          >
            <X className="w-4 h-4 text-slate-500 dark:text-slate-300" />
          </button>
        </div>

        {/* Categorized Navigation Sections */}
        <div className="space-y-5">
          {mobileDrawerSections.map((section) => (
            <section key={section.id} aria-label={section.title}>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2 px-1">
                {section.title}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = isNavItemActive(item, pathname);
                  return (
                    <Link
                      key={item.id || item.href}
                      href={item.href}
                      onClick={onClose}
                      className={`flex items-center gap-3 px-3 py-2.5 min-h-[48px] rounded-xl border text-left transition-all duration-200 ${
                        isActive
                          ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 font-semibold shadow-xs'
                          : 'bg-slate-50/60 dark:bg-slate-900/40 border-slate-100 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                      }`}
                    >
                      <div
                        className={`p-2 rounded-lg shrink-0 ${
                          isActive
                            ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-medium truncate block">{item.name}</span>
                      </div>
                      {item.badge && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        {/* Footer Actions */}
        {(onThemeToggle || onLogout) && (
          <div className="space-y-2.5 pt-3 border-t border-slate-100 dark:border-slate-700">
            {/* Theme Toggle Button */}
            {onThemeToggle && (
              <button
                type="button"
                onClick={() => {
                  onThemeToggle();
                  onClose();
                }}
                className="flex items-center justify-between w-full min-h-[48px] px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <span className="flex items-center gap-2.5">
                  {theme === 'light' ? (
                    <Moon className="w-4.5 h-4.5" />
                  ) : (
                    <Sun className="w-4.5 h-4.5" />
                  )}
                  <span>Cambiar Tema</span>
                </span>
                <span className="text-[10px] uppercase tracking-wider text-slate-400">
                  {theme === 'light' ? 'Oscuro' : 'Claro'}
                </span>
              </button>
            )}

            {/* Logout Button */}
            {onLogout && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onLogout();
                }}
                className="flex items-center gap-2.5 w-full min-h-[48px] px-4 py-3 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/40 rounded-xl text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition cursor-pointer"
              >
                <LogOut className="w-4.5 h-4.5" />
                <span>Cerrar Sesión</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MobileNavDrawer;
