# Tasks: Accounting Dashboard and Core Modules

**Input**: Design documents from `/specs/002-accounting-dashboard/`

**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: Included for double-entry validation on the frontend, mapping to TDD principles in the constitution.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Route framework and basic styles coordination

- [x] T001 Initialize workspace route configuration in `frontend/src/app/layout.tsx`
- [x] T002 Configure global CSS variables for dark/light themes in `frontend/src/app/globals.css`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Context providers and API connections that must be complete before any UI views can function

- [x] T003 Setup theme context state machine in `frontend/src/lib/theme-context.tsx`
- [x] T004 Update API definitions in `frontend/src/services/api.ts` to support all dashboard-related endpoints

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Responsive Layout & Global Interface Elements (Priority: P1) 🎯 MVP

**Goal**: Establish the responsive shell structure containing the sidebar, header with global search, bottom navigation, and floating action button.

**Independent Test**: Navigate through `/transactions` on mobile (<768px) and desktop (>1024px) viewport widths to verify appropriate menu layout transitions.

### Implementation for User Story 1

- [x] T005 [P] [US1] Create responsive sidebar component in `frontend/src/components/Sidebar.tsx`
- [x] T006 [P] [US1] Create responsive bottom bar component in `frontend/src/components/BottomNav.tsx`
- [x] T007 [P] [US1] Create top header with global search bar in `frontend/src/components/Header.tsx`
- [x] T008 [P] [US1] Create floating action button in `frontend/src/components/FloatingActionButton.tsx`
- [x] T009 [US1] Integrate responsive layout container in `frontend/src/app/layout.tsx` using Sidebar and Header components
- [x] T010 [US1] Add auth validation check and redirect logic in `frontend/src/app/page.tsx`

**Checkpoint**: Shell visual framework is functional and ready for child pages.

---

## Phase 4: User Story 6 - Formulario de Asiento Contable Libre Multi-Item (Priority: P1)

**Goal**: Enter journal entries with an arbitrary number of debit/credit lines, validating balance before posting.

**Independent Test**: Click floating button, enter unbalanced items, verify saving is blocked. Enter balanced items, click save, verify transaction posts and details refresh in history.

### Tests for User Story 6
- [x] T011 [P] [US6] Create unit test in `frontend/src/tests/TransactionModal.test.tsx` verifying that saving fails if debits do not equal credits.

### Implementation for User Story 6

- [x] T012 [P] [US6] Create item entry row component in `frontend/src/components/JournalEntryRow.tsx`
- [x] T013 [US6] Create entry submission modal in `frontend/src/components/TransactionModal.tsx` managing dynamic array state and balance calculations
- [x] T014 [US6] Connect floating action button in `frontend/src/components/FloatingActionButton.tsx` to render the transaction creation modal

**Checkpoint**: Double-entry transaction creation is fully functional.

---

## Phase 5: User Story 2 - Historial de Transacciones Multimodal y Filtros (Priority: P1)

**Goal**: Visual history with Daily, Calendar, and Monthly views, filtered by date range and account/category.

**Independent Test**: View transactions under different views, filter by a specific category, and verify cards update.

### Implementation for User Story 2

- [x] T015 [P] [US2] Create global filters bar in `frontend/src/components/TransactionFilters.tsx`
- [x] T016 [P] [US2] Create daily list view component in `frontend/src/components/DailyView.tsx`
- [x] T017 [P] [US2] Create monthly overview list component in `frontend/src/components/MonthlyView.tsx`
- [x] T018 [P] [US2] Create monthly calendar grid component in `frontend/src/components/CalendarView.tsx`
- [x] T019 [US2] Build parent transactions controller page in `frontend/src/app/transactions/page.tsx` aggregating summary cards, range selection, and view states

**Checkpoint**: Transactions list page is complete with multi-view toggles and filters.

---

## Phase 6: User Story 3 - Visualización y Administración de Cuentas (Priority: P2)

**Goal**: Grouped lists of Assets and Liabilities, totals, and ABM options.

**Independent Test**: Access Cuentas page, verify Assets and Liabilities group sums match aggregates, add new account.

### Implementation for User Story 3

