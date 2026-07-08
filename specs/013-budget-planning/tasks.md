# Tasks: Presupuestos Financieros (Budgeting) y Proyecciones de Caja

**Input**: Design documents from `/specs/013-budget-planning/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: TDD approach is mandatory. All use cases, models, and controllers will be accompanied by tests as specified below.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Database entity migrations and validations for new period status

- [x] T001 Configure database migrations to add `PLANNING` to the status enum of `fiscal_years` and `periods` tables.
- [x] T002 Add validation logic in `backend/src/application/accounts/update-account.use-case.ts` to block modification of `isCashOrBank` for accounts that already contain ledger entries.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Type safety updates and core entity refactorings

- [x] T003 [P] Update status fields in `backend/src/infrastructure/database/entities/period.entity.ts` and `backend/src/infrastructure/database/entities/fiscal-year.entity.ts` to support `'OPEN' | 'CLOSED' | 'PLANNING'`.
- [x] T004 [P] Update API contract interfaces and validation schemas in `shared/src/index.ts` to support the new status types and endpoints.

---

## Phase 3: User Story 1 - Inicialización Automática de Presupuestos (Priority: P1) 🎯 MVP

**Goal**: Automatically create empty budget records when initializing a Fiscal Year.

**Independent Test**: Create a new Fiscal Year and verify that 12 budgets (one for each period) are created in zero.

### Tests for User Story 1
- [x] T005 [P] [US1] Create integration test `backend/tests/integration/period-creation.spec.ts` proving that saving a new Fiscal Year initializes 12 period budgets.

### Implementation for User Story 1
- [x] T006 [US1] Update `CreateFiscalYearUseCase` in `backend/src/application/periods/create-fiscal-year.use-case.ts` to auto-generate the 12 `BudgetEntity` entries in database.

---

## Phase 4: User Story 2 - Formulario de Presupuesto Mensual Tabular (Priority: P1)

**Goal**: Load, save/sync, and copy budgeted items using a clean tabular entry UI without pre-populating zero values.

**Independent Test**: Add, edit, and delete budget rows, save, verify sign and persistence. Duplicate from previous month.

### Tests for User Story 2
- [x] T007 [P] [US2] Write unit and integration tests in `backend/tests/integration/budget-details.spec.ts` for dynamic sync updates (creating, editing, and deleting items when omitted) and copy previous month service.

### Implementation for User Story 2
- [x] T008 [US2] Update `GetBudgetDetailUseCase` in `backend/src/application/budgets/get-budget-detail.use-case.ts` to return only active budgeted items and an array of `eligibleAccounts`.
- [x] T009 [US2] Update `UpdateBudgetItemsUseCase` in `backend/src/application/budgets/update-budget-items.use-case.ts` to implement full list synchronization (deleting omitted items).
- [x] T010 [US2] Implement `CopyPreviousBudgetUseCase` in `backend/src/application/budgets/copy-previous-budget.use-case.ts` to duplicate budgeted accounts/amounts from the previous month.
- [x] T011 [US2] Expose copy endpoint and update routes in `backend/src/infrastructure/controllers/budget.controller.ts`.
- [x] T012 [P] [US2] Implement new dynamic tabular layout with tabs (Ingresos, Egresos, Balance), pre-filtered eligible account selectors, "+ Agregar Partida", delete button, and "Copiar del mes anterior" action in `frontend/src/app/budgets/[periodId]/edit/page.tsx`.

---

## Phase 5: User Story 3 - Matriz Anual de Presupuestos (Priority: P2)

**Goal**: Visualise the consolidated year plan and redirect to individual monthly editors.

**Independent Test**: Load the annual grid, check column counts, and click header to redirect to editor.

### Implementation for User Story 3
- [x] T013 [US3] Implement and design the annual matrix page in `frontend/src/app/budgets/page.tsx` displaying accounts tree as rows and 12 months as columns.
- [x] T014 [US3] Add month header click event in `frontend/src/app/budgets/page.tsx` to navigate to `/budgets/[periodId]/edit`.

---

## Phase 6: User Story 4 - Reporte de Control de Desviaciones (Priority: P1)

**Goal**: Compare budget vs real transactions, showing cash deviations and coloring negative variances.

**Independent Test**: Load execution report, view real values, verify deviation alerts.

### Tests for User Story 4
- [x] T015 [P] [US4] Write unit/integration tests in `backend/tests/unit/budget-execution.spec.ts` and `backend/tests/integration/budget-tracking.spec.ts` for execution comparison and cash deviation signs.

### Implementation for User Story 4
- [x] T016 [US4] Update `GetBudgetExecutionUseCase` in `backend/src/application/budgets/get-budget-execution.use-case.ts` to support the new tabular format, and calculate cash-based deviations for Asset/Liability movements.
- [x] T017 [P] [US4] Implement comparative table and KPIs, highlighting negative deviations in red, in `frontend/src/app/budgets/[periodId]/execution/page.tsx`.

---

## Phase 7: User Story 5 - Reportes de Proyecciones (Caja y E.R. Proyectado) (Priority: P1)

**Goal**: Rolling 12-month forecast, pre-opening next year in PLANNING, alternating Cash Flow and P&L.

**Independent Test**: Open projection report, verify last closed month is base, select rolling 12 months, audit cascading cash balances.

### Tests for User Story 5
- [x] T018 [P] [US5] Write unit tests in `backend/tests/unit/cash-flow-forecast.spec.ts` validating rolling 12-month window limits, automatic pre-opening of the next fiscal year, and balance cascading.

### Implementation for User Story 5
- [x] T019 [US5] Update `CashFlowStatementForecastUseCase` in `backend/src/application/reports/cash-flow-statement.use-case.ts` to support the `rolling` query param and auto-pre-open next year if needed.
- [x] T020 [US5] Update `IncomeStatementForecastUseCase` in `backend/src/application/reports/income-statement-forecast.use-case.ts` to support the `rolling` parameter.
- [x] T021 [US5] Update `ReportsController` routes and parameter mappings in `backend/src/infrastructure/controllers/reports.controller.ts`.
- [x] T022 [P] [US5] Design and implement the projection report page (matrix with scroll, tabs/toggles for Cash Flow vs P&L, rolling vs full year, visual real vs projected indicator, interactive headers) in `frontend/src/app/reports/forecast/page.tsx`.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Verification and documentation updates

- [x] T023 Update developer documentation in `README.md`.
- [x] T024 Run formatting and static code checks with `npm run lint` and `npm run format`.
- [x] T025 Run the entire test suite `npm run test` to verify everything is green.
- [x] T026 Run `quickstart.md` validation scripts to verify all scenarios pass.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup completion. Blocks all user stories.
- **User Stories (Phase 3+)**: All depend on Foundational phase completion. Can be worked on sequentially or in parallel.
- **Polish (Final Phase)**: Depends on all user stories being complete.

### Parallel Opportunities
- Foundational tasks can be worked on in parallel.
- User Story implementation tasks (e.g. backend use cases vs frontend views) can be developed concurrently once entity schemas are settled.

---

## Phase 9: Convergence

- [x] T027 Block transaction creation, updates, reversals, and deletions in planning periods and write verification tests per FR-018 (contradicts)
- [x] T028 Import and initialize useRouter in budgets/page.tsx to resolve build type error per US3 (missing)
