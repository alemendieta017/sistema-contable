# Implementation Plan: Accounting Balances and Period Tracking Engine

**Branch**: `011-accounting-balances-tracking` | **Date**: 2026-07-02 | **Spec**: [spec.md](file:///Users/ale/dev/sistema-contable/specs/011-accounting-balances-tracking/spec.md)

**Input**: Feature specification from `/specs/011-accounting-balances-tracking/spec.md`

---

This feature extends the system core to implement ERP-style accounting periods and real-time ledger aggregates. It introduces `Fiscal Years` (spanning a calendar year, created by simply selecting the target year), monthly `Periods` that serve as query performance aggregates (`Account Period Balances`) to cache debits, credits, and opening/closing balances in real-time. This eliminates expensive table scans when fetching reports, keeping response times under 10ms.

Transaction locking is validated against the Fiscal Year and Period status. The user manages closing and opening of monthly periods via toggle switches in the 'Gestión de Periodos' / 'Configuración Financiera' screen, as well as closing at the Fiscal Year level. Reopening a past period and modifying a transaction triggers a forward cascade recalculation automatically, blocking the UI with an 'Actualizando saldos históricos...' loading screen to guarantee data integrity. Additionally, the Balance Sheet supports time-filtering (As of Date, By Period, and Comparative with 2-3 custom periods side-by-side).

---


## Technical Context

- **Language/Version**: TypeScript / Node.js
- **Primary Dependencies**: NestJS v11, Next.js, TypeORM, Zod, TailwindCSS, Lucide React
- **Storage**: PostgreSQL (via TypeORM)
- **Testing**: Jest, NestJS testing modules
- **Target Platform**: Desktop & Mobile Web
- **Project Type**: Full-stack Monorepo (Next.js + NestJS + Shared package)

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Principle I: Double-Entry Bookkeeping & Ledger Integrity**: The year-end closing entry balances temporary accounts exactly to zero, and records the net profit/loss to the Retained Earnings account in a single transaction, preserving double-entry integrity.
- **Principle II: Clean Architecture & SOLID**: Modifying business logic is strictly separated into use-case classes: `CreateFiscalYearUseCase` [NEW], `CloseFiscalYearUseCase` [NEW], `UpdatePeriodUseCase` [NEW], `ReconstructBalancesUseCase` [NEW], `BalanceSheetUseCase` [NEW], and `IncomeStatementUseCase` [NEW]. The domain models contain no database-specific imports.
- **Principle III: Monorepo Organization & Unified Type Safety**: Shared validation schemas are centralized under `shared/src/index.ts`. Both frontend and backend compile against the unified shared schemas.
- **Principle V: Test-Driven Development (TDD) & Quality Verification**: Integration and unit tests are written for all period logic, transaction locking gates, and roll-forward propagation. ESLint and Prettier are run and passed.
- **Principle VI: Prevention of Magic Strings**: Action types and constants (e.g. status fields `'OPEN' | 'CLOSED'`) use TypeScript enums or read-only constants.

---

## Project Structure

### Documentation (this feature)

```text
specs/011-accounting-balances-tracking/
├── plan.md              # This file
├── research.md          # Domain formulas, roll-forward propagation logic, and closing flows
├── data-model.md        # Database schema diagrams and entity details
├── quickstart.md        # Step-by-step verification flows
└── contracts/
    └── periods-api.md   # API endpoints contract (GET, POST, PATCH)
```

### Source Code

```text
shared/
└── src/
    └── index.ts          # Modify: Export validation schemas and types for Fiscal Years and Periods

backend/
├── src/
│   ├── domain/
│   │   └── ledger/
│   │       └── period.model.ts                  # [NEW] Domain models for FiscalYear, Period, and Balance
│   ├── application/
│   │   ├── periods/
│   │   │   ├── create-fiscal-year.use-case.ts    # [NEW] Create fiscal year + 12 monthly periods
│   │   │   ├── update-period.use-case.ts         # [NEW] Open/Close a monthly period
│   │   │   ├── close-fiscal-year.use-case.ts     # [NEW] Generate year-end closing entry
│   │   │   ├── reconstruct-balances.use-case.ts  # [NEW] Recalculate balances table from journal lines
│   │   │   ├── balance-sheet.use-case.ts         # [NEW] Fast Balance Sheet report
│   │   │   └── income-statement.use-case.ts      # [NEW] Fast Income Statement report
│   │   └── ledger/
│   │       ├── create-transaction.use-case.ts    # Modify: Add period lock checks + balance update
│   │       ├── update-transaction.use-case.ts    # Modify: Add period lock checks + balance update
│   │       ├── delete-transaction.use-case.ts    # Modify: Add period lock checks + balance update
│   │       └── reverse-transaction.use-case.ts   # Modify: Add period lock checks + balance update
│   ├── infrastructure/
│   │   ├── database/
│   │   │   ├── database.module.ts                # Modify: Register new entities
│   │   │   └── entities/
│   │   │       ├── fiscal-year.entity.ts         # [NEW] FiscalYear TypeORM Entity
│   │   │       ├── period.entity.ts              # [NEW] Period TypeORM Entity
│   │   │       └── account-period-balance.entity.ts # [NEW] AccountPeriodBalance TypeORM Entity
│   │   └── controllers/
│   │       ├── period.controller.ts              # [NEW] Fiscal year and period REST routes
│   │       └── reports.controller.ts             # Modify: Add balance-sheet and income-statement endpoints
└── tests/
    └── integration/
        ├── periods-locking.spec.ts               # [NEW] Tests for period locks on transactions
        ├── balance-propagation.spec.ts           # [NEW] Tests for real-time aggregation & roll-forward
        └── annual-closing.spec.ts                # [NEW] Tests for the annual closing transaction

frontend/
├── src/
│   ├── app/
│   │   ├── periods/
│   │   │   └── page.tsx                          # [NEW] Period and Fiscal Year Management Screen
│   │   ├── reports/
│   │   │   ├── balance-sheet/
│   │   │   │   └── page.tsx                      # [NEW] Balance Sheet UI
│   │   │   └── income-statement/
│   │   │       └── page.tsx                      # [NEW] Income Statement UI
│   │   └── settings/
│   │       └── page.tsx                          # Modify: Add link/section to period management
│   ├── components/
│   │   └── Sidebar.tsx                           # Modify: Add links to reports and periods settings
│   └── services/
│       └── api.ts                                # Modify: Add period/report API wrappers
```

**Structure Decision**: Monorepo structure, modifying both backend and frontend layers to deliver high-performance reporting and period-locking controls.

---

## User Review Required

> [!IMPORTANT]
> **Retroactive Period Validation**: Once accounting periods are active, all transactions MUST reside within a valid, open period. Any transaction recorded before creating a Fiscal Year will need to be associated with a newly created Fiscal Year.
>
> **Period Locks**: Users will not be allowed to edit, delete, or post transactions inside closed periods. Any adjustments must be done by reopening the period, or posting a reversal transaction in a currently open period.

---

## Open Questions

- **Reconstruction Trigger**: Should the reconstruction of period balances be automated during application bootstrap, database migrations, or triggered strictly on demand?
  - *Decision*: We will implement a REST endpoint for manual on-demand reconstruction, and automatically trigger reconstruction upon restoring a database backup to guarantee sync.
- **Comparative Period Selection**: How does the user select comparative periods in the Balance Sheet?
  - *Decision*: The user manually selects 2 or 3 arbitrary periods from dropdowns (Option A).
- **Cascade Recalculation Trigger & UI Lock**: How does the system handle cascade recalculations and UI responsiveness when a past period is modified?
  - *Decision*: The recalculation triggers automatically on transaction save, blocking the UI with an "Actualizando saldos históricos..." loading overlay to prevent race conditions and guarantee data integrity (Option A).

---

## Proposed Changes

### Centralized Shared Layers

#### [MODIFY] [shared/src/index.ts](file:///Users/ale/dev/sistema-contable/shared/src/index.ts)
- Define and export validation schemas:
  - `CreateFiscalYearRequestSchema`
  - `CloseFiscalYearRequestSchema`
  - `UpdatePeriodRequestSchema`

### Backend Component Layer

#### [NEW] [fiscal-year.entity.ts](file:///Users/ale/dev/sistema-contable/backend/src/infrastructure/database/entities/fiscal-year.entity.ts)
- TypeORM entity representing `fiscal_years`.

#### [NEW] [period.entity.ts](file:///Users/ale/dev/sistema-contable/backend/src/infrastructure/database/entities/period.entity.ts)
- TypeORM entity representing `periods`.

#### [NEW] [account-period-balance.entity.ts](file:///Users/ale/dev/sistema-contable/backend/src/infrastructure/database/entities/account-period-balance.entity.ts)
- TypeORM entity representing `account_period_balances`.

#### [NEW] [period.model.ts](file:///Users/ale/dev/sistema-contable/backend/src/domain/ledger/period.model.ts)
- Pure domain logic classes representing `FiscalYear`, `Period`, and `AccountPeriodBalance`.

#### [NEW] [create-fiscal-year.use-case.ts](file:///Users/ale/dev/sistema-contable/backend/src/application/periods/create-fiscal-year.use-case.ts)
- Creates a new `FiscalYearEntity` using the specified calendar year.
- Automatically sets the name to `"Ejercicio {year}"` and the dates from January 1st to December 31st of that year, converted to UTC using the user's local timezone offset.
- Automatically generates 12 monthly periods nested within that fiscal year, similarly aligned with the user's timezone offset.


#### [NEW] [update-period.use-case.ts](file:///Users/ale/dev/sistema-contable/backend/src/application/periods/update-period.use-case.ts)
- Opens or closes a monthly period. Exposes a PATCH endpoint to toggle status.
- If a period is reopened, triggers a recalculation and roll-forward propagation of balances.

#### [NEW] [close-fiscal-year.use-case.ts](file:///Users/ale/dev/sistema-contable/backend/src/application/periods/close-fiscal-year.use-case.ts)
- Validates that the fiscal year is open.
- Automatically marks all 12 monthly periods nested in the fiscal year as CLOSED.
- Identifies temporary accounts with non-zero closing balances.
- Generates and posts a closing journal entry, crediting/debiting temporary accounts to zero and posting the net profit/loss to Retained Earnings.
- Marks the fiscal year as closed.
- Rolls forward opening balances to the next fiscal year.

#### [NEW] [reconstruct-balances.use-case.ts](file:///Users/ale/dev/sistema-contable/backend/src/application/periods/reconstruct-balances.use-case.ts)
- Wipes `account_period_balances`.
- Traverses all posted transactions chronologically and reconstructs all balances in order.

#### [NEW] [balance-sheet.use-case.ts](file:///Users/ale/dev/sistema-contable/backend/src/application/periods/balance-sheet.use-case.ts)
- Queries `account_period_balances` supporting three modes:
  - **By Period**: Direct fetch of the selected period's balances.
  - **As of Date**: Calculates running balances up to the specified date by scanning or aggregating.
  - **Comparative**: Returns side-by-side columns comparing 2 or 3 custom periods.
- Dynamically calculates the cumulative net income (Income minus Expense) for the current fiscal year up to the queried period, appending it as a virtual Equity account "Resultado del Ejercicio" so that the balance sheet balances.
- Computes totals and returns formatted report under 10ms.


#### [NEW] [income-statement.use-case.ts](file:///Users/ale/dev/sistema-contable/backend/src/application/periods/income-statement.use-case.ts)
- Queries `account_period_balances` for the selected period to fetch Income and Expenses.
- Computes net profit/loss and returns formatted report.

#### [NEW] [period.controller.ts](file:///Users/ale/dev/sistema-contable/backend/src/infrastructure/controllers/period.controller.ts)
- Exposes `GET /api/fiscal-years`, `POST /api/fiscal-years`, `POST /api/fiscal-years/:id/close`.
- Exposes `GET /api/periods`, `PATCH /api/periods/:id`.

#### [MODIFY] [reports.controller.ts](file:///Users/ale/dev/sistema-contable/backend/src/infrastructure/controllers/reports.controller.ts)
- Register `balance-sheet` and `income-statement` GET routes.
- Register `reconstruct-balances` POST route.

#### [MODIFY] [create-transaction.use-case.ts](file:///Users/ale/dev/sistema-contable/backend/src/application/ledger/create-transaction.use-case.ts)
- Add period checks (block if date is inside a closed period).
- In the transaction save callback, update `account_period_balances` and propagate roll-forward.

#### [MODIFY] [update-transaction.use-case.ts](file:///Users/ale/dev/sistema-contable/backend/src/application/ledger/update-transaction.use-case.ts)
- Check period locks for the transaction's old date AND new date.
- Recalculate and roll-forward balances for old accounts/periods and new accounts/periods.

#### [MODIFY] [delete-transaction.use-case.ts](file:///Users/ale/dev/sistema-contable/backend/src/application/ledger/delete-transaction.use-case.ts)
- Check period lock for transaction date.
- Recalculate and roll-forward balances upon deletion.

#### [MODIFY] [reverse-transaction.use-case.ts](file:///Users/ale/dev/sistema-contable/backend/src/application/ledger/reverse-transaction.use-case.ts)
- Ensure the reversal transaction falls within an open period.
- Update balances and roll forward.

### Frontend Component Layer

#### [MODIFY] [api.ts](file:///Users/ale/dev/sistema-contable/frontend/src/services/api.ts)
- Implement REST API calls for periods, fiscal years, reports (balance sheet, income statement), and reconstruct balances.

#### [MODIFY] [page.tsx](file:///Users/ale/dev/sistema-contable/frontend/src/app/settings/page.tsx)
- Add a panel linked to `/periods` to configure Fiscal Years and Monthly Periods.

#### [NEW] [page.tsx](file:///Users/ale/dev/sistema-contable/frontend/src/app/periods/page.tsx)
- Premium "Fiscal Years / Locks" (Configuración Financiera o Gestión de Periodos) page.
- Lists open/closed Fiscal Years. Expanding a year displays 12 monthly periods.
- Each period features a switch toggle [ Abierto / Cerrado ] to lock or unlock ledger modifications.
- Triggers automatic background recalculation if reopened, showing a blocking loading overlay "Actualizando saldos históricos..." in the UI.

#### [NEW] [page.tsx](file:///Users/ale/dev/sistema-contable/frontend/src/app/reports/balance-sheet/page.tsx)
- Real-time Balance Sheet reporting page.
- Header bar filters:
  - **Selector de Modo**: "A la fecha" (As of Date picker), "Por Periodo" (Period dropdown loading from `account_period_balances`), and "Comparativo" (manually select 2 or 3 periods side-by-side).
  - **Nivel de Cuenta (Profundidad)**: Dropdown or slider (Level 1 to 4) to expand/collapse account tree structure.
- Shows a blocking loading overlay "Actualizando saldos históricos..." during background recalculations.

#### [NEW] [page.tsx](file:///Users/ale/dev/sistema-contable/frontend/src/app/reports/income-statement/page.tsx)
- Real-time Income Statement reporting page using period aggregates.

#### [MODIFY] [Sidebar.tsx](file:///Users/ale/dev/sistema-contable/frontend/src/components/Sidebar.tsx)
- Add links to Balance Sheet and Income Statement.

---

## Verification Plan

### Automated Tests
- Create integration test files under `backend/tests/integration/`:
  - `periods-locking.spec.ts`
  - `balance-propagation.spec.ts`
  - `annual-closing.spec.ts`
- Execute test command:
  ```bash
  [ -s "$HOME/.nvm/nvm.sh" ] && \. "$HOME/.nvm/nvm.sh" && npm run test --workspace=backend
  ```

### Manual Verification
- Walk through verification flows in [quickstart.md](file:///Users/ale/dev/sistema-contable/specs/011-accounting-balances-tracking/quickstart.md) (Fiscal Year creation, Period locking, Aggregate balance tracking, Roll-forward propagation, and Annual Close procedure).
