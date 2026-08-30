# Implementation Plan: Presupuestos Financieros (Budgeting) y Proyecciones de Caja

**Branch**: `013-budget-planning` | **Date**: 2026-07-07 | **Spec**: [spec.md](file:///Users/ale/dev/sistema-contable/specs/013-budget-planning/spec.md)

**Input**: Feature specification from `/specs/013-budget-planning/spec.md`

---

## Summary

The objective is to implement a comprehensive budgeting system that tracks not only income and expenses, but also savings/investments (asset movements) and financing (liability movements). These inputs are used to generate two key monthly real vs. projected reports:

1. **Income Statement (Real vs. Projected)** (accrual basis).
2. **Cash Flow Statement (Real vs. Projected)** (cash basis).

The technical approach introduces a dynamic "add-on-demand" tabular entry UI, support for pre-opened planning periods (`PLANNING` status), and a rolling 12-month window for cash flow and profit-and-loss forecasting.

---

## Technical Context

**Language/Version**: Node.js v24.18, TypeScript v5.3

**Primary Dependencies**: NestJS v11, Next.js v15, TypeORM v0.3, Zod v3.23

**Storage**: PostgreSQL (via TypeORM)

**Testing**: Jest (unit and integration tests)

**Target Platform**: Web Monorepo (NestJS Backend + Next.js Frontend)

**Project Type**: Web Application

**Performance Goals**: API response for reports and execution dashboards under 1.5 seconds.

**Constraints**: Strict double-entry integrity; exclusion of EQUITY accounts; immutable ledger rules (blocking `isCashOrBank` modification for accounts with transactions).

**Scale/Scope**: Single multi-tenant backend instance handling daily ledger transactions.

---

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- **Principle I: Double-Entry Bookkeeping & Ledger Integrity**: Pass. Budget entities do not modify ledger entries; they are read-only comparisons. Blocking modifications to `isCashOrBank` for accounts with transactions ensures ledger integrity.
- **Principle II: Clean Architecture & SOLID Principles**: Pass. All budget operations (reconciliation, saving, reporting) will be encapsulated in separate Use Case classes inside the application layer.
- **Principle III: Monorepo Organization & Unified Type Safety**: Pass. centralizing request/response DTO schemas in the `shared` package maintains compile-time types across Next.js and NestJS.
- **Principle IV: Budgetary Control and Personal/Family Domain**: Pass. Directly addresses the core principle of budgeting and control for assets, liabilities, income, and expenses.
- **Principle V: Strict Test-Driven Development (TDD) & Quality Verification**: Pass. All new features and use cases will be accompanied by comprehensive tests maintaining 100% coverage on calculations.

---

## Project Structure

### Documentation (this feature)

```text
specs/013-budget-planning/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── contracts/
    └── api-contracts.md # API Contract updates
```

### Source Code (repository root)

```text
shared/
└── src/
    └── index.ts         # Zod schemas & type contracts

backend/
├── src/
│   ├── domain/
│   │   └── budgets/
│   │       └── budget.model.ts      # Budget domain models
│   ├── application/
│   │   ├── accounts/
│   │   │   └── update-account.use-case.ts # Updates Account details (including isCashOrBank)
│   │   ├── budgets/
│   │   │   ├── get-budget-detail.use-case.ts     # Fetches budget and items for editing
│   │   │   ├── get-budget-execution.use-case.ts  # Generates execution comparison dashboard
│   │   │   ├── replicate-budget-item.use-case.ts # Propagates item to entire fiscal year
│   │   │   ├── update-budget-items.use-case.ts   # Saves edited budget amounts
│   │   │   └── copy-previous-budget.use-case.ts  # [NEW] Copies items from previous month
│   │   └── reports/
│   │       ├── cash-flow-statement.use-case.ts   # Real vs Projected Cash Flow report
│   │       └── income-statement-forecast.use-case.ts # Real vs Projected Income Statement report
│   └── infrastructure/
│       ├── controllers/
│       │   ├── budget.controller.ts  # REST routes for budgets
│       │   └── reports.controller.ts # REST routes for reports
│       └── database/
│           └── entities/
│               ├── account.entity.ts     # Added isCashOrBank
│               ├── budget.entity.ts      # Refactored 1-1 with Period
│               ├── budget-item.entity.ts # New entity for limits per account
│               ├── period.entity.ts      # [MODIFY] Added PLANNING status
│               └── fiscal-year.entity.ts # [MODIFY] Added PLANNING status
```

**Structure Decision**: Web application layout (Option 2) leveraging separate frontend and backend directories with centralized shared schemas.

---

## Complexity Tracking

_No violations detected._
