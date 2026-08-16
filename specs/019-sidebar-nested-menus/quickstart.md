# Quickstart & Verification Guide: Menús y Submenús Anidados

**Feature**: `019-sidebar-nested-menus`  
**Date**: 2026-08-15  
**Status**: Completed

---

## 1. Overview

This quickstart guide provides step-by-step instructions to verify the nested navigation hierarchy across desktop and mobile devices, including automated unit tests and manual visual validation flows.

---

## 2. Automated Test Verification

### 2.1 Navigation Unit Tests

Run the frontend test suite covering navigation active path detection, type guards, and group auto-expansion:

```bash
# Run unit tests for navigation configuration & components
npm run test --workspace=frontend
```

**Expected Results**:

- `navigation.test.ts` passes with 100% assertions:
  - Correct identification of `NavGroup` vs `NavItem`.
  - Proper matching for exact routes and nested sub-routes (e.g. `/budgets/matrix` and `/budgets/matrix/2026-08`).
  - Active detection for alias paths (`/budgets` -> `Planificación Presupuestaria`).
  - Correct auto-expansion logic for parent groups.

### 2.2 Static Quality & Lint Verification

```bash
# Run ESLint compliance check
npm run lint
```

**Expected Results**: Zero errors and zero warnings across the repository.

---

## 3. Manual Verification Scenarios

### Scenario 1: Desktop Sidebar Expand & Collapse Parent Groups (P1)

1. Open the application in a desktop browser window ($> 1024\text{px}$).
2. Locate the navigation sidebar on the left.
3. Verify that items are organized into top-level links (`Transacciones`, `Cuentas`), collapsible groups (`Presupuestos`, `Reportes`), and secondary links (`Estadísticas`, `Períodos`, `Ajustes`).
4. Click on the **Presupuestos** group header:
   - Verify smooth slide-down transition.
   - Verify Chevron icon rotates down ($90^\circ$).
   - Verify subitems "Planificación Presupuestaria" and "Control de Ejecución" are displayed with clear indentation.
5. Click on **Planificación Presupuestaria**:
   - Verify navigation to `/budgets/matrix`.
   - Verify the subitem has an active background and text highlight (`text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40`).
   - Verify the parent "Presupuestos" header displays an active contextual indicator.

---

### Scenario 2: Direct URL Deep-Link Auto-Expansion (P2)

1. Navigate directly to `http://localhost:3000/reports/income-statement` (or refresh the page while on that URL).
2. Observe the sidebar on initial render:
   - The **Reportes** parent group is automatically expanded.
   - The **Estado de Resultados** subitem is highlighted as active.
   - Other inactive groups (e.g. "Presupuestos") remain in their default state.

---

### Scenario 3: Desktop Sidebar Collapsed Mode (Flyout Popover) (P2)

1. Click the collapse toggle button (`ChevronLeft`) in the sidebar header to collapse the sidebar to icon-only mode (`w-20`).
2. Hover or click the **Presupuestos** icon:
   - Verify a floating flyout popover appears to the right of the sidebar.
   - Verify the popover header says "Presupuestos" and lists "Planificación Presupuestaria" and "Control de Ejecución".
3. Click "Control de Ejecución":
   - Verify navigation to `/budgets/control`.
   - Verify the flyout popover closes immediately.

---

### Scenario 4: Mobile Hierarchical Drawer Navigation (P1)

1. Resize the browser viewport to mobile dimensions ($\le 768\text{px}$) or open on a mobile device.
2. Verify the bottom navigation bar (`BottomNav`) is visible with 4 items: `Registro`, `Cuentas`, `Estadísticas`, and `Más`.
3. Tap the **Más** button:
   - Verify the drawer opens smoothly from the bottom.
   - Verify the options are neatly organized into clear sections:
     - **Presupuestos**: "Planificación Presupuestaria" & "Control de Ejecución".
     - **Reportes e Informes**: "Balance General", "Estado de Resultados", "Resultados Proyectados", "Caja Proyectada".
     - **Gestión**: "Períodos", "Ajustes".
   - Verify each touch target is at least $48\text{px}$ high.
4. Tap **Control de Ejecución**:
   - Verify the drawer dismisses automatically.
   - Verify navigation to `/budgets/control`.
