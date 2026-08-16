# UI & Component Contract: Menús y Submenús Anidados

**Feature**: `020-sidebar-nested-menus`  
**Date**: 2026-08-15  
**Status**: Completed

---

## 1. Scope & Component Architecture

This contract defines the public component interfaces, prop contracts, DOM accessibility attributes, and route mappings for the desktop `Sidebar` and mobile `BottomNav` / Drawer navigation components.

```
frontend/src/
├── config/
│   └── navigation.ts            # Navigation hierarchy schema, items, and helper utils
├── components/
│   ├── Sidebar.tsx              # Desktop Sidebar component
│   ├── BottomNav.tsx            # Mobile Bottom Bar and Hierarchical Drawer
│   └── navigation/
│       ├── SidebarNavGroup.tsx  # Collapsible parent group item with chevron
│       ├── SidebarNavItem.tsx   # Direct link leaf item
│       ├── SidebarFlyout.tsx    # Floating popover panel for collapsed mode
│       └── MobileNavDrawer.tsx  # Categorized mobile drawer content
```

---

## 2. Component Contracts

### 2.1 `SidebarNavGroup`

Renders an expandable parent navigation item on desktop.

#### Props

```typescript
export interface SidebarNavGroupProps {
  /** The navigation group configuration */
  group: NavGroup;
  /** Whether the sidebar itself is in collapsed icon-only mode */
  isSidebarCollapsed: boolean;
  /** Whether this group is currently expanded */
  isExpanded: boolean;
  /** Callback triggered when user clicks to toggle expand/collapse */
  onToggleExpand: (groupId: string) => void;
  /** Current active pathname from Next.js usePathname() */
  pathname: string;
}
```

#### DOM / Accessibility Contract

- Renders `<button type="button" aria-expanded={isExpanded} aria-controls={`nav-group-${group.id}`}>`
- Chevron icon rotates $90^\circ$ when `isExpanded` is true.
- Submenu container renders `<div id={`nav-group-${group.id}`} role="region">`.

---

### 2.2 `SidebarFlyout`

Renders a floating popup submenu when hovering/clicking a group icon in collapsed sidebar mode.

#### Props

```typescript
export interface SidebarFlyoutProps {
  group: NavGroup;
  pathname: string;
  isOpen: boolean;
  onClose: () => void;
}
```

#### Behavioral Contract

- Positioned absolutely to the right of the collapsed sidebar button (`left-full ml-3 top-0 z-50 min-w-[200px]`).
- Includes group title as header, followed by each child `NavItem`.
- Closes automatically when clicking a subitem or on mouse leave / backdrop click.

---

### 2.3 `MobileNavDrawer`

Renders the full categorized navigation panel when the mobile "Más" button is tapped.

#### Props

```typescript
export interface MobileNavDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  pathname: string;
}
```

#### Behavioral Contract

- Renders as a backdrop-dismissible bottom drawer or slide-over sheet.
- Group headers clearly distinguish categories:
  1. **Presupuestos**: "Planificación Presupuestaria", "Control de Ejecución".
  2. **Reportes e Informes**: "Balance General", "Estado de Resultados", "Resultados Proyectados", "Caja Proyectada".
  3. **Gestión y Configuración**: "Períodos", "Ajustes".
- Every item has a touch target height $\ge 48\text{px}$.
- Tapping any item invokes `onClose()` before Next.js page transition.

---

## 3. Route Contracts & Backward Compatibility

All navigation links must route to existing canonical page endpoints without broken redirects:

| Display Label                | Route (`href`)                       | Canonical Page Path                                           |
| ---------------------------- | ------------------------------------ | ------------------------------------------------------------- |
| Transacciones                | `/transactions`                      | `frontend/src/app/transactions/page.tsx`                      |
| Cuentas                      | `/accounts`                          | `frontend/src/app/accounts/page.tsx`                          |
| Planificación Presupuestaria | `/budgets/matrix`                    | `frontend/src/app/budgets/matrix/page.tsx`                    |
| Control de Ejecución         | `/budgets/control`                   | `frontend/src/app/budgets/control/page.tsx`                   |
| Balance General              | `/reports/balance-sheet`             | `frontend/src/app/reports/balance-sheet/page.tsx`             |
| Estado de Resultados         | `/reports/income-statement`          | `frontend/src/app/reports/income-statement/page.tsx`          |
| Resultados Proyectados       | `/reports/income-statement/forecast` | `frontend/src/app/reports/income-statement/forecast/page.tsx` |
| Caja Proyectada              | `/reports/cash-flow`                 | `frontend/src/app/reports/cash-flow/page.tsx`                 |
| Estadísticas                 | `/stats`                             | `frontend/src/app/stats/page.tsx`                             |
| Períodos                     | `/periods`                           | `frontend/src/app/periods/page.tsx`                           |
| Ajustes                      | `/settings`                          | `frontend/src/app/settings/page.tsx`                          |
