# Tasks: Budget Planning Matrix & Execution Control UX (Desktop & Mobile)

**Input**: Design documents from `/specs/017-budget-planning-ux/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/budget-planning-api.md, quickstart.md

**Tests**: Unit & Integration tests included per TDD requirement (Constitution V) and quickstart.md.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US5, US3, US4, US6)
- Includes exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Shared types, DTOs, and domain models for the 4-block budget matrix, distribution drivers, cash flow directions, mobile planning state, and execution control engine

- [x] T001 [P] Define 4-block section keys (`INGRESOS`, `GASTOS_VIDA`, `AHORRO_INVERSIONES`, `DEUDAS_FINANCIACION`), driver enums (`FLAT_PRORATE`, `WEIGHTED_HISTORICAL`, `PERCENTAGE_GROWTH`, `FORWARD_FILL`, `PRIOR_YEAR_ACTUAL`), cash flow directions (`INGRESO_EFECTIVO`, `EGRESO_EFECTIVO`), gauge statuses (`NORMAL`, `WARNING`, `OVERBUDGET`), mobile planning interfaces (`MobilePlanningState`, `DeepDiveDistributionParams`), matrix and control request/response schemas, and transfer DTOs in `shared/src/index.ts`
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

## Phase 3: User Story 1 - Desktop 12-Month Matrix Inline Planning & Direct Cell Editing (Priority: P1) 🎯 MVP

**Goal**: Provide an interactive 12-month matrix view (`/budgets/matrix`) occupying 100% available screen width on desktop (>768px), with inline grid cell editing, spreadsheet keyboard navigation (`Tab`, `Shift+Tab`, `Enter`, `Shift+Enter`, `Esc`), clipboard multi-cell paste parsing, 3-dots options menu (`•••`) per row, 100% Spanish labels, high-contrast dark/light theme styling, dynamic parent subtotals, fiscal year select bugfix (`fy.name`), removal of sticky cash flow footer, and atomic batch persistence with dirty state warning.

**Independent Test**: A user on a desktop viewport (>768px) can open `/budgets/matrix`, view the grid taking 100% viewport width without a sticky cash flow bar, see the fiscal year selector displaying year name ("2025" / "2026"), navigate through cells using keyboard shortcuts, edit values inline, cancel edits with `Esc`, copy/paste tabular data, view parent subtotal recalculations in real time, and save batch updates atomically via `[ 💾 Guardar Todo ]`.

### Tests for User Story 1

- [x] T006 [P] [US1] Create integration test suite for matrix endpoints and multi-period atomic batch update operations in `backend/tests/integration/budget-matrix.spec.ts`

### Implementation for User Story 1

- [x] T007 [P] [US1] Implement `GetBudgetMatrixUseCase` to aggregate 12 monthly periods, build hierarchical category trees with dynamic read-only parent subtotals, compute section/grand totals, and handle period lock statuses in `backend/src/application/budgets/get-budget-matrix.use-case.ts`
- [x] T008 [P] [US1] Implement `UpdateBudgetMatrixUseCase` for atomic multi-period cell updates across all sections and periods in a single transaction in `backend/src/application/budgets/update-budget-matrix.use-case.ts`
- [x] T009 [US1] Add `GET /api/budgets/matrix` (supporting optional `categoryId` query param) and `PUT /api/budgets/matrix/batch-update` HTTP endpoints in `backend/src/infrastructure/controllers/budget.controller.ts`
- [x] T010 [P] [US1] Add API client methods for matrix data fetch and atomic batch update in `frontend/src/services/api.ts`
- [x] T011 [P] [US1] Refactor interactive desktop matrix spreadsheet component `BudgetMatrixGrid.tsx` to occupy 100% viewport width (`w-full`), remove sticky bottom cash flow footer, provide spreadsheet keyboard navigation (`Tab`, `Shift+Tab`, `Enter`, `Shift+Enter`, `Esc`), clipboard multi-cell paste handling, collapsible parent categories with auto-calculated subtotals, and 3-dots options menu (`•••`) in `frontend/src/components/budgets/BudgetMatrixGrid.tsx`
- [x] T012 [US1] Update matrix planning page with 100% full-width layout, fix fiscal year selector dropdown to correctly render year names (`fy.name`) and closed status indicator (`(Cerrado)`), maintain dirty state tracking and `[ 💾 Guardar Todo ]` atomic persistence in `frontend/src/app/budgets/matrix/page.tsx`

**Checkpoint**: At this point, User Story 1 (MVP) is fully functional and testable independently.

---

## Phase 4: User Story 2 - Mobile Adaptive Planning: Active Month View & 12-Month Deep-Dive Sheet (Priority: P1)

**Goal**: Provide a dedicated mobile planning layout ($\le 768\text{px}$) featuring an active month view with swipeable horizontal month selector strip, 4 collapsible financial block accordions showing monthly sums in headers, touch-friendly account cards with 3-dots bottom sheet, a 12-month vertical "Deep-Dive por Rubro" bottom sheet with mass-distribution actions (`[ Distribuir parejo ]`, `[ Copiar de Ene a Dic ]`, `[ Traer Real del Año Anterior + % ]`), and a sticky bottom action bar for mobile dirty state.

**Independent Test**: Open `/budgets/matrix` on a mobile viewport ($\le 768\text{px}$), swipe the month selector strip from January to March, expand financial block accordions, tap an account card to open the Deep-Dive bottom sheet, apply "Distribuir parejo", and save changes via the Sticky Bottom Action Bar.

### Implementation for User Story 2

- [x] T013 [P] [US2] Create responsive viewport detection hook `useMediaQuery.ts` for desktop vs mobile breakpoints (768px boundary) in `frontend/src/hooks/useMediaQuery.ts`
- [x] T014 [P] [US2] Create swipeable horizontal month selector strip component `BudgetMonthStrip.tsx` with active month indicators and status badges in `frontend/src/components/budgets/BudgetMonthStrip.tsx`
- [x] T015 [P] [US2] Create touch-friendly mobile account card component `BudgetAccountCard.tsx` with contextual labels (_"Promedio anual: ₲ 120.000"_), numeric input, and 3-dots menu trigger in `frontend/src/components/budgets/BudgetAccountCard.tsx`
- [x] T016 [P] [US2] Create mobile "Deep-Dive por Rubro" Bottom Sheet component `BudgetDeepDiveDrawer.tsx` with vertical 12-month list and top mass distribution actions (`[ Distribuir parejo ]`, `[ Copiar de Ene a Dic ]`, `[ Traer Real del Año Anterior + % ]`) in `frontend/src/components/budgets/BudgetDeepDiveDrawer.tsx`
- [x] T017 [P] [US2] Create mobile Sticky Bottom Action Bar component `BudgetStickyActionBar.tsx` displaying `[ 💾 Guardar Cambios (N pendientes) ]` and `[ Descartar ]` in the thumb zone during dirty state in `frontend/src/components/budgets/BudgetStickyActionBar.tsx`
- [x] T018 [US2] Create mobile active month container component `BudgetMobileView.tsx` integrating month strip, 4 collapsible block accordions with header totals, account cards, 3-dots bottom sheet drawer, deep-dive drawer, and sticky bottom action bar in `frontend/src/components/budgets/BudgetMobileView.tsx`
- [x] T019 [US2] Integrate mobile adaptive view with `useMediaQuery` toggle between `BudgetMatrixGrid` (desktop) and `BudgetMobileView` (mobile) while preserving dirty state in `frontend/src/app/budgets/matrix/page.tsx`

**Checkpoint**: Mobile Adaptive Planning view and 12-Month Deep-Dive Sheet work independently and seamlessly synchronize state with the desktop view.

---

## Phase 5: User Story 5 - 4 Executive Financial Blocks & Streamlined Unified Balance Budgeting (Priority: P1)

**Goal**: Structure matrix into 4 distinct executive blocks (🟢 Ingresos, 🔴 Gastos de Vida, 🔵 Ahorro e Inversiones, 🟣 Deudas y Financiación). Auto-populate active P&L accounts, unify modal budgeting for Balance accounts into a single non-verbose modal/drawer ("Presupuestar Cuenta" / "Presupuestar Activo/Pasivo") with 3 direct inputs (`Seleccionar cuenta`, `Dirección de Flujo: [Salida de efectivo] [Entrada de efectivo]`, `Concepto`), remove inline "+ Agregar sub-línea" buttons inside rows, remove inline direction toggle buttons, enable row editing/deletion via the 3-dots menu (`•••`), and compute cash flow statement net flows.

**Independent Test**: A user can view pre-populated P&L accounts, click `+ Presupuestar Activo` or `+ Presupuestar Deuda` to open the unified dialog (modal on desktop, drawer on mobile), select a balance account, choose `[Salida de efectivo]`, enter a concept, and see the clean row added to the budget with editing and deletion options accessible via the 3-dots menu (`•••`).

### Tests for User Story 5

- [x] T020 [P] [US5] Create unit test suite for cash flow statement and net flow rollup calculations (`totalInflows`, `totalOutflows`, `netMonthlyFlow`, `cumulativeNetFlow`) across the 4 executive blocks in `backend/tests/unit/cash-flow-direction.spec.ts`

### Implementation for User Story 5

- [x] T021 [P] [US5] Update `GetBudgetMatrixUseCase` and `UpdateBudgetMatrixUseCase` in `backend/src/application/budgets/` to automatically pre-populate active P&L accounts (🟢 Ingresos and 🔴 Gastos de Vida) and structure on-demand balance accounts (🔵 Ahorro e Inversiones and 🟣 Deudas y Financiación) with `(accountId, subRowId, cashFlowDirection)` keys and row deletion handling
- [x] T022 [P] [US5] Create unified, non-verbose dialog component `BudgetAccountModal.tsx` (centered modal on desktop, Bottom Sheet drawer on mobile) for on-demand budgeting of Balance accounts with account selector, simple flow direction selector (`[Salida de efectivo]` / `[Entrada de efectivo]`), and concept input in `frontend/src/components/budgets/BudgetAccountModal.tsx` (replacing `AddBalanceBudgetModal.tsx`)
- [x] T023 [US5] Integrate unified balance modal (`+ Presupuestar Activo`, `+ Presupuestar Deuda`), row editing and deletion via 3-dots menu (`•••` with confirmation), discrete cash flow direction badges, and remove inline "+ Agregar sub-línea" and direction toggle buttons in `BudgetMatrixGrid.tsx` and `BudgetMobileView.tsx`
- [x] T024 [US5] Update net cash flow impact calculations incorporating `INGRESO_EFECTIVO` (+ Cash) and `EGRESO_EFECTIVO` (- Cash) directions in `backend/src/application/reports/cash-flow-statement.use-case.ts`

**Checkpoint**: 4 executive blocks and streamlined on-demand balance budgeting are functional and testable independently.

---

## Phase 6: User Story 3 - Simplified Budget Auto-Fill & Baseline Loading (Priority: P2)

**Goal**: Provide a simplified Auto-fill tool ("Autorellenar Presupuesto") with clear, natural language options (Distribuir monto anual parejo, Replicar adelante `Ctrl+D`, Incremento porcentual mensual, Ponderación histórica, and Traer real del año anterior con ajuste %) accessible via the 3-dots row menu (`•••`) and mobile deep-dive sheets without complex jargon.

**Independent Test**: A user can click the 3-dots menu (`•••`) on an account row or in the mobile deep-dive sheet, select "Rellenar", choose "Distribuir monto total parejo en los 12 meses" with an annual total of ₲ 1.200.000, and verify that each month is populated with ₲ 100.000 automatically.

### Tests for User Story 3

- [x] T025 [P] [US3] Create unit test suite for distribution drivers math calculations (`FLAT_PRORATE`, `WEIGHTED_HISTORICAL`, `PERCENTAGE_GROWTH`, `FORWARD_FILL`) and ISO date-shifted baseline queries in `backend/tests/unit/budget-drivers.spec.ts`

### Implementation for User Story 3

- [x] T026 [P] [US3] Implement `ApplyBudgetDriverUseCase` for driver transformations (`FLAT_PRORATE`, `WEIGHTED_HISTORICAL`, `PERCENTAGE_GROWTH`, `FORWARD_FILL`) in `backend/src/application/budgets/apply-budget-driver.use-case.ts`
- [x] T027 [P] [US3] Implement `GetPriorYearActualsUseCase` for baseline pre-population from posted ledger entries with percentage adjustment using deterministic 1-year ISO date shifting (`shiftYear(date, -1)`) in `backend/src/application/budgets/get-prior-year-actuals.use-case.ts`
- [x] T028 [US3] Add `POST /api/budgets/matrix/apply-driver` and `POST /api/budgets/matrix/baseline-actuals` HTTP endpoints in `backend/src/infrastructure/controllers/budget.controller.ts`
- [x] T029 [P] [US3] Add API client methods for driver application and baseline actuals load in `frontend/src/services/api.ts`
- [x] T030 [P] [US3] Create simplified auto-fill dialog component `AutofillModal.tsx` (centered modal on desktop, Bottom Sheet drawer on mobile) replacing complex jargon with intuitive natural language labels and clear distribution options in `frontend/src/components/budgets/AutofillModal.tsx` (replacing `DriverActionModal.tsx`)
- [x] T031 [US3] Integrate simplified auto-fill modal trigger inside 3-dots row menu (`•••`), mobile Deep-Dive sheet, and support keyboard shortcut (`Ctrl+D` / `Cmd+D` with preventDefault for forward fill) in `frontend/src/app/budgets/matrix/page.tsx`

**Checkpoint**: Simplified auto-fill and baseline pre-population from prior year actuals work independently.

---

## Phase 7: User Story 4 - Executive Monthly Budget Execution & Availability Dashboard (Priority: P2)

**Goal**: Provide a dedicated, separate Monthly Execution Control page (`/budgets/control`) in the navigation sidebar, displaying real-time available residual balance ($\text{Available} = \text{Budgeted} - \text{Executed} - \text{Committed}$), double-entry debit/credit ledger mappings per flow direction, visual color-coded consumption gauge bars (Green <75%, Yellow 75-99%, Red >=100%), and directional inter-account budget reallocations (Salida $\leftrightarrow$ Salida, Entrada $\leftrightarrow$ Entrada) with audit logging (`budget_reassignments`).

**Independent Test**: A user can navigate directly to "Control de Ejecución" (`/budgets/control`) from the sidebar, verify execution metrics and gauge bars per category, transfer available budget from an unspent expense to an investment contribution, and verify that cross-direction transfers (e.g. expense to income) are blocked.

### Tests for User Story 4

- [x] T032 [P] [US4] Create unit test suite for budget control execution metrics ($\text{Available} = \text{Budgeted} - \text{Executed} - \text{Committed}$, double-entry debits/credits mapping, consumption gauge status) and directional transfer validation in `backend/tests/unit/budget-control.spec.ts`

### Implementation for User Story 4

- [x] T033 [P] [US4] Implement `GetBudgetControlUseCase` to aggregate budgeted amounts, compute actual ledger debits/credits per flow direction, calculate available residual balances, and evaluate consumption gauges across the 4 financial blocks in `backend/src/application/budgets/get-budget-control.use-case.ts`
- [x] T034 [P] [US4] Implement `TransferBudgetFundsUseCase` for directional budget re-allocations (Salida $\leftrightarrow$ Salida, Entrada $\leftrightarrow$ Entrada) with source residual balance validation and audit logging in `backend/src/application/budgets/transfer-budget-funds.use-case.ts`
- [x] T035 [US4] Add `GET /api/budgets/control` and `POST /api/budgets/control/transfer` HTTP endpoints in `backend/src/infrastructure/controllers/budget.controller.ts`
- [x] T036 [P] [US4] Add API client methods for budget execution control dashboard and directional fund transfers in `frontend/src/services/api.ts`
- [x] T037 [P] [US4] Create budget transfer dialog component `BudgetTransferModal.tsx` (centered modal on desktop, Bottom Sheet drawer on mobile) with same-direction account filtering, source residual balance validation, and reason input in `frontend/src/components/budgets/BudgetTransferModal.tsx`
- [x] T038 [US4] Implement executive control dashboard page (`/budgets/control`) as an independent full-screen view with active period selector, 4-block executive summary, color-coded gauge bars (Green <75%, Yellow 75-99%, Red >=100%), and transfer action triggers in `frontend/src/app/budgets/control/page.tsx`
- [x] T039 [US4] Update main navigation sidebar in `frontend/src/components/Sidebar.tsx` and layout in `frontend/src/app/budgets/layout.tsx` to provide two separate, dedicated navigation entries: "Planificación Presupuestaria" (`/budgets/matrix`) and "Control de Ejecución" (`/budgets/control`)

**Checkpoint**: Executive monthly control dashboard and directional transfers operate independently.

---

## Phase 8: User Story 6 - Mobile Ergonomics & Micro-Interactions (Priority: P2)

**Goal**: Deliver tactile ergonomics on mobile: smooth currency input mask with thousands separator (`₲ 150.000`) without cursor jumping or focus loss, native numeric keypad (`inputmode="numeric"` and `pattern="[0-9]*"` for 0-decimal currencies like Guaraníes ₲), touch targets $\ge 44 \times 44\text{px}$, bottom sheets with safe area insets (`env(safe-area-inset-bottom)`), and auto-scrolling when software keyboard opens.

**Independent Test**: Tap an input field on a mobile device, verify native numeric keypad opens, type "150000", verify smooth formatting as "₲ 150.000" without cursor jumps, verify all buttons and touch areas are at least 44x44px, and verify drawers open with safe area padding.

### Implementation for User Story 6

- [x] T040 [P] [US6] Implement smooth numeric currency input mask hook `useCurrencyInput.ts` supporting real-time thousands formatting for Guaraníes (₲) without cursor leaping or character truncation in `frontend/src/hooks/useCurrencyInput.ts`
- [x] T041 [US6] Apply `useCurrencyInput` hook, `inputmode="numeric"`, `pattern="[0-9]*"`, and touch target sizing ($\ge 44 \times 44\text{px}$) across all mobile inputs in `frontend/src/components/budgets/BudgetAccountCard.tsx` and `frontend/src/components/budgets/BudgetDeepDiveDrawer.tsx`
- [x] T042 [US6] Add safe area insets (`env(safe-area-inset-bottom)`), backdrop dismissal gestures, and auto-scroll viewport adjustments on keyboard focus across all budget dialogs/drawers in `frontend/src/components/budgets/BudgetDeepDiveDrawer.tsx`, `frontend/src/components/budgets/AutofillModal.tsx`, `frontend/src/components/budgets/BudgetAccountModal.tsx`, and `frontend/src/components/budgets/BudgetTransferModal.tsx`

**Checkpoint**: All mobile touch interactions, numeric keypads, and bottom sheet drawers are ergonomic and accessible.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Static code quality verification, test suite execution, performance benchmarking, WCAG AA contrast verification, and walkthrough validation

- [x] T043 [P] Run static code quality analysis across shared, backend, and frontend monorepo packages to ensure 0 ESLint errors and 0 warnings (`npm run lint`), and verify WCAG AA color contrast compliance across Light and Dark themes
- [x] T044 Execute automated unit and integration test suites (`npm --prefix backend test` and `npm --prefix frontend test`), verify cell update response performance (<100ms) and spreadsheet grid navigation (60fps), and perform end-to-end walkthrough per `specs/017-budget-planning-ux/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - **User Story 1 (P1)**: Can start after Foundational (Phase 2)
  - **User Story 2 (P1)**: Can start after Foundational (Phase 2); connects to matrix state
  - **User Story 5 (P1)**: Can start after Foundational (Phase 2); integrates 4 blocks into desktop and mobile views
  - **User Story 3 (P2)**: Can start after Foundational (Phase 2); builds on matrix updates
  - **User Story 4 (P2)**: Can start after Foundational (Phase 2); operates on active period control
  - **User Story 6 (P2)**: Can start after Foundational (Phase 2); enhances mobile components
