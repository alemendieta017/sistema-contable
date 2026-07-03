# Tasks: Accounting Balances and Period Tracking Engine

**Input**: Design documents from `/specs/011-accounting-balances-tracking/`

**Prerequisites**: [plan.md](file:///Users/ale/dev/sistema-contable/specs/011-accounting-balances-tracking/plan.md) (required), [spec.md](file:///Users/ale/dev/sistema-contable/specs/011-accounting-balances-tracking/spec.md) (required for user stories), [research.md](file:///Users/ale/dev/sistema-contable/specs/011-accounting-balances-tracking/research.md), [data-model.md](file:///Users/ale/dev/sistema-contable/specs/011-accounting-balances-tracking/data-model.md), [periods-api.md](file:///Users/ale/dev/sistema-contable/specs/011-accounting-balances-tracking/contracts/periods-api.md)

**Tests**: Tests are MANDATORY as per the system constitution (Strict Test-Driven Development (TDD)). Write tests before implementing business logic.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

- Monorepo: `backend/src/`, `frontend/src/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Shared validation schemas and monorepo contract definitions

- [x] T001 Setup shared schemas and types for Fiscal Years, Periods, and Balance Reports in shared/src/index.ts
- [x] T002 Configure validation exports in shared/package.json

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database entities and domain models that all user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 [P] Create TypeORM database entity for FiscalYear in backend/src/infrastructure/database/entities/fiscal-year.entity.ts
- [x] T004 [P] Create TypeORM database entity for Period in backend/src/infrastructure/database/entities/period.entity.ts
- [x] T005 [P] Create TypeORM database entity for AccountPeriodBalance in backend/src/infrastructure/database/entities/account-period-balance.entity.ts
- [x] T006 Register period entities in backend/src/infrastructure/database/database.module.ts
- [x] T007 Create domain models for FiscalYear, Period, and AccountPeriodBalance in backend/src/domain/ledger/period.model.ts

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Real-time Period Balance Aggregation (Priority: P1) 🎯 MVP

**Goal**: Automatically aggregate and roll forward account balances upon transaction post or reverse.

**Independent Test**: Verify transaction posting updates `account_period_balances` locally and propagates balances to subsequent periods.

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T008 [P] [US1] Create integration test for balance updates and roll-forward propagation in backend/tests/integration/balance-propagation.spec.ts

### Implementation for User Story 1

- [x] T009 [US1] Implement CreateFiscalYearUseCase in backend/src/application/periods/create-fiscal-year.use-case.ts
- [x] T010 [US1] Implement ReconstructBalancesUseCase in backend/src/application/periods/reconstruct-balances.use-case.ts
- [x] T011 [US1] Modify transaction creation logic to update aggregates and propagate balances in backend/src/application/ledger/create-transaction.use-case.ts
- [x] T012 [US1] Modify transaction update logic to adjust old and new period balances in backend/src/application/ledger/update-transaction.use-case.ts
- [x] T013 [US1] Modify transaction deletion logic to decrement balances and propagate changes in backend/src/application/ledger/delete-transaction.use-case.ts
- [x] T014 [US1] Modify transaction reversal logic to update balances in backend/src/application/ledger/reverse-transaction.use-case.ts
- [x] T015 [US1] Expose reconstruct-balances route in backend/src/infrastructure/controllers/reports.controller.ts

**Checkpoint**: User Story 1 is fully functional and testable independently.

---

## Phase 4: User Story 2 - Monthly Period Closure and Lock (Priority: P2)

**Goal**: Lock monthly accounting periods via UI toggle switches, preventing transaction entry modifications in closed periods.

**Independent Test**: Verify that writing to a closed period is rejected, and reopening propagates historical modifications forward.

### Tests for User Story 2

- [x] T016 [P] [US2] Create integration test for period locks and closed-period restrictions in backend/tests/integration/periods-locking.spec.ts

### Implementation for User Story 2

- [x] T017 [US2] Implement UpdatePeriodUseCase in backend/src/application/periods/update-period.use-case.ts
- [x] T018 [US2] Add period locking verification checks to transaction use-cases (create, update, delete, reverse) in backend/src/application/ledger/
- [x] T019 [US2] Expose endpoints GET/POST /api/fiscal-years and GET/PATCH /api/periods in backend/src/infrastructure/controllers/period.controller.ts
- [x] T020 [P] [US2] Implement API service wrapper functions for period operations in frontend/src/services/api.ts
- [x] T021 [US2] Create Configuración Financiera page with list of fiscal years, expanding to monthly toggles [ Abierto / Cerrado ] and UI loading overlay in frontend/src/app/periods/page.tsx
- [x] T022 [P] [US2] Add period setup panel link in settings view frontend/src/app/settings/page.tsx

**Checkpoint**: User Stories 1 and 2 are fully integrated and functional.

---

## Phase 5: User Story 4 - Balance General with Advanced Period Filters (Priority: P2)

**Goal**: Query Balance Sheet and Income Statement using fast performance aggregates with modes (By Period, As of Date, Comparative).

**Independent Test**: Load reports, verify filters (date, period, comparative) and virtual net income calculation.

### Tests for User Story 4

- [x] T023 [P] [US4] Create unit tests for reports and virtual account calculation in backend/tests/unit/reports.spec.ts

### Implementation for User Story 4

- [x] T024 [US4] Implement BalanceSheetUseCase supporting three time modes (As of Date, By Period, Comparative) and depth collapse (1-4) in backend/src/application/periods/balance-sheet.use-case.ts
- [x] T025 [US4] Implement IncomeStatementUseCase using aggregates in backend/src/application/periods/income-statement.use-case.ts
- [x] T026 [US4] Expose report routes in backend/src/infrastructure/controllers/reports.controller.ts
- [x] T027 [P] [US4] Implement report API wrappers in frontend/src/services/api.ts
- [x] T028 [US4] Create Balance Sheet UI page with filters, comparative columns, and loading overlay block in frontend/src/app/reports/balance-sheet/page.tsx
- [x] T029 [US4] Create Income Statement UI page in frontend/src/app/reports/income-statement/page.tsx
- [x] T030 [P] [US4] Add Sidebar links to Balance Sheet and Income Statement in frontend/src/components/Sidebar.tsx
- [x] T038 [US4] Remove the depth filter dropdown from the Balance Sheet UI in frontend/src/app/reports/balance-sheet/page.tsx

**Checkpoint**: Reports and filters are fully functional.

---

## Phase 6: User Story 3 - Fiscal Year Annual Closing (Priority: P3)

**Goal**: Execute fiscal year annual closing, zeroing temporary accounts to Retained Earnings and carrying forward balances.

**Independent Test**: Verify closing entry resets income/expenses to zero and copies asset/liability balances forward to the next year.

### Tests for User Story 3

- [x] T031 [P] [US3] Create integration tests for annual close and balance carry-forward in backend/tests/integration/annual-closing.spec.ts

### Implementation for User Story 3

- [x] T032 [US3] Implement CloseFiscalYearUseCase in backend/src/application/periods/close-fiscal-year.use-case.ts
- [x] T033 [US3] Expose post-close route POST /api/fiscal-years/:id/close in backend/src/infrastructure/controllers/period.controller.ts
- [x] T034 [US3] Add fiscal year close button in period management UI and link to API in frontend/src/app/periods/page.tsx

**Checkpoint**: The complete fiscal periods engine and reporting suite is fully operational.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Verification and final code formatting.

- [x] T035 [P] Run backend integration test suite in backend/
- [x] T036 Run ESLint and Prettier formatting checks across frontend/ and backend/
- [x] T037 Perform manual validation flows in specs/011-accounting-balances-tracking/quickstart.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately.
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories.
- **User Stories (Phase 3+)**: All depend on Foundational phase completion.
  - US1 (Phase 3) is a prerequisite for US2, US4, and US3.
  - US2 (Phase 4) and US4 (Phase 5) can run in parallel after US1 completes.
  - US3 (Phase 6) depends on US2 (requires period locks).
- **Polish (Final Phase)**: Depends on all stories being complete.

### Parallel Opportunities

- Foundational database entities (T003, T004, T005) can be created in parallel.
- Integration tests (T008, T016, T023, T031) can be written in parallel by developers or test engineers.
- UI services (T020, T027) can be implemented in parallel.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 (Setup) and Phase 2 (Foundational).
2. Implement Phase 3 (User Story 1 - Real-time Period Balance Aggregation).
3. Validate using `balance-propagation.spec.ts` integration test.

### Incremental Delivery

1. Deliver MVP (Real-time aggregation).
2. Deliver Period Management and locking functionality (US2).
3. Deliver fast reports with mode/depth filters (US4).
4. Deliver Annual Fiscal Year Closing logic (US3).
