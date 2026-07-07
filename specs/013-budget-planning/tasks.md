# Tasks: Presupuestos Financieros (Budgeting) y Proyecciones de Caja

**Input**: Design documents from `/specs/013-budget-planning/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Test-driven development is required by the project constitution. Integration and unit tests are included for each user story.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Monorepo**: Backend under `backend/src/` and `backend/tests/`, Frontend under `frontend/src/`, Shared schemas under `shared/src/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Shared schemas and database structure configuration

- [x] T001 Register new Zod schemas and TypeScript interface definitions for budget details, item updates, replication, and report forecasts in `shared/src/index.ts`
- [x] T002 Configure database migrations and entity imports for the refactored schemas in `backend/src/infrastructure/database/database.module.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core model refactoring and basic account flag logic. No user stories can begin until these models and basic endpoints are in place.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 [P] Add the `isCashOrBank` boolean column to the account table in `backend/src/infrastructure/database/entities/account.entity.ts`
- [x] T004 [P] Refactor the budget table to reference `periodId` as a unique 1-to-1 relation in `backend/src/infrastructure/database/entities/budget.entity.ts`
- [x] T005 [P] Create the new `BudgetItemEntity` table representing individual account limits per budget in `backend/src/infrastructure/database/entities/budget-item.entity.ts`
- [x] T006 [P] Define core domain model models and interfaces for budget calculations in `backend/src/domain/budgets/budget.model.ts`
- [x] T007 [P] Create unit/integration tests for account updating and cash/bank flag block validation in `backend/tests/integration/update-account.spec.ts`
- [x] T008 Implement account patch logic to update `isCashOrBank`, blocking modifications if journal entries exist in `backend/src/application/accounts/update-account.use-case.ts` (depends on T007 tests)
- [x] T009 Add the `PATCH /api/accounts/:id` endpoint to handle account flag updates in `backend/src/infrastructure/controllers/account.controller.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Inicialización Automática de Presupuestos (Priority: P1) 🎯 MVP

**Goal**: Automatically generate corresponding empty budgets when creating a new Fiscal Year and its periods.

**Independent Test**: Create a new Fiscal Year "2026". Check the DB or API and verify that 12 Period entities were generated and each has a corresponding `Budget` entity with all amounts set to 0.

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T010 [P] [US1] Create integration tests verifying automatic budget creation on period generation in `backend/tests/integration/period-creation.spec.ts`

### Implementation for User Story 1

- [x] T011 [US1] Update the fiscal year creation use case to create a corresponding empty `Budget` for each created period in `backend/src/application/periods/create-fiscal-year.use-case.ts`

**Checkpoint**: User Story 1 is fully functional and testable independently.

---

## Phase 4: User Story 2 - Formulario de Presupuesto Unificado y Flexible (Priority: P1)

**Goal**: Fetch, edit, and save budget item values split into Consumos, Ahorros e Inversiones, and Deudas y Tarjetas in a single page.

**Independent Test**: Open budget editing for a month. Input values in the three categories, click save, reload the page, and verify the values persist correctly.

### Tests for User Story 2

- [x] T012 [P] [US2] Create integration tests for retrieving and updating budget items in `backend/tests/integration/budget-details.spec.ts`

### Implementation for User Story 2

- [x] T013 [US2] Implement Use Case to fetch budget metadata and all eligible accounts mapped with their budgeted amounts in `backend/src/application/budgets/get-budget-detail.use-case.ts`
- [x] T014 [US2] Implement Use Case to save and batch update multiple budget item limits in `backend/src/application/budgets/update-budget-items.use-case.ts`
- [x] T015 [US2] Register GET `/api/budgets/by-period/:periodId` and PUT `/api/budgets/by-period/:periodId/items` in `backend/src/infrastructure/controllers/budget.controller.ts`
- [x] T016 [P] [US2] Add API client methods for budget details and update items in `frontend/src/services/api.ts`
- [x] T017 [US2] Build the unified budget editing page split into Consumos, Ahorros, and Deudas sections with sign formatting in `frontend/src/app/budgets/[periodId]/edit/page.tsx`

**Checkpoint**: At this point, User Stories 1 and 2 work independently.

---

## Phase 5: User Story 3 - Carga Masiva Anual con Variaciones Manuales (Priority: P2)

**Goal**: Propagate a budget item amount to all 12 periods of the current fiscal year while preserving manual adjustments in other months.

**Independent Test**: Put an amount in Alquileres for January, click "Replicate", save, open June and verify it has the same amount, edit June manually, save, verify June is updated but December still has the January amount.

### Tests for User Story 3

- [x] T018 [P] [US3] Create integration tests for budget item replication across the fiscal year in `backend/tests/integration/budget-replication.spec.ts`

### Implementation for User Story 3

