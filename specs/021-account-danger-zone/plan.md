# Implementation Plan: Danger Zone Settings - Factory Reset & Account Deletion

**Branch**: `021-account-danger-zone` | **Date**: 2026-08-16 | **Spec**: [specs/021-account-danger-zone/spec.md](spec.md)

**Input**: Feature specification from `specs/021-account-danger-zone/spec.md`

## Summary

Implement a dedicated "Zona de Peligro" (Danger Zone) in the Settings page (`/settings`) with high visual contrast and red styling, providing two distinct irreversible operations:

1. **Restablecer datos de fábrica (Factory Reset)**: Atomically purges all financial records (transactions, journal entries, account balances, budgets, periods, fiscal years, custom accounts) and re-seeds standard starter accounts linked to the base currency while preserving the user account and active session.
2. **Eliminar cuenta permanentemente (Account Deletion)**: Atomically purges all user financial records, tokens, and the user entity itself, immediately terminates active sessions, and redirects the user to the login screen.

Both operations enforce strict multi-step confirmation (exact case-sensitive confirmation phrases + backend password re-authentication with bcrypt).

---

## Technical Context

**Language/Version**: TypeScript 5.3+ / Node.js 20+

**Primary Dependencies**: NestJS 10 (Backend), Next.js 14+ (Frontend), TypeORM 0.3+, TailwindCSS v4.3, lucide-react, Zod 3.22+, bcrypt

**Storage**: PostgreSQL (TypeORM with relational constraints and ACID transactions)

**Testing**: Jest (Backend unit and integration tests), ESLint / Prettier static verification

**Target Platform**: Web browsers (responsive desktop & mobile) + Node.js backend

**Project Type**: Full-stack Monorepo Web Application (`backend/`, `frontend/`, `shared/`)

**Performance Goals**: Factory Reset and Account Deletion operations complete in under 3 seconds (SC-003, SC-004)

**Constraints**:

- Atomic database transactions (all-or-nothing rollback on error)
- Zero orphaned records upon purge
- Zero ESLint errors and warnings across backend, frontend, and shared workspaces (Constitution Principle VII)

**Scale/Scope**: Scoped per authenticated tenant/user; complete data wipe with 100% cascade isolation

---

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design._

| Principle                                                   | Requirement & Evaluation                                                                                                                                                   | Status   |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| **I. Double-Entry Bookkeeping & Ledger Integrity**          | All financial deletions are strictly atomic. Reset leaves a valid base chart of accounts ready for balanced journal entries.                                               | **PASS** |
| **II. Clean Architecture & SOLID Principles**               | Domain models, application use cases (`FactoryResetUseCase`, `DeleteAccountUseCase`), and presentation/controller layers are strictly decoupled with Dependency Injection. | **PASS** |
| **III. Monorepo Organization & Unified Type Safety**        | All request/response schemas, DTOs, enums (`DangerZoneAction`), and constants are defined in `shared/src/index.ts` and consumed by both backend and frontend.              | **PASS** |
| **IV. Budgetary Control and Personal/Family Domain**        | Budget allocations, matrix items, and reassignments are correctly cascadingly purged during data wipes.                                                                    | **PASS** |
| **V. Strict Test-Driven Development (TDD) & Quality**       | Comprehensive unit tests for use cases and integration tests for atomic database cascades before finalizing implementation.                                                | **PASS** |
| **VI. Prevention of Magic Strings & Strict Type Constants** | Typed constants used for confirmation phrases (`RESTABLECER DATOS`, `ELIMINAR MI CUENTA`), action enums, and error codes (`AUTH_INVALID_CURRENT_PASSWORD`).                | **PASS** |
| **VII. Mandatory ESLint Compliance & Static Quality**       | Strict adherence to zero ESLint warnings/errors and zero unapproved disables across all monorepo workspaces.                                                               | **PASS** |

---

## Project Structure

### Documentation (this feature)

```text
specs/021-account-danger-zone/
├── spec.md              # Feature specification
├── plan.md              # This file (Implementation plan)
├── research.md          # Phase 0 research & design choices
├── data-model.md        # Phase 1 data model & schemas
├── quickstart.md        # Phase 1 verification and testing guide
├── contracts/           # Phase 1 API contracts
│   └── danger-zone-api.contract.md
└── checklists/          # Checklists
```

### Source Code Layout

```text
shared/src/
├── index.ts                             # DangerZoneAction, confirmation schemas, DTOs, default accounts

backend/src/
├── application/
│   └── danger-zone/
│       ├── factory-reset.use-case.ts     # Application logic for factory data reset & re-seeding
│       ├── factory-reset.use-case.spec.ts
│       ├── delete-account.use-case.ts    # Application logic for permanent user deletion
│       └── delete-account.use-case.spec.ts
├── infrastructure/
│   ├── controllers/
│   │   ├── danger-zone.controller.ts     # Endpoints for reset-data and delete-account
│   │   └── dto/
│   │       ├── factory-reset.dto.ts
│   │       └── delete-account.dto.ts
│   └── danger-zone/
│       └── danger-zone.module.ts         # NestJS DangerZoneModule wiring

frontend/src/
├── components/
│   ├── settings/
│   │   ├── DangerZoneSection.tsx         # Red-accented container with action triggers
│   │   ├── FactoryResetModal.tsx         # Strict confirmation dialog for reset
│   │   └── DeleteAccountModal.tsx        # Strict confirmation dialog for account deletion
├── services/
│   └── api.ts                            # DangerZone API methods (resetData, deleteAccount)
└── app/
    └── settings/
        └── page.tsx                      # Integration of DangerZoneSection in Settings
```

---

## Complexity Tracking

> **No Constitution violations detected.** All patterns conform to existing clean architecture and monorepo standards.

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --------- | ---------- | ------------------------------------ |
| None      | N/A        | N/A                                  |
