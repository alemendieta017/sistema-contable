# Tasks: Web Accounting App (Sistema Contable)

**Input**: Design documents from `/specs/001-accounting-webapp/`

**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: TDD is strictly required by the project constitution. For each user story, test tasks are defined and must be implemented to fail before writing the corresponding production code.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

---

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project monorepo initialization and container configuration

- [x] T001 Initialize root workspaces package.json and base tsconfig.json in package.json
- [x] T002 Initialize shared TypeScript contracts package in shared/package.json
- [x] T003 Initialize Next.js app with Tailwind CSS v4 in frontend/package.json
- [x] T004 Initialize NestJS app in backend/package.json
- [x] T005 [P] Setup eslint, prettier, and basic code formatting in package.json

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core framework infrastructure and Docker environment configuration

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T006 Configure Dockerfile.dev for backend, frontend, and shared workspace in backend/Dockerfile.dev
- [x] T007 Configure docker-compose.yml with volume mounts for hot reload in docker-compose.yml
- [x] T008 Configure TypeORM PostgreSQL connection and transaction configuration in backend/src/infrastructure/database/database.module.ts
- [x] T009 [P] Implement user database model, entity schema, and JWT auth framework in backend/src/infrastructure/auth/auth.module.ts
- [x] T010 [P] Setup shadcn/ui configuration and Tailwind CSS v4 custom theme in frontend/components.json

**Checkpoint**: Foundation ready - Docker environment starts successfully and database connection is online.

---

## Phase 3: User Story 1 - Registro de Transacciones Básicas (Priority: P1) 🎯 MVP

**Goal**: Support basic double-entry records (Income, Expense, Transfer) with simplified entry forms, validating credit/debit squaring in base currency.

**Independent Test**: Register an expense of $50,000 to Cash and confirm that cash balance decreases and expense category increases, with a balanced ledger write.

### Tests for User Story 1
> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**
- [x] T011 [P] [US1] Write integration tests for double-entry balance check (FR-002) in backend/tests/integration/ledger-validation.spec.ts
- [x] T012 [P] [US1] Write contract tests for transaction and account creation endpoints in backend/tests/contract/ledger.spec.ts

### Implementation for User Story 1
- [x] T013 [P] [US1] Create Account, Transaction, and JournalEntry database entities in backend/src/infrastructure/database/entities/
- [x] T014 [P] [US1] Implement Ledger domain model and repository interfaces in backend/src/domain/ledger/
- [x] T015 [US1] Implement CreateTransaction use case enforcing double-entry validation (FR-001, FR-002) and serializable locks in backend/src/application/ledger/create-transaction.use-case.ts
- [x] T016 [US1] Implement ledger and account controllers exposing REST endpoints in backend/src/infrastructure/controllers/
- [x] T017 [P] [US1] Implement Zod schemas and TypeScript models for ledger endpoints in shared/src/ledger/
- [x] T018 [P] [US1] Build mobile-first pages for register and transaction creation (income, expense, transfer forms) in frontend/src/app/transactions/
- [x] T019 [US1] Implement API client services for authentication and ledger operations in frontend/src/services/api.ts

**Checkpoint**: User Story 1 MVP is fully testable and operational.

---

## Phase 4: User Story 2 - Asientos Contables Multi-Item (Priority: P1)

**Goal**: Support arbitrary, multi-item debit/credit transactions (split entries) through an advanced seat editor.

**Independent Test**: Register a split entry debiting "Comida" ($70k) and "Ropa" ($30k), crediting "Tarjeta" ($100k) and verify it balances.

### Tests for User Story 2
- [x] T020 [P] [US2] Write integration tests verifying multi-item transaction posting and rejection of unbalanced split entries in backend/tests/integration/multi-item-validation.spec.ts

### Implementation for User Story 2
- [x] T021 [US2] Extend CreateTransaction use case and REST endpoints to accept arbitrary journal entry lists in backend/src/application/ledger/create-transaction.use-case.ts
- [x] T022 [P] [US2] Build advanced seat editor dynamic form (Asiento Libre) showing live balancing summary on screen in frontend/src/app/transactions/asiento-libre/page.tsx

**Checkpoint**: Multi-item split transaction creation works and rejects unbalanced entries.

---

## Phase 5: User Story 3 - Visualización de Saldos, Cuentas y Patrimonio Neto (Priority: P2)

**Goal**: Display account balances grouped by group and show the live Net Worth (Patrimonio Neto).

**Independent Test**: Verify that accounts page displays asset groups, liability groups, and net worth = assets - liabilities.

### Tests for User Story 3
- [x] T023 [P] [US3] Write integration tests for account balance aggregation and net worth summaries in backend/tests/integration/balance-calculation.spec.ts

### Implementation for User Story 3
- [x] T024 [US3] Implement GetAccountsSummary usecase returning balances grouped by accounts (Activos/Pasivos) in backend/src/application/accounts/get-accounts-summary.use-case.ts
- [x] T025 [US3] Implement GET /api/accounts/summary endpoint in backend/src/infrastructure/controllers/account.controller.ts
- [x] T026 [P] [US3] Build accounts dashboard listing assets, credit card cycles, and net worth gauges in frontend/src/app/accounts/page.tsx

**Checkpoint**: User Net Worth and account details can be queried and displayed.

---

## Phase 6: User Story 4 - Control y Seguimiento de Presupuestos (Priority: P2)

**Goal**: Track monthly budget limits per category and subcategory with default fallbacks.

