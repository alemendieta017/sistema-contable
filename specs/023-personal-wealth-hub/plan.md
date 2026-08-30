# Implementation Plan: Personal Wealth Hub & Continuous Financial Forecasting

**Branch**: `023-personal-wealth-hub` | **Date**: 2026-08-27 | **Spec**: [specs/023-personal-wealth-hub/spec.md](spec.md)

**Input**: Feature specification from `specs/023-personal-wealth-hub/spec.md` + Explicit user architectural instruction (complete elimination of `FiscalYear` and no backward compatibility required).

---

## Summary

Transform the accounting system into an integrated **Personal & Family Wealth OS (Centro de Comando Financiero Personal y Familiar)** with **complete elimination of `FiscalYear`**:

1. **Continuous Monthly Ledger & Auto-Provisioned Periods (`ensurePeriod`)**: Delete `FiscalYearEntity`, fiscal year closing logic, and year-end locking wizards. Associate `PeriodEntity` directly with `userId` and monthly calendar buckets (`YYYY-MM`). Eliminate corporate annual closing blocks and boundary errors through atomic on-demand auto-provisioning and chronological forward balance cascades (`AccountPeriodBalanceEntity`).
2. **Four-Quadrant Budget Matrix & Continuous Rolling Cash Flow**: Restructure budgeting into four core quadrants (`INGRESOS`, `EGRESOS`, `AHORRO_INVERSIONES`, `DEUDAS_FINANCIACION`), computing Operating Surplus, Net Cash Flow ($\Delta \text{Efectivo}$), and continuous roll-forward liquidity in a pure rolling window driven by `(startPeriod, months)` without `fiscalYearId`. Support dynamic month extension and negative liquidity alerts.
3. **Instant Financial Statements & Net Worth Evolution (<50ms p95)**: Expose sub-50ms queries for Balance General and historical Net Worth Evolution ($\sum \text{Assets} - \sum \text{Liabilities}$) directly from pre-aggregated balance snapshots without scanning raw journal transactions.
4. **Tactical Short-Term Commitments & Virtual Calendar (30–90 days)**: Introduce `RecurringScheduleEntity` to track recurring obligations (salaries, rents, utility bills, card due dates) with dynamic virtual calendar projections (zero ledger pollution) and one-click double-entry settlement.

---

## Technical Context

**Language/Version**: TypeScript 5.3+ / Node.js 20+

**Primary Dependencies**: Next.js 16+ / React 19 (Frontend), NestJS 11 (Backend), TypeORM 0.3+, TailwindCSS v4.3, lucide-react, Zod 3.23+

**Storage**: PostgreSQL (TypeORM with relational integrity, unique compound indexes on `[user_id, name]`, and `SERIALIZABLE` transactions for ledger consistency)

**Testing**: Jest (Backend unit & integration tests), Jest / React Testing Library (Frontend component tests), ESLint / Prettier static verification

**Target Platform**: Responsive Web (Desktop, Tablet, Mobile 320px+) + Node.js Backend API

**Project Type**: Full-stack Monorepo Web Application (`backend/`, `frontend/`, `shared/`)

**Performance Goals**:

- Balance General and Net Worth Evolution queries execute in $<50$ms p95 across 36+ monthly periods (SC-001)
- Auto-provisioning of missing monthly periods executed atomically in $<15$ms (SC-002)
- 100% mathematical consistency in rolling cash flow forecast: $\text{Closing Cash}(t) = \text{Opening Cash}(t) + \Delta \text{Efectivo}(t)$ (SC-003)

**Constraints**:

- Zero ledger balance discrepancy ($\sum \text{Debits} \equiv \sum \text{Credits}$) on all committed entries (Constitution Principle I)
- Zero `FiscalYear` legacy dependencies: complete clean break
- Zero ESLint errors, zero ESLint warnings, and zero unapproved disables across all workspaces (Constitution Principle VII)
- Zero arbitrary Tailwind brackets; strictly standard spacing, tokens, and tabular numbers (`tabular-nums`)

**Scale/Scope**: Core temporal layer (`periods/`, `balance-update`), budget matrix & forecast (`budgets/`), reports engine (`reports/`), tactical commitments (`recurring-schedules`), and modern rolling UI.

---

