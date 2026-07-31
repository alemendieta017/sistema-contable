'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CashFlowForecastRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/reports/forecast?type=CASH_FLOW');
  }, [router]);

  return (
    <div className="text-center py-24">
      <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
      <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Cargando Flujo de Caja Proyectado...</span>
    </div>
  );
}
