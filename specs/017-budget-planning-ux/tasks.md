# Tasks: Budget Planning Matrix & Execution Control UX

**Input**: Design documents from `/specs/017-budget-planning-ux/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/budget-planning-api.md

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Includes exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Shared types, DTOs, and domain models for budget matrix, drivers, flow intentions, and control engine

- [x] T001 Define budget matrix DTOs, driver enums (`FLAT_PRORATE`, `WEIGHTED_HISTORICAL`, `PERCENTAGE_GROWTH`, `FORWARD_FILL`, `PRIOR_YEAR_ACTUAL`), flow intention enums (`PAY`, `RECEIVE`, `INVEST`, `SAVE`, `DIVEST`), execution control schemas, and transfer DTOs in `shared/src/index.ts`
- [x] T002 [P] Define domain interfaces and models for budget matrix grid, drivers, execution summary, flow intentions, and reassignments in `backend/src/domain/budgets/budget.model.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database entity and module registration required before user story implementation

- [x] T003 Create database entity `BudgetReassignmentEntity` for inter-account budget transfer audit logging in `backend/src/infrastructure/database/entities/budget-reassignment.entity.ts`
- [x] T004 [P] Register `BudgetReassignmentEntity` in database module in `backend/src/infrastructure/database/database.module.ts`

---

## Phase 3: User Story 1 - Annual Matrix Inline Planning & Direct Cell Editing (Priority: P1) 🎯 MVP

**Goal**: Provide an interactive 12-month matrix view (`/budgets/matrix`) with responsive mobile sticky account name column layout, inline grid cell editing, spreadsheet keyboard navigation (`Tab`, `Enter`, `Esc`), multi-cell clipboard paste parsing, 100% Spanish labels, high-contrast theme styling, and real-time total recalculations.

**Independent Test**: A user can open `/budgets/matrix` on desktop or mobile, navigate through cells using `Tab` and `Enter`, update values directly inline, cancel edits with `Esc`, copy/paste tabular data, and save batch updates cleanly.

### Implementation for User Story 1

- [x] T005 [P] [US1] Create integration test suite for matrix endpoints and multi-period batch update operations in `backend/tests/integration/budget-matrix.spec.ts`
- [x] T006 [P] [US1] Implement `GetBudgetMatrixUseCase` to aggregate 12 monthly periods, handle optional category filtering, and compute category totals in `backend/src/application/budgets/get-budget-matrix.use-case.ts`
- [x] T007 [P] [US1] Implement `UpdateBudgetMatrixUseCase` for bulk multi-period cell updates in `backend/src/application/budgets/update-budget-matrix.use-case.ts`
- [x] T008 [US1] Add `GET /api/budgets/matrix` (supporting optional `category` filter query param) and `PUT /api/budgets/matrix/batch-update` HTTP endpoints in `backend/src/infrastructure/controllers/budget.controller.ts`
- [x] T009 [P] [US1] Add API client methods for matrix data fetch and batch update in `frontend/src/services/api.ts`
- [x] T010 [P] [US1] Create interactive matrix spreadsheet component `BudgetMatrixGrid.tsx` with category filter dropdown (FR-010), sticky account name column for mobile, inline cell editing, keyboard navigation (`Tab`, `Enter`, `Esc`), clipboard paste handler (`\n`/`\t` parsing), 100% Spanish labels ("Ingresos", "Egresos", "Activos", "Pasivos", "Patrimonio Neto", "Año"), and dynamic total calculations in `frontend/src/components/budgets/BudgetMatrixGrid.tsx`
- [x] T011 [US1] Implement layout view switcher shell in `frontend/src/app/budgets/layout.tsx`, root redirect in `frontend/src/app/budgets/page.tsx`, and main matrix page in `frontend/src/app/budgets/matrix/page.tsx`

---

## Phase 4: User Story 2 - Smart Budget Distribution Drivers & Mass Loading (Priority: P2)

**Goal**: Provide smart distribution drivers (Prorrateo Anual, MoM %, Forward Fill, Traer Real del Año Anterior) to automate 12-month budget entry without manual per-cell calculations.

**Independent Test**: A user can select an account row, apply "Prorrateo Anual" ($120,000 → $10,000/mo), "Fill Right" (`Ctrl+D`), or "Traer Real del Año Anterior" (+5%), and verify that monthly cells update automatically.

### Implementation for User Story 2

