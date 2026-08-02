'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { authService } from '@/services/auth.service';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setError(null);
    setMessage(null);
    setIsLoading(true);

    try {
      const res = await authService.forgotPassword({ email: email.trim() });
      setMessage(res.message || 'If the email is registered, a password reset link has been sent.');
    } catch (err: any) {
      setError(err.message || 'An error occurred while requesting password reset.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4 py-12">
      <div className="max-w-md w-full space-y-8 bg-slate-800 p-8 rounded-xl shadow-2xl border border-slate-700">
        <div>
          <h2 className="mt-2 text-center text-3xl font-extrabold text-white">
            Forgot Your Password?
          </h2>
          <p className="mt-2 text-center text-sm text-slate-400">
            Enter your email address and we&apos;ll send you a link to reset your password.
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {message && (
          <div className="bg-emerald-500/10 border border-emerald-500/50 text-emerald-400 px-4 py-3 rounded-lg text-sm">
            {message}
          </div>
        )}

        {!message && (
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-300">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                placeholder="juan.perez@example.com"
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading || !email}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? 'Sending Link...' : 'Send Reset Link'}
              </button>
            </div>
          </form>
        )}

        <div className="text-center text-sm pt-4">
          <Link href="/login" className="font-medium text-indigo-400 hover:text-indigo-300">
            ← Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
