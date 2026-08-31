import {
  LucideIcon,
  ReceiptText,
  Wallet,
  PieChart,
  CalendarRange,
  Target,
  FileText,
  TrendingUp,
  Banknote,
  BarChart3,
  Settings,
} from 'lucide-react';

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
  items: NavItem[];
}

/**
 * Type guard to differentiate between a NavGroup and a standalone NavItem.
 */
export function isNavGroup(entry: NavEntry): entry is NavGroup {
  return 'items' in entry && Array.isArray((entry as NavGroup).items);
}

export function isNavItem(entry: NavEntry): entry is NavItem {
  return 'href' in entry && typeof entry.href === 'string';
}

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

/**
 * Desktop navigation items / groups registry.
 */
export const navigationRegistry: NavEntry[] = [
  {
    id: 'transactions',
    name: 'Transacciones',
    href: '/transactions',
    icon: ReceiptText,
    mobilePlacement: 'bottom_bar',
  },
  {
    id: 'accounts',
    name: 'Cuentas',
    href: '/accounts',
    icon: Wallet,
    mobilePlacement: 'bottom_bar',
  },
  {
    id: 'budgets',
    name: 'Presupuestos',
    icon: PieChart,
    items: [
      {
        id: 'budgets-matrix',
        name: 'Planificación',
        href: '/budgets/matrix',
        aliasHrefs: ['/budgets'],
        icon: CalendarRange,
        mobilePlacement: 'drawer',
      },
      {
        id: 'budgets-control',
        name: 'Control de Ejecución',
        href: '/budgets/control',
        icon: Target,
        mobilePlacement: 'drawer',
      },
    ],
  },
  {
    id: 'reports',
    name: 'Reportes',
    icon: FileText,
    items: [
      {
        id: 'reports-balance-sheet',
        name: 'Balance General',
        href: '/reports/balance-sheet',
        icon: FileText,
        mobilePlacement: 'drawer',
      },
      {
        id: 'reports-income-statement',
        name: 'Estado de Resultados',
        href: '/reports/income-statement',
        matchExact: true,
        icon: FileText,
        mobilePlacement: 'drawer',
      },
      {
        id: 'reports-forecast',
        name: 'Resultados Proyectados',
        href: '/reports/income-statement/forecast',
        aliasHrefs: ['/reports/forecast'],
        icon: TrendingUp,
        mobilePlacement: 'drawer',
      },
      {
        id: 'reports-cash-flow',
        name: 'Caja Proyectada',
        href: '/reports/cash-flow',
        icon: Banknote,
        mobilePlacement: 'drawer',
      },
    ],
  },
  {
    id: 'stats',
    name: 'Estadísticas',
    href: '/stats',
    icon: BarChart3,
    mobilePlacement: 'bottom_bar',
  },
  {
    id: 'settings',
    name: 'Ajustes',
    href: '/settings',
    icon: Settings,
    mobilePlacement: 'drawer',
  },
];

/**
 * Mobile drawer categorized sections derived from the single navigationRegistry source.
 */
const budgetGroup = navigationRegistry.find((e) => e.id === 'budgets') as NavGroup | undefined;
const reportGroup = navigationRegistry.find((e) => e.id === 'reports') as NavGroup | undefined;

export const mobileDrawerSections: MobileNavSection[] = [
  {
    id: 'budgets-section',
    title: budgetGroup?.name ?? 'Presupuestos',
    items: budgetGroup ? budgetGroup.items : [],
  },
  {
    id: 'reports-section',
    title: 'Reportes e Informes',
    items: reportGroup ? reportGroup.items : [],
  },
  {
    id: 'management-section',
    title: 'Gestión y Configuración',
    items: navigationRegistry.filter(
      (e): e is NavItem => isNavItem(e) && e.mobilePlacement === 'drawer',
    ),
  },
];
