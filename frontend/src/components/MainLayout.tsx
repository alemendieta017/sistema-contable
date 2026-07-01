"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "./Sidebar";
import Header from "./Header";
import BottomNav from "./BottomNav";
import FloatingActionButton from "./FloatingActionButton";


export default function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [loading, setLoading] = useState(true);


  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    const isAuthRoute = pathname === "/";

    if (!token && !isAuthRoute) {
      router.replace("/");
    } else if (token && isAuthRoute) {
      router.replace("/transactions");
    } else {
      setLoading(false);
    }
  }, [pathname, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs text-slate-400 font-semibold">Cargando aplicación...</span>
        </div>
      </div>
    );
  }

  const isAuthPage = pathname === "/";
  const isTransactionEntryPage = pathname === "/transactions/new" || pathname?.startsWith("/transactions/new/");
  
  if (isAuthPage) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden">
      {/* Permanent sidebar on desktop */}
      <Sidebar />

      {/* Main app container */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Top Header - hidden on the dedicated transaction entry route */}
        {!isTransactionEntryPage && <Header />}

        {/* Dynamic page content scrollarea */}
        <main className={`flex-1 overflow-y-auto ${
          isTransactionEntryPage
            ? "p-0 overflow-hidden"
            : "px-4 py-6 sm:px-6 lg:px-8 pb-24 lg:pb-8"
        }`}>
          <div className={isTransactionEntryPage ? "h-full w-full flex flex-col" : "max-w-6xl mx-auto"}>{children}</div>
        </main>
      </div>

      {/* Floating Action Button */}
      {!isTransactionEntryPage && <FloatingActionButton />}

      {/* Mobile Bottom Navigation Bar */}
      {!isTransactionEntryPage && <BottomNav />}


    </div>
  );
}
