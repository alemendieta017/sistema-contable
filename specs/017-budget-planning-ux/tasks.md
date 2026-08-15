# Tasks: Budget Planning Matrix & Execution Control UX

**Input**: Design documents from `/specs/017-budget-planning-ux/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/budget-planning-api.md

**Tests**: Unit & Integration tests included per TDD requirement (Constitution V) and quickstart.md.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US4, US2, US3)
- Includes exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Shared types, DTOs, and domain models for the 4-block budget matrix, distribution drivers, cash flow directions, and execution control engine

- [x] T001 [P] Define 4-block section keys (`INGRESOS`, `GASTOS_VIDA`, `AHORRO_INVERSIONES`, `DEUDAS_FINANCIACION`), driver enums (`FLAT_PRORATE`, `WEIGHTED_HISTORICAL`, `PERCENTAGE_GROWTH`, `FORWARD_FILL`, `PRIOR_YEAR_ACTUAL`), cash flow directions (`INGRESO_EFECTIVO`, `EGRESO_EFECTIVO`), gauge statuses (`NORMAL`, `WARNING`, `OVERBUDGET`), matrix and control request/response schemas, and transfer DTOs in `shared/src/index.ts`
- [x] T002 [P] Define domain interfaces and models for 4 executive blocks, category tree hierarchies, distribution drivers, execution metrics, and budget reassignments in `backend/src/domain/budgets/budget.model.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core database entity schemas and module registrations required before user story implementation

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 Create database entity `BudgetReassignmentEntity` for inter-account budget transfer audit logging in `backend/src/infrastructure/database/entities/budget-reassignment.entity.ts`
- [x] T004 [P] Update database entity `BudgetItemEntity` in `backend/src/infrastructure/database/entities/budget-item.entity.ts` to support `subRowId`, `subRowLabel`, and `cashFlowDirection`
- [x] T005 [P] Register `BudgetReassignmentEntity` in database module in `backend/src/infrastructure/database/database.module.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Annual Matrix Inline Planning & Direct Cell Editing (Priority: P1) 🎯 MVP

**Goal**: Provide an interactive 12-month matrix view (`/budgets/matrix`) occupying 100% available screen width, with responsive mobile layout (fixed sticky account name column and horizontal touch scroll), inline grid cell editing, spreadsheet keyboard navigation (`Tab`, `Shift+Tab`, `Enter`, `Shift+Enter`, `Esc`), clipboard multi-cell paste parsing, 3-dots options menu (`•••`) per row, 100% Spanish labels, high-contrast dark/light theme styling, dynamic parent subtotals, fiscal year select bugfix (`fy.name`), removal of sticky footer, and atomic batch persistence with dirty state warning.

**Independent Test**: A user can open `/budgets/matrix` on desktop or mobile, view the grid taking 100% viewport width without a sticky cash flow bar, see the fiscal year selector displaying "2025" / "2026", navigate through cells using keyboard shortcuts, edit values inline, cancel edits with `Esc`, copy/paste tabular data, view parent subtotal recalculations in real time, and save batch updates atomically via `[ 💾 Guardar Todo ]`.

### Tests for User Story 1

- [x] T006 [P] [US1] Create integration test suite for matrix endpoints and multi-period atomic batch update operations in `backend/tests/integration/budget-matrix.spec.ts`

### Implementation for User Story 1

- [x] T007 [P] [US1] Implement `GetBudgetMatrixUseCase` to aggregate 12 monthly periods, build hierarchical category trees with dynamic read-only parent subtotals, compute section/grand totals, and handle period lock statuses in `backend/src/application/budgets/get-budget-matrix.use-case.ts`
- [x] T008 [P] [US1] Implement `UpdateBudgetMatrixUseCase` for atomic multi-period cell updates across all sections and periods in a single transaction in `backend/src/application/budgets/update-budget-matrix.use-case.ts`
- [x] T009 [US1] Add `GET /api/budgets/matrix` (supporting optional `categoryId` query param) and `PUT /api/budgets/matrix/batch-update` HTTP endpoints in `backend/src/infrastructure/controllers/budget.controller.ts`
- [x] T010 [P] [US1] Add API client methods for matrix data fetch and atomic batch update in `frontend/src/services/api.ts`
- [x] T011 [P] [US1] Refactor interactive matrix spreadsheet component `BudgetMatrixGrid.tsx` to occupy 100% width, remove sticky bottom cash flow footer, introduce a 3-dots options menu (`•••`) per row (with "Rellenar", "Editar", "Eliminar" actions), and ensure fixed sticky account column on mobile in `frontend/src/components/budgets/BudgetMatrixGrid.tsx`
- [x] T012 [US1] Update matrix planning page with 100% full-width layout, fix fiscal year selector dropdown to correctly render year names (`fy.name`) and closed status indicator (`(Cerrado)`), maintain dirty state tracking and `[ 💾 Guardar Todo ]` atomic persistence in `frontend/src/app/budgets/matrix/page.tsx`

**Checkpoint**: At this point, User Story 1 (MVP) is fully functional and testable independently.

---

## Phase 4: User Story 4 - 4 Executive Financial Blocks & Streamlined Unified Balance Budgeting (Priority: P1)

**Goal**: Structure matrix into 4 distinct executive blocks (🟢 Ingresos, 🔴 Gastos de Vida, 🔵 Ahorro e Inversiones, 🟣 Deudas y Financiación). Auto-populate active P&L accounts, unify modal budgeting for Balance accounts into a single non-verbose modal ("Presupuestar Cuenta" / "Presupuestar Activo/Pasivo") with 3 direct inputs (`Seleccionar cuenta`, `Dirección de Flujo: [Salida de efectivo] [Entrada de efectivo]`, `Concepto`), remove inline "+ Agregar sub-línea" buttons inside rows, remove inline direction toggle buttons, and enable row editing/deletion via the 3-dots menu (`•••`).

**Independent Test**: A user can view pre-populated P&L accounts, click `+ Presupuestar Activo` or `+ Presupuestar Deuda` to open the unified modal, select a balance account, choose `[Salida de efectivo]`, enter a concept, and see the clean row added to the grid with editing and deletion options accessible via the 3-dots menu (`•••`).

### Tests for User Story 4

- [x] T013 [P] [US4] Create unit test suite for cash flow statement and net flow rollup calculations (`totalInflows`, `totalOutflows`, `netMonthlyFlow`, `cumulativeNetFlow`) across the 4 executive blocks in `backend/tests/unit/cash-flow-direction.spec.ts`

### Implementation for User Story 4

- [x] T014 [P] [US4] Update `GetBudgetMatrixUseCase` and `UpdateBudgetMatrixUseCase` in `backend/src/application/budgets/` to automatically pre-populate active P&L accounts (🟢 Ingresos and 🔴 Gastos de Vida) and structure on-demand balance accounts (🔵 Ahorro e Inversiones and 🟣 Deudas y Financiación) with `(accountId, subRowId, cashFlowDirection)` keys and row deletion handling
- [x] T015 [P] [US4] Create unified, non-verbose modal component `BudgetAccountModal.tsx` for on-demand budgeting of Balance accounts with account selector, simple flow direction selector (`[Salida de efectivo]` / `[Entrada de efectivo]`), and concept input in `frontend/src/components/budgets/BudgetAccountModal.tsx` (replacing `AddBalanceBudgetModal.tsx`)
- [x] T016 [US4] Integrate unified balance modal (`+ Presupuestar Activo`, `+ Presupuestar Deuda`), row editing and deletion via 3-dots menu (`•••` with confirmation), discrete cash flow direction badges, and remove inline "+ Agregar sub-línea" and direction toggle buttons in `frontend/src/components/budgets/BudgetMatrixGrid.tsx`
- [x] T017 [US4] Update net cash flow impact calculations incorporating `INGRESO_EFECTIVO` (+ Cash) and `EGRESO_EFECTIVO` (- Cash) directions in `backend/src/application/reports/cash-flow-statement.use-case.ts`

**Checkpoint**: 4 executive blocks and streamlined on-demand balance budgeting are functional and testable independently.

---

## Phase 5: User Story 2 - Simplified Budget Auto-Fill & Baseline Loading (Priority: P2)

**Goal**: Provide a simplified Auto-fill tool ("Autorellenar Presupuesto") with clear, natural language options (Distribuir monto anual parejo, Replicar adelante `Ctrl+D`, Incremento porcentual mensual, Ponderación histórica, and Traer real del año anterior con ajuste %) accessible via the 3-dots row menu (`•••`) without complex jargon.

**Independent Test**: A user can click the 3-dots menu (`•••`) on an account row, select "Rellenar", choose "Distribuir monto anual equitativamente" with an annual total of $120,000, and verify that each month is populated with $10,000 automatically.

### Tests for User Story 2

- [x] T018 [P] [US2] Create unit test suite for distribution drivers math calculations (`FLAT_PRORATE`, `WEIGHTED_HISTORICAL`, `PERCENTAGE_GROWTH`, `FORWARD_FILL`) and ISO date-shifted baseline queries in `backend/tests/unit/budget-drivers.spec.ts`

### Implementation for User Story 2

- [x] T019 [P] [US2] Implement `ApplyBudgetDriverUseCase` for driver transformations (`FLAT_PRORATE`, `WEIGHTED_HISTORICAL`, `PERCENTAGE_GROWTH`, `FORWARD_FILL`) in `backend/src/application/budgets/apply-budget-driver.use-case.ts`
- [x] T020 [P] [US2] Implement `GetPriorYearActualsUseCase` for baseline pre-population from posted ledger entries with percentage adjustment using deterministic 1-year ISO date shifting (`shiftYear(date, -1)`) in `backend/src/application/budgets/get-prior-year-actuals.use-case.ts`
- [x] T021 [US2] Add `POST /api/budgets/matrix/apply-driver` and `POST /api/budgets/matrix/baseline-actuals` HTTP endpoints in `backend/src/infrastructure/controllers/budget.controller.ts`
- [x] T022 [P] [US2] Add API client methods for driver application and baseline actuals load in `frontend/src/services/api.ts`
- [x] T023 [P] [US2] Create simplified auto-fill modal component `AutofillModal.tsx` replacing complex jargon with intuitive natural language labels and clear distribution options in `frontend/src/components/budgets/AutofillModal.tsx` (replacing `DriverActionModal.tsx`)
- [x] T024 [US2] Integrate simplified auto-fill modal trigger inside 3-dots row menu (`•••`), and support keyboard shortcut (`Ctrl+D` / `Cmd+D` with preventDefault for forward fill) in `frontend/src/app/budgets/matrix/page.tsx`

**Checkpoint**: Simplified auto-fill and baseline pre-population from prior year actuals work independently.

---

## Phase 6: User Story 3 - Executive Monthly Budget Execution & Availability Dashboard (Priority: P3)

**Goal**: Provide a dedicated, separate Monthly Execution Control page (`/budgets/control`) in the navigation sidebar, displaying real-time available residual balance ($\text{Available} = \text{Budgeted} - \text{Executed} - \text{Committed}$), double-entry debit/credit ledger mappings per flow direction, visual color-coded consumption gauge bars (Green <75%, Yellow 75-99%, Red >=100%), and directional inter-account budget reallocations (Salida $\leftrightarrow$ Salida, Entrada $\leftrightarrow$ Entrada) with audit logging (`budget_reassignments`).

**Independent Test**: A user can navigate directly to "Control de Ejecución" (`/budgets/control`) from the sidebar, verify execution metrics and gauge bars per category, transfer available budget from an unspent expense to an investment contribution, and verify that cross-direction transfers (e.g. expense to income) are blocked.

### Tests for User Story 3

- [x] T025 [P] [US3] Create unit test suite for budget control execution metrics ($\text{Available} = \text{Budgeted} - \text{Executed} - \text{Committed}$, double-entry debits/credits mapping, consumption gauge status) and directional transfer validation in `backend/tests/unit/budget-control.spec.ts`

### Implementation for User Story 3

- [x] T026 [P] [US3] Implement `GetBudgetControlUseCase` to aggregate budgeted amounts, compute actual ledger debits/credits per flow direction, calculate available residual balances, and evaluate consumption gauges across the 4 financial blocks in `backend/src/application/budgets/get-budget-control.use-case.ts`
- [x] T027 [P] [US3] Implement `TransferBudgetFundsUseCase` for directional budget re-allocations (Salida $\leftrightarrow$ Salida, Entrada $\leftrightarrow$ Entrada) with source residual balance validation and audit logging in `backend/src/application/budgets/transfer-budget-funds.use-case.ts`
- [x] T028 [US3] Add `GET /api/budgets/control` and `POST /api/budgets/control/transfer` HTTP endpoints in `backend/src/infrastructure/controllers/budget.controller.ts`
- [x] T029 [P] [US3] Add API client methods for budget execution control dashboard and directional fund transfers in `frontend/src/services/api.ts`
- [x] T030 [P] [US3] Create budget transfer modal component `BudgetTransferModal.tsx` with same-direction account filtering, source residual balance validation, and reason input in `frontend/src/components/budgets/BudgetTransferModal.tsx`
- [x] T031 [US3] Implement executive control dashboard page (`/budgets/control`) as an independent full-screen view with active period selector, 4-block executive summary, color-coded gauge bars (Green <75%, Yellow 75-99%, Red >=100%), and transfer action triggers in `frontend/src/app/budgets/control/page.tsx`
- [x] T034 [US3] Update main navigation sidebar in `frontend/src/components/Sidebar.tsx` and layout in `frontend/src/app/budgets/layout.tsx` to provide two separate, dedicated navigation entries: "Planificación Presupuestaria" (`/budgets/matrix`) and "Control de Ejecución" (`/budgets/control`)

**Checkpoint**: All user stories are now fully functional and testable independently.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Static code quality verification, test suite execution, performance benchmarking, WCAG AA contrast verification, and walkthrough validation

- [x] T032 [P] Run static code quality analysis across shared, backend, and frontend monorepo packages to ensure 0 ESLint errors and 0 warnings (`npm run lint`), and verify WCAG AA color contrast compliance across Light and Dark themes
- [x] T033 Execute automated unit and integration test suites (`npm --prefix backend test`), verify cell update response performance (<100ms) and spreadsheet grid navigation (60fps), and perform end-to-end walkthrough per `specs/017-budget-planning-ux/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - **User Story 1 (P1)**: Can start after Foundational (Phase 2)
  - **User Story 4 (P1)**: Can start after Foundational (Phase 2); extends US1 matrix structure with 4 executive blocks and on-demand balance budgeting
  - **User Story 2 (P2)**: Can start after Foundational (Phase 2); builds on matrix updates
  - **User Story 3 (P3)**: Can start after Foundational (Phase 2); operates on active period control
