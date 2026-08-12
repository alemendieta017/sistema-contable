# Implementation Plan: Budget Planning Matrix & Execution Control UX

**Branch**: `017-budget-planning-ux` | **Date**: 2026-08-12 | **Spec**: [spec.md](file:///C:/Users/amend/.gemini/antigravity/worktrees/sistema-contable/redesign_budget_planning_ux/specs/017-budget-planning-ux/spec.md)

**Input**: Feature specification from `/specs/017-budget-planning-ux/spec.md`

## Summary

This plan defines the technical implementation for redesigning the Budgeting Module into a unified 12-month Annual Matrix view (`/budgets/matrix`) with inline cell editing, spreadsheet keyboard navigation (`Tab`, `Enter`, `Esc`), external paste support, smart distribution drivers (Prorrateo Anual, MoM %, Forward Fill, Traer Real del Año Anterior), and an Executive Monthly Control Dashboard (`/budgets/control`) featuring real-time available residual balance calculation ($\text{Available} = \text{Budgeted} - \text{Executed} - \text{Committed}$), visual color-coded consumption gauge bars (Green <75%, Yellow 75-99%, Red >=100%), and inter-account budget re-allocation controls with audit tracking.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js v18+, NestJS v10, Next.js 14  
**Primary Dependencies**: TypeORM, NestJS, Zod, React 18, Lucide React, TailwindCSS v4.3  
**Storage**: PostgreSQL (TypeORM)  
**Testing**: Jest (Unit & Integration)  
**Target Platform**: Web application (Monorepo with NestJS backend + Next.js frontend + `@sistema-contable/shared` package)  
**Performance Goals**: <100ms cell update response time, 60fps spreadsheet grid keyboard navigation  
**Constraints**: Double-entry ledger integrity, clean architecture, zero magic strings, strict ESLint compliance (0 errors, 0 warnings)  
**Scale/Scope**: Multi-user financial management with 12 monthly periods per fiscal year across active chart of accounts

## Constitution Check

_GATE: Re-checked post-design. All gates PASSED._

- **I. Double-Entry Bookkeeping & Ledger Integrity**: PASSED. Budget planning and inter-account transfers do not modify posted journal entries directly; ledger integrity is preserved. Baseline queries read posted entries accurately.
- **II. Clean Architecture & SOLID**: PASSED. Application logic encapsulated in dedicated NestJS use cases (`GetBudgetMatrixUseCase`, `UpdateBudgetMatrixUseCase`, `ApplyBudgetDriverUseCase`, `GetPriorYearActualsUseCase`, `TransferBudgetFundsUseCase`); domain models and controllers strictly separated. Historical prior year actuals use deterministic ISO date shifting (`shiftYear(date, -1)`) and B-Tree indexed PostgreSQL date range queries (`tx.accounting_date >= startDate AND tx.accounting_date <= endDate`), eliminating name string parsing and SQL type mismatch errors.
- **III. Monorepo Organization & Unified Type Safety**: PASSED. Shared DTOs and contracts exported from `@sistema-contable/shared`.
- **IV. Budgetary Control and Personal/Family Domain**: PASSED. Extends budgetary control with 12-month matrix editing and active month residual available balance enforcement.
- **V. Strict Test-Driven Development (TDD)**: PASSED. Unit tests for driver math calculations and integration tests for matrix/control endpoints written and executed.
- **VI. Prevention of Magic Strings & Strict Type Constants**: PASSED. Driver types (`FLAT_PRORATE`, `WEIGHTED_HISTORICAL`, `PERCENTAGE_GROWTH`, `FORWARD_FILL`, `PRIOR_YEAR_ACTUAL`) and gauge status levels (`NORMAL`, `WARNING`, `OVERBUDGET`) defined as strict TypeScript enums/unions.
- **VII. Mandatory ESLint Compliance**: PASSED. Monorepo codebase verified with zero lint errors and zero warnings.

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
│   │   │   ├── get-budget-matrix.use-case.ts    # 12-month matrix fetch & category aggregations
│   │   │   ├── update-budget-matrix.use-case.ts # Batch cell update across periods
│   │   │   ├── apply-budget-driver.use-case.ts  # Driver transformation calculations
│   │   │   ├── get-prior-year-actuals.use-case.ts # Baseline historical transactions load
│   │   │   ├── get-budget-control.use-case.ts   # Executive control dashboard & residual calculations
│   │   │   └── transfer-budget-funds.use-case.ts# Inter-account budget re-allocation with audit logging
│   │   └── reports/
│   │       └── cash-flow-statement.use-case.ts  # Net cash flow calculations incorporating flow intentions
│   └── infrastructure/
│       ├── database/
│       │   └── entities/
│       │       └── budget-reassignment.entity.ts # Audit entity for budget transfers
│       └── controllers/
│           └── budget.controller.ts             # Matrix & Control HTTP endpoints
└── tests/
    ├── unit/
    │   └── budget-drivers.spec.ts               # Unit tests for drivers & residual math
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
    │       ├── BudgetMatrixGrid.tsx             # Interactive matrix grid with keyboard & paste support
    │       ├── DriverActionModal.tsx            # Smart distribution driver modal dialog
    │       └── BudgetTransferModal.tsx          # Re-allocation transfer modal
    └── services/
        └── api.ts                               # API client methods for budget matrix & control
```

**Structure Decision**: Monorepo with shared type safety (`shared`), NestJS backend (`backend`), and Next.js frontend (`frontend`).

## Complexity Tracking

_No violations. Clean Architecture and Monorepo guidelines strictly maintained._
