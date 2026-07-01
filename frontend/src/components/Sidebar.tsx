"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ReceiptText, BarChart3, Wallet, Settings, LogOut, Moon, Sun, Plus } from "lucide-react";
import { useTheme } from "../lib/theme-context";
import { api } from "../services/api";

export default function Sidebar() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();

  const handleLogout = () => {
    api.auth.logout();
    window.location.href = "/";
  };

  const navItems = [
    { name: "Transacciones", href: "/transactions", icon: ReceiptText },
    { name: "Estadísticas", href: "/stats", icon: BarChart3 },
    { name: "Cuentas", href: "/accounts", icon: Wallet },
    { name: "Ajustes", href: "/settings", icon: Settings },
  ];

  return (
    <aside className="hidden sm:flex flex-col w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 min-h-screen p-5 justify-between">
      <div className="space-y-6">
        {/* Logo */}
        <div className="flex items-center space-x-3 px-2 py-1.5">
          <div className="flex items-center justify-center w-9 h-9 bg-indigo-500 text-white rounded-xl shadow-md shadow-indigo-500/20">
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
          <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-indigo-500 to-indigo-600 bg-clip-text text-transparent">
            Contabilidad
          </span>
        </div>

        {/* Desktop Quick Add Transaction Button */}
        <div className="px-2 pt-1 pb-3">
          <Link
            href="/transactions/new"
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-md shadow-indigo-500/10 transition duration-150 active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Nueva Transacción</span>
          </Link>
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  isActive
                    ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400"
                    : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-indigo-600 dark:text-indigo-400" : ""}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="space-y-4">
        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="flex items-center space-x-3 w-full px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:text-slate-800 dark:hover:text-slate-200 transition duration-200"
        >
          {theme === "light" ? (
            <>
              <Moon className="w-4 h-4" />
              <span>Modo Oscuro</span>
            </>
          ) : (
            <>
              <Sun className="w-4 h-4" />
              <span>Modo Claro</span>
            </>
          )}
        </button>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="flex items-center space-x-3 w-full px-4 py-2.5 rounded-xl text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition duration-200"
        >
          <LogOut className="w-4 h-4" />
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </aside>
  );
}
