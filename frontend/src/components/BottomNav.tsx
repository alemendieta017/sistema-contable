"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReceiptText, BarChart3, Menu, Wallet, Settings, LogOut, Moon, Sun, X } from "lucide-react";
import { useTheme } from "../lib/theme-context";
import { api } from "../services/api";

export default function BottomNav() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = () => {
    api.auth.logout();
    window.location.href = "/";
  };

  const menuItems = [
    { name: "Cuentas", href: "/accounts", icon: Wallet },
    { name: "Ajustes", href: "/settings", icon: Settings },
  ];

  return (
    <>
      {/* Bottom Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex items-center justify-around px-4 z-40 shadow-lg">
        <Link
          href="/transactions"
          className={`flex flex-col items-center justify-center flex-1 py-1 ${
            pathname.startsWith("/transactions")
              ? "text-indigo-600 dark:text-indigo-400"
              : "text-slate-400 dark:text-slate-500"
          }`}
        >
          <ReceiptText className="w-5 h-5" />
          <span className="text-4xs mt-1 font-bold">Registro</span>
        </Link>

        <Link
          href="/stats"
          className={`flex flex-col items-center justify-center flex-1 py-1 ${
            pathname.startsWith("/stats")
              ? "text-indigo-600 dark:text-indigo-400"
              : "text-slate-400 dark:text-slate-500"
          }`}
        >
          <BarChart3 className="w-5 h-5" />
          <span className="text-4xs mt-1 font-bold">Estadísticas</span>
        </Link>

        <button
          onClick={() => setIsMenuOpen(true)}
          className={`flex flex-col items-center justify-center flex-1 py-1 ${
            isMenuOpen || pathname.startsWith("/accounts") || pathname.startsWith("/settings")
              ? "text-indigo-600 dark:text-indigo-400"
              : "text-slate-400 dark:text-slate-500"
          }`}
        >
          <Menu className="w-5 h-5" />
          <span className="text-4xs mt-1 font-bold">Más</span>
        </button>
      </div>

      {/* Drawer Menu overlay */}
      {isMenuOpen && (
        <div className="lg:hidden fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex flex-col justify-end animate-in fade-in duration-200">
          {/* Dismiss Area */}
          <div className="flex-1" onClick={() => setIsMenuOpen(false)} />

          {/* Drawer Sheet */}
          <div className="bg-white dark:bg-slate-800 rounded-t-3xl p-6 space-y-6 shadow-xl border-t border-slate-100 dark:border-slate-700 animate-in slide-in-from-bottom-full duration-300">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-700">
              <h3 className="font-bold text-base text-slate-800 dark:text-slate-100">Menú</h3>
              <button
                onClick={() => setIsMenuOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700 hover:bg-slate-200"
              >
                <X className="w-4 h-4 text-slate-500 dark:text-slate-300" />
              </button>
            </div>

            <nav className="grid grid-cols-2 gap-4">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMenuOpen(false)}
                    className={`flex flex-col items-center p-4 rounded-2xl border text-center transition-all duration-200 ${
                      isActive
                        ? "bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400"
                        : "bg-slate-50/50 dark:bg-slate-900/30 border-slate-100 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    <Icon className="w-6 h-6 mb-2" />
                    <span className="text-xs font-bold">{item.name}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="space-y-3 pt-2">
              {/* Theme Toggle Button */}
              <button
                onClick={() => {
                  toggleTheme();
                  setIsMenuOpen(false);
                }}
                className="flex items-center justify-between w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100"
              >
                <span className="flex items-center gap-2.5">
                  {theme === "light" ? <Moon className="w-4.5 h-4.5" /> : <Sun className="w-4.5 h-4.5" />}
                  <span>Cambiar Tema</span>
                </span>
                <span className="text-4xs uppercase tracking-wider text-slate-400">
                  {theme === "light" ? "Oscuro" : "Claro"}
                </span>
              </button>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="flex items-center gap-2.5 w-full px-4 py-3 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/40 rounded-xl text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-100"
              >
                <LogOut className="w-4.5 h-4.5" />
                <span>Cerrar Sesión</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
