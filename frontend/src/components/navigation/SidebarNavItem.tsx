'use client';

import React from 'react';
import Link from 'next/link';
import { NavItem, isNavItemActive } from '../../config/navigation';

export interface SidebarNavItemProps {
  item: NavItem;
  pathname: string;
  isCollapsed?: boolean;
  isSubItem?: boolean;
  onClick?: () => void;
}

export const SidebarNavItem: React.FC<SidebarNavItemProps> = ({
  item,
  pathname,
  isCollapsed = false,
  isSubItem = false,
  onClick,
}) => {
  const isActive = isNavItemActive(item, pathname);
  const Icon = item.icon;

  if (isSubItem) {
    return (
      <Link
        href={item.href}
        onClick={onClick}
        title={item.name}
        className={`flex items-center justify-between rounded-lg pl-9 pr-3 py-2 text-xs font-medium transition-all duration-200 ${
          isActive
            ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-semibold'
            : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:text-slate-900 dark:hover:text-slate-200'
        }`}
      >
        <div className="flex items-center space-x-2.5 min-w-0">
          <Icon
            className={`w-3.5 h-3.5 shrink-0 ${
              isActive
                ? 'text-indigo-600 dark:text-indigo-400'
                : 'text-slate-400 dark:text-slate-500'
            }`}
          />
          <span className="truncate">{item.name}</span>
        </div>
        {item.badge && (
          <span className="ml-2 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 shrink-0">
            {item.badge}
          </span>
        )}
      </Link>
    );
  }

  return (
    <Link
      href={item.href}
      onClick={onClick}
      title={isCollapsed ? item.name : undefined}
      className={`flex items-center rounded-xl text-sm font-semibold transition-all duration-200 ${
        isCollapsed ? 'justify-center p-3' : 'justify-between px-4 py-3'
      } ${
        isActive
          ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400'
          : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:text-slate-800 dark:hover:text-slate-200'
      }`}
    >
      <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'} min-w-0`}>
        <Icon
          className={`w-4 h-4 shrink-0 ${
            isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'
          }`}
        />
        {!isCollapsed && <span className="truncate">{item.name}</span>}
      </div>
      {!isCollapsed && item.badge && (
        <span className="ml-2 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 shrink-0">
          {item.badge}
        </span>
      )}
    </Link>
  );
};

export default SidebarNavItem;
