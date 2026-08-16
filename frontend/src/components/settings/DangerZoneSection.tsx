'use client';

import React, { useState } from 'react';
import { AlertTriangle, RotateCcw, Trash2, CheckCircle2, ShieldAlert } from 'lucide-react';
import FactoryResetModal from './FactoryResetModal';
import DeleteAccountModal from './DeleteAccountModal';

interface DangerZoneSectionProps {
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
}

export default function DangerZoneSection({ onSuccess, onError }: DangerZoneSectionProps) {
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [localSuccess, setLocalSuccess] = useState('');
  const [localError, setLocalError] = useState('');

  const handleResetSuccess = (message: string) => {
    setLocalSuccess(message);
    setLocalError('');
    if (onSuccess) {
      onSuccess(message);
    }
  };

  const handleResetError = (message: string) => {
    setLocalError(message);
    setLocalSuccess('');
    if (onError) {
      onError(message);
    }
  };

  return (
    <div className="bg-red-50/20 dark:bg-red-950/10 border border-red-200/90 dark:border-red-900/50 rounded-3xl p-5 md:p-6 shadow-sm space-y-5">
      {/* Section Header */}
      <div className="flex items-start gap-3">
        <div className="p-2.5 bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 rounded-2xl shrink-0 mt-0.5">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm md:text-base font-extrabold text-red-900 dark:text-red-200">
              Zona de Peligro
            </h3>
            <span className="text-4xs font-bold uppercase tracking-wider px-2 py-0.5 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 rounded-full border border-red-200 dark:border-red-800/60">
              Irreversible
            </span>
          </div>
          <p className="text-xs text-red-700/80 dark:text-red-300/70 font-medium leading-relaxed">
            Las operaciones contenidas en este apartado modifican o destruyen información de manera
            permanente. Realice copias de seguridad previas si desea conservar sus registros.
          </p>
        </div>
      </div>

      {/* Local Feedback Banners */}
      {localSuccess && (
        <div className="p-3 text-xs text-green-700 bg-green-50 dark:bg-green-950/20 dark:text-green-400 rounded-xl flex items-center gap-2 border border-green-200">
          <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
          <span>{localSuccess}</span>
        </div>
      )}
      {localError && (
        <div className="p-3 text-xs text-red-700 bg-red-50 dark:bg-red-950/20 dark:text-red-400 rounded-xl flex items-start gap-2 border border-red-200">
          <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{localError}</span>
        </div>
      )}

      {/* Action Cards Grid / List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
        {/* Action 1: Factory Reset */}
        <div className="bg-white dark:bg-slate-800/90 p-4 md:p-5 rounded-2xl border border-red-100 dark:border-red-900/40 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-slate-800 dark:text-slate-100">
              <RotateCcw className="w-4 h-4 text-red-500" />
              <h4 className="text-xs font-bold">Restablecer datos de fábrica</h4>
            </div>
            <p className="text-4xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
              Elimina todas las transacciones, asientos contables, presupuestos, períodos y cuentas
              creadas. Restaura el catálogo de cuentas base predeterminado. Tu cuenta de usuario se
              mantendrá intacta.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsResetModalOpen(true)}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800/60 font-bold rounded-xl text-xs transition duration-150 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restablecer Datos</span>
          </button>
        </div>

        {/* Action 2: Permanent Account Deletion */}
        <div className="bg-white dark:bg-slate-800/90 p-4 md:p-5 rounded-2xl border border-red-200 dark:border-red-800/60 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-red-900 dark:text-red-200">
              <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
              <h4 className="text-xs font-bold text-red-600 dark:text-red-400">
                Eliminar cuenta permanentemente
              </h4>
            </div>
            <p className="text-4xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
              Elimina tu cuenta de usuario de forma definitiva, invalidando credenciales y borrando
              la totalidad de datos contables y personales asociados. No podrás recuperar el acceso.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsDeleteModalOpen(true)}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs transition duration-150 shadow-md shadow-red-600/10 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Eliminar Cuenta</span>
          </button>
        </div>
      </div>

      {/* Confirmation Modals */}
      <FactoryResetModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        onSuccess={handleResetSuccess}
        onError={handleResetError}
      />

      <DeleteAccountModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} />
    </div>
  );
}