**Independent Test**: Configure a budget of $500,000 for comida, post a transaction of $200,000, and verify budget reflects 40% consumption.

### Tests for User Story 4
- [x] T027 [P] [US4] Write integration tests for budget spent-amount calculation and default recurrence checks in backend/tests/integration/budget-tracking.spec.ts

### Implementation for User Story 4
- [x] T028 [P] [US4] Create Budget and BudgetAmount database entities in backend/src/infrastructure/database/entities/
- [x] T029 [P] [US4] Implement Budget domain model and use cases in backend/src/domain/budgets/
- [x] T030 [US4] Implement GetBudgetsSummary use case aggregating expenses against budget thresholds in backend/src/application/budgets/get-budgets-summary.use-case.ts
- [x] T031 [P] [US4] Build budget monitoring interface with spent progress bars and override limit forms in frontend/src/app/budgets/page.tsx

**Checkpoint**: Category spending is matched against limits, showing visual alerts for exceeded budgets.

---

## Phase 7: User Story 5 - Estadísticas y Gráficos de Distribución (Priority: P3)

**Goal**: Show statistics charts (pie/bar) of category distributions for income and expenses.

**Independent Test**: Verify statistic view represents proportional category amounts matching actual transactions.

### Implementation for User Story 5
- [x] T032 [US5] Implement category percentage statistics API endpoint in backend/src/infrastructure/controllers/reports.controller.ts
- [x] T033 [P] [US5] Build statistics dashboard incorporating charts for category allocations in frontend/src/app/stats/page.tsx

**Checkpoint**: Category charts are populated with transaction distribution data.

---

## Phase 8: User Story 6 - Exportación a Excel y Respaldos (Priority: P3)

**Goal**: Export transaction data to Excel matching the RealByte columns formatting and support DB backups.

**Independent Test**: Trigger Excel export and verify download file headers match `Fecha`, `Cuenta`, `Categoría`, `Subcategorías`, `Nota`, `PYG`, `Ingreso/Gasto`, `Descripción`, `Importe`, `Moneda`.

### Implementation for User Story 6
- [x] T034 [US6] Implement Excel generation stream service using Excel libraries in backend/src/application/reports/export-excel.service.ts
- [x] T035 [US6] Implement JSON database dump and import services in backend/src/application/backup/backup.service.ts
- [x] T036 [P] [US6] Build settings page with database backup upload and Excel download links in frontend/src/app/settings/page.tsx

**Checkpoint**: User data can be extracted as Excel sheets or exported/imported as database backups.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: General E2E testing, security hardening, and code audit

- [x] T037 [P] Create full user journey automated E2E tests using Playwright in frontend/tests/e2e/workflow.spec.ts
- [x] T038 [P] Audit TypeScript types across shared, backend, and frontend workspaces to resolve warnings
- [x] T039 Run quickstart.md validation script and document outcomes in walkthrough.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - starts immediately.
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories.
- **User Stories (Phase 3+)**: All depend on Foundational phase completion.
  - User Story 1 (P1 - MVP) is independent.
  - User Story 2 (P1) can start after US1 models are created; adds advanced entry support.
  - User Story 3 (P2) can start after US1 models are created; adds balance views.
  - User Story 4 (P2) can start after US1 models are created; adds budget tables.
  - User Story 5 (P3) depends on US1/US3 data.
  - User Story 6 (P3) depends on US1.
- **Polish (Phase 9)**: Depends on all user stories being completed.

### Parallel Opportunities

- All setup tasks (T001-T005) can run in parallel.
- Database, Auth, and Frontend setup (T008, T009, T010) in Phase 2 can run in parallel.
- Once Foundation completes, Developers A, B, and C can work on User Story 1, 2, and 4 in parallel.
- Inside any User Story phase, tests (T011, T012) can be written in parallel.

---

## Parallel Example: User Story 1

```bash
# Developer A starts tests:
Task: "Write integration tests for double-entry balance check (FR-002) in backend/tests/integration/ledger-validation.spec.ts"

# Developer B writes shared schema types:
Task: "Implement Zod schemas and TypeScript models for ledger endpoints in shared/src/ledger/"

# Developer C builds front-end templates:
Task: "Build mobile-first pages for register and transaction creation (income, expense, transfer forms) in frontend/src/app/transactions/"
```

---

## Implementation Strategy

### MVP First (User Story 1 & 2 Only)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational (CRITICAL).
3. Complete Phase 3: User Story 1 (Basic double entry).
4. Complete Phase 4: User Story 2 (Multi-item entries).
5. **STOP and VALIDATE**: Execute integration tests and manual check of balancing.

### Incremental Delivery

1. Setup + Foundational → Project scaffolding runs.
2. User Story 1 + 2 → Double entry engine MVP.
3. User Story 3 → Financial Accounts and Net Worth visibility.
4. User Story 4 → Budgets.
5. User Story 5 → Analytics charts.
6. User Story 6 → Data export and backup tool.

---

## Phase 10: Convergence

- [x] T040 Implement transaction reversal usecase, backend endpoint, and frontend UI button per FR-005 (partial)
- [x] T041 Implement budget default recurrence (period 0) fallback logic and UI config per FR-007 (missing)
- [x] T042 Implement currency selection in account form and exchange rate update API/UI per FR-008 (partial)
- [x] T043 Add support for hierarchical subcategories in forms, lists, and selectors per FR-009 (partial)
- [x] T044 Implement soft-delete/logical deactivation of accounts in API and frontend UI per Edge Cases (missing)
