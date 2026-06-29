# Tasks: UI Improvements (Theme, Mobile Layout & Shadcn Charts)

**Input**: Design documents from `/specs/003-ui-improvements/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md

**Tests**: None requested for this layout implementation.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Install `recharts` dependency in `frontend/package.json`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

- [x] T002 Configure tailwind-merge or general styling setup if needed for charts

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Theme Toggling (Priority: P1) 🎯 MVP

**Goal**: Make light and dark theme modes function properly.

**Independent Test**: Click the theme toggle and verify class `dark` is appended to `html` and Tailwind styles update instantly.

### Implementation for User Story 1

- [x] T003 [US1] Define class-based dark mode selector `@variant dark (&:where(.dark, .dark *));` in `frontend/src/app/globals.css`
- [x] T004 [US1] Update `frontend/src/components/ThemeToggle.tsx` and theme context if needed to ensure the toggle correctly adds/removes the class on the document root

**Checkpoint**: Theme toggling is fully functional.

---

## Phase 4: User Story 2 - Compact Mobile Counters (Priority: P2)

**Goal**: Shrink the transaction statistics summary cards on mobile into a single horizontal row.

**Independent Test**: Shrink browser to <640px on `/transactions` and verify the metrics occupy a single line.

### Implementation for User Story 2

- [x] T005 [US2] Update `frontend/src/app/transactions/page.tsx` transaction summary counters section to use a single flex-row container with line dividers on viewports `< 640px` and grid layout on `sm:` viewports

**Checkpoint**: Mobile transaction counters are compact and horizontal.

---

## Phase 5: User Story 3 - Professional Shadcn Charts (Priority: P3)

**Goal**: Replace native SVG charts with Recharts-based components to look professional and prevent text overflows.

**Independent Test**: Hover over chart segments on `/stats` or dashboard and ensure tooltips render nicely and text fits boundaries.

### Implementation for User Story 3

- [x] T006 [P] [US3] Reimplement `PieChart.tsx` in `frontend/src/components/PieChart.tsx` using Recharts (Doughnut style) with customized responsive container, center labels, and legend
- [x] T007 [P] [US3] Reimplement `NetWorthChart.tsx` in `frontend/src/components/NetWorthChart.tsx` using Recharts line chart component with area gradient shading, custom nodes, and tooltips
- [x] T008 [P] [US3] Reimplement `IncomeStatementChart.tsx` in `frontend/src/components/IncomeStatementChart.tsx` using Recharts double-bar chart with custom rounded corners, legend, and tooltips

**Checkpoint**: All three charts use Recharts and do not overflow legends or labels.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: General verification and code quality

- [x] T009 Run `quickstart.md` validation scenarios manually in a browser to confirm compliance
- [x] T010 Run build/lint check in `frontend` to ensure zero compilation or typescript errors

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Can start immediately.
- **Foundational (Phase 2)**: Depends on Setup completion.
- **User Stories (Phase 3+)**: All depend on Foundational completion. Can be implemented sequentially (US1 → US2 → US3) or in parallel.
- **Polish (Phase 6)**: Depends on all user stories completion.

### Parallel Opportunities

- Re-implementing the three charts (T006, T007, T008) can be done completely in parallel.
