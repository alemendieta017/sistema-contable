'use client';

import React, { useState } from 'react';
import { AlertTriangle, X, RotateCcw, ShieldAlert, Eye, EyeOff } from 'lucide-react';
import { api } from '../../services/api';
import { FACTORY_RESET_PHRASE, AuthErrorCode } from '@sistema-contable/shared';

interface FactoryResetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
  onError?: (error: string) => void;
}

export default function FactoryResetModal({
  isOpen,
  onClose,
  onSuccess,
  onError: onParentError,
}: FactoryResetModalProps) {
  const [confirmationPhrase, setConfirmationPhrase] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleClose = () => {
    setConfirmationPhrase('');
    setCurrentPassword('');
    setShowPassword(false);
    setError('');
    setLoading(false);
    onClose();
  };

  const isPhraseValid = confirmationPhrase === FACTORY_RESET_PHRASE;
  const isPasswordProvided = currentPassword.trim().length > 0;
  const canSubmit = isPhraseValid && isPasswordProvided && !loading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    try {
      setLoading(true);
      setError('');

      const response = await api.dangerZone.resetData({
        confirmationPhrase,
        currentPassword,
      });

      handleClose();
      onSuccess(response.message || 'Datos contables restablecidos de fábrica con éxito.');
    } catch (err: any) {
      let errorMessage = 'Error al restablecer los datos.';
      if (
        err.code === AuthErrorCode.INVALID_CURRENT_PASSWORD ||
        err.status === 401 ||
        (typeof err.message === 'string' &&
          (err.message.includes('AUTH_INVALID_CURRENT_PASSWORD') ||
            err.message.toLowerCase().includes('contraseña actual incorrecta') ||
            err.message.toLowerCase().includes('invalid current password')))
      ) {
        errorMessage = 'Contraseña actual incorrecta';
      } else if (err.message) {
        errorMessage = err.message;
      }
      setError(errorMessage);
      if (onParentError) {
        onParentError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="bg-white dark:bg-slate-800 rounded-3xl p-6 max-w-lg w-full border border-red-200 dark:border-red-900/60 shadow-2xl space-y-5 text-slate-800 dark:text-slate-100"
        role="dialog"
        aria-modal="true"
        aria-labelledby="factory-reset-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-red-600 dark:text-red-400">
            <div className="p-2 bg-red-100 dark:bg-red-950/50 rounded-xl">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h3 id="factory-reset-title" className="text-sm font-bold">
                Restablecer datos de fábrica
              </h3>
              <p className="text-4xs uppercase tracking-wider text-red-500 font-semibold">
                Acción destructiva
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg transition disabled:opacity-40"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Warnings */}
        <div className="p-3.5 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-2xl space-y-2 text-xs text-red-800 dark:text-red-300">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <p className="font-semibold text-xs leading-relaxed">
              Esta operación eliminará permanentemente todas las transacciones, asientos contables,
              períodos, presupuestos y cuentas personalizadas.
            </p>
          </div>
          <ul className="text-3xs space-y-1 list-disc list-inside text-red-700/90 dark:text-red-300/80 pl-1">
            <li>Se restablecerán las cuentas predeterminadas del sistema.</li>
            <li>Tu cuenta de usuario y contraseña se mantendrán intactas.</li>
            <li className="font-bold">Esta acción NO se puede deshacer.</li>
          </ul>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-3 text-xs text-red-700 bg-red-50 dark:bg-red-950/20 dark:text-red-400 rounded-xl border border-red-200 dark:border-red-900/50 flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-3xs font-bold uppercase text-slate-500 dark:text-slate-400">
              Para confirmar, escribe{' '}
              <span className="font-mono font-black text-red-600 dark:text-red-400 select-all">
                {FACTORY_RESET_PHRASE}
              </span>
            </label>
            <input
              type="text"
              value={confirmationPhrase}
              onChange={(e) => setConfirmationPhrase(e.target.value)}
              disabled={loading}
              placeholder={FACTORY_RESET_PHRASE}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-mono outline-none focus:border-red-500 text-slate-800 dark:text-slate-100 transition"
              autoComplete="off"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-3xs font-bold uppercase text-slate-500 dark:text-slate-400">
              Contraseña actual
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                disabled={loading}
                placeholder="••••••••"
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs outline-none focus:border-red-500 text-slate-800 dark:text-slate-100 pr-10 transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
              >
                {showPassword ? (
                  <EyeOff className="w-3.5 h-3.5" />
                ) : (
                  <Eye className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-700">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs transition disabled:opacity-40"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs shadow-md shadow-red-600/10 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
            >
              {loading ? (
                <>
                  <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                  <span>Restableciendo...</span>
                </>
              ) : (
                <span>Restablecer Datos</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