- **Polish (Phase 9)**: Depends on completion of all user story tasks

### User Story Dependencies

- **User Story 1 (P1)**: Independent after Phase 2 (Core 12-month spreadsheet grid & atomic persistence)
- **User Story 2 (P1)**: Independent after Phase 2 (Mobile Active Month view, Month Strip, Deep-Dive sheet)
- **User Story 5 (P1)**: Independent after Phase 2 (4 blocks, unified balance modal, net cash flow rollup)
- **User Story 3 (P2)**: Independent after Phase 2 (Distribution drivers & prior year actuals baseline)
- **User Story 4 (P2)**: Independent after Phase 2 (Executive monthly control dashboard & directional transfers)
- **User Story 6 (P2)**: Independent after Phase 2 (Mobile ergonomics, native keypad, currency mask)

### Parallel Opportunities

- **Phase 1**: `T001` and `T002` can run in parallel
- **Phase 2**: `T004` and `T005` can run in parallel
- **Phase 3 (US1)**: `T006` (tests), `T007` (get matrix), `T008` (update matrix), `T010` (API client), `T011` (desktop grid UI) can run in parallel
- **Phase 4 (US2)**: `T013` (media query hook), `T014` (month strip UI), `T015` (account card UI), `T016` (deep dive drawer), `T017` (sticky action bar) can run in parallel
- **Phase 5 (US5)**: `T020` (tests), `T021` (matrix 4-block use case), `T022` (balance modal UI) can run in parallel
- **Phase 6 (US3)**: `T025` (unit tests), `T026` (apply driver use case), `T027` (prior year actuals use case), `T029` (API client), `T030` (autofill modal UI) can run in parallel
- **Phase 7 (US4)**: `T032` (unit tests), `T033` (get control use case), `T034` (transfer use case), `T036` (API client), `T037` (transfer modal UI) can run in parallel
- **Phase 8 (US6)**: `T040` (currency input hook) can run in parallel
- **Phase 9**: `T043` can run in parallel with `T044`

