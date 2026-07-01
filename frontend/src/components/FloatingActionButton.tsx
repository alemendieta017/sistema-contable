"use client";

import React from "react";
import { Plus } from "lucide-react";
import { usePathname } from "next/navigation";

import Link from "next/link";

export default function FloatingActionButton() {
  const pathname = usePathname();

  // Only show on transactions page
  if (pathname !== "/transactions") return null;

  return (
    <Link
      href="/transactions/new"
      className="fixed bottom-20 right-6 w-14 h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full flex items-center justify-center shadow-lg shadow-indigo-500/30 hover:scale-105 active:scale-95 transition-all duration-200 z-40 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 lg:hidden"
      aria-label="Agregar transacción"
    >
      <Plus className="w-6 h-6 stroke-[2.5]" />
    </Link>
  );
}