## Constitution Check

_GATE: Evaluated against `.specify/memory/constitution.md`. Must pass before implementation._

| Principle                                                   | Evaluation & Implementation Alignment                                                                                                                                                                                            | Status   |
| :---------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------- |
| **I. Double-Entry Bookkeeping & Ledger Integrity**          | All transactions strictly balance ($\sum \text{Debits} = \sum \text{Credits}$). Virtual commitments never pollute the general ledger until settled. Settlements create balanced double-entry journal entries.                    | **PASS** |
| **II. Clean Architecture & SOLID Principles**               | Complete elimination of legacy fiscal year layers; pure monthly domain model (`Period`), application use cases, and decoupled infrastructure adapters.                                                                           | **PASS** |
| **III. Monorepo Organization & Unified Type Safety**        | Single source of truth in `@sistema-contable/shared` for all schemas, enums (`BudgetMatrixSectionKey`, `CashFlowDirection`, `FlowIntention`), request/response contracts, and TypeScript interfaces. Zero `fiscalYearId` fields. | **PASS** |
| **IV. Budgetary Control and Personal/Family Domain**        | 4-quadrant budget matrix distinguishes operating surplus from capital investments and debt amortizations, calculating true household liquidity.                                                                                  | **PASS** |
| **V. Strict Test-Driven Development (TDD) & Quality**       | 100% test coverage mandatory on balance roll-forward cascade, cash flow forecast formulas, and auto-provisioning mechanics before completion.                                                                                    | **PASS** |
| **VI. Prevention of Magic Strings & Strict Type Constants** | Enums and typed constants used for all quadrant keys, schedule frequencies, flow types, transaction modes, and period formats.                                                                                                   | **PASS** |
| **VII. Mandatory ESLint Compliance & Static Code Quality**  | Zero ESLint warnings/errors and zero type errors enforced across shared, backend, and frontend packages (`npm run validate`).                                                                                                    | **PASS** |

---

## Project Structure

### Documentation (this feature)

```text
specs/023-personal-wealth-hub/
├── plan.md              # This file (/speckit-plan output)
├── research.md          # Phase 0 output: architectural research & math models (zero fiscal year)
├── data-model.md        # Phase 1 output: schemas, ERD, and state lifecycles
├── contracts/           # Phase 1 output: clean API and interface contracts
│   └── wealth-hub.contract.md
├── quickstart.md        # Phase 1 output: end-to-end runnable validation scenarios
└── tasks.md             # Phase 2 output (/speckit-tasks output)
```

### Source Code Modifications & Deletions

#### 1. Shared Package (`shared/src/index.ts`)

- **[MODIFY]** `BudgetMatrixResponse`, `MatrixCellUpdateSchema`, `UpdateBudgetMatrixRequestSchema`, `ApplyBudgetDriverRequestSchema`: Remove `fiscalYearId` and `fiscalYearName`.
- **[DELETE]** `CreateFiscalYearRequestSchema`, `CreateFiscalYearRequest`, `CloseFiscalYearRequestSchema`, `CloseFiscalYearRequest`.
- **[NEW]** `RollingBudgetMatrixResponse`, `RollingCashFlowSummary`, `EnsurePeriodRequestSchema`, `RecurringScheduleDto`, `CreateRecurringScheduleRequestSchema`, `SettleRecurringScheduleRequestSchema`, `NetWorthEvolutionResponse`.

#### 2. Backend Deletions (Eliminating Fiscal Years)

- **[DELETE]** `backend/src/infrastructure/database/entities/fiscal-year.entity.ts`
- **[DELETE]** `backend/src/application/periods/create-fiscal-year.use-case.ts`
- **[DELETE]** `backend/src/application/periods/close-fiscal-year.use-case.ts`
- **[DELETE]** `backend/src/infrastructure/controllers/dto/create-fiscal-year.dto.ts`

#### 3. Backend Source Code Layout

