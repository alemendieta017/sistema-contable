"use client";

import React, { useState, useEffect } from "react";
import { api } from "../services/api";
import { DollarSign, Save } from "lucide-react";

interface Currency {
  id: string;
  code: string;
  name: string;
  symbol: string;
  rateToBase: number;
  isBase: boolean;
}

export default function CurrencySettings() {
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [rates, setRates] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadCurrencies();
  }, []);

  const loadCurrencies = async () => {
    try {
      const curList = await api.currencies.list();
      setCurrencies(curList || []);
      const initialRates: Record<string, string> = {};
      for (const c of curList) {
        initialRates[c.id] = Number(c.rateToBase).toString();
      }
      setRates(initialRates);
    } catch (err: any) {
      setError("Error al cargar divisas.");
    }
  };

  const handleUpdateRate = async (id: string, rate: number) => {
    if (rate <= 0) {
      setError("La tasa de cambio debe ser un número positivo.");
      return;
    }
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      await api.currencies.updateRate(id, rate);
      setSuccess("Tasa de cambio actualizada con éxito.");
      loadCurrencies();
    } catch (err: any) {
      setError(err.message || "Error al actualizar tasa.");
    } finally {
      setLoading(false);
    }
  };

  const baseCurrency = currencies.find((c) => c.isBase);

  return (
    <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm space-y-4">
      <div>
        <h3 className="text-xs font-bold text-slate-850 dark:text-slate-100">
          Tipos de Cambio
        </h3>
        <p className="text-4xs text-slate-455 dark:text-slate-500 uppercase tracking-widest mt-0.5">
          Cotización de monedas extranjeras (Moneda base: {baseCurrency?.code || "Guaraní PYG"})
        </p>
      </div>

      {success && (
        <div className="p-3 text-xs text-green-700 bg-green-50 dark:bg-green-950/20 dark:text-green-400 rounded-xl border border-green-150">
          {success}
        </div>
      )}
      {error && (
        <div className="p-3 text-xs text-red-750 bg-red-50 dark:bg-red-950/20 dark:text-red-400 rounded-xl border border-red-150">
          {error}
        </div>
      )}

      <div className="space-y-2.5">
        {currencies
          .filter((c) => !c.isBase)
          .map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between gap-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800"
            >
              <div className="text-xs">
                <p className="font-extrabold text-slate-800 dark:text-slate-200">{c.code}</p>
                <p className="text-4xs text-slate-400 font-semibold mt-0.5">{c.name}</p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.0001"
                  value={rates[c.id] || ""}
                  onChange={(e) => setRates({ ...rates, [c.id]: e.target.value })}
                  className="w-28 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-xs outline-none text-right font-extrabold"
                />
                <button
                  onClick={() => handleUpdateRate(c.id, Number(rates[c.id]))}
                  disabled={loading}
                  className="p-2 bg-indigo-600 hover:bg-indigo-750 text-white rounded-xl transition duration-150 disabled:opacity-50"
                  title="Guardar tasa"
                >
                  <Save className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        {currencies.filter((c) => !c.isBase).length === 0 && (
          <p className="text-3xs text-slate-450 dark:text-slate-500 italic text-center py-2">
            No hay monedas extranjeras configuradas.
          </p>
        )}
      </div>
    </div>
  );
}
