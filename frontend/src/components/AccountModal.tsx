'use client';

import React, { useState, useEffect } from 'react';
import { X, AlertCircle, ChevronDown, Check } from 'lucide-react';
import { api } from '../services/api';
import { formatInputDisplay, parseInputRaw } from '../lib/utils';

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
  systemRole?: string | null;
}

interface Account {
  id: string;
  name: string;
  type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE';
  currencyId: string;
  parentId?: string | null;
  systemRole?: string | null;
}

interface AccountModalProps {
  onClose: () => void;
  onSuccess: (createdAccount?: Account) => void;
  parentCandidates: ParentAccount[];
  initialName?: string;
  initialType?: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE';
  initialParentId?: string;
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
  initialName,
  initialType,
  initialParentId,
  accountToEdit,
}: AccountModalProps) {
  const isEditing = !!accountToEdit;

  const [name, setName] = useState(accountToEdit?.name || initialName || '');
  const [type, setType] = useState<'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE'>(
    accountToEdit?.type || initialType || 'ASSET',
  );
  const [isCashOrBank, setIsCashOrBank] = useState<boolean>(accountToEdit?.isCashOrBank ?? false);
  const [initialBalance, setInitialBalance] = useState<string>('');
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [selectedCurrencyId, setSelectedCurrencyId] = useState('');
  const [selectedParentId, setSelectedParentId] = useState(initialParentId || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const isLocked = isEditing && accountToEdit?.hasTransactions;

  useEffect(() => {
    fetchCurrencies();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

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
        onSuccess();
      } else {
        const created = await api.accounts.create({
          name: name.trim(),
          type,
          currencyId: selectedCurrencyId,
          parentId: selectedParentId || null,
          isCashOrBank,
          initialBalance: initialBalance !== '' ? Number(initialBalance) : undefined,
        });
        onSuccess(created);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al guardar la cuenta.');
    } finally {
      setLoading(false);
    }
  };

  const [isTypeMenuOpen, setIsTypeMenuOpen] = useState(false);
  const typeMenuRef = React.useRef<HTMLDivElement>(null);

  const accountTypeOptions = [
    {
      value: 'ASSET' as const,
      label: 'ACTIVO',
      description: 'Efectivo, cuentas bancarias, inversiones y bienes',
    },
    {
      value: 'LIABILITY' as const,
      label: 'PASIVO',
      description: 'Deudas, préstamos y tarjetas de crédito',
    },
    {
      value: 'INCOME' as const,
      label: 'INGRESO',
      description: 'Sueldos, ventas, honorarios y entradas de dinero',
    },
    {
      value: 'EXPENSE' as const,
      label: 'EGRESO',
      description: 'Gastos, compras, servicios, comida y transporte',
    },
  ];

  const currentTypeOption =
    accountTypeOptions.find((opt) => opt.value === type) || accountTypeOptions[0];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (typeMenuRef.current && !typeMenuRef.current.contains(e.target as Node)) {
        setIsTypeMenuOpen(false);
      }
    };
    if (isTypeMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isTypeMenuOpen]);

  // Filter possible parent accounts (same type, no parent itself, and not system/capital/equity)
  const filteredParents = parentCandidates.filter(
    (a) =>
      a.type === type &&
      !a.parentId &&
      !a.systemRole &&
      a.type !== 'EQUITY' &&
      a.name.trim().toLowerCase() !== 'capital',
  );

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-md shadow-2xl border border-slate-100 dark:border-slate-700 animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200 dark:border-slate-700 shrink-0">
          <div>
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
              {isEditing ? 'Editar Cuenta o Categoría' : 'Crear Cuenta o Categoría'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition"
          >
            <X className="w-4.5 h-4.5 text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSave} className="p-6 space-y-4 overflow-y-auto flex-1">
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

          <div ref={typeMenuRef} className="relative">
            <label className="block text-3xs font-bold uppercase text-slate-400 dark:text-slate-500 mb-1">
              Tipo
            </label>
            {isEditing ? (
              <div className="w-full bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold text-slate-600 dark:text-slate-400 flex items-center justify-between opacity-80 cursor-not-allowed">
                <span>{currentTypeOption.label}</span>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  aria-label="Tipo"
                  aria-expanded={isTypeMenuOpen}
                  onClick={() => setIsTypeMenuOpen(!isTypeMenuOpen)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs outline-none focus:border-indigo-500 font-bold text-slate-700 dark:text-slate-200 flex items-center justify-between text-left transition hover:bg-slate-100/70 dark:hover:bg-slate-800"
                >
                  <span>{currentTypeOption.label}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                      isTypeMenuOpen ? 'rotate-180 text-indigo-500' : ''
                    }`}
                  />
                </button>

                {isTypeMenuOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl z-20 py-1.5 overflow-hidden animate-in fade-in zoom-in-95 duration-100 divide-y divide-slate-100 dark:divide-slate-700/50">
                    {accountTypeOptions.map((opt) => {
                      const isSelected = opt.value === type;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            handleTypeChange(opt.value);
                            setIsTypeMenuOpen(false);
                          }}
                          className={`w-full text-left px-3.5 py-2.5 flex items-start justify-between gap-2 transition ${
                            isSelected
                              ? 'bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-200'
                          }`}
                        >
                          <div>
                            <span className="block text-xs font-bold">{opt.label}</span>
                            <span className="block text-4xs text-slate-400 dark:text-slate-500 mt-0.5 leading-tight">
                              {opt.description}
                            </span>
                          </div>
                          {isSelected && (
                            <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Saldo Field only on Account Creation for ASSET or LIABILITY */}
          {!isEditing && (type === 'ASSET' || type === 'LIABILITY') && (
            <div>
              <label className="block text-3xs font-bold uppercase text-slate-400 dark:text-slate-500 mb-1">
                Saldo (Opcional)
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={formatInputDisplay(initialBalance)}
                placeholder="0"
                onFocus={(e) => e.target.select()}
                onChange={(e) => {
                  const parsed = parseInputRaw(e.target.value);
                  setInitialBalance(parsed);
                }}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-200 font-semibold tabular-nums"
              />
              <p className="text-4xs text-slate-400 dark:text-slate-500 mt-1 font-medium">
                Saldo inicial con el que empieza esta cuenta.
              </p>
            </div>
          )}

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

          {!isEditing && filteredParents.length > 0 && (
            <div>
              <label className="block text-3xs font-bold uppercase text-slate-400 dark:text-slate-500 mb-1">
                Cuenta / Categoría Padre (Opcional)
              </label>
              <select
                value={selectedParentId}
                onChange={(e) => setSelectedParentId(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs outline-none focus:border-indigo-500 font-semibold text-slate-700 dark:text-slate-200"
              >
                <option value="">Ninguna (Es cuenta principal)</option>
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
