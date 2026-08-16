'use client';

import React from 'react';
import { ChevronRight } from 'lucide-react';
import { NavGroup, isNavGroupActive } from '../../config/navigation';
import { SidebarNavItem } from './SidebarNavItem';

export interface SidebarNavGroupProps {
  /** The navigation group configuration */
  group: NavGroup;
  /** Whether the sidebar itself is in collapsed icon-only mode */
  isSidebarCollapsed: boolean;
  /** Whether this group is currently expanded */
  isExpanded: boolean;
  /** Callback triggered when user clicks to toggle expand/collapse */
  onToggleExpand: (groupId: string) => void;
  /** Current active pathname from Next.js */
  pathname: string;
}

export const SidebarNavGroup: React.FC<SidebarNavGroupProps> = ({
  group,
  isSidebarCollapsed,
  isExpanded,
  onToggleExpand,
  pathname,
}) => {
  const hasActiveChild = isNavGroupActive(group, pathname);
  const GroupIcon = group.icon;

  if (isSidebarCollapsed) {
    return (
      <button
        type="button"
        aria-expanded={isExpanded}
        aria-controls={`nav-group-${group.id}`}
        onClick={() => onToggleExpand(group.id)}
        title={group.name}
        className={`w-full flex items-center justify-center p-3 rounded-xl text-sm font-semibold transition-all duration-200 relative cursor-pointer ${
          hasActiveChild
            ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400'
            : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:text-slate-800 dark:hover:text-slate-200'
        }`}
      >
        <GroupIcon
          className={`w-4 h-4 shrink-0 ${
            hasActiveChild ? 'text-indigo-600 dark:text-indigo-400' : ''
          }`}
        />
        {hasActiveChild && (
          <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400" />
        )}
      </button>
    );
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        aria-expanded={isExpanded}
        aria-controls={`nav-group-${group.id}`}
        onClick={() => onToggleExpand(group.id)}
        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer ${
          hasActiveChild
            ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/20'
            : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:text-slate-800 dark:hover:text-slate-200'
        }`}
      >
        <div className="flex items-center space-x-3 min-w-0">
          <GroupIcon
            className={`w-4 h-4 shrink-0 ${
              hasActiveChild
                ? 'text-indigo-600 dark:text-indigo-400'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          />
          <span className="truncate">{group.name}</span>
          {hasActiveChild && !isExpanded && (
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400 shrink-0" />
          )}
        </div>
        <ChevronRight
          className={`w-4 h-4 shrink-0 text-slate-400 transition-transform duration-200 ${
            isExpanded ? 'rotate-90 text-slate-600 dark:text-slate-200' : ''
          }`}
        />
      </button>

      <div
        id={`nav-group-${group.id}`}
        role="region"
        aria-label={group.name}
        className={`grid transition-all duration-300 ease-in-out ${
          isExpanded
            ? 'grid-rows-[1fr] opacity-100'
            : 'grid-rows-[0fr] opacity-0 pointer-events-none'
        }`}
      >
        <div className="overflow-hidden space-y-1">
          {group.items.map((subItem) => (
            <SidebarNavItem key={subItem.id} item={subItem} pathname={pathname} isSubItem={true} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default SidebarNavGroup;
