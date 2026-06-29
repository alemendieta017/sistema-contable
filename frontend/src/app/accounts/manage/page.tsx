"use client";

import React, { useState, useEffect } from "react";
import { api } from "../../../services/api";
import AccountModal from "../../../components/AccountModal";
import { ArrowLeft, Plus, ToggleLeft, ToggleRight, Check, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { formatCurrency } from "../../../lib/utils";

interface AccountSummary {
  id: string;
  name: string;
  type: "ASSET" | "LIABILITY" | "EQUITY" | "INCOME" | "EXPENSE";
  balance: number;
  currencyCode?: string;
  currencySymbol?: string;
  decimalPlaces?: number;
  parentId?: string | null;
  status?: "ACTIVE" | "INACTIVE";
}

export default function AccountsManagePage() {
  const [accounts, setAccounts] = useState<AccountSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await api.accounts.summary();
      setAccounts(data?.accounts || []);
    } catch (err: any) {
      setError(err.message || "Error al cargar las cuentas.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivate = async (id: string) => {
    if (!confirm("¿Está seguro de que desea desactivar o eliminar este rubro?")) return;
    setSaving(true);
    setError("");
    try {
      await api.accounts.delete(id);
      fetchAccounts();
    } catch (err: any) {
      setError(err.message || "Error al actualizar estado de la cuenta.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <span className="text-xs text-slate-400 font-semibold">Cargando gestor...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center space-x-3.5">
          <Link
            href="/accounts"
            className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 text-slate-655 hover:text-slate-800 dark:hover:text-slate-200 transition hover:bg-slate-50 shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-800 dark:text-slate-100">
              Administración de Rubros
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-455 mt-0.5">
              Administrar catálogos de cuentas y categorías
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 py-2 px-4 bg-indigo-650 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-md shadow-indigo-500/10 transition"
        >
          <Plus className="w-4 h-4" />
          <span>Nuevo Rubro</span>
        </button>
      </div>

      {error && (
        <div className="p-3.5 text-xs text-red-700 bg-red-50 dark:bg-red-950/30 dark:text-red-400 rounded-2xl border border-red-150 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Grid List */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider">
              <th className="p-4">Nombre</th>
              <th className="p-4">Tipo</th>
              <th className="p-4 text-right">Saldo</th>
              <th className="p-4 text-center">Estado</th>
              <th className="p-4 text-center">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-750 font-medium">
            {accounts.map((a) => {
              const isInactive = a.status === "INACTIVE";
              return (
                <tr
                  key={a.id}
                  className={`hover:bg-slate-50/50 dark:hover:bg-slate-750/20 transition ${
                    isInactive ? "opacity-60 bg-slate-50/20 dark:bg-slate-900/10" : ""
                  }`}
                >
                  <td className="p-4">
                    <span className="font-bold text-slate-800 dark:text-slate-200">{a.name}</span>
                    {a.parentId && (
                      <span className="block text-4xs text-slate-400 dark:text-slate-500 font-normal mt-0.5">
                        Subcategoría de cuenta ID: {a.parentId.substring(0, 8)}
                      </span>
                    )}
                  </td>
                  <td className="p-4">
                    <span className="text-3xs font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-350 px-2 py-0.5 rounded-md">
                      {a.type}
                    </span>
                  </td>
                  <td className="p-4 text-right font-extrabold">
                    {formatCurrency(a.balance, {
                      code: a.currencyCode,
                      symbol: a.currencySymbol,
                      decimalPlaces: a.decimalPlaces,
                    })}
                  </td>
                  <td className="p-4 text-center">
                    {isInactive ? (
                      <span className="inline-flex items-center gap-1 text-red-500 font-bold text-3xs uppercase tracking-wider bg-red-50 dark:bg-red-950/20 px-2 py-0.5 rounded-full">
                        Inactivo
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400 font-bold text-3xs uppercase tracking-wider bg-green-50 dark:bg-green-950/20 px-2 py-0.5 rounded-full">
                        <Check className="w-3 h-3" />
                        Activo
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-center">
                    {!isInactive ? (
                      <button
                        onClick={() => handleDeactivate(a.id)}
                        disabled={saving}
                        className="text-3xs font-bold py-1 px-3 border border-red-200 dark:border-red-900 text-red-650 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition"
                      >
                        Desactivar
                      </button>
                    ) : (
                      <span className="text-3xs text-slate-400 font-bold">Deshabilitado</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showAddModal && (
        <AccountModal
          onClose={() => setShowAddModal(false)}
          onSuccess={fetchAccounts}
          parentCandidates={accounts}
        />
      )}
    </div>
  );
}
