# Implementation Plan: Integration of Equity System Accounts and Fiscal Year Closing

**Branch**: `016-system-accounts-equity` | **Date**: 2026-08-05 | **Spec**: [spec.md](file:///c:/Users/amend/Dev/sistema-contable/specs/016-system-accounts-equity/spec.md)

**Input**: Feature specification from `/specs/016-system-accounts-equity/spec.md`

## Summary

This plan outlines the technical changes required to implement mandatory **System Accounts** (`NET_INCOME` and `RETAINED_EARNINGS`) under Equity (Patrimonio Neto), eliminate synthetic in-memory fallback account IDs (`virtual-net-income`, `virtual-accumulated-results`), hide 0 balance system accounts from Balance Sheet reporting, execute database migrations to auto-assign/create system accounts for all users, and streamline `CloseFiscalYearUseCase` to automatically select the mandatory `RETAINED_EARNINGS` account.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js v18+, NestJS v10, Next.js 14  
**Primary Dependencies**: TypeORM, NestJS, Zod, React, TailwindCSS  
**Storage**: PostgreSQL (TypeORM)  
**Testing**: Jest (Unit & Integration)  
**Target Platform**: Web application (Monorepo with NestJS backend + Next.js frontend + shared package)  
**Performance Goals**: <200ms balance sheet response time  
**Constraints**: Double-entry ledger integrity, clean architecture, zero magic strings, mandatory system accounts without fallback  
**Scale/Scope**: All active companies/users in the system

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- **I. Double-Entry Bookkeeping & Ledger Integrity**: PASSED. Year-end closing entries automatically balance debits and credits and post to the real `RETAINED_EARNINGS` system account.
- **II. Clean Architecture & SOLID**: PASSED. Domain entities remain framework-free; use cases encapsulate logic; controllers handle HTTP contracts.
- **III. Monorepo Organization & Unified Type Safety**: PASSED. Shared schemas (`SystemRoleSchema`, `CloseFiscalYearRequestSchema`) updated in `@sistema-contable/shared`.
- **IV. Budgetary Control and Personal/Family Domain**: PASSED. Unaffected.
- **V. Strict Test-Driven Development (TDD)**: PASSED. All existing integration test suites (`annual-closing.spec.ts`, `fast-reports.spec.ts`, seeders) will be updated and verified before completion.
- **VI. Prevention of Magic Strings**: PASSED. `SystemRole` enum/type constant enforced across backend and shared package.

## Project Structure

### Documentation (this feature)

```text
specs/016-system-accounts-equity/
├── plan.md              # Implementation plan (this file)
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 API contracts
│   └── system-accounts-api.md
└── tasks.md             # Phase 2 output (/speckit-tasks command)
```

### Source Code (repository root)

```text
shared/
└── src/
    └── index.ts                                 # SystemRole, Account, CloseFiscalYear schemas

backend/
├── src/
│   ├── domain/
│   │   └── ledger/
│   │       └── ledger.model.ts                  # Account model systemRole field
│   ├── application/
│   │   └── periods/
│   │       ├── balance-sheet.use-case.ts        # Dynamic balance sheet injection into real system accounts & zero-balance hiding
│   │       └── close-fiscal-year.use-case.ts    # Auto-resolving RETAINED_EARNINGS account
│   └── infrastructure/
│       ├── database/
│       │   ├── entities/
│       │   │   └── account.entity.ts            # system_role column & index
│       │   ├── migrations/
│       │   │   └── XXXXXXXXXXXXX-system-accounts.ts # Migration script
│       │   └── seeds/                           # Seeder scenarios updated with system roles
│       └── controllers/
│           ├── account.controller.ts
│           └── period.controller.ts
└── tests/
    └── integration/
        ├── annual-closing.spec.ts               # Integration tests
        └── fast-reports.spec.ts                 # Integration tests

frontend/
└── src/                                         # UI components updated for optional retainedEarningsAccountId
```

**Structure Decision**: Monorepo with shared type safety (`shared`), NestJS backend (`backend`), and Next.js frontend (`frontend`).

## Complexity Tracking

_No violations. Clean Architecture maintained._
