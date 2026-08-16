# Data Model & Type Definitions: Menús y Submenús Anidados

**Feature**: `019-sidebar-nested-menus`  
**Date**: 2026-08-15  
**Status**: Completed

---

## 1. Overview

This document outlines the TypeScript data structures, state models, and utility interfaces for the nested navigation hierarchy in both the desktop `Sidebar` and the mobile `BottomNav` / Drawer.

---

## 2. Core Navigation Types (`frontend/src/config/navigation.ts`)

```typescript
import { LucideIcon } from 'lucide-react';

/**
 * Individual leaf navigation item.
 */
export interface NavItem {
  /** Unique key identifying the navigation item */
  id: string;
  /** Display label in Spanish */
  name: string;
  /** Primary target route path (e.g. '/budgets/matrix') */
  href: string;
  /** Icon component from lucide-react */
  icon: LucideIcon;
  /** Optional secondary routes that also mark this item as active */
  aliasHrefs?: string[];
  /** When true, only exact pathname match activates the item */
  matchExact?: boolean;
  /** Optional badge indicator (e.g. 'Nuevo', 'Beta') */
  badge?: string;
  /** Mobile-specific display priority (e.g. in primary bottom bar vs drawer) */
  mobilePlacement?: 'bottom_bar' | 'drawer' | 'both';
}

/**
 * Collapsible parent navigation group with nested child items.
 */
export interface NavGroup {
  /** Unique key identifying the navigation group (e.g. 'budgets', 'reports') */
  id: string;
  /** Display group title in Spanish (e.g. 'Presupuestos', 'Reportes') */
  name: string;
  /** Icon component representing the parent group */
  icon: LucideIcon;
  /** Child navigation items */
  items: NavItem[];
  /** Default expansion state when not auto-expanded by active route */
  defaultOpen?: boolean;
}

/**
 * Union type representing any entry in the navigation tree.
 */
export type NavEntry = NavItem | NavGroup;

/**
 * Categorized section for organizing the mobile drawer menu.
 */
export interface MobileNavSection {
  id: string;
  title: string;
  entries: NavEntry[];
}
```

---

## 3. Navigation Schema Invariants & Helper Functions

### 3.1 Type Discriminators

```typescript
/**
 * Type guard to differentiate between a NavGroup and a standalone NavItem.
 */
export function isNavGroup(entry: NavEntry): entry is NavGroup {
  return 'items' in entry && Array.isArray((entry as NavGroup).items);
}

export function isNavItem(entry: NavEntry): entry is NavItem {
  return !('items' in entry) && typeof (entry as NavItem).href === 'string';
}
```

### 3.2 Active Path Computation

```typescript
/**
 * Determines whether a NavItem is currently active given the current pathname.
 */
export function isNavItemActive(item: NavItem, pathname: string): boolean {
  if (!pathname) return false;

  if (item.matchExact) {
    return pathname === item.href;
  }

  if (pathname === item.href) return true;

  if (item.aliasHrefs && item.aliasHrefs.includes(pathname)) {
    return true;
  }

  if (pathname.startsWith(item.href + '/')) {
    return true;
  }

  return false;
}

/**
 * Determines whether any child within a NavGroup is currently active.
 */
export function isNavGroupActive(group: NavGroup, pathname: string): boolean {
  return group.items.some((child) => isNavItemActive(child, pathname));
}
```

---

## 4. Navigation Registry Structure

### 4.1 Desktop & Mobile Navigation Tree

| Entry ID                   | Type       | Display Name                 | Target Route (`href`)                                             | Icon                        | Parent Group |
| -------------------------- | ---------- | ---------------------------- | ----------------------------------------------------------------- | --------------------------- | ------------ |
| `transactions`             | `NavItem`  | Transacciones                | `/transactions`                                                   | `ReceiptText`               | -            |
| `accounts`                 | `NavItem`  | Cuentas                      | `/accounts`                                                       | `Wallet`                    | -            |
| `budgets`                  | `NavGroup` | Presupuestos                 | -                                                                 | `Table` / `PiggyBank`       | -            |
| `budgets-matrix`           | `NavItem`  | Planificación Presupuestaria | `/budgets/matrix` (alias: `/budgets`)                             | `Table`                     | `budgets`    |
| `budgets-control`          | `NavItem`  | Control de Ejecución         | `/budgets/control`                                                | `ShieldAlert`               | `budgets`    |
| `reports`                  | `NavGroup` | Reportes                     | -                                                                 | `FileText` / `FolderKanban` | -            |
| `reports-balance-sheet`    | `NavItem`  | Balance General              | `/reports/balance-sheet`                                          | `FileText`                  | `reports`    |
| `reports-income-statement` | `NavItem`  | Estado de Resultados         | `/reports/income-statement`                                       | `FileText`                  | `reports`    |
| `reports-forecast`         | `NavItem`  | Resultados Proyectados       | `/reports/forecast` (alias: `/reports/income-statement/forecast`) | `TrendingUp`                | `reports`    |
| `reports-cash-flow`        | `NavItem`  | Caja Proyectada              | `/reports/cash-flow`                                              | `Banknote`                  | `reports`    |
| `stats`                    | `NavItem`  | Estadísticas                 | `/stats`                                                          | `BarChart3`                 | -            |
| `periods`                  | `NavItem`  | Períodos                     | `/periods`                                                        | `Calendar`                  | -            |
| `settings`                 | `NavItem`  | Ajustes                      | `/settings`                                                       | `Settings`                  | -            |

---

## 5. UI State Management

### 5.1 Desktop Sidebar State

- `isCollapsed: boolean`: Persisted in `localStorage['sidebar_collapsed']`.
- `expandedGroups: Record<string, boolean>`: Keyed by `group.id`. Initialized by evaluating `isNavGroupActive(group, pathname)`.
- `flyoutGroupId: string | null`: Tracks which group has its floating popover open in collapsed mode.

### 5.2 Mobile Drawer State

- `isMenuOpen: boolean`: Toggles the full-height mobile slide-over/bottom drawer.
- Automatic dismiss on selection (`onClick={() => setIsMenuOpen(false)}`).
