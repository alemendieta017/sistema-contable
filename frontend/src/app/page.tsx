'use client';

import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import BrandLogo from '../components/brand/BrandLogo';

export default function HomePage() {
  const [view, setView] = useState<'home' | 'login' | 'register'>('home');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // If user already has a token, redirect directly to transactions
    const token = localStorage.getItem('auth_token');
    if (token) {
      window.location.href = '/transactions';
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.auth.login({ email, password });
      if (res.access_token) {
        localStorage.setItem('auth_token', res.access_token);
        window.location.href = '/transactions';
      } else {
        throw new Error('No token returned');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to log in');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.auth.register({ fullName: name, email, password });
      setView('login');
      setError('Registration successful! Please log in.');
    } catch (err: any) {
      setError(err.message || 'Failed to register');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 text-center bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <div className="w-full max-w-md p-8 bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800 animate-in fade-in zoom-in duration-500">
        {/* Contawave Logo */}
        <div className="flex justify-center mb-6">
          <BrandLogo variant="square" className="w-24 h-24" />
        </div>

        {error && (
          <div className="p-3 mb-4 text-xs text-red-700 bg-red-50 dark:bg-red-950/30 dark:text-red-400 rounded-lg">
            {error}
          </div>
        )}

        {view === 'home' && (
          <>
            <h1 className="text-3xl font-extrabold tracking-tight mb-2 text-slate-900 dark:text-white">
              Contawave
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mb-6 text-sm">
              Sistema de gestión contable con partida doble y presupuestos.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => setView('login')}
                className="w-full py-3 px-4 bg-brand-gradient hover:opacity-95 text-white font-bold rounded-xl shadow-brand-glow-sm hover:shadow-brand-glow transition duration-200 cursor-pointer"
              >
                Ingresar
              </button>
              <button
                onClick={() => setView('register')}
                className="w-full py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-white font-semibold rounded-xl transition duration-200 cursor-pointer"
              >
                Crear cuenta
              </button>
            </div>
          </>
        )}

        {view === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4 text-left">
            <h2 className="text-xl font-bold text-center">Iniciar Sesión</h2>
            <div>
              <label className="block text-3xs font-bold uppercase text-slate-400 mb-1">
                Correo Electrónico
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="correo@ejemplo.com"
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-xs outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-3xs font-bold uppercase text-slate-400 mb-1">
                Contraseña
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-xs outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-100"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-brand-gradient hover:opacity-95 text-white font-bold rounded-xl shadow-brand-glow-sm hover:shadow-brand-glow transition duration-200 disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Iniciando...' : 'Ingresar'}
            </button>
            <button
              type="button"
              onClick={() => setView('home')}
              className="w-full py-2.5 text-xs text-slate-500 dark:text-slate-400 hover:underline text-center"
            >
              Atrás
            </button>
          </form>
        )}

        {view === 'register' && (
          <form onSubmit={handleRegister} className="space-y-4 text-left">
            <h2 className="text-xl font-bold text-center">Crear Cuenta</h2>
            <div>
              <label className="block text-3xs font-bold uppercase text-slate-400 mb-1">
                Nombre
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Juan Pérez"
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-xs outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-3xs font-bold uppercase text-slate-400 mb-1">
                Correo Electrónico
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="correo@ejemplo.com"
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-xs outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-3xs font-bold uppercase text-slate-400 mb-1">
                Contraseña
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-xs outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-100"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-brand-gradient hover:opacity-95 text-white font-bold rounded-xl shadow-brand-glow-sm hover:shadow-brand-glow transition duration-200 disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Creando...' : 'Registrar Cuenta'}
            </button>
            <button
              type="button"
              onClick={() => setView('home')}
              className="w-full py-2.5 text-xs text-slate-500 dark:text-slate-400 hover:underline text-center"
            >
              Atrás
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
