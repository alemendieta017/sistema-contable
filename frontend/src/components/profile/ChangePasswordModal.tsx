'use client';

import React, { useState } from 'react';
import { authService } from '@/services/auth.service';

interface ChangePasswordModalProps {
  onClose: () => void;
}

export default function ChangePasswordModal({ onClose }: ChangePasswordModalProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const rules = [
    { label: 'At least 8 characters long', valid: newPassword.length >= 8 },
    { label: 'One uppercase letter (A-Z)', valid: /[A-Z]/.test(newPassword) },
    { label: 'One lowercase letter (a-z)', valid: /[a-z]/.test(newPassword) },
    { label: 'One number (0-9)', valid: /\d/.test(newPassword) },
    { label: 'One special character (!@#$%^&*)', valid: /[^a-zA-Z0-9]/.test(newPassword) },
  ];

  const isNewPasswordValid = rules.every((r) => r.valid);
  const isFormValid =
    currentPassword.length > 0 &&
    isNewPasswordValid &&
    newPassword === confirmNewPassword &&
    currentPassword !== newPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      const res = await authService.changePassword({ currentPassword, newPassword });
      setSuccess(res.message || 'Password updated successfully!');
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to change password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl max-w-md w-full p-6 space-y-6">
        <div className="flex justify-between items-center border-b border-slate-700 pb-4">
          <h3 className="text-lg font-bold text-white">Change Password</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-xl font-bold transition-colors"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-emerald-500/10 border border-emerald-500/50 text-emerald-400 px-4 py-3 rounded-lg text-sm">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300">Current Password</label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300">New Password</label>
            <input
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
            <label className="block text-sm font-medium text-slate-300">Confirm New Password</label>
            <input
              type="password"
              required
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              placeholder="••••••••"
            />
            {confirmNewPassword.length > 0 && newPassword !== confirmNewPassword && (
              <p className="text-xs text-red-400 mt-1">Passwords do not match</p>
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isFormValid || isLoading}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
            >
              {isLoading ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
