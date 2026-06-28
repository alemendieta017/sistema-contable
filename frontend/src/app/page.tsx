"use client";

import React, { useState, useEffect } from "react";
import { api } from "../services/api";

export default function HomePage() {
  const [view, setView] = useState<"home" | "login" | "register">("home");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // If user already has a token, redirect directly to transactions
    const token = localStorage.getItem("auth_token");
    if (token) {
      window.location.href = "/transactions";
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await api.auth.login({ email, password });
      if (res.access_token) {
        localStorage.setItem("auth_token", res.access_token);
        window.location.href = "/transactions";
      } else {
        throw new Error("No token returned");
      }
    } catch (err: any) {
      setError(err.message || "Failed to log in");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api.auth.register({ email, password });
      setView("login");
      setError("Registration successful! Please log in.");
    } catch (err: any) {
      setError(err.message || "Failed to register");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 text-center bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100">
      <div className="w-full max-w-md p-8 bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-700 animate-in fade-in zoom-in duration-500">
        {/* Logo */}
        <div className="inline-flex items-center justify-center w-16 h-16 mb-6 bg-indigo-500 text-white rounded-2xl shadow-lg shadow-indigo-500/30">
          <svg
            className="w-8 h-8"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.5"
              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>

        {error && (
          <div className="p-3 mb-4 text-xs text-red-700 bg-red-50 dark:bg-red-950/30 dark:text-red-400 rounded-lg">
            {error}
          </div>
        )}

        {view === "home" && (
          <>
            <h1 className="text-3xl font-extrabold tracking-tight mb-2">
              Sistema Contable
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mb-6 text-sm">
              Contabilidad personal y familiar con partida doble y presupuestos.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => setView("login")}
                className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-md transition duration-200"
              >
                Ingresar
              </button>
              <button
                onClick={() => setView("register")}
                className="w-full py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-white font-semibold rounded-xl transition duration-200"
              >
                Crear cuenta
              </button>
            </div>
          </>
        )}

        {view === "login" && (
          <form onSubmit={handleLogin} className="space-y-4 text-left">
            <h2 className="text-xl font-bold text-center">Iniciar Sesión</h2>
            <div>
              <label className="block text-3xs font-bold uppercase text-slate-400 mb-1">Correo Electrónico</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="correo@ejemplo.com"
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-xs outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-3xs font-bold uppercase text-slate-400 mb-1">Contraseña</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-xs outline-none focus:border-indigo-500"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-md transition duration-200 disabled:opacity-50"
            >
              {loading ? "Iniciando..." : "Ingresar"}
            </button>
            <button
              type="button"
              onClick={() => setView("home")}
              className="w-full py-2.5 text-xs text-slate-500 dark:text-slate-400 hover:underline text-center"
            >
              Atrás
            </button>
          </form>
        )}

        {view === "register" && (
          <form onSubmit={handleRegister} className="space-y-4 text-left">
            <h2 className="text-xl font-bold text-center">Crear Cuenta</h2>
            <div>
              <label className="block text-3xs font-bold uppercase text-slate-400 mb-1">Nombre</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Juan Pérez"
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-xs outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-3xs font-bold uppercase text-slate-400 mb-1">Correo Electrónico</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="correo@ejemplo.com"
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-xs outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-3xs font-bold uppercase text-slate-400 mb-1">Contraseña</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-xs outline-none focus:border-indigo-500"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-md transition duration-200 disabled:opacity-50"
            >
              {loading ? "Creando..." : "Registrar Cuenta"}
            </button>
            <button
              type="button"
              onClick={() => setView("home")}
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
