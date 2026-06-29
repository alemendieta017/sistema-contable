# Tasks: Monthly View Tabular Format

**Input**: Design documents from `/specs/007-monthly-view-tabular/`

**Prerequisites**: plan.md (required), spec.md (required)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Verify the developer environment is properly running

- [x] T001 Verify frontend and backend packages are installed and can run `npm run dev` in frontend/

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core helpers that are pre-requisite for calculations and rendering

- [x] T002 Inspect and verify the base currency helper exports from frontend/src/lib/utils.ts

---

## Phase 3: User Story 1 - Tabular Monthly Summary (Priority: P1) 🎯 MVP

**Goal**: Show the 12-month summary for the year in a clean HTML table instead of grid cards.

**Independent Test**: Navigate to the Libro Diario page, toggle to the "Mensual" view, and see a single clean table containing 12 months with columns for Mes, Transacciones, Ingresos, Gastos, and Saldo Neto.

### Implementation for User Story 1

- [x] T003 [US1] Replace grid structure with HTML table layout in frontend/src/components/MonthlyView.tsx
- [x] T004 [US1] Implement column rendering for Month, Transactions count, Incomes, Expenses, and Net Balance in frontend/src/components/MonthlyView.tsx
- [x] T005 [US1] Format numeric and currency columns in frontend/src/components/MonthlyView.tsx using formatCurrency helper

---

## Phase 4: User Story 2 - Responsive Clean UX/UI with Micro-animations (Priority: P2)

**Goal**: Implement responsive design, row highlights, and styling for inactive months.

**Independent Test**: Hover over table rows to observe background transitions. Adjust viewport size to verify horizontal scrolling. Confirm that months with 0 transactions appear with lower opacity.

### Implementation for User Story 2

- [x] T006 [US2] Add row hover highlight styles and transitions in frontend/src/components/MonthlyView.tsx
- [x] T007 [US2] Implement lower opacity formatting for months with 0 transactions in frontend/src/components/MonthlyView.tsx
- [x] T008 [US2] Wrap table component in horizontal overflow wrapper to support mobile viewports in frontend/src/components/MonthlyView.tsx

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Final validation of functionality and ensuring no regressions

- [x] T009 Run Next.js build and verify zero linting/compile issues in frontend/
- [x] T010 Run manual validation scenarios defined in specs/007-monthly-view-tabular/quickstart.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Can start immediately.
- **Foundational (Phase 2)**: Depends on Setup completion.
- **User Story 1 (Phase 3)**: Depends on Foundational (Phase 2) completion.
- **User Story 2 (Phase 4)**: Depends on User Story 1 completion.
- **Polish (Phase 5)**: Depends on all user story completions.

### Parallel Opportunities

- The tasks are sequential as they edit the same component file frontend/src/components/MonthlyView.tsx.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Setup and Foundational phases.
2. Implement Phase 3 (User Story 1) to replace grid with the table format.
3. Validate basic tabular display.

### Incremental Delivery

1. Verify base table layout (MVP).
2. Apply Polish, hover transitions, and mobile responsive overflow.
3. Verify formatting and compile cleanliness.