- [x] T019 [US3] Implement Use Case to propagate a budget limit across all other periods in the same fiscal year in `backend/src/application/budgets/replicate-budget-item.use-case.ts`
- [x] T020 [US3] Register POST `/api/budgets/replicate` endpoint in `backend/src/infrastructure/controllers/budget.controller.ts`
- [x] T021 [US3] Integrate the "Replicar a todo el Ejercicio" action button next to account fields in `frontend/src/app/budgets/[periodId]/edit/page.tsx`

**Checkpoint**: Bulk loading and replication functions are fully operational.

---

## Phase 6: User Story 4 - Dashboard de Ejecución Presupuestaria Unificado (Priority: P1)

**Goal**: Display real-time execution comparison (Budgeted vs. Real) with deviation coloring and a bottom-aligned liquidity summary card.

**Independent Test**: Load the execution dashboard for a period. Check that values match actual journal transactions, red highlights are active for over-budgets/negative flow deviations, and the bottom summary calculates cash balances.

### Tests for User Story 4

- [x] T022 [P] [US4] Create unit tests validating budget execution calculations and deviation sign rules in `backend/tests/unit/budget-execution.spec.ts`

### Implementation for User Story 4

- [x] T023 [US4] Implement Use Case to calculate monthly execution details (Consumos, Ahorros, Deudas, and Resumen de Liquidez) in `backend/src/application/budgets/get-budget-execution.use-case.ts`
- [x] T024 [US4] Register GET `/api/budgets/execution-report` endpoint in `backend/src/infrastructure/controllers/budget.controller.ts`
- [x] T025 [US4] Build the execution dashboard UI page displaying comparisons and colored alerts in `frontend/src/app/budgets/[periodId]/execution/page.tsx`

**Checkpoint**: Budget execution monitoring is complete and accurate.

---

## Phase 7: User Story 5 - Reportes de Flujo de Caja y Resultados (Real vs. Proyectado) (Priority: P1)

**Goal**: Monthly grid reports displaying historical actuals for closed periods and budget-based projections for open/future periods.

**Independent Test**: Open the Cash Flow and Income Statement reports, select a fiscal year, and check that historical months pull ledger data and future months transition smoothly to budgeted amounts.

### Tests for User Story 5

- [x] T026 [P] [US5] Create unit tests verifying forecast algorithms and ending cash projection calculations in `backend/tests/unit/cash-flow-forecast.spec.ts`

### Implementation for User Story 5

- [x] T027 [US5] Implement Use Case for real vs projected Income Statement forecast in `backend/src/application/reports/income-statement-forecast.use-case.ts`
- [x] T028 [US5] Implement Use Case for real vs projected Cash Flow forecast incorporating asset/liability sign adjustments in `backend/src/application/reports/cash-flow-statement.use-case.ts`
- [x] T029 [US5] Register routes GET `/api/reports/income-statement/real-vs-projected` and GET `/api/reports/cash-flow/real-vs-projected` in `backend/src/infrastructure/controllers/reports.controller.ts`
- [x] T030 [P] [US5] Create Real vs Projected Income Statement forecast report page in `frontend/src/app/reports/income-statement/forecast/page.tsx`
- [x] T031 [P] [US5] Create Real vs Projected Cash Flow forecast report page in `frontend/src/app/reports/cash-flow/page.tsx`

**Checkpoint**: All user stories are independently functional and integrated.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Clean up, UI integration, and final verification checks.

- [x] T032 Update Account administration UI to configure `isCashOrBank` flag on assets in `frontend/src/app/accounts/page.tsx`
- [x] T033 Verify ESLint, Prettier formatting, and run the complete Jest test suite to validate 100% coverage on financial calculations

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P1)**: Can start after Foundational (Phase 2)
- **User Story 3 (P2)**: Depends on User Story 2 data editing structure
- **User Story 4 (P1)**: Can start after Foundational (Phase 2)
- **User Story 5 (P1)**: Can start after Foundational (Phase 2)

### Within Each User Story

- Tests MUST be written and fail before implementation
- Models before services
- Services before endpoints
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Once Foundational phase completes, all user stories can start in parallel (if team capacity allows)
- All tests for a user story marked [P] can run in parallel
- Different user stories can be worked on in parallel by different team members

---

## Parallel Example: User Story 2

```bash
# Launch tests for User Story 2 in parallel:
Task: "Create integration tests for retrieving and updating budget items in backend/tests/integration/budget-details.spec.ts"
Task: "Add API client methods for budget details and update items in frontend/src/services/api.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 & 2 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (Auto-budget generation)
4. Complete Phase 4: User Story 2 (Unified budget entry form)
5. **STOP and VALIDATE**: Test User Story 1 and 2 independently
6. Deploy/demo the basic budget entry workflow.

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 & 2 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 3 → Test independently → Deploy/Demo (Annual Replication)
4. Add User Story 4 → Test independently → Deploy/Demo (Real-time Execution)
5. Add User Story 5 → Test independently → Deploy/Demo (Forecast Reports)
6. Each story adds value without breaking previous stories

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
