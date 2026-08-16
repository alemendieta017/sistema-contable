# Implementation Plan: Menús y Submenús Anidados en Sidebar y Navegación Móvil

**Branch**: `implement_sidebar_nested_menus` | **Date**: 2026-08-15 | **Spec**: [spec.md](file:///C:/Users/amend/.gemini/antigravity/worktrees/sistema-contable/implement_sidebar_nested_menus/specs/019-sidebar-nested-menus/spec.md)

**Input**: Feature specification from `/specs/019-sidebar-nested-menus/spec.md`

## Summary

This plan defines the technical implementation for the **Nested Menus & Submenus Navigation Architecture** across Desktop and Mobile viewports for the Sistema Contable web application.

Key architectural deliverables:

1. **Centralized Type-Safe Navigation Registry (`frontend/src/config/navigation.ts`)**:
   - Single source of truth defining navigation items (`NavItem`), collapsible parent groups (`NavGroup`), and mobile drawer categorized sections.
   - Eliminates hardcoded duplicate routes and magic strings across `Sidebar.tsx` and `BottomNav.tsx`.
   - Pure, testable helper functions for active path computation (`isNavItemActive`, `isNavGroupActive`) with support for nested sub-routes and route aliases (`/budgets` $\rightarrow$ `/budgets/matrix`, `/reports/income-statement/forecast` $\rightarrow$ `/reports/forecast`).

2. **Desktop Collapsible Hierarchical Sidebar (`frontend/src/components/Sidebar.tsx`)**:
   - **Standalone items**: "Transacciones", "Cuentas", "Estadísticas", "Períodos", "Ajustes".
   - **Collapsible Groups**:
     - **Presupuestos**: "Planificación Presupuestaria" (`/budgets/matrix`), "Control de Ejecución" (`/budgets/control`).
     - **Reportes**: "Balance General" (`/reports/balance-sheet`), "Estado de Resultados" (`/reports/income-statement`), "Resultados Proyectados" (`/reports/income-statement/forecast`), "Caja Proyectada" (`/reports/cash-flow`).
   - **Auto-Expansion & Context Awareness**: Automatically auto-expands the corresponding parent group on initial load or route transition if any child route is active.
   - **Smooth 60 FPS Disclosure Transitions**: CSS Grid row height transitions (`grid-template-rows: 0fr` $\leftrightarrow$ `1fr`) and rotating Chevron indicators without fixed-height layout jumps.
   - **Desktop Collapsed Mode (Flyout Popover)**: In collapsed icon-only mode (`w-20`), hovering or clicking a parent group icon displays an accessible floating popover menu with the group title and clickable subitems.

3. **Hierarchical Mobile Navigation (`frontend/src/components/BottomNav.tsx`)**:
   - Redesigned "Más" drawer replacing the crowded 2-column grid with structured, categorized sections and touch targets ($\ge 48\text{px}$).
   - Instant auto-closing on subitem selection (`setIsMenuOpen(false)`).
   - Bottom bar remains fast and responsive with primary actions (`Registro`, `Cuentas`, `Estadísticas`, and `Más`).

4. **Component Decomposition & Clean Architecture**:
   - Modular navigation components under `frontend/src/components/navigation/`:
     - `SidebarNavGroup.tsx`: Collapsible parent group component with Chevron rotation and active status indicator.
     - `SidebarNavItem.tsx`: Individual leaf navigation link with active state styling.
     - `SidebarFlyout.tsx`: Floating popover panel for collapsed sidebar state.
     - `MobileNavDrawer.tsx`: Categorized mobile sheet drawer.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js v18+, Next.js 16, React 19  
**Primary Dependencies**: Lucide React, TailwindCSS v4.3, Next.js App Router  
**Storage**: Browser `localStorage` for `sidebar_collapsed`  
**Testing**: Jest, React Testing Library  
**Target Platform**: Responsive Web Application (Desktop $>1024\text{px}$, Tablet $768-1024\text{px}$, Mobile $\le 768\text{px}$)  
**Performance Goals**: 60 FPS transitions, zero layout shifts, <16ms response time on expand/collapse  
**Constraints**: Zero magic strings, 100% Spanish UI labels, WCAG AA compliance (contrast and $\ge 48\text{px}$ mobile touch targets), strict ESLint compliance (0 errors, 0 warnings)  
**Scale/Scope**: Unified navigation across 11+ application routes

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- **I. Double-Entry Bookkeeping & Ledger Integrity**: PASSED. Navigation architecture does not alter financial ledger records; double-entry integrity unaffected.
- **II. Clean Architecture & SOLID Principles**: PASSED. Clear separation between configuration/data layer (`frontend/src/config/navigation.ts`), layout logic (`Sidebar.tsx`, `BottomNav.tsx`), and subcomponents (`SidebarNavGroup.tsx`, `SidebarFlyout.tsx`, `MobileNavDrawer.tsx`).
- **III. Monorepo Organization & Unified Type Safety**: PASSED. All navigation items and group definitions are strongly typed using TypeScript interfaces and discriminating unions.
- **IV. Budgetary Control and Personal/Family Domain**: PASSED. Direct, 2-click access to both "Planificación Presupuestaria" and "Control de Ejecución".
- **V. Strict Test-Driven Development (TDD) & Quality Verification**: PASSED. Comprehensive unit tests covering navigation utilities, active path detection, and group auto-expansion.
- **VI. Prevention of Magic Strings & Strict Type Constants**: PASSED. Navigation IDs, routes, labels, and icons are centralized in a typed registry without inline magic strings.
- **VII. Mandatory ESLint Compliance & Static Code Quality**: PASSED. All new and modified files must pass ESLint with 0 errors and 0 warnings.

## Project Structure

### Documentation (this feature)

```text
specs/019-sidebar-nested-menus/
├── spec.md              # Feature specification
├── plan.md              # Implementation plan (this file)
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 UI contracts
│   └── navigation-ui-contract.md
└── tasks.md             # Phase 2 output (/speckit-tasks command)
```

### Source Code (repository root)

```text
frontend/
├── src/
│   ├── config/
│   │   └── navigation.ts            # Centralized typed navigation registry and helper functions
│   ├── components/
│   │   ├── Sidebar.tsx              # Refactored desktop Sidebar using navigation config
│   │   ├── BottomNav.tsx            # Refactored mobile BottomNav and drawer
│   │   └── navigation/
│   │       ├── SidebarNavGroup.tsx  # Collapsible parent group item with animated chevron
│   │       ├── SidebarNavItem.tsx   # Individual leaf navigation item
│   │       ├── SidebarFlyout.tsx    # Floating popover panel for collapsed sidebar state
│   │       └── MobileNavDrawer.tsx  # Categorized mobile drawer sheet
│   └── tests/
│       ├── navigation.test.ts       # Unit tests for active route matching & helpers
│       ├── Sidebar.test.tsx         # Unit tests for Sidebar collapse, expand, and popovers
│       └── BottomNav.test.tsx       # Unit tests for BottomNav and Mobile Drawer interactions
```

**Structure Decision**: Web application frontend modular structure adhering to Clean Architecture and Next.js App Router conventions.

## Complexity Tracking

_No violations. Clean Architecture and constitutional principles strictly maintained._
