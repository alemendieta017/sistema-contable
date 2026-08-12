'use client';

import React, { useState, useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { api } from '../services/api';

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
  accountToEdit?: {
    id: string;
    name: string;
    type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE';
    isCashOrBank?: boolean;
    hasTransactions?: boolean;
  };
}

export default function AccountModal({
  onClose,
  onSuccess,
  parentCandidates,
  accountToEdit,
}: AccountModalProps) {
  const [name, setName] = useState(accountToEdit?.name || '');
  const [type, setType] = useState<'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE'>(
    accountToEdit?.type || 'ASSET',
  );
  const [isCashOrBank, setIsCashOrBank] = useState<boolean>(accountToEdit?.isCashOrBank ?? false);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [selectedCurrencyId, setSelectedCurrencyId] = useState('');
  const [selectedParentId, setSelectedParentId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isEditing = !!accountToEdit;
  const isLocked = isEditing && accountToEdit?.hasTransactions;

  useEffect(() => {
    fetchCurrencies();
  }, []);

  const handleNameChange = (val: string) => {
    setName(val);
    if (type === 'ASSET' && !isEditing) {
      const lower = val.toLowerCase();
      const isKeywordMatch =
        lower.includes('efectivo') ||
        lower.includes('caja') ||
        lower.includes('banco') ||
        /\bmp\b/.test(lower);
      setIsCashOrBank(isKeywordMatch);
    }
  };

  const handleTypeChange = (newType: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE') => {
    setType(newType);
    setSelectedParentId('');
    if (newType !== 'ASSET') {
      setIsCashOrBank(false);
    }
  };

  const fetchCurrencies = async () => {
    try {
      const data = await api.currencies.list();
      setCurrencies(data || []);
      const base = data?.find((c: Currency) => c.isBase);
      if (base) {
        setSelectedCurrencyId(base.id);
      }
    } catch {
      setError('Error al cargar monedas.');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError('');

    try {
      if (isEditing) {
        await api.accounts.update(accountToEdit.id, {
          name: name.trim(),
          isCashOrBank,
        });
      } else {
        await api.accounts.create({
          name: name.trim(),
          type,
          currencyId: selectedCurrencyId,
          parentId: selectedParentId || null,
          isCashOrBank,
        });
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al guardar la cuenta.');
    } finally {
      setLoading(false);
    }
  };

  // Filter possible parent accounts (same type and no parent itself)
  const filteredParents = parentCandidates.filter((a) => a.type === type && !a.parentId);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-md shadow-2xl border border-slate-100 dark:border-slate-700 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <div>
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
              {isEditing ? 'Editar Cuenta o Categoría' : 'Crear Cuenta o Categoría'}
            </h2>
            <p className="text-4xs text-slate-400 uppercase font-bold tracking-wider mt-0.5">
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
            <div className="p-3 text-xs text-red-700 bg-red-50 dark:bg-red-950/30 dark:text-red-400 rounded-xl flex items-start gap-2">
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
              onChange={(e) => handleNameChange(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-200 font-semibold"
            />
          </div>

          <div>
            <label className="block text-3xs font-bold uppercase text-slate-400 dark:text-slate-500 mb-1">
              Tipo de Rubro
            </label>
            <select
              value={type}
              disabled={isEditing}
              onChange={(e) => handleTypeChange(e.target.value as any)}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs outline-none focus:border-indigo-500 font-semibold text-slate-700 dark:text-slate-200 disabled:opacity-60"
            >
              <option value="ASSET">ACTIVO (Efectivo, Cuentas Bancarias)</option>
              <option value="LIABILITY">PASIVO (Deudas, Tarjetas de Crédito)</option>
              <option value="INCOME">INGRESO (Sueldo, Ventas, etc.)</option>
              <option value="EXPENSE">EGRESO (Gastos, Comida, Servicios)</option>
              <option value="EQUITY">PATRIMONIO NETO</option>
            </select>
          </div>

          {type === 'ASSET' && (
            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl">
              <div>
                <label
                  htmlFor="isCashOrBankToggle"
                  className="block text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer"
                >
                  Es cuenta de Efectivo/Banco
                </label>
                <p className="text-5xs text-slate-400 dark:text-slate-500">
                  {isLocked
                    ? 'Inmutable: La cuenta posee transacciones registradas'
                    : 'Incluye los movimientos de esta cuenta en el reporte de Flujo de Caja'}
                </p>
              </div>
              <input
                id="isCashOrBankToggle"
                type="checkbox"
                checked={isCashOrBank}
                disabled={!!isLocked}
                onChange={(e) => setIsCashOrBank(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 disabled:opacity-50 cursor-pointer"
              />
            </div>
          )}

          {!isEditing && (
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
          )}

          {!isEditing &&
            (type === 'INCOME' || type === 'EXPENSE') &&
            filteredParents.length > 0 && (
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
              {loading ? 'Guardando...' : isEditing ? 'Guardar Cambios' : 'Crear Cuenta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
