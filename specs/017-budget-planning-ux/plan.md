# Implementation Plan: Budget Planning Matrix & Execution Control UX

**Branch**: `017-budget-planning-ux` | **Date**: 2026-08-13 | **Spec**: [spec.md](file:///C:/Users/amend/.gemini/antigravity/worktrees/sistema-contable/redesign_budget_planning_ux/specs/017-budget-planning-ux/spec.md)

**Input**: Feature specification from `/specs/017-budget-planning-ux/spec.md`

## Summary

This plan defines the technical implementation for redesigning the Budgeting Module into a unified 12-month Annual Matrix view (`/budgets/matrix`) and an Executive Monthly Control Dashboard (`/budgets/control`).

Key architectural highlights include:

1. **4 Executive Financial Blocks**: 🟢 Ingresos (P&L auto-loaded), 🔴 Gastos de Vida (P&L auto-loaded with collapsible category tree and dynamic read-only parent subtotals), 🔵 Ahorro e Inversiones (Balance Assets on-demand via `+ Presupuestar Activo`), and 🟣 Deudas y Financiación (Balance Liabilities on-demand via `+ Presupuestar Deuda`).
2. **Interactive Spreadsheet Grid**: Inline cell editing, keyboard navigation (`Tab`, `Enter`, `Esc`), clipboard multi-cell paste parsing, and mobile-first responsive design with sticky account column and horizontal touch scroll.
3. **Smart Distribution Drivers**: Prorrateo Anual plano, MoM % growth, Forward Fill (`Ctrl+D`), and deterministic baseline pre-population from prior year actuals using 1-year ISO date shifts (`shiftYear(date, -1)`).
4. **Execution Control & Available Residual Engine**: $\text{Available} = \text{Budgeted} - \text{Executed} - \text{Committed}$, mapped to double-entry debits/credits per flow direction, visual color-coded consumption gauge bars (Green <75%, Yellow 75-99%, Red >=100%), and directional inter-account budget transfers (Salida $\leftrightarrow$ Salida, Entrada $\leftrightarrow$ Entrada) with audit logging.
5. **Sticky Footer & Atomic Persistence**: Live calculation of Total Entradas (+), Total Salidas (-), Flujo Neto del Mes, and Flujo Neto Acumulado, persisted atomically via `[ 💾 Guardar Todo ]` with dirty state protection.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js v18+, NestJS v10, Next.js 14  
**Primary Dependencies**: TypeORM, NestJS, Zod, React 18, Lucide React, TailwindCSS v4.3, shadcn/ui  
**Storage**: PostgreSQL (TypeORM)  
**Testing**: Jest (Unit & Integration)  
**Target Platform**: Web application (Monorepo with NestJS backend + Next.js frontend + `@sistema-contable/shared` package)  
**Performance Goals**: <100ms cell update response time, 60fps spreadsheet grid keyboard navigation  
**Constraints**: Double-entry ledger integrity, clean architecture, zero magic strings, strict ESLint compliance (0 errors, 0 warnings), 100% Spanish UI labels, WCAG AA contrast compliance  
**Scale/Scope**: Multi-user financial management with 12 monthly periods per fiscal year across active chart of accounts

## Constitution Check

_GATE: Re-checked post-design. All gates PASSED._

- **I. Double-Entry Bookkeeping & Ledger Integrity**: PASSED. Budget planning and inter-account transfers do not modify posted journal entries directly; ledger records remain immutable. Baseline queries accurately aggregate posted entries via date ranges. Execution engine maps debits and credits strictly according to flow direction.
- **II. Clean Architecture & SOLID**: PASSED. Business logic is encapsulated in dedicated NestJS use cases (`GetBudgetMatrixUseCase`, `UpdateBudgetMatrixUseCase`, `ApplyBudgetDriverUseCase`, `GetPriorYearActualsUseCase`, `GetBudgetControlUseCase`, `TransferBudgetFundsUseCase`). Domain models, use cases, and controllers are strictly separated. Historical baseline queries use deterministic ISO date shifts and indexed date range queries (`tx.accounting_date >= startDate AND tx.accounting_date <= endDate`).
- **III. Monorepo Organization & Unified Type Safety**: PASSED. Shared DTOs, schemas, enums, and API contracts are centralized and exported from `@sistema-contable/shared`.
- **IV. Budgetary Control and Personal/Family Domain**: PASSED. Organizes budgets into 4 executive financial blocks (Ingresos, Gastos de Vida, Ahorro e Inversiones, Deudas y Financiación) with real-time available residual calculations and directional reallocations.
- **V. Strict Test-Driven Development (TDD)**: PASSED. Unit tests for driver math, cash flow rollup, execution control, and integration tests for matrix/control endpoints are defined in the plan and quickstart guide.
- **VI. Prevention of Magic Strings & Strict Type Constants**: PASSED. Section keys (`BudgetMatrixSectionKey`), driver types (`BudgetDriverType`), cash flow directions (`CashFlowDirection`), and gauge statuses (`BudgetGaugeStatus`) are defined as strict TypeScript enums/unions. Visual and accounting semantics are derived directly from the tuple `(account.type, cashFlowDirection)`.
- **VII. Mandatory ESLint Compliance**: PASSED. All code changes adhere to strict ESLint standards with zero errors and zero warnings.

## Project Structure

### Documentation (this feature)

```text
specs/017-budget-planning-ux/
├── spec.md              # Feature specification
├── plan.md              # Implementation plan (this file)
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 API contracts
│   └── budget-planning-api.md
└── tasks.md             # Phase 2 output (/speckit-tasks command)
```

### Source Code (repository root)

```text
shared/
└── src/
    └── index.ts                                 # Shared budget matrix & control schemas, DTO types, enums

backend/
├── src/
│   ├── domain/
│   │   └── budgets/
│   │       └── budget.model.ts                  # Budget Matrix, Driver, Reassignment domain interfaces
│   ├── application/
│   │   ├── budgets/
│   │   │   ├── get-budget-matrix.use-case.ts    # 12-month matrix fetch, 4-block & category tree aggregations
│   │   │   ├── update-budget-matrix.use-case.ts # Atomic multi-period cell updates across blocks
│   │   │   ├── apply-budget-driver.use-case.ts  # Driver transformation calculations
│   │   │   ├── get-prior-year-actuals.use-case.ts # Baseline historical transactions load via ISO date shift
│   │   │   ├── get-budget-control.use-case.ts   # Executive control dashboard & residual calculations
│   │   │   └── transfer-budget-funds.use-case.ts# Directional budget re-allocation with audit logging
│   │   └── reports/
│   │       └── cash-flow-statement.use-case.ts  # Net cash flow calculations based on cashFlowDirection
│   └── infrastructure/
│       ├── database/
│       │   └── entities/
│       │       ├── budget-item.entity.ts        # Extended with subRowId, subRowLabel, cashFlowDirection
│       │       └── budget-reassignment.entity.ts# Audit entity for budget transfers
│       └── controllers/
│           └── budget.controller.ts             # Matrix & Control HTTP endpoints
└── tests/
    ├── unit/
    │   ├── budget-drivers.spec.ts               # Unit tests for drivers & distribution math
    │   └── budget-control.spec.ts               # Unit tests for execution metrics & directional transfer validation
    └── integration/
        └── budget-matrix.spec.ts                # Integration tests for matrix API & transfers

frontend/
└── src/
    ├── app/
    │   └── budgets/
    │       ├── layout.tsx                       # Shared layout with Top View Switcher (Matrix vs Control)
    │       ├── page.tsx                         # Redirect to /budgets/matrix
    │       ├── matrix/
    │       │   └── page.tsx                     # 12-month Annual Matrix Grid & Driver UI
    │       └── control/
    │           └── page.tsx                     # Executive Monthly Control Dashboard & Gauges
    ├── components/
    │   └── budgets/
    │       ├── BudgetMatrixGrid.tsx             # Interactive 4-block matrix grid with keyboard, paste & sticky columns
    │       ├── AddBalanceBudgetModal.tsx        # Modal for on-demand Asset/Liability movement budgeting
    │       ├── DriverActionModal.tsx            # Smart distribution driver modal dialog
    │       └── BudgetTransferModal.tsx          # Directional re-allocation transfer modal
    └── services/
        └── api.ts                               # API client methods for budget matrix & control
```

**Structure Decision**: Monorepo with shared type safety (`shared`), NestJS backend (`backend`), and Next.js frontend (`frontend`).

## Complexity Tracking

_No violations. Clean Architecture, Monorepo guidelines, and constitutional principles strictly maintained._
