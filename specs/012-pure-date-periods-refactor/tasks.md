# Tasks: La Estrategia Correcta para Periodos y Fechas

**Input**: Design documents from `/specs/012-pure-date-periods-refactor/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Tests are MANDATORY as required by Principle V of the Project Constitution (Strict TDD & Quality Verification).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- Monorepo structure containing frontend/, backend/, and shared/ directories.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Shared schemas updates and initial database schema migrations

- [ ] T001 Update request validation schemas in [shared/src/index.ts](file:///Users/ale/dev/sistema-contable/shared/src/index.ts) to add regex validation for YYYY-MM-DD dates
- [ ] T002 Build shared workspace schemas by running build command in [shared/package.json](file:///Users/ale/dev/sistema-contable/shared/package.json)
- [ ] T003 Generate database migration script to drop/rename date columns and add DATE types in [backend/src/infrastructure/database/migrations/](file:///Users/ale/dev/sistema-contable/backend/src/infrastructure/database/migrations/)
- [ ] T004 Apply database migrations via backend typeorm run script in [backend/package.json](file:///Users/ale/dev/sistema-contable/backend/package.json)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core model refactoring and seed scripts alignment. MUST complete before implementing user stories.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T005 [P] Update domain properties to string-based dates in [ledger.model.ts](file:///Users/ale/dev/sistema-contable/backend/src/domain/ledger/ledger.model.ts)
- [ ] T006 [P] Update domain boundary dates to string primitives in [period.model.ts](file:///Users/ale/dev/sistema-contable/backend/src/domain/ledger/period.model.ts)
- [ ] T007 [P] Change date columns mappings to DATE and TIMESTAMPTZ in [transaction.entity.ts](file:///Users/ale/dev/sistema-contable/backend/src/infrastructure/database/entities/transaction.entity.ts)
- [ ] T008 [P] Change start/end date columns mappings to DATE in [fiscal-year.entity.ts](file:///Users/ale/dev/sistema-contable/backend/src/infrastructure/database/entities/fiscal-year.entity.ts)
- [ ] T009 [P] Change start/end date columns mappings to DATE in [period.entity.ts](file:///Users/ale/dev/sistema-contable/backend/src/infrastructure/database/entities/period.entity.ts)
- [ ] T010 Refactor chronological sorting and boundary comparison logic to use strings in [balance-update.service.ts](file:///Users/ale/dev/sistema-contable/backend/src/application/periods/balance-update.service.ts)
- [ ] T011 Refactor sorting and range filtering queries to use string boundaries in [reconstruct-balances.use-case.ts](file:///Users/ale/dev/sistema-contable/backend/src/application/periods/reconstruct-balances.use-case.ts)
- [ ] T012 [P] Update transaction request validations DTOs in [create-transaction.dto.ts](file:///Users/ale/dev/sistema-contable/backend/src/infrastructure/controllers/dto/create-transaction.dto.ts)
- [ ] T013 Update all seed script scenarios and seeder script in [backend/src/infrastructure/database/seeds/](file:///Users/ale/dev/sistema-contable/backend/src/infrastructure/database/seeds/) to write date values in YYYY-MM-DD format

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Accurate Monthly Reports Across Timezones (Priority: P1) 🎯 MVP

**Goal**: Paraguay accountants get correct monthly reporting totals regardless of server/client timezone differences

**Independent Test**: Register a transaction on June 30th at 23:30 local time. Run the June Balance Sheet and verify it is included.

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T014 [P] [US1] Update contract tests in [ledger.spec.ts](file:///Users/ale/dev/sistema-contable/backend/tests/contract/ledger.spec.ts) to assert the schema contracts for `accountingDate` and `createdAt`
- [ ] T015 [P] [US1] Add/Update report timezone validation integration tests in [fast-reports.spec.ts](file:///Users/ale/dev/sistema-contable/backend/tests/integration/fast-reports.spec.ts) to verify UTC/Paraguay month-end boundary transaction inclusion

### Implementation for User Story 1

- [ ] T016 [US1] Refactor transaction CRUD use cases to use string `accountingDate` in [create-transaction.use-case.ts](file:///Users/ale/dev/sistema-contable/backend/src/application/ledger/create-transaction.use-case.ts), [update-transaction.use-case.ts](file:///Users/ale/dev/sistema-contable/backend/src/application/ledger/update-transaction.use-case.ts), [delete-transaction.use-case.ts](file:///Users/ale/dev/sistema-contable/backend/src/application/ledger/delete-transaction.use-case.ts), and [reverse-transaction.use-case.ts](file:///Users/ale/dev/sistema-contable/backend/src/application/ledger/reverse-transaction.use-case.ts)
- [ ] T017 [US1] Refactor list query filters to perform string comparison on `accountingDate` in [ledger.controller.ts](file:///Users/ale/dev/sistema-contable/backend/src/infrastructure/controllers/ledger.controller.ts)
- [ ] T018 [US1] Refactor balance sheet calculation use case to perform range queries with pure string dates on `accountingDate` in [balance-sheet.use-case.ts](file:///Users/ale/dev/sistema-contable/backend/src/application/periods/balance-sheet.use-case.ts)
- [ ] T019 [US1] Refactor category statistics use case to query transactions using timezone-neutral date string range on `accountingDate` in [get-category-statistics.use-case.ts](file:///Users/ale/dev/sistema-contable/backend/src/application/reports/get-category-statistics.use-case.ts)
- [ ] T020 [P] [US1] Update API services in [frontend/src/services/api.ts](file:///Users/ale/dev/sistema-contable/frontend/src/services/api.ts) to map frontend API calls to `accountingDate` instead of `date`
- [ ] T021 [US1] Update forms, components, pages and charts in [frontend/src/app/transactions/new/page.tsx](file:///Users/ale/dev/sistema-contable/frontend/src/app/transactions/new/page.tsx), [frontend/src/app/stats/page.tsx](file:///Users/ale/dev/sistema-contable/frontend/src/app/stats/page.tsx), [frontend/src/components/CalendarView.tsx](file:///Users/ale/dev/sistema-contable/frontend/src/components/CalendarView.tsx), [frontend/src/components/DailyView.tsx](file:///Users/ale/dev/sistema-contable/frontend/src/components/DailyView.tsx), [frontend/src/components/MonthlyView.tsx](file:///Users/ale/dev/sistema-contable/frontend/src/components/MonthlyView.tsx), and [frontend/src/components/NetWorthChart.tsx](file:///Users/ale/dev/sistema-contable/frontend/src/components/NetWorthChart.tsx) to capture, sort, and render pure date strings timezone-independently

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Strict Period Locking Validation (Priority: P2)

**Goal**: Block new transactions or modifications in CLOSED monthly periods using simple string comparison

**Independent Test**: Attempt to post a transaction with a date within a closed period and verify it is blocked.

### Tests for User Story 2

- [ ] T022 [P] [US2] Update closed-period validation tests in [periods-locking.spec.ts](file:///Users/ale/dev/sistema-contable/backend/tests/integration/periods-locking.spec.ts) to verify blocking behavior

### Implementation for User Story 2

- [ ] T023 [US2] Update period validation check queries in [create-transaction.use-case.ts](file:///Users/ale/dev/sistema-contable/backend/src/application/ledger/create-transaction.use-case.ts) and [update-transaction.use-case.ts](file:///Users/ale/dev/sistema-contable/backend/src/application/ledger/update-transaction.use-case.ts) to compare `accountingDate` with period boundaries lexicographically

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Clean Creation of Fiscal Years and Periods (Priority: P3)

**Goal**: Generate monthly periods defined by pure date boundaries (YYYY-MM-DD) without hour offsets or zone assumptions when initializing a Fiscal Year

**Independent Test**: Create a new Fiscal Year and verify that the periods have pure YYYY-MM-DD boundaries.

### Tests for User Story 3

- [ ] T024 [P] [US3] Update period creation integration tests in [period-creation.spec.ts](file:///Users/ale/dev/sistema-contable/backend/tests/integration/period-creation.spec.ts) to check for pure date strings

### Implementation for User Story 3

- [ ] T025 [US3] Refactor 12 monthly periods creation logic in [create-fiscal-year.use-case.ts](file:///Users/ale/dev/sistema-contable/backend/src/application/periods/create-fiscal-year.use-case.ts) to compute pure YYYY-MM-DD dates
- [ ] T026 [US3] Update fiscal year creation modal and page in [frontend/src/app/periods/page.tsx](file:///Users/ale/dev/sistema-contable/frontend/src/app/periods/page.tsx) to send pure date strings for fiscal year dates and display boundaries timezone-neutrally

**Checkpoint**: All user stories should now be independently functional

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Cleanup, full test validation, and verification scenarios

- [ ] T027 Update remaining integration test suites under [backend/tests/integration/](file:///Users/ale/dev/sistema-contable/backend/tests/integration/) to resolve errors from date field changes
- [ ] T028 Perform a full schema reset and seeding using `npm run db:reset` inside [backend/](file:///Users/ale/dev/sistema-contable/backend/) directory
- [ ] T029 [P] Run frontend and backend tests to confirm 100% success and test coverage
- [ ] T030 [P] Run ESLint and Prettier checking on backend, frontend, and shared folders
- [ ] T031 Execute verification scenarios detailed in [quickstart.md](file:///Users/ale/dev/sistema-contable/specs/012-pure-date-periods-refactor/quickstart.md)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can then proceed sequentially in priority order (P1 → P2 → P3) or in parallel if capacity allows
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - May integrate with US1 but is independently testable
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - May integrate with US1/US2 but is independently testable

### Within Each User Story

- Write/Update tests FIRST, verify they fail before implementation
- Domain models and DB entities before services and use cases
- Services/use cases before endpoints/controllers
- Backend endpoints before frontend components and integration
- Story complete before moving to next priority

### Parallel Opportunities

- Shared schemas updates (T001) and DB migration setup (T003) can be drafted in parallel
- Foundational domain model and entity updates (T005-T009) can run in parallel
- Once Foundational phase is complete, developers can implement US1, US2, and US3 in parallel as they touch independent domain components and controllers
- Writing report test updates (T014, T015) can run in parallel

---

## Parallel Example: User Story 1

```bash
# Launch contract and integration tests for US1 in parallel:
Task: "Update contract tests in backend/tests/contract/ledger.spec.ts"
Task: "Add/Update report timezone validation integration tests in backend/tests/integration/fast-reports.spec.ts"

# Update domain models and entities for US1 in parallel:
Task: "Update domain properties in backend/src/domain/ledger/ledger.model.ts"
Task: "Change date columns mappings in backend/src/infrastructure/database/entities/transaction.entity.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently using the validation scenario in quickstart.md
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo
4. Add User Story 3 → Test independently → Deploy/Demo
5. Each story adds value without breaking previous stories
