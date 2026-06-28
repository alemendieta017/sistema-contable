"use client";

import React, { useState } from "react";
import { Lock, Eye, EyeOff, CheckCircle } from "lucide-react";

export default function SecuritySettings() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (newPassword.length < 6) {
      setError("La nueva contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setSuccess("Contraseña actualizada con éxito (simulado).");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  return (
    <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm space-y-4">
      <div>
        <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">
          Seguridad de la Cuenta
        </h3>
        <p className="text-4xs text-slate-455 dark:text-slate-500 uppercase tracking-widest mt-0.5">
          Modificar credenciales de acceso
        </p>
      </div>

      {success && (
        <div className="p-3 text-xs text-green-700 bg-green-50 dark:bg-green-950/20 dark:text-green-400 rounded-xl flex items-center gap-2 border border-green-150">
          <CheckCircle className="w-4 h-4 text-green-500" />
          <span>{success}</span>
        </div>
      )}
      {error && (
        <div className="p-3 text-xs text-red-700 bg-red-50 dark:bg-red-950/20 dark:text-red-400 rounded-xl border border-red-150">
          {error}
        </div>
      )}

      <form onSubmit={handleUpdatePassword} className="space-y-3">
        <div>
          <label className="block text-3xs font-bold uppercase text-slate-400 dark:text-slate-500 mb-1">
            Contraseña Actual
          </label>
          <div className="relative">
            <input
              type={showPass ? "text" : "password"}
              value={currentPassword}
              required
              placeholder="••••••••"
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-3xs font-bold uppercase text-slate-400 dark:text-slate-500 mb-1">
              Nueva Contraseña
            </label>
            <input
              type={showPass ? "text" : "password"}
              value={newPassword}
              required
              placeholder="Mínimo 6 caracteres"
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-3xs font-bold uppercase text-slate-400 dark:text-slate-500 mb-1">
              Confirmar Contraseña
            </label>
            <input
              type={showPass ? "text" : "password"}
              value={confirmPassword}
              required
              placeholder="Confirmar"
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={() => setShowPass(!showPass)}
            className="text-4xs font-bold uppercase text-slate-450 dark:text-slate-400 hover:text-slate-655 hover:underline"
          >
            {showPass ? "Ocultar contraseña" : "Ver contraseña"}
          </button>

          <button
            type="submit"
            disabled={!currentPassword || !newPassword}
            className="py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition disabled:opacity-40 shadow-md shadow-indigo-500/5"
          >
            Actualizar
          </button>
        </div>
      </form>
    </div>
  );
}
