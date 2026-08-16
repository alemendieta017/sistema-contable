# Implementation Plan: Dual-Mode Transaction Creation & Accounting UX Optimization

**Branch**: `022-dual-mode-transactions` | **Date**: 2026-08-16 | **Spec**: [specs/022-dual-mode-transactions/spec.md](spec.md)

**Input**: Feature specification from `specs/022-dual-mode-transactions/spec.md`

## Summary

Overhaul the transaction creation experience across the accounting application (`/transactions/new` and transaction modals) by introducing two purpose-built modes:

1. **Modo 1: Transacción Rápida (Quick Transaction)**: For routine daily operations (Gastos, Ingresos, Transferencias Internas) using a single-amount, guided form with a strict 5-step field order (`1. Fecha/Hora` → `2. Cuenta / Cuenta Origen` → `3. Categoría / Cuenta Destino` → `4. Monto` → `5. Concepto`) that automatically abstracts double-entry ledger mechanics into balanced journal entries.
2. **Modo 2: Asiento Contable Libre / Avanzado (Free Journal Entry Grid)**: For accountants and complex multi-line entries (payroll, depreciation, opening balances) with independent Debe and Haber columns, real-time difference calculation, automatic line-balancing pre-fills, keyboard-first desktop shortcuts (`Ctrl+Enter`), and mobile stacked-card responsive layouts.
3. **Ergonomic Responsive UI & Account Picker**: Dedicated mobile bottom sheet overlay with category tabs and search, native numeric input triggers (`inputMode="decimal"`), neutral financial semantics (eliminating misleading traffic-light colors), and a consolidated single primary action bar.

---

## Technical Context

**Language/Version**: TypeScript 5.3+ / Node.js 20+

**Primary Dependencies**: Next.js 14+ / React 19 (Frontend), NestJS 10 (Backend), TypeORM 0.3+, TailwindCSS v4.3, lucide-react, Zod 3.23+

**Storage**: PostgreSQL (TypeORM with relational integrity and `SERIALIZABLE` database transactions for ledger consistency)

**Testing**: Jest / React Testing Library (Frontend unit & component tests), Jest (Backend ledger use case tests), ESLint / Prettier static verification

**Target Platform**: Web browsers (responsive desktop, tablet, and mobile iOS/Android) + Node.js backend

**Project Type**: Full-stack Monorepo Web Application (`frontend/`, `backend/`, `shared/`)

**Performance Goals**:

- Quick transaction entry and submission in under 10 seconds (SC-001)
- Keystroke reduction by at least 60% on desktop (SC-002)
- Zero viewport clipping or horizontal scrolling on viewports from 320px to 4K (SC-004, SC-006)

**Constraints**:

- Zero ledger balance discrepancy (\(\sum \text{Debits} = \sum \text{Credits}\)) on all committed entries (Constitution Principle I)
- Zero ESLint warnings and errors across backend, frontend, and shared workspaces (Constitution Principle VII)
- Strict double-entry immutability and period closure enforcement

**Scale/Scope**: Scoped to transaction creation workflows (`/transactions/new`, `TransactionModal`, and reusable entry components)

---

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design._

| Principle                                                   | Requirement & Evaluation                                                                                                                                                                                  | Status   |
| :---------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------- |
| **I. Double-Entry Bookkeeping & Ledger Integrity**          | Both Quick Mode and Free Mode compile into strictly balanced double-entry journal entries (\(\sum \text{Debits} \equiv \sum \text{Credits}\)). Backend ledger engine rejects any unbalanced transactions. | **PASS** |
| **II. Clean Architecture & SOLID Principles**               | Presentation components (`QuickTransactionForm`, `FreeJournalEntryGrid`, `AccountPickerSheet`) are strictly decoupled from application services and backend controllers.                                  | **PASS** |
| **III. Monorepo Organization & Unified Type Safety**        | Shared types (`TransactionMode`, `QuickOperationType`, `CreateTransactionRequestSchema`) are declared in `shared/src/index.ts` and consumed consistently across frontend and backend.                     | **PASS** |
| **IV. Budgetary Control and Personal/Family Domain**        | Quick transaction categories and accounts map directly to budget ledger accounts, allowing seamless budget execution tracking.                                                                            | **PASS** |
| **V. Strict Test-Driven Development (TDD) & Quality**       | Comprehensive unit and component tests for double-entry conversions, auto-balancing calculations, keyboard navigation, and mobile bottom sheet rendering.                                                 | **PASS** |
| **VI. Prevention of Magic Strings & Strict Type Constants** | Enums and typed constants used for `TransactionMode`, `QuickOperationType`, `EntryType`, and form field identifiers.                                                                                      | **PASS** |
| **VII. Mandatory ESLint Compliance & Static Quality**       | Strict adherence to zero ESLint warnings/errors and zero unapproved disables across all monorepo workspaces.                                                                                              | **PASS** |

---

## Project Structure

### Documentation (this feature)

```text
specs/022-dual-mode-transactions/
├── spec.md              # Feature specification
├── plan.md              # This file (Implementation plan)
├── research.md          # Phase 0 research & design choices
├── data-model.md        # Phase 1 data model & schemas
├── quickstart.md        # Phase 1 verification and testing guide
└── contracts/           # Phase 1 interface contracts
    └── transaction-entry.contract.md
```

### Source Code Layout

```text
shared/src/
└── index.ts                               # TransactionMode, QuickOperationType, CreateTransactionRequestSchema

frontend/src/
├── components/
│   ├── transactions/
│   │   ├── ModeSelector.tsx               # Segmented switch between Quick Mode and Free Mode
│   │   ├── QuickTransactionForm.tsx       # 5-step guided form for Expense, Income, Transfer
│   │   ├── FreeJournalEntryGrid.tsx       # Tabular multi-line grid with Debe/Haber columns
│   │   ├── FreeJournalEntryRow.tsx        # Individual row for desktop table & mobile card
│   │   └── AccountPickerSheet.tsx         # Mobile bottom sheet & desktop combobox picker
│   ├── TransactionModal.tsx               # Updated modal utilizing dual-mode components
│   └── JournalEntryRow.tsx                # Refactored / deprecated in favor of FreeJournalEntryRow
├── app/
│   └── transactions/
│       └── new/
│           └── page.tsx                   # Dedicated page integrating dual-mode transaction entry
└── tests/
    ├── QuickTransactionForm.test.tsx      # Tests for 5-step sequence, Expense/Income/Transfer mapping
    ├── FreeJournalEntryGrid.test.tsx      # Tests for Debe/Haber mutual exclusivity and auto-balancing
    ├── AccountPickerSheet.test.tsx        # Tests for bottom sheet overlay and category filtering
    └── TransactionModal.test.tsx          # Updated modal integration tests
```

---

## Complexity Tracking

> **No Constitution violations detected.** All components follow clean architecture, unified types in `shared/`, and existing monorepo conventions.

| Violation | Why Needed | Simpler Alternative Rejected Because |
| :-------- | :--------- | :----------------------------------- |
| None      | N/A        | N/A                                  |
