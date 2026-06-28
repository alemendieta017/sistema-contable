"use client";

import React from "react";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "../lib/theme-context";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
      <div>
        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Tema del Sistema</h4>
        <p className="text-4xs text-slate-400 dark:text-slate-500 font-semibold mt-0.5">
          Alternar entre modo claro y oscuro
        </p>
      </div>

      <button
        onClick={toggleTheme}
        className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none bg-slate-250 dark:bg-indigo-600"
        type="button"
        role="switch"
        aria-checked={theme === "dark"}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out flex items-center justify-center ${
            theme === "dark" ? "translate-x-5" : "translate-x-0"
          }`}
        >
          {theme === "dark" ? (
            <Moon className="w-3 h-3 text-indigo-600" />
          ) : (
            <Sun className="w-3 h-3 text-amber-500" />
          )}
        </span>
      </button>
    </div>
  );
}
