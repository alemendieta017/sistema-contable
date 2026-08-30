'use client';

import React, { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { RefreshCw } from 'lucide-react';

function ForecastRedirectHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const type = searchParams.get('type');
    if (type === 'INCOME_STATEMENT') {
      router.replace('/reports/income-statement/forecast');
    } else {
      router.replace('/reports/cash-flow');
    }
  }, [router, searchParams]);

  return null;
}

export default function ForecastRedirectPage() {
  const loadingIndicator = (
    <div className="flex items-center justify-center h-full w-full py-24">
      <div className="flex flex-col items-center space-y-2">
        <RefreshCw className="w-6 h-6 text-indigo-500 animate-spin" />
        <span className="text-xs font-semibold text-slate-400">Redirigiendo a Proyecciones...</span>
      </div>
    </div>
  );

  return (
    <Suspense fallback={loadingIndicator}>
      <ForecastRedirectHandler />
      {loadingIndicator}
    </Suspense>
  );
}
