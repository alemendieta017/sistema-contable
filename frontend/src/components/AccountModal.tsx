"use client";

import React, { useState, useEffect } from "react";
import { X, Plus, AlertCircle } from "lucide-react";
import { api } from "../services/api";

interface Currency {
  id: string;
  code: string;
  name: string;
  symbol: string;
  isBase: boolean;
}

interface ParentAccount {
  id: string;
  name: string;
  type: string;
  parentId?: string | null;
}

interface AccountModalProps {
  onClose: () => void;
  onSuccess: () => void;
  parentCandidates: ParentAccount[];
}

export default function AccountModal({ onClose, onSuccess, parentCandidates }: AccountModalProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState<"ASSET" | "LIABILITY" | "EQUITY" | "INCOME" | "EXPENSE">("ASSET");
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [selectedCurrencyId, setSelectedCurrencyId] = useState("");
  const [selectedParentId, setSelectedParentId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchCurrencies();
  }, []);

  const fetchCurrencies = async () => {
    try {
      const data = await api.currencies.list();
      setCurrencies(data || []);
      const base = data?.find((c: Currency) => c.isBase);
      if (base) {
        setSelectedCurrencyId(base.id);
      }
    } catch (err: any) {
      setError("Error al cargar monedas.");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError("");

    try {
      await api.accounts.create({
        name: name.trim(),
        type,
        currencyId: selectedCurrencyId,
        parentId: selectedParentId || null,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Error al crear la cuenta.");
    } finally {
      setLoading(false);
    }
  };

  // Filter possible parent accounts (same type and no parent itself)
  const filteredParents = parentCandidates.filter(
    (a) => a.type === type && !a.parentId
  );

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-md shadow-2xl border border-slate-100 dark:border-slate-700 animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-150 dark:border-slate-700">
          <div>
            <h2 className="text-base font-bold text-slate-850 dark:text-slate-100">
              Crear Cuenta o Categoría
            </h2>
            <p className="text-4xs text-slate-450 uppercase font-bold tracking-wider mt-0.5">
              Administración de Rubros
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700 hover:bg-slate-200"
          >
            <X className="w-4.5 h-4.5 text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSave} className="p-6 space-y-4">
          {error && (
            <div className="p-3 text-xs text-red-750 bg-red-50 dark:bg-red-950/30 dark:text-red-400 rounded-xl flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-3xs font-bold uppercase text-slate-400 dark:text-slate-500 mb-1">
              Nombre de la Cuenta
            </label>
            <input
              type="text"
              value={name}
              required
              placeholder="Ej. Efectivo, Comida, Sueldo"
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-200 font-semibold"
            />
          </div>

          <div>
            <label className="block text-3xs font-bold uppercase text-slate-400 dark:text-slate-500 mb-1">
              Tipo de Rubro
            </label>
            <select
              value={type}
              onChange={(e) => {
                setType(e.target.value as any);
                setSelectedParentId("");
              }}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs outline-none focus:border-indigo-500 font-semibold text-slate-700 dark:text-slate-200"
            >
              <option value="ASSET">ACTIVO (Efectivo, Cuentas Bancarias)</option>
              <option value="LIABILITY">PASIVO (Deudas, Tarjetas de Crédito)</option>
              <option value="INCOME">INGRESO (Sueldo, Ventas, etc.)</option>
              <option value="EXPENSE">EGRESO (Gastos, Comida, Servicios)</option>
              <option value="EQUITY">PATRIMONIO NETO</option>
            </select>
          </div>

          <div>
            <label className="block text-3xs font-bold uppercase text-slate-400 dark:text-slate-500 mb-1">
              Moneda
            </label>
            <select
              value={selectedCurrencyId}
              required
              onChange={(e) => setSelectedCurrencyId(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs outline-none focus:border-indigo-500 font-semibold text-slate-700 dark:text-slate-200"
            >
              {currencies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} - {c.name} ({c.symbol})
                </option>
              ))}
            </select>
          </div>

          {(type === "INCOME" || type === "EXPENSE") && filteredParents.length > 0 && (
            <div>
              <label className="block text-3xs font-bold uppercase text-slate-400 dark:text-slate-500 mb-1">
                Categoría Padre (Opcional)
              </label>
              <select
                value={selectedParentId}
                onChange={(e) => setSelectedParentId(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs outline-none focus:border-indigo-500 font-semibold text-slate-700 dark:text-slate-200"
              >
                <option value="">Ninguna (Es categoría principal)</option>
                {filteredParents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex space-x-2 pt-4 border-t border-slate-100 dark:border-slate-700">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs hover:bg-slate-300 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-md transition disabled:opacity-50"
            >
              {loading ? "Creando..." : "Crear Cuenta"}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
