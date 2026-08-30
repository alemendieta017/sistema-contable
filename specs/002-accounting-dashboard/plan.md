# Implementation Plan: Accounting Dashboard and Core Modules

**Branch**: `002-accounting-dashboard` | **Date**: 2026-06-27 | **Spec**: [spec.md](file:///root/dev/sistema-contable/specs/002-accounting-dashboard/spec.md)

**Input**: Feature specification from `/specs/002-accounting-dashboard/spec.md`

## Summary

- **Primary Requirement**: Create a responsive mobile-first accounting dashboard with a permanent desktop sidebar, containing four views (Transactions, Stats, Accounts, Settings), global search, a floating transaction button, and a dynamic multi-item double-entry transaction creation form.
- **Technical Approach**:
  - Responsive layout leveraging Tailwind CSS breakpoint utilities (`hidden lg:flex`, `flex lg:hidden`).
  - Modular Next.js 15 pages mapping to `/transactions`, `/stats`, `/accounts`, and `/settings`.
  - Unified state for filters, search query, and current timeframe.
  - Zero-dependency interactive SVG rendering for statistics distribution and timeline charts.
  - Form validation verifying $\sum \text{debits} - \sum \text{credits} = 0$ in base currency before letting the user submit to the NestJS ledger backend.

## Technical Context

- **Language/Version**: TypeScript 5.3, Node.js v20
- **Primary Dependencies**: Next.js 15, React 19, NestJS 11, Tailwind CSS v4, Lucide React, Radix UI
- **Storage**: PostgreSQL (via TypeORM)
- **Testing**: Jest (backend), Jest/Testing-Library (frontend)
- **Target Platform**: Modern web browsers (mobile-first touch viewports and desktop wide viewports)
- **Project Type**: Full-stack web application (NestJS backend, Next.js frontend, shared TypeScript package)
- **Performance Goals**: Transitions and navigation under 200ms; search results filtering under 300ms; charts rendering under 400ms.
- **Constraints**: WSL-exclusive environment, Clean Architecture, monorepo, strict double-entry verification, no magic strings (utilize shared enums or TypeScript read-only constants for routes and configurations).
- **Scale/Scope**: 1 unified dashboard container, 4 page modules, 1 multi-item modal form, 3 interactive SVG charts.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- **Double-Entry Bookkeeping & Ledger Integrity**: **PASSED**. Multi-item entries are validated mathematically before sending to backend. Entries are append-only.
- **Clean Architecture & SOLID Principles**: **PASSED**. Separation of api services on frontend; separate domain/application/infrastructure layers on backend.
- **Monorepo Organization & Unified Type Safety**: **PASSED**. Reuse entities and request validation schemas from `@sistema-contable/shared`.
- **Budgetary Control and Personal/Family Domain**: **PASSED**. Integrates with backend budget checks.
- **Strict Test-Driven Development (TDD)**: **PASSED**. Tests written prior to frontend component coding.
- **Prevention of Magic Strings & Strict Type Constants**: **PASSED**. Use enum types from `@sistema-contable/shared` (e.g. `AccountTypeSchema`, `JournalEntryRequestSchema`) and route constants for navigation.

## Project Structure

### Documentation (this feature)

```text
specs/002-accounting-dashboard/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── checklists/
│   └── requirements.md  # Spec checklist
└── contracts/
    └── api-contracts.md # API specifications
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── domain/
│   │   └── ledger/
│   ├── application/
│   │   └── reports/
│   └── infrastructure/
│       └── controllers/
│           ├── account.controller.ts
│           ├── ledger.controller.ts
│           └── reports.controller.ts

frontend/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── accounts/
│   │   │   └── page.tsx
│   │   ├── stats/
│   │   │   └── page.tsx
│   │   ├── transactions/
│   │   │   └── page.tsx
│   │   └── settings/
│   │       └── page.tsx
│   ├── components/
│   │   ├── Sidebar.tsx
│   │   ├── BottomNav.tsx
│   │   ├── FloatingActionButton.tsx
│   │   ├── TransactionModal.tsx
│   │   └── CustomCharts.tsx
│   └── services/
│       └── api.ts

shared/
└── src/
    └── index.ts
```

**Structure Decision**: Monorepo structure with `@sistema-contable/frontend` (Next.js), `@sistema-contable/backend` (NestJS), and `@sistema-contable/shared` (Zod schemas and TypeScript types). We will add responsive sidebar components in `frontend/src/components/`, modular page files in `frontend/src/app/`, and validation helpers.
