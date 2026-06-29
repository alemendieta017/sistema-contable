# Tasks: Consistent Timezone and Date Handling

**Input**: Design documents from `/specs/008-fix-timezone-handling/`

**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md

**Tests**: Tests are MANDATORY as per the project's strict Test-Driven Development (TDD) principles. Unit/integration tests must be written first and fail before implementing fixes.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- File paths are exact.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Verify the environment and check database seed states.

- [x] T001 Verify docker-compose environment is running and psql matches target schema in `/Users/ale/dev/sistema-contable/docker-compose.yml`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core helpers and parameters needed across both frontend and backend.

- [x] T002 [P] Implement `formatLocalDateWithOffset` and `formatLocalDateEndWithOffset` helpers in `frontend/src/lib/utils.ts` to convert `YYYY-MM-DD` inputs to timezone-offset ISO strings
- [x] T003 [P] Update reports controller query parameters in `backend/src/infrastructure/controllers/reports.controller.ts` to accept `timezoneOffset`

---

## Phase 3: User Story 1 - Timezone-Respectful Transaction Visualization in Calendar (Priority: P1) 🎯 MVP

**Goal**: Transactions render on their exact local calendar day inside the monthly calendar regardless of client timezone offset.

**Independent Test**: Set browser timezone to UTC-4. Add a transaction stored in the DB at `2026-06-01 04:00:00+00`. Switch to Calendar View; the transaction must show on June 1st.

### Tests for User Story 1

- [x] T004 [P] [US1] Create unit tests in `frontend/src/tests/CalendarView.test.tsx` checking timezone rendering boundaries for negative offsets

### Implementation for User Story 1

- [x] T005 [US1] Refactor `frontend/src/components/CalendarView.tsx` to group and display dates using local timezone methods (`.getFullYear()`, `.getMonth()`, `.getDate()`) on parsed date objects
- [x] T006 [US1] Execute and verify the newly created frontend unit tests for CalendarView pass successfully

---

## Phase 4: User Story 2 - Accurate Monthly Accumulations and Summaries (Priority: P1)

**Goal**: Accumulate transaction totals under the correct local month in both the Monthly summary view and backend category statistics.

**Independent Test**: Set browser timezone to UTC-4. In the Monthly dashboard view, verify June's totals include a transaction stored in the database at `2026-06-01 04:00:00+00`.

### Tests for User Story 2

- [x] T007 [P] [US2] Write unit tests in backend for `GetCategoryStatisticsUseCase` in `backend/tests/integration/get-category-statistics.spec.ts` verifying monthly boundary ranges are shifted accurately according to client `timezoneOffset`
- [x] T008 [P] [US2] Write unit tests in frontend for `MonthlyView.tsx` in `frontend/src/tests/MonthlyView.test.tsx` verifying grouping aggregates transactions under correct local months

### Implementation for User Story 2

- [x] T009 [US2] Update `backend/src/application/reports/get-category-statistics.use-case.ts` boundary parsing to shift boundaries by `timezoneOffset` minutes
- [x] T010 [US2] Refactor `frontend/src/components/MonthlyView.tsx` to group aggregates using browser's local timezone Date extraction
- [x] T011 [US2] Modify transactions list API request in `frontend/src/app/transactions/page.tsx` and `frontend/src/services/api.ts` to pass offset-preserving ISO-8601 strings, and simplify the backend list query in `backend/src/infrastructure/controllers/ledger.controller.ts` using native Date parsing

---

## Phase 5: User Story 3 - Timezone-Aware Transaction Entry and Normalization (Priority: P2)

**Goal**: Persist transactions using timezone offsets from the client and resolve shifting on the daily dashboard view.

**Independent Test**: Register a transaction on June 1st in UTC-4. Verify it gets stored as `2026-06-01 04:00:00+00` in the database, and renders on June 1st in the daily list.

### Tests for User Story 3

- [x] T012 [P] [US3] Update test cases in `frontend/src/tests/TransactionModal.test.tsx` to assert that the creation payload sends local date with timezone offset formatted by helper
- [x] T019 [P] [US3] Create integration tests in `backend/tests/integration/ledger-list.spec.ts` verifying that `startDate` and `endDate` query boundaries are correctly shifted according to their timezone offset

### Implementation for User Story 3

- [x] T013 [US3] Update `frontend/src/components/TransactionModal.tsx` to format selected date with `formatLocalDateWithOffset` before submitting transaction creation payload
- [x] T014 [US3] Update `frontend/src/app/transactions/asiento-libre/page.tsx` to format selected date with `formatLocalDateWithOffset` on submission payload
- [x] T015 [US3] Refactor date grouping in `frontend/src/components/DailyView.tsx` to group by local calendar day (avoiding raw `.toISOString()` UTC day shifting)

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Code cleanup, formatting lint checks, and quickstart validations.

- [x] T016 Run linting and formatting verifications:
  ```bash
  npx prettier --write "frontend/src/components/DailyView.tsx" "frontend/src/components/CalendarView.tsx" "frontend/src/components/MonthlyView.tsx" "frontend/src/tests/CalendarView.test.tsx" "frontend/src/tests/MonthlyView.test.tsx" "frontend/src/tests/TransactionModal.test.tsx" "frontend/src/lib/utils.ts" "backend/src/application/reports/get-category-statistics.use-case.ts" "backend/src/infrastructure/controllers/reports.controller.ts" "backend/tests/integration/get-category-statistics.spec.ts" "backend/tests/integration/ledger-list.spec.ts"
  ```
- [x] T017 Execute all backend and frontend unit tests to verify no regressions in double-entry bookkeeping engine or validations
- [x] T018 Execute manual verification steps as outlined in `specs/008-fix-timezone-handling/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)** $\rightarrow$ **Foundational (Phase 2)** (Blocks all User Stories)
- **User Story 1 (P1)** and **User Story 2 (P1)** can run in parallel after Phase 2 is complete.
- **User Story 3 (P2)** can run after P1 stories are complete or in parallel if frontend forms are isolated.
- **Polish (Phase 6)** depends on all stories being completed.

---

## Parallel Opportunities

- T002 and T003 can be implemented in parallel (frontend helper vs backend query structure).
- T004 (US1 tests), T007 (US2 tests), T008 (US2 tests), T012 (US3 tests), and T019 (US3 list tests) can all be written in parallel as they cover separate files and components.
- Implementation of US1 (Calendar) and US2 (Monthly) can run in parallel since CalendarView and MonthlyView components are isolated.

---

## Implementation Strategy

### MVP First (P1 User Stories)
1. Complete Setup and Foundational.
2. Complete US1 (Calendar View) and US2 (Monthly View & stats endpoint range fixes).
3. Validate independent rendering correctness of existing database entries.

### Incremental Delivery
1. Add US3 to allow creating new entries with timezone offsets.
2. Verify existing and new entries render consistently together.
3. Validate and clean codebase in Phase 6.
