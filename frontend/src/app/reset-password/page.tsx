'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { authService } from '@/services/auth.service';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Invalid or missing password reset token.');
    }
  }, [token]);

  const rules = [
    { label: 'At least 6 characters long', valid: newPassword.length >= 6 },
  ];

  const isPasswordValid = rules.every((r) => r.valid);
  const isFormValid = !!token && isPasswordValid && newPassword === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    setError(null);
    setIsLoading(true);

    try {
      const res = await authService.resetPassword({
        token,
        newPassword,
      });
      setSuccessMessage(res.message || 'Password reset successfully! Redirecting to login...');
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password. The link may have expired or already been used.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md w-full space-y-8 bg-slate-800 p-8 rounded-xl shadow-2xl border border-slate-700">
      <div>
        <h2 className="mt-2 text-center text-3xl font-extrabold text-white">
          Reset Your Password
        </h2>
        <p className="mt-2 text-center text-sm text-slate-400">
          Enter your new secure password below
        </p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="bg-emerald-500/10 border border-emerald-500/50 text-emerald-400 px-4 py-3 rounded-lg text-sm">
          {successMessage}
        </div>
      )}

      {!successMessage && (
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-slate-300">
                New Password
              </label>
              <input
                id="newPassword"
                name="newPassword"
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="mt-1 block w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                placeholder="••••••••"
              />
            </div>

            {newPassword.length > 0 && (
              <div className="p-3 bg-slate-950/50 rounded-lg border border-slate-800 space-y-1">
                <p className="text-xs font-semibold text-slate-400 mb-1">Requirements:</p>
                {rules.map((rule, idx) => (
                  <div key={idx} className="flex items-center text-xs space-x-2">
                    <span className={rule.valid ? 'text-emerald-400' : 'text-slate-500'}>
                      {rule.valid ? '✓' : '○'}
                    </span>
                    <span className={rule.valid ? 'text-emerald-300' : 'text-slate-400'}>
                      {rule.label}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-300">
                Confirm New Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1 block w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                placeholder="••••••••"
              />
              {confirmPassword.length > 0 && newPassword !== confirmPassword && (
                <p className="text-xs text-red-400 mt-1">Passwords do not match</p>
              )}
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={!isFormValid || isLoading}
              className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Resetting Password...' : 'Reset Password'}
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
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4 py-12">
      <Suspense fallback={<div className="text-white">Loading...</div>}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