```text
backend/src/
├── domain/
│   ├── ledger/
│   │   ├── period.model.ts                # Monthly calendar period domain model
│   │   └── ledger.model.ts                # Balanced transaction and entry entities
│   └── commitments/
│       └── recurring-schedule.model.ts    # Tactical commitment rule domain model
├── application/
│   ├── periods/
│   │   ├── ensure-period.service.ts       # Atomic get-or-create monthly period & balance init
│   │   ├── balance-update.service.ts      # Forward cascade across continuous timeline (no fiscalYear join)
│   │   └── balance-sheet.use-case.ts      # Instant statement of financial position
│   ├── budgets/
│   │   ├── get-budget-matrix.use-case.ts  # Rolling 12-month 4-quadrant forecast & liquidity roll-forward
│   │   ├── update-budget-matrix.use-case.ts # Batch update without fiscalYearId
│   │   └── extend-budget-matrix.use-case.ts # Dynamic month extension & previous month duplication
│   ├── reports/
│   │   ├── net-worth-evolution.use-case.ts # High-speed time-series net worth aggregation (<50ms)
│   │   └── cash-flow-statement.use-case.ts# Real vs projected cash flow
│   └── commitments/
│       ├── create-recurring-schedule.use-case.ts # Create recurring commitment rule
│       ├── get-calendar-preview.use-case.ts      # Virtual 30-90 day projection engine
│       └── settle-recurring-schedule.use-case.ts # One-click double-entry ledger settlement
└── infrastructure/
    ├── database/entities/
    │   ├── period.entity.ts               # Direct userId ownership, unique [userId, name], NO fiscalYearId
    │   ├── account-period-balance.entity.ts # Snapshot cache entity
    │   ├── budget.entity.ts               # Budget container (1:1 with period)
    │   ├── budget-item.entity.ts          # Budget line item with 4-quadrant classification
    │   └── recurring-schedule.entity.ts   # Tactical recurring schedule entity
    └── controllers/
        ├── period.controller.ts           # /api/periods/ensure and user-scoped list (removed fiscal-years)
        ├── budget.controller.ts           # /api/budgets/matrix rolling query & /extend
        ├── reports.controller.ts          # /api/reports/net-worth-evolution
        └── recurring-schedule.controller.ts # CRUD, /calendar-preview, /settle
```

#### 4. Frontend Source Code Layout

```text
frontend/src/
├── services/
│   └── api.ts                             # Pure rolling methods, removed api.fiscalYears
├── components/
│   ├── budgets/
│   │   ├── BudgetMatrixGrid.tsx           # Continuous rolling matrix grid with 4-quadrant grouping
│   │   └── BudgetMobileView.tsx           # Continuous mobile matrix and executive view
│   ├── commitments/
│   │   ├── CommitmentCalendarPreview.tsx  # Tactical 30-90 day timeline with one-click settle
│   │   └── CommitmentModal.tsx            # Schedule creation and edit modal
│   └── NetWorthChart.tsx                  # Connected to high-speed backend time-series endpoint
├── app/
│   ├── budgets/
│   │   ├── matrix/page.tsx                # Removed fiscal year dropdown! Pure continuous rolling navigation
│   │   └── commitments/page.tsx           # Dedicated tactical commitments & calendar view
│   ├── reports/
│   │   └── forecast/page.tsx              # Clean rolling forecast without fiscal year selector
│   ├── periods/
│   │   └── page.tsx                       # Clean period status view without annual closing wizard
│   └── stats/
│       └── page.tsx                       # Consumes /api/reports/net-worth-evolution
```

---

## Complexity Tracking

> **No Constitution violations detected.** The complete elimination of `FiscalYear` dramatically reduces architectural complexity, removes dead code, and directly satisfies DDD boundaries.

| Item                                           | Why Needed                                                                                                       | Alternative Rejected Because                                                                                           |
| :--------------------------------------------- | :--------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------- |
| **Complete Elimination of `FiscalYearEntity`** | User confirmed application is in development; fiscal years add artificial corporate friction to personal finance | Preserving unused fiscal years creates technical debt, dead endpoints, and unnecessary database joins                  |
| **`AccountPeriodBalanceEntity` Snapshots**     | Sub-50ms Balance Sheet and Net Worth Evolution across 36+ periods                                                | Scanning raw journal entries on every query violates SC-001 ($<50$ms p95) as transactions scale                        |
| **Virtual Commitments Projection**             | Foreseeing 30–90 day cash pinches without polluting accounting books                                             | Writing scheduled future transactions into `journal_entries` violates double-entry immutability and reality principles |
