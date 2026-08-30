# Implementation Plan: Treasury Cash Accounts and Cash Flow Refactor

**Branch**: `014-treasury-cash-flow-refactor` | **Date**: 2026-07-31 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/014-treasury-cash-flow-refactor/spec.md`

## Summary

Refactor money account configuration UX and default initialization to eliminate ambiguous inline grid checkboxes, ensure liquidity flag immutability for accounts with transaction history, and guarantee high-performance, deterministic Direct Cash Flow calculations using period balance aggregations (`AccountPeriodBalanceEntity`).

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 20+
**Primary Dependencies**: NestJS 10.x, TypeORM, Next.js 14+ (App Router), TailwindCSS, Lucide React
**Storage**: PostgreSQL / TypeORM relational database with transactions
**Testing**: Jest (Backend unit/integration), React Testing Library (Frontend)
**Target Platform**: Web application (Desktop & Mobile Responsive)
**Project Type**: Web application (Monorepo with `backend/` NestJS and `frontend/` Next.js)
**Performance Goals**: Direct Cash Flow report rendering < 500ms regardless of transaction volume
**Constraints**: Pure double-entry bookkeeping integrity; 100% type safety across API boundaries; immutability of historical ledger entries & liquid account status once posted
**Scale/Scope**: Multi-currency accounting ledger supporting personal & family financial management

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- [x] **I. Double-Entry Bookkeeping & Ledger Integrity**: Compliant. Cash balance movements update period balances without altering ledger entries or violating double-entry balance.
- [x] **II. Clean Architecture & SOLID Principles**: Compliant. Domain entities and use cases handle validation rules (`UpdateAccountUseCase`) decoupled from infrastructure/UI.
- [x] **III. Monorepo Organization & Unified Type Safety**: Compliant. Shared DTO interfaces maintain contract consistency between NestJS backend and Next.js frontend.
- [x] **IV. Budgetary Control and Personal/Family Domain**: Compliant. Cash flow report properly isolates liquid cash movements from budget categories.
- [x] **V. Strict Test-Driven Development (TDD) & Quality Verification**: Compliant. All use cases and UI components require TDD test coverage prior to release.
- [x] **VI. Prevention of Magic Strings & Strict Type Constants**: Compliant. Enums and constants used for account types (`ASSET`, `LIABILITY`, etc.) and status codes.

## Project Structure

### Documentation (this feature)

```text
specs/014-treasury-cash-flow-refactor/
├── spec.md              # Feature specification
├── plan.md              # Implementation plan (this file)
├── research.md          # Phase 0 research & decisions
├── data-model.md        # Phase 1 data model & state transition rules
├── quickstart.md        # Phase 1 validation & testing guide
├── contracts/           # Phase 1 API interface contracts
│   ├── accounts-api.md  # Accounts management endpoints
│   └── cash-flow-api.md # Cash flow reporting endpoints
└── checklists/
    └── requirements.md  # Specification quality checklist
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── application/
│   │   ├── accounts/
│   │   │   ├── delete-account.use-case.ts
│   │   │   ├── get-accounts-summary.use-case.ts
│   │   │   └── update-account.use-case.ts
│   │   └── reports/
│   │       └── get-cash-flow.use-case.ts
│   ├── domain/
│   └── infrastructure/
│       └── database/
│           └── entities/
│               ├── account.entity.ts
│               ├── account-period-balance.entity.ts
│               └── journal-entry.entity.ts
└── tests/

frontend/
├── src/
│   ├── app/
│   │   └── accounts/
│   │       └── page.tsx
│   ├── components/
│   │   ├── AccountModal.tsx
│   │   └── AccountsList.tsx
│   └── services/
│       └── api.ts
└── tests/
```

**Structure Decision**: Monorepo Web Application layout (Option 2). Frontend (Next.js) handles UI modal/table cleanup and default payload construction; Backend (NestJS) enforces immutability rules and computes cash flow reports over `AccountPeriodBalanceEntity`.

## Complexity Tracking

> **No constitution violations or unjustified complexities.**

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --------- | ---------- | ------------------------------------ |
| _None_    | N/A        | N/A                                  |
