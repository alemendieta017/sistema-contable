# Phase 0 Research: Menús y Submenús Anidados en Sidebar y Navegación Móvil

**Feature**: `020-sidebar-nested-menus`  
**Date**: 2026-08-15  
**Status**: Completed

---

## 1. Context & Problem Statement

As the accounting system expanded (introducing comprehensive budgeting planning matrices, execution controls, financial reports, forecast models, and accounting period management), the main navigation sidebar became an unorganized flat list of 11+ top-level links. This caused:

- High visual clutter and lack of clear mental models for module groupings (e.g. Budgeting vs. Reports).
- Crowded mobile "Más" drawer menu with a flat 2-column grid lacking distinction between major workflows.
- Inability to quickly navigate related tools (e.g. switching between "Planificación Presupuestaria" and "Control de Ejecución").

The goal is to implement a clean, accessible, collapsible nested navigation system on Desktop (expanded and collapsed sidebar states) and an ergonomic categorized mobile drawer navigation.

---

## 2. Research Decisions & Technical Trade-offs

### Decision 1: Centralized, Type-Safe Navigation Registry (`frontend/src/config/navigation.ts`)

- **Decision**: Define a strongly typed navigation schema supporting both standalone links (`NavItem`) and hierarchical collapsible parent groups (`NavGroup`) in a dedicated config module `frontend/src/config/navigation.ts`.
- **Rationale**:
  - Prevents duplication between Desktop `Sidebar`, Mobile `BottomNav` / Drawer, and future breadcrumb/command palette components.
  - Ensures 100% compile-time type safety with TypeScript, eliminating magic strings in routes and labels.
  - Allows easy unit testing of navigation matching, active state detection, and auto-expansion logic.
- **Alternatives Considered**:
  - _Hardcoded JSX within `Sidebar.tsx` and `BottomNav.tsx`_: Rejected because changes to routes or labels require updating multiple files with high risk of desynchronization.
  - _Dynamic server-driven navigation endpoint_: Rejected as unnecessary complexity for a client-side routing structure.

---

### Decision 2: Automatic Expansion & Smart Active State Detection

- **Decision**:
  - Automatically expand a `NavGroup` when the current pathname matches either the group's exact route prefix or any child `NavItem`'s `href` or sub-routes (e.g. `/budgets/matrix`, `/budgets/control`, `/reports/*`).
  - Maintain an interactive toggle state (`expandedGroups: Record<string, boolean>`) allowing users to collapse or expand groups on demand without breaking active highlight.
  - Highlight active child subitems with primary brand styling (`text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 font-semibold`) and provide a subtle active accent on the parent group header when one of its children is active.
- **Rationale**:
  - Delivers seamless context awareness when navigating via direct bookmarks, search, or deep links.
  - Conforms to standard UX practices (WCAG AA, clean spatial orientation).
- **Alternatives Considered**:
  - _Strict single-accordion (opening one group forces all others to close)_: Rejected because users frequently compare reports and budgets and prefer keeping multiple relevant groups open.
  - _URL query parameter-driven state_: Rejected because it pollutes clean browser URLs.

---

### Decision 3: Desktop Collapsed Mode (Flyout Popover)

- **Decision**:
  - In collapsed sidebar mode (`w-20`, icon-only), hovering or clicking a `NavGroup` icon triggers an absolute positioned flyout popover panel (`left-full ml-2 top-0 z-50`) displaying the group title header and its subitems.
  - Clicking any subitem inside the popover navigates to the target page and closes the flyout.
  - Uses CSS transition / backdrop dismiss for high accessibility and effortless dismiss on mouse leave or escape key.
- **Rationale**:
  - Eliminates the need to uncollapse the entire sidebar just to access a nested submenu.
  - Aligns with standard productivity application UI paradigms (VS Code, Tailwind UI, Linear).
- **Alternatives Considered**:
  - _Disabling submenus in collapsed mode_: Rejected because it severely breaks user workflow when working on smaller desktop screens.
  - _Expanding the whole sidebar on hover_: Rejected as jarring and disorienting.

---

### Decision 4: Mobile Drawer Ergonomics & Categorized Sections

- **Decision**:
  - Redesign the mobile "Más" drawer into categorized sections with distinct visual group cards/accordions.
  - Enforce minimum touch target heights of $48\text{px}$ (exceeding WCAG's $44\times 44\text{px}$ requirement).
  - Automatically dismiss the mobile drawer upon item selection (`setIsMenuOpen(false)`).
  - Keep primary fast actions in the fixed bottom bar (`Registro`, `Cuentas`, `Estadísticas`, and `Más`).
- **Rationale**:
  - Solves the mobile tap confusion caused by the cramped 2-column grid.
  - Makes discovering reports and budgeting tools intuitive and frictionless on mobile screens.
- **Alternatives Considered**:
  - _Multi-level sliding screen drilldown_: Rejected as overly complex for a 2-level hierarchy.
  - _Replacing BottomNav with a hamburger header only_: Rejected because bottom navigation is far more ergonomic for one-handed mobile use.

---

### Decision 5: Accessible Animation & Transitions

- **Decision**:
  - Use CSS Grid transitions (`grid-template-rows: 0fr` to `1fr`) with `overflow-hidden` and `opacity` transition for smooth height expansion without fixed height magic numbers.
  - Rotate Chevron icons (`transform rotate-90` or `rotate-180`) on active state.
  - Support `aria-expanded`, `aria-controls`, and keyboard navigation (`Enter`, `Space` to toggle groups).
- **Rationale**:
  - Grid row transition (`grid-rows-[0fr]` -> `grid-rows-[1fr]`) animates smoothly from dynamic height $0$ to full content height at 60 FPS without layout jumps.
  - Full WCAG accessibility compliance.