---

## Parallel Example: User Story 1

```bash
# Launch test suite and backend use cases in parallel:
Task: "Create integration test suite for matrix endpoints and multi-period atomic batch update operations in backend/tests/integration/budget-matrix.spec.ts"
Task: "Implement GetBudgetMatrixUseCase to aggregate 12 monthly periods in backend/src/application/budgets/get-budget-matrix.use-case.ts"
Task: "Implement UpdateBudgetMatrixUseCase for atomic multi-period cell updates in backend/src/application/budgets/update-budget-matrix.use-case.ts"

# Launch UI grid component in parallel:
Task: "Refactor interactive desktop matrix spreadsheet component BudgetMatrixGrid.tsx in frontend/src/components/budgets/BudgetMatrixGrid.tsx"
```

---

## Parallel Example: User Story 2 (Mobile Adaptive Planning)

```bash
# Launch mobile sub-components in parallel:
Task: "Create responsive viewport detection hook useMediaQuery.ts in frontend/src/hooks/useMediaQuery.ts"
Task: "Create swipeable horizontal month selector strip component BudgetMonthStrip.tsx in frontend/src/components/budgets/BudgetMonthStrip.tsx"
Task: "Create touch-friendly mobile account card component BudgetAccountCard.tsx in frontend/src/components/budgets/BudgetAccountCard.tsx"
Task: "Create mobile Deep-Dive por Rubro Bottom Sheet component BudgetDeepDiveDrawer.tsx in frontend/src/components/budgets/BudgetDeepDiveDrawer.tsx"
Task: "Create mobile Sticky Bottom Action Bar component BudgetStickyActionBar.tsx in frontend/src/components/budgets/BudgetStickyActionBar.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 (Setup) and Phase 2 (Foundational - CRITICAL).
2. Complete Phase 3 (User Story 1 - Desktop 12-Month Matrix Inline Planning & Direct Cell Editing).
3. **STOP and VALIDATE**: Test `/budgets/matrix` inline grid editing, keyboard navigation, full-width layout, and total recalculations on desktop.
4. Deploy/demo if ready.

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test desktop matrix independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test mobile adaptive active month view & deep-dive bottom sheet independently
4. Add User Story 5 → Test 4 executive blocks, on-demand balance budgeting & net cash flow rollup
5. Add User Story 3 → Test smart distribution drivers & prior year actuals baseline
6. Add User Story 4 → Test executive monthly control dashboard & directional transfers
7. Add User Story 6 → Test mobile ergonomics, native numeric keypad, and fluid currency mask
8. Complete Polish → Zero ESLint errors/warnings & full test suite passing

---

## Notes

- All tasks follow strict `[ID] [P?] [Story] Description with exact file path` checklist format.
- Every user story is independently completable and testable.
- Zero magic strings, 100% Spanish UI labels, and WCAG AA contrast compliance strictly enforced.
