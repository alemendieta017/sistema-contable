# Tasks: Menús y Submenús Anidados en Sidebar y Navegación Móvil

**Input**: Design documents from `specs/020-sidebar-nested-menus/` (`spec.md`, `plan.md`, `data-model.md`, `research.md`, `contracts/navigation-ui-contract.md`, `quickstart.md`)

**Prerequisites**: `plan.md` (required), `spec.md` (required for user stories), `research.md`, `data-model.md`, `contracts/`

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (`[US1]`, `[US2]`, `[US3]`, `[US4]`)
- Exact file paths included in all task descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and navigation component directory structure.

- [x] T001 Create navigation subcomponents directory at frontend/src/components/navigation
- [x] T002 [P] Create navigation config directory at frontend/src/config

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core navigation models, type definitions, helper functions, and initial unit test suite.

**⚠️ CRITICAL**: No user story work can begin until this foundational phase is complete.

- [x] T003 [P] Create unit test suite for navigation type guards and active path detection in frontend/src/tests/navigation.test.ts
- [x] T004 Implement NavItem, NavGroup, and MobileNavSection types with helper functions (isNavGroup, isNavItem, isNavItemActive, isNavGroupActive) and full registry tree in frontend/src/config/navigation.ts

**Checkpoint**: Foundation ready — navigation registry and path detection helpers are verified and ready for component implementation.

---

## Phase 3: User Story 1 - Navegación Jerárquica Desplegable en Sidebar de Escritorio (Priority: P1) 🎯 MVP

**Goal**: Implement collapsible hierarchical groups (Presupuestos, Reportes) and individual leaf items in the desktop sidebar with smooth animated disclosure transitions.

**Independent Test**: Navigate to the desktop sidebar, expand/collapse the "Presupuestos" group header with smooth chevron animation, and click "Planificación Presupuestaria" or "Control de Ejecución" verifying correct routing and active highlight.

### Implementation for User Story 1

- [x] T005 [P] [US1] Create leaf navigation link component in frontend/src/components/navigation/SidebarNavItem.tsx
- [x] T006 [P] [US1] Create collapsible group item component with animated chevron and CSS grid disclosure in frontend/src/components/navigation/SidebarNavGroup.tsx
- [x] T007 [US1] Refactor desktop sidebar to render standalone items and collapsible groups from navigation config in frontend/src/components/Sidebar.tsx
- [x] T008 [US1] Create unit tests for desktop sidebar rendering, group toggling, and active item styling in frontend/src/tests/Sidebar.test.tsx

**Checkpoint**: User Story 1 (MVP) is fully functional and independently testable on desktop viewports.

---

## Phase 4: User Story 2 - Menú Móvil Jerárquico y Optimizado (Priority: P1)

**Goal**: Redesign the mobile "Más" drawer with structured, categorized sections (Presupuestos, Reportes e Informes, Gestión), touch targets $\ge 48\text{px}$, and automatic dismiss on navigation.

**Independent Test**: Resize to mobile viewport, tap "Más" in the bottom bar, verify categorized group cards/sections, tap "Control de Ejecución", and confirm drawer auto-dismisses with immediate navigation.

### Implementation for User Story 2

- [x] T009 [P] [US2] Create categorized mobile drawer sheet component with $\ge 48\text{px}$ touch targets and auto-close callback in frontend/src/components/navigation/MobileNavDrawer.tsx
- [x] T010 [US2] Refactor mobile bottom navigation bar and integrate MobileNavDrawer in frontend/src/components/BottomNav.tsx
- [x] T011 [US2] Create unit tests for mobile BottomNav and MobileNavDrawer categorized rendering and interaction in frontend/src/tests/BottomNav.test.tsx

**Checkpoint**: User Stories 1 AND 2 are both functional across desktop and mobile devices.

---

## Phase 5: User Story 3 - Expansión Automática por Ruta Activa y Persistencia (Priority: P2)

**Goal**: Automatically auto-expand the parent group containing the active subitem upon page load or direct URL access (e.g. `/budgets/matrix`, `/budgets/control`, `/reports/*`), supporting route aliases and nested paths.

**Independent Test**: Load deep URL directly (e.g., `/reports/income-statement` or `/budgets/control`) and verify the parent group is automatically expanded on render with the subitem highlighted.

### Implementation for User Story 3

- [x] T012 [US3] Add automatic active group auto-expansion and route alias handling in frontend/src/components/Sidebar.tsx
- [x] T013 [US3] Add unit tests for deep link route auto-expansion and alias resolution in frontend/src/tests/Sidebar.test.tsx and frontend/src/tests/navigation.test.ts

