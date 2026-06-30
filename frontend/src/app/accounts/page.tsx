"use client";

import React, { useState, useEffect } from "react";
import { api } from "../../services/api";
import AccountsList from "../../components/AccountsList";
import AccountModal from "../../components/AccountModal";
import { Plus, Wallet, ShieldAlert, BadgeAlert } from "lucide-react";
import { formatCurrency } from "../../lib/utils";

type AccountSummary = {
  id: string;
  name: string;
  type: "ASSET" | "LIABILITY" | "EQUITY" | "INCOME" | "EXPENSE";
  balance: number;
  currencyCode?: string;
  currencySymbol?: string;
  decimalPlaces?: number;
  parentId?: string | null;
  status?: "ACTIVE" | "INACTIVE";
};

type SummaryData = {
  netWorth: number;
  totalAssets: number;
  totalLiabilities: number;
  accounts: AccountSummary[];
};

export default function AccountsPage() {
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [currencies, setCurrencies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [deletingId, setDeletingId] = useState("");

  useEffect(() => {
    loadSummary();
  }, []);

  const loadSummary = async () => {
    try {
      setLoading(true);
      setError("");
      const [data, curs] = await Promise.all([
        api.accounts.summary(),
        api.currencies.list(),
      ]);
      setSummary(data);
      setCurrencies(curs || []);
    } catch (err: any) {
      setError(err.message || "Error al cargar resumen de cuentas.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async (id: string) => {
    if (!confirm("¿Está seguro de que desea eliminar o desactivar esta cuenta/categoría?")) {
      return;
    }
    setSaving(true);
    setDeletingId(id);
    setError("");
    try {
      const res = await api.accounts.delete(id);
      if (res && res.action === "DEACTIVATED") {
        alert("La cuenta tiene transacciones asociadas y ha sido marcada como INACTIVA.");
      } else {
        alert("La cuenta ha sido eliminada con éxito.");
      }
      loadSummary();
    } catch (err: any) {
      setError(err.message || "Error al eliminar la cuenta.");
    } finally {
      setSaving(false);
      setDeletingId("");
    }
  };

  const handleCreateDefaultAccounts = async () => {
    setSaving(true);
    setError("");
    try {
      const currencies = await api.currencies.list();
      const defaultCurrencyId = (currencies?.find((c: any) => c.isBase)?.id) || "00000000-0000-0000-0000-000000000000";
      
      const defaults = [
        { name: "Efectivo", type: "ASSET" },
        { name: "Cuenta Bancaria", type: "ASSET" },
        { name: "Tarjeta de Crédito", type: "LIABILITY" },
        { name: "Capital Inicial", type: "EQUITY" },
        { name: "Sueldo", type: "INCOME" },
        { name: "Otros Ingresos", type: "INCOME" },
        { name: "Comida", type: "EXPENSE" },
        { name: "Transporte", type: "EXPENSE" },
        { name: "Servicios", type: "EXPENSE" },
        { name: "Ropa", type: "EXPENSE" },
      ];
      
      for (const item of defaults) {
        await api.accounts.create({
          name: item.name,
          type: item.type as any,
          currencyId: defaultCurrencyId,
        });
      }
      loadSummary();
    } catch (err: any) {
      setError(err.message || "Error al generar cuentas por defecto.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <span className="text-xs text-slate-400 font-semibold">Cargando saldos...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-800 dark:text-slate-100">
            Cuentas y Rubros
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-450 mt-0.5">
            Saldos agregados de activos, pasivos y patrimonio
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 py-2 px-4 bg-indigo-600 hover:bg-indigo-750 text-white font-bold rounded-xl text-xs shadow-md shadow-indigo-500/10 transition"
        >
          <Plus className="w-4 h-4" />
          <span>Agregar Cuenta</span>
        </button>
      </div>

      {error && (
        <div className="p-3.5 text-xs text-red-700 bg-red-50 dark:bg-red-950/30 dark:text-red-400 rounded-2xl border border-red-150 flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Net Worth Dashboard Card */}
      {(() => {
        const baseCurrency = currencies.find((c) => c.isBase) || { code: "PYG", symbol: "₲", decimalPlaces: 0 };
        return (
          <div className="bg-gradient-to-tr from-indigo-600 to-indigo-700 dark:from-indigo-600 dark:to-indigo-700 text-white rounded-3xl p-6 shadow-lg shadow-indigo-500/10 relative overflow-hidden">
            <div className="absolute right-4 bottom-4 opacity-5 pointer-events-none">
              <Wallet className="w-40 h-40" />
            </div>
            <p className="text-3xs font-extrabold uppercase tracking-widest text-indigo-200">
              Patrimonio Neto
            </p>
            <h2 className="text-3xl font-extrabold mt-1">
              {formatCurrency(summary?.netWorth || 0, baseCurrency)}
            </h2>

            <div className="grid grid-cols-2 gap-4 mt-6 border-t border-indigo-500/40 pt-4 text-xs">
              <div>
                <p className="text-indigo-200 font-semibold text-3xs uppercase tracking-wider">
                  Total Activos
                </p>
                <p className="font-bold text-base mt-0.5">
                  {formatCurrency(summary?.totalAssets || 0, baseCurrency)}
                </p>
              </div>
              <div>
                <p className="text-indigo-200 font-semibold text-3xs uppercase tracking-wider">
                  Total Pasivos
                </p>
                <p className="font-bold text-base mt-0.5">
                  {formatCurrency(summary?.totalLiabilities || 0, baseCurrency)}
                </p>
              </div>
            </div>
          </div>
        );
      })()}

      {/* If no accounts exist */}
      {summary?.accounts.length === 0 && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm text-center space-y-4 max-w-lg mx-auto">
          <BadgeAlert className="w-10 h-10 text-amber-500 mx-auto" />
          <div>
            <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">
              No hay cuentas configuradas
            </h3>
            <p className="text-xs text-slate-450 dark:text-slate-550 mt-1 max-w-sm mx-auto leading-relaxed">
              Comienza generando un plan predeterminado de cuentas (Efectivo, Tarjetas, Sueldo, Comida, Transporte, etc.) con un solo clic.
            </p>
          </div>
          <button
            type="button"
            onClick={handleCreateDefaultAccounts}
            disabled={saving}
            className="w-full max-w-xs py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition disabled:opacity-50"
          >
            {saving ? "Generando cuentas..." : "Generar Cuentas Predeterminadas"}
          </button>
        </div>
      )}

      {/* Grouped Account Tables */}
      {summary && summary.accounts.length > 0 && (
        <AccountsList
          accounts={summary.accounts}
          onDelete={handleDeleteAccount}
          deletingId={deletingId}
        />
      )}

      {/* Account Add Modal */}
      {showAddModal && (
        <AccountModal
          onClose={() => setShowAddModal(false)}
          onSuccess={loadSummary}
          parentCandidates={summary?.accounts || []}
        />
      )}
    </div>
  );
}
