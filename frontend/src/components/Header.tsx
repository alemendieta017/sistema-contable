"use client";

import React, { useEffect, useState } from "react";
import { Search, User, Sun, Moon } from "lucide-react";
import { useSearch } from "../lib/search-context";
import { useTheme } from "../lib/theme-context";
import { api } from "../services/api";

export default function Header() {
  const { searchQuery, setSearchQuery } = useSearch();
  const { theme, toggleTheme } = useTheme();
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    const user = api.auth.getUser();
    if (user && user.email) {
      setUserEmail(user.email);
    }
  }, []);

  return (
    <header className="h-16 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-between px-6 sticky top-0 z-30 shadow-sm">
      {/* Search Input Box */}
      <div className="flex-1 max-w-md">
        <div className="relative flex items-center">
          <Search className="absolute left-3 w-4 h-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar transacciones..."
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
          {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
        </button>

        {/* User Card */}
        {userEmail && (
          <div className="flex items-center space-x-2.5 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700">
            <div className="w-7 h-7 bg-indigo-100 dark:bg-indigo-950/60 rounded-full flex items-center justify-center border border-indigo-200 dark:border-indigo-800">
              <User className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <span className="hidden sm:inline text-xs font-semibold text-slate-600 dark:text-slate-300">
              {userEmail.split("@")[0]}
            </span>
          </div>
        )}
      </div>
    </header>
  );
}