**Checkpoint**: User Stories 1, 2, and 3 are complete with seamless deep-link navigation and context awareness.

---

## Phase 6: User Story 4 - Navegación con Sidebar Colapsado (Compacto) en Escritorio (Priority: P2)

**Goal**: Provide floating flyout popovers when hovering or clicking group icons in collapsed sidebar mode (`w-20`), allowing direct access to subitems without uncollapsing the sidebar.

**Independent Test**: Collapse sidebar to icon-only mode (`w-20`), click or hover on "Presupuestos" group icon, verify popover panel appears with subitems, and select "Control de Ejecución".

### Implementation for User Story 4

- [x] T014 [P] [US4] Create floating flyout popover component for collapsed sidebar state in frontend/src/components/navigation/SidebarFlyout.tsx
- [x] T015 [US4] Integrate SidebarFlyout into collapsed mode interactions in frontend/src/components/Sidebar.tsx
- [x] T016 [US4] Add unit tests for collapsed sidebar flyout popover opening, navigation, and dismissal in frontend/src/tests/Sidebar.test.tsx

**Checkpoint**: All 4 user stories are fully implemented and functional across all viewport and sidebar states.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Quality assurance, static analysis verification, and end-to-end regression validation.

- [x] T017 [P] Verify WCAG AA accessibility, color contrast across light/dark themes, and ARIA attributes in frontend/src/components/Sidebar.tsx and frontend/src/components/BottomNav.tsx
- [x] T018 Execute full frontend test suite and ensure 100% test pass rate via npm run test --workspace=frontend
- [x] T019 Run ESLint verification to ensure 0 errors and 0 warnings across modified and created files via npm run lint
- [x] T020 Run manual validation against quickstart scenarios in specs/020-sidebar-nested-menus/quickstart.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately.
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories.
- **User Stories (Phase 3+)**: All depend on Foundational phase completion.
  - **US1 (Desktop Hierarchical Sidebar - P1)**: Core MVP — no dependencies on other stories.
  - **US2 (Mobile Hierarchical Drawer - P1)**: Can be implemented concurrently with or after US1.
  - **US3 (Auto-expansion & Deep Routing - P2)**: Extends US1 and US2 with active route listeners.
  - **US4 (Collapsed Sidebar Flyout Popovers - P2)**: Extends US1 collapsed state.
- **Polish (Phase 7)**: Depends on all user stories being completed.

### User Story Dependencies

```
[Phase 1: Setup] ──> [Phase 2: Foundational (Types & Config)]
                             │
            ┌────────────────┴────────────────┐
            ▼                                 ▼
   [Phase 3: US1 Desktop Sidebar]     [Phase 4: US2 Mobile Drawer]
            │                                 │
            ├────────────────┬────────────────┘
            ▼                ▼
   [Phase 5: US3 Auto-Exp] [Phase 6: US4 Flyouts]
            │                │
            └────────┬───────┘
                     ▼
             [Phase 7: Polish]
```

### Parallel Opportunities

- **Setup Phase**: T001 and T002 can run in parallel.
- **Foundational Phase**: T003 and T004 can proceed together (TDD test writing alongside interface definitions).
- **User Story 1**: T005 (`SidebarNavItem.tsx`) and T006 (`SidebarNavGroup.tsx`) can be built in parallel before integrating in T007.
- **User Story 2 & User Story 1**: Can be implemented in parallel once Foundational Phase 2 is complete.
- **User Story 4**: T014 (`SidebarFlyout.tsx`) can be built in parallel.
- **Polish Phase**: T017 (Accessibility) and T019 (Lint check) can run in parallel.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001 - T002).
2. Complete Phase 2: Foundational (T003 - T004).
3. Complete Phase 3: User Story 1 (T005 - T008).
4. **STOP and VALIDATE**: Test desktop sidebar expand/collapse and navigation in desktop viewport.

### Incremental Delivery

1. **Increment 1**: Setup + Foundational $\rightarrow$ Type-safe navigation registry and pure test suite ready.
2. **Increment 2 (MVP)**: User Story 1 $\rightarrow$ Desktop collapsible groups ("Presupuestos", "Reportes") working smoothly.
3. **Increment 3**: User Story 2 $\rightarrow$ Redesigned mobile "Más" categorized drawer with $\ge 48\text{px}$ touch targets.
4. **Increment 4**: User Story 3 $\rightarrow$ Auto-expansion on direct URL / refresh / deep-links.
5. **Increment 5**: User Story 4 $\rightarrow$ Hover/click flyout popovers in collapsed icon-only sidebar mode.
6. **Increment 6**: Phase 7 Polish $\rightarrow$ Linting, accessibility, full test suite pass, and quickstart validation.