- **Polish (Phase 7)**: Depends on completion of all user story tasks

### User Story Dependencies

- **User Story 1 (P1)**: Independent after Phase 2 (Core 12-month spreadsheet grid & atomic persistence)
- **User Story 4 (P1)**: Independent after Phase 2 (4 blocks, on-demand balance modals, net cash flow rollup)
- **User Story 2 (P2)**: Independent after Phase 2 (Driver algorithms & prior year actuals baseline)
- **User Story 3 (P3)**: Independent after Phase 2 (Executive monthly control dashboard & directional transfers)

### Parallel Opportunities

- **Phase 1**: `T001` and `T002` can run in parallel
- **Phase 2**: `T004` and `T005` can run in parallel
- **Phase 3 (US1)**: `T006` (tests), `T007` (get matrix), `T008` (update matrix), `T010` (API client), `T011` (matrix grid UI) can run in parallel
- **Phase 4 (US4)**: `T013` (tests), `T014` (matrix 4-block use case), `T015` (balance modal UI) can run in parallel
- **Phase 5 (US2)**: `T018` (unit tests), `T019` (apply driver use case), `T020` (prior year actuals use case), `T022` (API client), `T023` (driver modal UI) can run in parallel
- **Phase 6 (US3)**: `T025` (unit tests), `T026` (get control use case), `T027` (transfer use case), `T029` (API client), `T030` (transfer modal UI) can run in parallel
- **Phase 7**: `T032` can run in parallel with `T033`