- [x] T012 [P] [US2] Create unit test suite for distribution drivers math calculations in `backend/tests/unit/budget-drivers.spec.ts`
- [x] T013 [P] [US2] Implement `ApplyBudgetDriverUseCase` for driver transformations (`FLAT_PRORATE`, `WEIGHTED_HISTORICAL`, `PERCENTAGE_GROWTH`, `FORWARD_FILL`) using deterministic ISO date shifting and SQL range querying in `backend/src/application/budgets/apply-budget-driver.use-case.ts`
- [x] T014 [P] [US2] Implement `GetPriorYearActualsUseCase` for baseline pre-population from posted journal entries with percentage adjustment using deterministic ISO date shifting and SQL range querying in `backend/src/application/budgets/get-prior-year-actuals.use-case.ts`
- [x] T015 [US2] Add `POST /api/budgets/matrix/apply-driver` and `POST /api/budgets/matrix/baseline-actuals` HTTP endpoints in `backend/src/infrastructure/controllers/budget.controller.ts`
- [x] T016 [P] [US2] Add API client methods for driver application and baseline actuals load in `frontend/src/services/api.ts`
- [x] T017 [P] [US2] Create driver action modal component `DriverActionModal.tsx` for selecting rules, parameters, and baseline adjustments in `frontend/src/components/budgets/DriverActionModal.tsx`
- [x] T018 [US2] Integrate distribution driver modal and driver actions into the matrix planning grid page in `frontend/src/app/budgets/matrix/page.tsx`

---

## Phase 5: User Story 4 - Balance Sheet Cash Flow Intention Switches (Priority: P2)

**Goal**: Support explicit flow intention switches (`PAGAR` vs `RECIBIR` for Liabilities, and `INVERTIR` vs `AHORRAR` vs `DESINVERTIR` for Assets) in the matrix grid view with visual cash flow direction badges (`+ Cash` / `- Cash`) and cash flow projection calculations.

**Independent Test**: A user can toggle a Liability account between `PAGAR` and `RECIBIR` or an Asset account between `INVERTIR` and `AHORRAR`, and verify that the cash flow direction badge updates (`+ Cash Inflow` / `- Cash Outflow`) and affects cash flow calculations.

### Implementation for User Story 4

- [x] T019 [P] [US4] Update `BudgetItemEntity` in `backend/src/infrastructure/database/entities/budget-item.entity.ts` and shared DTOs in `shared/src/index.ts` to include `flowIntention` enum field and validation rules.
- [x] T020 [P] [US4] Update `GetBudgetMatrixUseCase` and `UpdateBudgetMatrixUseCase` in `backend/src/application/budgets/` to query, calculate, and persist `flowIntention` for Balance Sheet items.
- [x] T021 [P] [US4] Add Flow Intention toggle buttons (`PAGAR` | `RECIBIR` for Liabilities; `INVERTIR` | `AHORRAR` | `DESINVERTIR` for Assets) and real-time cash flow impact badges in `frontend/src/components/budgets/BudgetMatrixGrid.tsx`.
- [x] T022 [US4] Update cash flow summary calculations in budget matrix and control engine to incorporate `flowIntention` signs in `backend/src/application/reports/cash-flow-statement.use-case.ts`.

---

## Phase 6: User Story 3 - Executive Monthly Budget Execution & Availability Dashboard (Priority: P3)

**Goal**: Provide a dedicated active month execution dashboard (`/budgets/control`) displaying real-time available residual balance ($\text{Available} = \text{Budgeted} - \text{Executed} - \text{Committed}$), color-coded consumption gauge bars (Green <75%, Yellow 75-99%, Red >=100%), and inter-account budget re-allocation controls.

**Independent Test**: A user can toggle to `/budgets/control` for August 2026, view visual gauge bars displaying consumption percentages, view calculated residual balances per account, and execute an inter-account budget re-allocation transfer.

### Implementation for User Story 3

