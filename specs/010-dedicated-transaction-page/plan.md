# Implementation Plan: Dedicated Transaction Entry Page & Operations

**Branch**: `010-dedicated-transaction-page` | **Date**: 2026-06-30 | **Spec**: [spec.md](file:///Users/ale/dev/sistema-contable/specs/010-dedicated-transaction-page/spec.md)

**Input**: Feature specification from `/specs/010-dedicated-transaction-page/spec.md`

## Summary

This feature transitions manual transaction entry from a constrained modal into a spacious, dedicated page located at `/transactions/new`. The new design delivers an exquisite desktop user experience and a distraction-free fullscreen mobile layout. Additionally, the feature enhances transaction management capability by implementing editing, copying/cloning, permanent deletion, and time registration for transactions.

## Technical Context

- **Language/Version**: TypeScript / Node.js
- **Primary Dependencies**: React 19, Next.js (App Router), NestJS (TypeScript backend), TailwindCSS v4, TypeORM, Lucide React
- **Storage**: PostgreSQL (via TypeORM)
- **Testing**: Jest, NestJS testing utilities (Backend) / React Testing Library (Frontend)
- **Target Platform**: Desktop & Mobile Web (Viewports >= 320px)
- **Project Type**: Full-stack Monorepo (Next.js frontend + NestJS backend)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Principle I: Double-Entry Bookkeeping & Ledger Integrity**: All transaction edits/creations are verified at the database level inside `SERIALIZABLE` isolation transactions. Sum of debits must equal sum of credits.
- **Principle II: Clean Architecture & SOLID**: Modifying business logic is strictly separated into use-case classes: `CreateTransactionUseCase`, `UpdateTransactionUseCase` [NEW], and `DeleteTransactionUseCase` [NEW]. Controllers only delegate request payloads.
- **Principle III: Monorepo Organization & Unified Type Safety**: Shared validation schemas are centralized under `shared/src/index.ts`. Both frontend and backend compile against the unified shared schemas.
- **Principle V: Test-Driven Development (TDD) & Quality Verification**: Integration and unit tests are written for all new controller endpoints and use cases, aiming for full validation before final release.
- **Principle VI: Prevention of Magic Strings**: Action types and constants use union types or TypeScript enums.

---

## Project Structure

### Documentation (this feature)

```text
specs/010-dedicated-transaction-page/
├── plan.md              # This file
├── research.md          # Research on date-time formatting, routes, mobile layouts
├── data-model.md        # DB Entity relationships and state transitions
├── quickstart.md        # Step-by-step verification flows
└── contracts/
    └── ledger-api.md    # API endpoints contracts (GET, PUT, DELETE)
```

### Source Code

```text
shared/
└── src/
    └── index.ts          # Modify: Export shared schemas/types for PUT request validation

backend/
├── src/
│   ├── application/
│   │   └── ledger/
│   │       ├── update-transaction.use-case.ts  # [NEW] Business logic for PUT
│   │       └── delete-transaction.use-case.ts  # [NEW] Business logic for DELETE
│   ├── infrastructure/
│   │   ├── controllers/
│   │   │   └── ledger.controller.ts            # Modify: Add GET/PUT/DELETE routes
│   │   └── ledger/
│   │       └── ledger.module.ts                # Modify: Register new use cases
└── tests/
    └── integration/
        ├── delete-transaction.spec.ts          # [NEW] Tests for DELETE use case
        └── update-transaction.spec.ts          # [NEW] Tests for PUT use case

frontend/
├── src/
│   ├── app/
│   │   └── transactions/
│   │       └── new/
│   │           └── page.tsx                    # [NEW] Fullpage editor (Create, Edit, Clone)
│   ├── components/
│   │   ├── MainLayout.tsx                      # Modify: Responsive fullscreen handling
│   │   ├── Sidebar.tsx                         # Modify: Route click to /transactions/new
│   │   ├── FloatingActionButton.tsx            # Modify: Route click to /transactions/new
│   │   └── Header.tsx                          # Modify: Hide search input when editing
│   ├── lib/
│   │   └── utils.ts                            # Modify: Add datetime timezone offset utility
│   └── services/
│       └── api.ts                              # Modify: Add api.transactions GET, PUT, DELETE
```

**Structure Decision**: Monorepo structure, modifying both backend modules and frontend pages/components to provide full end-to-end integration.

---

## Proposed Changes

### Centralized Shared Layers

#### [MODIFY] [shared/src/index.ts](file:///Users/ale/dev/sistema-contable/shared/src/index.ts)
- Add and export `UpdateTransactionRequestSchema` and `UpdateTransactionRequest` type (reusing/extending transaction validation schemas).

### Backend Component Layer

#### [MODIFY] [ledger.controller.ts](file:///Users/ale/dev/sistema-contable/backend/src/infrastructure/controllers/ledger.controller.ts)
- Import `UpdateTransactionUseCase` and `DeleteTransactionUseCase`.
- Add `GET /api/transactions/:id` to fetch details of a transaction for editing or cloning.
- Add `PUT /api/transactions/:id` to update details (delegating to `UpdateTransactionUseCase`).
- Add `DELETE /api/transactions/:id` to delete the transaction (delegating to `DeleteTransactionUseCase`).

#### [NEW] [update-transaction.use-case.ts](file:///Users/ale/dev/sistema-contable/backend/src/application/ledger/update-transaction.use-case.ts)
- Find existing transaction by ID.
- Throw `BadRequestException` if the transaction is reversed or is a reversal itself.
- Inside a `SERIALIZABLE` transaction block:
  - Fetch/Lock accounts for validation (active, exist, user-owned).
  - Verify double-entry balancing.
  - Delete existing journal entry rows.
  - Update main transaction header (date, description).
  - Create and save new journal entry lines.

#### [NEW] [delete-transaction.use-case.ts](file:///Users/ale/dev/sistema-contable/backend/src/application/ledger/delete-transaction.use-case.ts)
- Find transaction by ID.
- Delete the transaction from database (TypeORM `onDelete: 'CASCADE'` will automatically wipe entries).

#### [MODIFY] [ledger.module.ts](file:///Users/ale/dev/sistema-contable/backend/src/infrastructure/ledger/ledger.module.ts)
- Register `UpdateTransactionUseCase` and `DeleteTransactionUseCase` under providers and exports.

### Frontend Component Layer

#### [MODIFY] [utils.ts](file:///Users/ale/dev/sistema-contable/frontend/src/lib/utils.ts)
- Add helper `formatLocalDateTimeWithOffset(dateTimeStr)` to correctly format `datetime-local` input elements.

#### [MODIFY] [api.ts](file:///Users/ale/dev/sistema-contable/frontend/src/services/api.ts)
- Add transaction API wrappers for single `get`, `update` (PUT), and `delete`.

#### [MODIFY] [MainLayout.tsx](file:///Users/ale/dev/sistema-contable/frontend/src/components/MainLayout.tsx)
- Dynamically detect `/transactions/new` and hide standard header, bottom navigation drawer, and margins on mobile viewports (< 640px) to offer fullscreen experience.

#### [MODIFY] [Sidebar.tsx](file:///Users/ale/dev/sistema-contable/frontend/src/components/Sidebar.tsx) and [FloatingActionButton.tsx](file:///Users/ale/dev/sistema-contable/frontend/src/components/FloatingActionButton.tsx)
- Change transaction creation triggers from opening a modal to navigating (`router.push('/transactions/new')`).

#### [NEW] [page.tsx](file:///Users/ale/dev/sistema-contable/frontend/src/app/transactions/new/page.tsx)
- Dedicated, fully responsive screen containing:
  - Header: Back button, save button, transaction page title.
  - Concept/Glosa and Date-time inputs in responsive grid card layouts.
  - Journal entry rows with searchable accounts, debit/credit toggle buttons, and amounts.
  - Automatic balance calculations (Debit totals, Credit totals, difference indicator).
  - Navigation warnings (intercept accidental redirects if form is dirty).

---

## Verification Plan

### Automated Tests
- Create unit/integration tests under `backend/tests/integration/` for `UpdateTransactionUseCase` and `DeleteTransactionUseCase`.
- Run tests via docker command:
  ```bash
  docker exec -w /app/backend sistema-contable-backend npm run test
  ```

### Manual Verification
- Follow validation flows detailed in [quickstart.md](file:///Users/ale/dev/sistema-contable/specs/010-dedicated-transaction-page/quickstart.md) (Create, Edit, Clone, Delete, Mobile viewport responsiveness, and Date/Time entries).
