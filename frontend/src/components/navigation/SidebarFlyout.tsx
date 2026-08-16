'use client';

import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import { NavGroup, isNavItemActive } from '../../config/navigation';

export interface SidebarFlyoutProps {
  group: NavGroup;
  pathname: string;
  isOpen: boolean;
  onClose: () => void;
}

export const SidebarFlyout: React.FC<SidebarFlyoutProps> = ({
  group,
  pathname,
  isOpen,
  onClose,
}) => {
  const flyoutRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      if (flyoutRef.current && !flyoutRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      ref={flyoutRef}
      role="menu"
      aria-label={group.name}
      onMouseLeave={onClose}
      className="absolute left-full ml-3 top-0 z-50 min-w-[220px] max-w-xs bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-2 px-1.5 animate-in fade-in zoom-in-95 duration-150"
    >
      {/* Header */}
      <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-700/60 mb-1.5 flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 truncate">
          {group.name}
        </span>
      </div>

      {/* Subitem Links */}
      <div className="space-y-1">
        {group.items.map((child) => {
          const Icon = child.icon;
          const isActive = isNavItemActive(child, pathname);

          return (
            <Link
              key={child.id || child.href}
              href={child.href}
              role="menuitem"
              onClick={onClose}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors duration-150 ${
                isActive
                  ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-semibold'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <Icon
                className={`w-4 h-4 shrink-0 ${
                  isActive
                    ? 'text-indigo-600 dark:text-indigo-400'
                    : 'text-slate-400 dark:text-slate-500'
                }`}
              />
              <span className="truncate flex-1">{child.name}</span>
              {child.badge && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300">
                  {child.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default SidebarFlyout;
