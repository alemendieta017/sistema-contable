# Tasks: Transaction Screen UI/UX Improvements

**Input**: Design documents from `/specs/009-improve-transactions-ui/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Configure local workspace environment

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T002 Identify all invalid custom colors in the codebase

---

## Phase 2b: Test Infrastructure & TDD Setup

**Purpose**: Define and prepare tests before changing code, keeping in line with TDD principles

- [x] T002b [US1] Update CalendarView, MonthlyView, and TransactionFilters tests for parent-level date sync and filter visibility
- [x] T002c [US2] Add unit/integration tests for reorganized Transactions page header layout
- [x] T002d [US4] Add styling and contrast tests for Light/Dark modes

**Checkpoint**: Tests written/updated and failing as expected (Red phase of TDD)

---

## Phase 3: User Story 1 - Streamlined Monthly and Calendar Views (Priority: P1) 🎯 MVP

**Goal**: Hide date pickers in calendar/monthly views, sync navigation arrows to parent date context and trigger fetches.

**Independent Test**: Switch to Calendario, verify filters are hidden, click arrows, check that right entries are loaded.

### Implementation for User Story 1

- [x] T003 [P] [US1] Implement conditional hiding of date filters for calendar/monthly views in frontend/src/components/TransactionFilters.tsx
- [x] T004 [US1] Update parent state to track independent dates (dailyDates, calendarDates, monthlyDates) per view tab in frontend/src/app/transactions/page.tsx
- [x] T004b [US1] Modify active date computed selectors (activeStartDate/activeEndDate) and trigger fetchData reactively in frontend/src/app/transactions/page.tsx
- [x] T004c [US1] Refactor TransactionFilters component to handle date range changes in a single onDateRangeChange callback in frontend/src/components/TransactionFilters.tsx
- [x] T005 [P] [US1] Remove selectedDate internal state and connect month navigation to parent date handlers in frontend/src/components/CalendarView.tsx
- [x] T006 [P] [US1] Connect year navigation to parent date handlers and hide redundant summary counters in frontend/src/components/MonthlyView.tsx

**Checkpoint**: User Story 1 fully functional and testable independently.

---

## Phase 4: User Story 2 - Clean Header & Cohesive Selector Layout (Priority: P1)

**Goal**: Group title, switcher, and counters inside a clean card header widget.

**Independent Test**: Navigate to diario and check visual alignment of title and segmented buttons.

### Implementation for User Story 2

- [x] T007 [P] [US2] Reorganize top section layout and segmented controls inside a card header in frontend/src/app/transactions/page.tsx
- [x] T008 [P] [US2] Style hover backgrounds of segmented control buttons to use standard Tailwind CSS classes in frontend/src/app/transactions/page.tsx

**Checkpoint**: User Stories 1 and 2 work together.

---

## Phase 5: User Story 3 - Mobile-Optimized Counters (Priority: P2)

**Goal**: Fit summary counters in a single horizontal row on mobile.

**Independent Test**: Simulate mobile screen and verify that counters scroll horizontally without wrapping.

### Implementation for User Story 3

- [x] T009 [P] [US3] Constrain summary counters to a single row using a CSS grid-cols-3 layout, reduced padding, and text truncation to prevent lateral scroll in frontend/src/app/transactions/page.tsx

**Checkpoint**: Mobile viewport looks correct.

---

## Phase 6: User Story 4 - Theme Consistency and Contrast Fixes (Priority: P2)

**Goal**: Standardize custom tailwind colors so day borders, add buttons, and hovers render properly in all themes.

**Independent Test**: Toggle light and dark modes and inspect contrast.

### Implementation for User Story 4

- [x] T010 [P] [US4] Replace invalid slate-750 color with standard slate-700 in frontend/src/components/CalendarView.tsx
- [x] T011 [P] [US4] Replace invalid indigo-650 color with standard indigo-600 in frontend/src/app/accounts/page.tsx
- [x] T012 [P] [US4] Clean up non-existent colors (indigo-650, slate-750) in frontend/src/app/accounts/manage/page.tsx
- [x] T013 [P] [US4] Clean up non-existent red-555 and red-550 colors with red-500 in frontend/src/components/MonthlyView.tsx
- [x] T013b [P] [US4] Standardize invalid custom colors in remaining codebase files (AccountModal, AccountsList, DailyView, Header, TransactionModal, settings/page.tsx, transactions/page.tsx, TransactionFilters.tsx)

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Quality checks and validations.

- [x] T014 Run build verification npm run build in frontend
- [x] T014b Run ESLint/Prettier verification npm run lint in frontend
- [x] T014c Verify the complete automated test suite npm run test passes successfully in frontend
- [x] T015 Run validation quickstart guide validation scenarios in specs/009-improve-transactions-ui/quickstart.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately.
- **Foundational (Phase 2)**: Depends on Setup completion.
- **Test Infrastructure (Phase 2b)**: Depends on Phase 2.
- **User Stories (Phase 3+)**: All depend on Phase 2b completion.
  - Can proceed sequentially in priority order (US1 → US2 → US3 → US4).
- **Polish (Final Phase)**: Depends on all user stories being complete.

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Phase 2b.
- **User Story 2 (P2)**: Can start after Phase 2b.
- **User Story 3 (P3)**: Depends on US2 (modifies the same counters container).
- **User Story 4 (P4)**: Can start after Phase 2b.
