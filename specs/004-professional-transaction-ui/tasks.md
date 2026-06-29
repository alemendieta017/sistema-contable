# Tasks: Professional Transaction UI

**Input**: Design documents from `/specs/004-professional-transaction-ui/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Basic verification and repo check

- [x] T001 Verify active monorepo environment and ensure frontend dev server compiles cleanly

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core checks before starting UI updates

- [x] T002 Ensure backend API is running and local db contains seed accounts/transactions for testing

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Compact and Professional Ledger View (Priority: P1) 🎯 MVP

**Goal**: Compact table cells, zero rounded corners, smaller professional typography, and removal of double-entry jargon.

**Independent Test**: Load `/transactions`, verify density is high, corners are sharp, and "partida doble" text is hidden.

### Implementation for User Story 1

- [x] T003 [US1] Remove double-entry subheader labels in `frontend/src/app/transactions/page.tsx`
- [x] T004 [US1] Refactor main container layouts to use sharp corners (`rounded-none` or `rounded-sm`) and compact spacing in `frontend/src/app/transactions/page.tsx`
- [x] T005 [P] [US1] Apply compact rows and smaller font styles in `frontend/src/components/DailyView.tsx`
- [x] T006 [P] [US1] Apply compact cell and grid styles in `frontend/src/components/MonthlyView.tsx` and `frontend/src/components/CalendarView.tsx`

**Checkpoint**: User Story 1 is functional. Ledger records are fully viewable in high-density professional layout.

---

## Phase 4: User Story 2 - Simplified Date Filtering and Navigation (Priority: P1)

**Goal**: Navigating month-by-month with simple controls, plus custom date fields hidden behind a toggle.

**Independent Test**: Click monthly arrows to change view ranges. Toggle the custom checkbox to show/hide date input pickers.

### Implementation for User Story 2

- [x] T007 [US2] Update filter state logic to handle monthly step increments in `frontend/src/app/transactions/page.tsx`
- [x] T008 [US2] Replace datepicker inputs with month navigator (next/prev) and add custom date picker toggle block in `frontend/src/components/TransactionFilters.tsx`

**Checkpoint**: User Story 2 is functional. Date navigation is simplified.

---

## Phase 5: User Story 3 - Professional Transaction Form (Asiento Contable) (Priority: P1)

**Goal**: Searchable account autocomplete and auto-balancing amount logic.

**Independent Test**: Open the creation form. Search for accounts by name. Enter debit amount and verify new row auto-fills corresponding balancing credit amount.

### Implementation for User Story 3

- [x] T009 [US3] Replace default select menu with a searchable combobox/autocomplete selector in `frontend/src/components/JournalEntryRow.tsx`
- [x] T010 [US3] Add auto-fill amount suggestion logic for balancing new entries in `frontend/src/components/TransactionModal.tsx`
- [x] T011 [US3] Modify creation form style to remove rounded borders and adjust paddings in `frontend/src/components/TransactionModal.tsx`

**Checkpoint**: User Story 3 is functional. Journal entries can be added rapidly with autocomplete search and auto-balancing.

---

## Phase 6: User Story 4 - Responsive Metric Counters (Priority: P2)

**Goal**: Replace "Gastos" with "Egresos" and optimize card layouts on mobile screen viewports.

**Independent Test**: Shrink screen to mobile size. Confirm cards fit without overflowing or wrapping poorly.

### Implementation for User Story 4

- [x] T012 [US4] Rename "Gastos" to "Egresos" on page metric cards in `frontend/src/app/transactions/page.tsx` and option labels in `frontend/src/components/JournalEntryRow.tsx`
- [x] T013 [US4] Refactor CSS flex/grid layout properties on metrics row in `frontend/src/app/transactions/page.tsx` to handle responsive mobile screen scaling cleanly

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Quality verification and final review

- [x] T014 Run quickstart.md validation script and check all user story acceptance scenarios

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Can start immediately.
- **Foundational (Phase 2)**: Depends on Setup completion.
- **User Stories (Phases 3 to 6)**: Depend on Foundational completion.
- **Polish (Phase 7)**: Depends on all user stories completion.

### Parallel Opportunities

- T005 and T006 can run in parallel (different files in frontend components).
- T009 can be developed in parallel with T007.

---

## Parallel Example: User Story 1

```bash
# Launch visual updates for daily view and monthly/calendar views concurrently:
Task: "Apply compact rows and smaller font styles in frontend/src/components/DailyView.tsx"
Task: "Apply compact cell and grid styles in frontend/src/components/MonthlyView.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Setup and Foundational verification.
2. Implement and test compact ledger table layout with sharp edges.
3. Validate User Story 1 in browser.

### Incremental Delivery

1. Deploy Compact view (US1).
2. Add month navigation (US2).
3. Deliver professional transaction entry modal (US3).
4. Apply mobile adjustments and new terminology to metrics (US4).
