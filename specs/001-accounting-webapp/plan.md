# Implementation Plan: Web Accounting App (Sistema Contable)

**Branch**: `001-accounting-webapp` | **Date**: 2026-06-27 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-accounting-webapp/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

---

## Summary

Implement a mobile-first double-entry accounting web application inspired by RealByte Money Manager. The system will features a NestJS 11 backend, Next.js frontend with SSR support, PostgreSQL for ledger storage, and a shared TypeScript package for unified type safety. The primary improvement over the original app is supporting multi-item transactions (split entries) where $\sum \text{Debits} = \sum \text{Credits}$ is enforced within database transactions.

---

## Technical Context

**Language/Version**: TypeScript / Node.js (v24 LTS)

**Primary Dependencies**: NestJS v11 (backend), Next.js v15 (frontend), TypeORM (ORM), TailwindCSS v4, shadcn/ui, Zod

**Storage**: PostgreSQL 16 (utilizing Repeatable Read / Serializable transaction isolation level to ensure ledger updates are atomic and free of race conditions)

**Testing**: Jest for backend unit & integration tests, Playwright for E2E frontend verification

**Target Platform**: Responsive Web Browser (Mobile-First) with SSR support

**Project Type**: Web Application (Monorepo setup)

**Performance Goals**: API response time <100ms for ledger inserts, real-time budget updates <500ms

**Constraints**: Double-entry ledger integrity must be strictly enforced (errors must be corrected with reversal transactions; deletions or updates to posted lines are prohibited). Logical deletes only for accounts.

**Scale/Scope**: Personal and family accounting scale (~10k transactions/year, up to 100 accounts/categories).

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

1. **Double-Entry Bookkeeping & Ledger Integrity**: **PASS**
   - Transactions are modeled with a header and a detail list of debits/credits (`journal_entries`).
   - Balancing is verified on write.
   - Deletions are forbidden; reversals are supported.
2. **Clean Architecture & SOLID Principles**: **PASS**
   - The backend code will separate the framework-free domain layer (`backend/src/domain/`) from NestJS infrastructure (`backend/src/infrastructure/`).
   - Dependency injection is handled natively by NestJS.
3. **Monorepo Organization & Unified Type Safety**: **PASS**
   - Setting up a shared workspace package (`/shared`) for typescript contracts, ensuring validation schemas (Zod) and interfaces are compiled together.
4. **Budgetary Control and Personal/Family Domain**: **PASS**
   - Expense budgeting is supported per category, incorporating monthly override limits and fallbacks.
5. **Strict Test-Driven Development (TDD)**: **PASS**
   - 100% test coverage constraint is set for the double-entry accounting services and budget engine. Tests will be written and approved prior to building concrete services.
6. **Prevention of Magic Strings & Strict Type Constants**: **PASS**
   - The application will utilize TypeScript enums, constant dictionaries, or union types for all statuses, action types, config keys, and routes, preventing any use of inline magic strings.

---

## Project Structure

### Documentation (this feature)

```text
specs/001-accounting-webapp/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   └── api-endpoints.md # API endpoint specifications
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
backend/                  # NestJS Backend Project
├── Dockerfile.dev        # Docker config for watch development
├── package.json
├── src/
│   ├── domain/           # Clean Architecture: Domain models, repository interfaces
│   │   ├── accounts/
│   │   ├── ledger/       # Transaction and JournalEntry models
│   │   └── budgets/
│   ├── application/      # Use cases & handlers (create transaction, update budget)
│   ├── infrastructure/   # Controllers, TypeORM/Prisma DB config, Nest modules
│   └── main.ts
└── tests/
    ├── integration/      # Balance checks, concurrent updates
    └── unit/             # Entity level rules

frontend/                 # Next.js Frontend Project
├── Dockerfile.dev        # Docker config for dev server
├── package.json
├── src/
│   ├── app/              # SSR App Router (diario, calendario, cuentas, stats, presupuestos)
│   ├── components/       # shadcn/ui responsive UI components (Tailwind v4)
│   └── services/         # API HTTP Client
└── tests/

shared/                   # Shared TypeScript models and Zod schemas
├── package.json
└── src/
    └── index.ts          # Exports validation types and schemas

docker-compose.yml        # Development orchestration
package.json              # Monorepo workspaces definition
```

**Structure Decision**: Monorepo using npm workspaces, separating backend (NestJS), frontend (Next.js), and shared package (contracts/types). Unified containerization via `docker-compose.yml` binds code volumes to ensure instantaneous hot-reload.

---

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

*No violations detected. The architecture aligns with clean architecture and double-entry principles.*
