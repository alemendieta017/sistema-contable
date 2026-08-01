'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import ChangePasswordModal from '../profile/ChangePasswordModal';

export default function HeaderProfileMenu() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) {
    return (
      <div className="flex items-center space-x-3">
        <button
          onClick={() => router.push('/login')}
          className="text-sm font-medium text-slate-300 hover:text-white px-3 py-1.5 rounded-lg transition-colors"
        >
          Sign In
        </button>
        <button
          onClick={() => router.push('/signup')}
          className="text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 px-3.5 py-1.5 rounded-lg transition-colors shadow-sm"
        >
          Sign Up
        </button>
      </div>
    );
  }

  // Get initials (e.g., "Juan Pérez" -> "JP")
  const getInitials = (name: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const handleLogout = () => {
    logout();
    setIsOpen(false);
    router.push('/login');
    router.refresh();
  };

  return (
    <>
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center justify-center w-9 h-9 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:ring-offset-slate-900 transition-all"
          title={user.fullName}
        >
          {getInitials(user.fullName)}
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-2 w-64 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl py-2 z-50 divide-y divide-slate-700/60">
            <div className="px-4 py-3">
              <p className="text-sm font-semibold text-white truncate">{user.fullName}</p>
              <p className="text-xs text-slate-400 truncate mt-0.5">{user.email}</p>
            </div>

            <div className="py-1">
              <button
                onClick={() => {
                  setIsOpen(false);
                  setIsChangePasswordOpen(true);
                }}
                className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-700/60 hover:text-white flex items-center space-x-2 transition-colors"
              >
                <span>🔑</span>
                <span>Security / Change Password</span>
              </button>
            </div>

            <div className="py-1">
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 flex items-center space-x-2 transition-colors"
              >
                <span>🚪</span>
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {isChangePasswordOpen && (
        <ChangePasswordModal onClose={() => setIsChangePasswordOpen(false)} />
      )}
    </>
  );
}