---

## Parallel Example: User Story 1

```bash
# Launch test suite and backend use cases in parallel:
Task: "Create integration test suite for matrix endpoints and multi-period atomic batch update operations in backend/tests/integration/budget-matrix.spec.ts"
Task: "Implement GetBudgetMatrixUseCase to aggregate 12 monthly periods in backend/src/application/budgets/get-budget-matrix.use-case.ts"
Task: "Implement UpdateBudgetMatrixUseCase for atomic multi-period cell updates in backend/src/application/budgets/update-budget-matrix.use-case.ts"

# Launch UI grid component in parallel:
Task: "Create interactive matrix spreadsheet component BudgetMatrixGrid.tsx in frontend/src/components/budgets/BudgetMatrixGrid.tsx"
```

---

## Parallel Example: User Story 4

```bash
# Launch test suite, use case updates, and balance modal in parallel:
Task: "Create unit test suite for cash flow statement and net flow rollup calculations in backend/tests/unit/cash-flow-direction.spec.ts"
Task: "Update GetBudgetMatrixUseCase and UpdateBudgetMatrixUseCase to structure 4 executive blocks in backend/src/application/budgets/"
Task: "Create unified modal component BudgetAccountModal.tsx in frontend/src/components/budgets/BudgetAccountModal.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 (Setup) and Phase 2 (Foundational - CRITICAL).
2. Complete Phase 3 (User Story 1 - Annual Matrix Inline Planning & Direct Cell Editing).
3. **STOP and VALIDATE**: Test `/budgets/matrix` inline grid editing, keyboard navigation, mobile sticky column layout, and total recalculations.
4. Deploy/demo if ready.

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 4 → Test 4 executive blocks, on-demand balance budgeting & net cash flow rollup
4. Add User Story 2 → Test smart distribution drivers & prior year actuals baseline
5. Add User Story 3 → Test executive monthly control dashboard & directional transfers
6. Complete Polish → Zero ESLint errors/warnings & full test suite passing

---

## Notes

- All tasks follow strict `[ID] [P?] [Story] Description with exact file path` checklist format.
- Every user story is independently completable and testable.
- Zero magic strings, 100% Spanish UI labels, and WCAG AA contrast compliance strictly enforced.
