"use client";

import React, { useState } from "react";
import { api } from "../../services/api";
import ThemeToggle from "../../components/ThemeToggle";
import SecuritySettings from "../../components/SecuritySettings";
import CurrencySettings from "../../components/CurrencySettings";
import { Download, Upload, FileSpreadsheet, ShieldAlert, CheckCircle2 } from "lucide-react";

export default function SettingsPage() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const handleExcelExport = async () => {
    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const token = localStorage.getItem("auth_token");
      const API_BASE_URL = api.baseUrl || process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";
      
      const response = await fetch(`${API_BASE_URL}/reports/excel`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error("Error al exportar Excel");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `RegistroContable-${new Date().toISOString().substring(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      setSuccess("Reporte Excel descargado con éxito.");
    } catch (err: any) {
      setError(err.message || "Fallo al exportar archivo Excel.");
    } finally {
      setLoading(false);
    }
  };

  const handleBackupExport = async () => {
    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const backup = await api.backup.export();
      const blob = new Blob([JSON.stringify(backup, null, 2)], {
        type: "application/json",
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `BackupContable-${new Date().toISOString().substring(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      setSuccess("Copia de seguridad exportada con éxito.");
    } catch (err: any) {
      setError(err.message || "Fallo al exportar copia de seguridad.");
    } finally {
      setLoading(false);
    }
  };

  const handleBackupImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError("");
    setSuccess("");

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        await api.backup.import(json);
        setSuccess("Copia de seguridad restaurada con éxito.");
      } catch (err: any) {
        setError(err.message || "Fallo al importar respaldo. Verifique el formato JSON.");
      } finally {
        setLoading(false);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Top Header */}
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-800 dark:text-slate-100">
          Ajustes del Sistema
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-455 mt-0.5">
          Configuración global de preferencias, divisas y respaldos de información
        </p>
      </div>

      {success && (
        <div className="p-3 text-xs text-green-700 bg-green-50 dark:bg-green-950/20 dark:text-green-400 rounded-xl flex items-center gap-2 border border-green-150">
          <CheckCircle2 className="w-4 h-4 text-green-550" />
          <span>{success}</span>
        </div>
      )}
      {error && (
        <div className="p-3 text-xs text-red-750 bg-red-50 dark:bg-red-950/20 dark:text-red-400 rounded-xl border border-red-155 flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Grid list of sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column: Preferences */}
        <div className="space-y-6">
          <div className="space-y-2">
            <span className="text-3xs font-bold text-slate-450 dark:text-slate-500 uppercase tracking-widest px-1">
              Preferencias Visuales
            </span>
            <ThemeToggle />
          </div>

          <div className="space-y-2">
            <span className="text-3xs font-bold text-slate-450 dark:text-slate-500 uppercase tracking-widest px-1">
              Tipos de Divisas
            </span>
            <CurrencySettings />
          </div>
        </div>

        {/* Right Column: Security & Data */}
        <div className="space-y-6">
          <div className="space-y-2">
            <span className="text-3xs font-bold text-slate-450 dark:text-slate-500 uppercase tracking-widest px-1">
              Seguridad
            </span>
            <SecuritySettings />
          </div>

          {/* Backup & Export Panel */}
          <div className="space-y-2">
            <span className="text-3xs font-bold text-slate-450 dark:text-slate-500 uppercase tracking-widest px-1">
              Respaldo e Informes
            </span>
            
            <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm space-y-4">
              {/* Excel Report Download */}
              <div className="space-y-2 pb-4 border-b border-slate-100 dark:border-slate-700">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Exportar Planilla RealByte</h4>
                <p className="text-4xs text-slate-400 dark:text-slate-500 font-semibold leading-relaxed">
                  Descarga un reporte consolidado compatible para importación en planillas de contabilidad Excel.
                </p>
                <button
                  onClick={handleExcelExport}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition duration-150 disabled:opacity-50 shadow-md shadow-emerald-500/5"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Descargar Planilla (.xlsx)</span>
                </button>
              </div>

              {/* Backups export/import */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Copia de Seguridad</h4>
                <p className="text-4xs text-slate-400 dark:text-slate-500 font-semibold leading-relaxed">
                  Cree copias de seguridad de sus transacciones y cuentas en archivos JSON o restáurelas en cualquier momento.
                </p>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <button
                    onClick={handleBackupExport}
                    disabled={loading}
                    className="flex items-center justify-center gap-1.5 py-2.5 bg-indigo-600 hover:bg-indigo-750 text-white font-bold rounded-xl text-xs transition duration-150"
                  >
                    <Download className="w-4 h-4" />
                    <span>Exportar</span>
                  </button>

                  <label className="flex items-center justify-center gap-1.5 py-2.5 border border-dashed border-indigo-500/40 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 text-indigo-650 dark:text-indigo-400 font-bold rounded-xl text-xs cursor-pointer transition duration-150">
                    <Upload className="w-4 h-4" />
                    <span>Importar</span>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleBackupImport}
                      disabled={loading}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
