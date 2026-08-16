'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertOctagon, X, Trash2, ShieldAlert, Eye, EyeOff } from 'lucide-react';
import { api } from '../../services/api';
import { DELETE_ACCOUNT_PHRASE } from '@sistema-contable/shared';

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DeleteAccountModal({ isOpen, onClose }: DeleteAccountModalProps) {
  const router = useRouter();
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

  const isPhraseValid = confirmationPhrase === DELETE_ACCOUNT_PHRASE;
  const isPasswordProvided = currentPassword.trim().length > 0;
  const canSubmit = isPhraseValid && isPasswordProvided && !loading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    try {
      setLoading(true);
      setError('');

      await api.dangerZone.deleteAccount({
        confirmationPhrase,
        currentPassword,
      });

      // Purge auth session from localStorage
      api.auth.logout();

      // Redirect user to login page
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      } else {
        router.push('/login');
      }
    } catch (err: any) {
      if (
        err.status === 401 ||
        err.code === 'AUTH_INVALID_CURRENT_PASSWORD' ||
        (typeof err.message === 'string' &&
          (err.message.includes('AUTH_INVALID_CURRENT_PASSWORD') ||
            err.message.toLowerCase().includes('contraseña actual incorrecta') ||
            err.message.toLowerCase().includes('invalid current password')))
      ) {
        setError('Contraseña actual incorrecta');
      } else {
        setError(err.message || 'Error al eliminar la cuenta.');
      }
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="bg-white dark:bg-slate-800 rounded-3xl p-6 max-w-lg w-full border border-red-300 dark:border-red-900 shadow-2xl space-y-5 text-slate-800 dark:text-slate-100"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-account-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-red-600 dark:text-red-400">
            <div className="p-2 bg-red-100 dark:bg-red-950/50 rounded-xl">
              <AlertOctagon className="w-5 h-5" />
            </div>
            <div>
              <h3 id="delete-account-title" className="text-sm font-bold">
                Eliminar cuenta permanentemente
              </h3>
              <p className="text-4xs uppercase tracking-wider text-red-500 font-semibold">
                Destrucción total irreversible
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

        {/* Extreme Warning Banner */}
        <div className="p-3.5 bg-red-50 dark:bg-red-950/30 border border-red-300 dark:border-red-800 rounded-2xl space-y-2 text-xs text-red-800 dark:text-red-300">
          <div className="flex items-start gap-2">
            <Trash2 className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <p className="font-semibold text-xs leading-relaxed">
              Esta acción eliminará de forma irreversible y permanente tu cuenta de usuario, tus
              credenciales y la totalidad de los datos contables almacenados.
            </p>
          </div>
          <ul className="text-3xs space-y-1 list-disc list-inside text-red-700/90 dark:text-red-300/80 pl-1">
            <li>Tu sesión se cerrará de inmediato.</li>
            <li>No podrás volver a iniciar sesión con estas credenciales.</li>
            <li className="font-bold">Todos tus registros contables se perderán para siempre.</li>
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
                {DELETE_ACCOUNT_PHRASE}
              </span>
            </label>
            <input
              type="text"
              value={confirmationPhrase}
              onChange={(e) => setConfirmationPhrase(e.target.value)}
              disabled={loading}
              placeholder={DELETE_ACCOUNT_PHRASE}
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
              className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs shadow-md shadow-red-600/20 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
            >
              {loading ? (
                <>
                  <Trash2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Eliminando...</span>
                </>
              ) : (
                <span>Eliminar Cuenta Definitivamente</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