- [x] T022a [P] [US3] Create unit test suite for budget control calculation math and fund transfer validation in `backend/tests/unit/budget-control.spec.ts`
- [x] T023 [P] [US3] Implement `GetBudgetControlUseCase` for monthly execution summary and residual calculation ($\text{Available} = \text{Budgeted} - \text{Executed} - \text{Committed}$) in `backend/src/application/budgets/get-budget-control.use-case.ts`
- [x] T024 [P] [US3] Implement `TransferBudgetFundsUseCase` for inter-account budget re-allocation with audit logging in `backend/src/application/budgets/transfer-budget-funds.use-case.ts`
- [x] T025 [US3] Add `GET /api/budgets/control` and `POST /api/budgets/control/transfer` HTTP endpoints in `backend/src/infrastructure/controllers/budget.controller.ts`
- [x] T026 [P] [US3] Add API client methods for budget execution control dashboard and fund transfers in `frontend/src/services/api.ts`
- [x] T027 [P] [US3] Create budget transfer modal component `BudgetTransferModal.tsx` with source account residual balance validation and justification in `frontend/src/components/budgets/BudgetTransferModal.tsx`
- [x] T028 [US3] Implement executive control dashboard page with color-coded gauge bars and active period metrics in `frontend/src/app/budgets/control/page.tsx`

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Static code quality verification, test suite execution, and walkthrough validation

- [x] T029 [P] Run static code quality analysis across shared, backend, and frontend monorepo packages to ensure 0 ESLint errors and 0 warnings (`npm run lint`)
- [x] T030 Execute automated unit and integration test suites (`npm --prefix backend test`) and perform end-to-end walkthrough per `specs/017-budget-planning-ux/quickstart.md`

---

## Phase 8: Convergence

- [x] T031 Remediate ESLint warnings across budget feature files and monorepo to maintain zero warnings compliance per Constitution VII (CRITICAL) (contradicts)
- [x] T032 Change year selector label in matrix page from "Año Fiscal:" to "Año" in frontend/src/app/budgets/matrix/page.tsx per FR-014 (partial)
- [x] T033 Replace raw English category labels and totals with 100% Spanish text ("Gastos", "Ingresos", "Activos", "Pasivos", "Patrimonio Neto") in frontend/src/app/budgets/matrix/page.tsx and frontend/src/components/budgets/BudgetMatrixGrid.tsx per FR-015 (contradicts)
- [x] T034 Remove redundant "Grid Interactivo 12 Meses" layout header badge from grid toolbar in frontend/src/components/budgets/BudgetMatrixGrid.tsx per FR-016 (contradicts)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Can start immediately.
- **Foundational (Phase 2)**: Depends on Phase 1 completion. Blocks all user stories.
- **User Stories (Phase 3+)**: All depend on Phase 2 completion.
  - User Story 1 (P1): Can start immediately after Phase 2.
  - User Story 2 (P2): Depends on Phase 2; uses matrix update patterns from US1.
  - User Story 4 (P2): Depends on Phase 2; enhances matrix grid items with flow intentions.
  - User Story 3 (P3): Depends on Phase 2; operates on active periods in parallel with or after matrix planning.
- **Polish (Phase 7)**: Depends on completion of all user story tasks.

### Parallel Opportunities

- Within Phase 1: `T002` can run in parallel with `T001`.
- Within Phase 3 (US1): `T005` (tests), `T006` (get matrix), `T007` (update matrix), `T009` (api client), `T010` (matrix grid UI) can run in parallel.
- Within Phase 4 (US2): `T012` (unit tests), `T013` (apply driver use case), `T014` (prior year actuals use case), `T016` (api client), `T017` (driver modal UI) can run in parallel.
- Within Phase 5 (US4): `T019` (entity/DTO update), `T020` (matrix use cases), `T021` (grid UI toggles) can run in parallel.
- Within Phase 6 (US3): `T023` (get control use case), `T024` (transfer use case), `T026` (api client), `T027` (transfer modal UI) can run in parallel.
- Within Phase 7: `T029` can run in parallel with `T030`.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 (Setup) and Phase 2 (Foundational).
2. Complete Phase 3 (User Story 1 - Annual Matrix Inline Planning).
3. **STOP and VALIDATE**: Test `/budgets/matrix` inline grid editing, keyboard navigation, mobile sticky column layout, and total recalculations.

### Incremental Delivery

1. Foundation ready (Phase 1 + Phase 2).
2. Add User Story 1 (MVP: Annual 12-month Matrix inline grid editing & paste support).
3. Add User Story 2 (Smart Distribution Drivers & Baseline pre-population from prior year actuals).
4. Add User Story 4 (Balance Sheet Cash Flow Intention Switches: PAGAR/RECIBIR, INVERTIR/AHORRAR/DESINVERTIR).
5. Add User Story 3 (Executive Monthly Control Dashboard & Inter-account Budget Transfers).
6. Run final polish (ESLint 0 errors/warnings & full test suite).