- [x] T020 [P] [US3] Create grouped accounts tables in `frontend/src/components/AccountsList.tsx`
- [x] T021 [P] [US3] Create account creator form modal in `frontend/src/components/AccountModal.tsx`
- [x] T022 [US3] Build accounts presentation page in `frontend/src/app/accounts/page.tsx`
- [x] T023 [US3] Build administration page for accounts in `frontend/src/app/accounts/manage/page.tsx`

**Checkpoint**: Accounts dashboard and ABM are functional.

---

## Phase 7: User Story 4 - Estadísticas Contables y Gráficos de Evolución (Priority: P2)

**Goal**: Interactive pie and line SVG charts reflecting financial progress.

**Independent Test**: Access Estadísticas page, verify pie charts show categories sorted descending, verify net worth line maps balances.

### Implementation for User Story 4

- [x] T024 [P] [US4] Create interactive pie distribution component in `frontend/src/components/PieChart.tsx` using SVG circle strokes
- [x] T025 [P] [US4] Create net worth line chart component in `frontend/src/components/NetWorthChart.tsx` using SVG bezier paths
- [x] T026 [P] [US4] Create income statement comparative chart in `frontend/src/components/IncomeStatementChart.tsx`
- [x] T027 [US4] Build statistics screen container in `frontend/src/app/stats/page.tsx`

**Checkpoint**: Statistics reporting module is operational.

---

## Phase 8: User Story 5 - Configuración de Preferencias y Perfil (Priority: P3)

**Goal**: Theme, currency configurations, and password updates.

**Independent Test**: Access settings, switch theme, verify design shifts color theme immediately.

### Implementation for User Story 5

- [x] T028 [P] [US5] Create theme toggle switch in `frontend/src/components/ThemeToggle.tsx`
- [x] T029 [P] [US5] Create security form section in `frontend/src/components/SecuritySettings.tsx`
- [x] T030 [P] [US5] Create multi-currency configuration panel in `frontend/src/components/CurrencySettings.tsx`
- [x] T031 [US5] Build configuration landing page in `frontend/src/app/settings/page.tsx`

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Final checkouts, documentation, and optimizations.

- [x] T032 Verify verification scenarios documented in `quickstart.md`
- [x] T033 Verify TypeScript clean builds and format constraints

---

## Dependencies & Execution Order

### Phase Dependencies

1. **Setup (Phase 1)** can start immediately.
2. **Foundational (Phase 2)** depends on Setup completion and blocks all user stories.
3. **User Stories (Phases 3 to 8)** depend on Foundational completion.
   - User Story 1 (P1) is the MVP and can be worked on first.
   - User Story 6 (P1) should follow US1 to enable data insertion.
   - User Story 2 (P1) follows to display the entered data.
   - User Stories 3, 4, and 5 can follow in priority order.
4. **Polish (Phase 9)** runs once all user stories are functionally complete.

### Parallel Opportunities

- Within Phase 3 (US1), tasks T005, T006, T007, and T008 can be developed in parallel since they create self-contained UI components.
- Within Phase 4 (US6), the unit test T011 and component T012 can run in parallel.
- Within Phase 5 (US2), sub-views T016, T017, T018, and filters T015 can be built in parallel.
- Within Phase 6 (US3), components T020 and T021 can run in parallel.
- Within Phase 7 (US4), charts T024, T025, and T026 can run in parallel.
- Within Phase 8 (US5), components T028, T029, and T030 can run in parallel.

---

## Parallel Example: User Story 1

```bash
# Developers A, B, and C can work on layout modules simultaneously:
Developer A: Build Sidebar.tsx (T005)
Developer B: Build BottomNav.tsx (T006)
Developer C: Build Header.tsx (T007)
```

---

## Implementation Strategy

### MVP First (User Story 1 & 6 Only)

1. Complete Setup and Foundational blocks (Phases 1 & 2).
2. Complete User Story 1 (Shell and Navigation).
3. Complete User Story 6 (Multi-Item floating form modal).
4. **STOP and VALIDATE**: Verify that the application renders correctly, the entry modal opens, and it blocks unbalanced entries.
5. Deploy/Demo the entry flow.
