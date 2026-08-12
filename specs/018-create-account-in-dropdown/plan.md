# Implementation Plan: Create Account from Dropdown in Transaction Entry

**Branch**: `018-create-account-in-dropdown` | **Date**: 2026-08-12 | **Spec**: [specs/018-create-account-in-dropdown/spec.md](file:///C:/Users/amend/.gemini/antigravity/worktrees/sistema-contable/add_account_journal_entry/specs/018-create-account-in-dropdown/spec.md)

**Input**: Feature specification from `specs/018-create-account-in-dropdown/spec.md`

## Summary

Add inline quick account creation functionality directly within the account selection combobox of journal entry and transaction forms (`JournalEntryRow.tsx` used in `NewTransactionPage` and `TransactionModal`). When a bookkeeper searches for a missing account or clicks the "+ Add New Account" / "+ Crear Cuenta" shortcut, `AccountModal` opens in-place without page reload or data loss. Upon saving, the newly created account is automatically selected on the active transaction line and added to the session's accounts cache.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 18+  
**Primary Dependencies**: Next.js 14+ (App Router), React 18, TailwindCSS, Lucide Icons, NestJS 10+  
**Storage**: PostgreSQL / TypeORM (backend `AccountEntity`)  
**Testing**: Jest, React Testing Library  
**Target Platform**: Modern Web Browsers (Desktop & Mobile)  
**Project Type**: Monorepo Web Application (`frontend/` + `backend/`)  
**Performance Goals**: Account creation & auto-selection completed in <15 seconds; zero unneeded network refetches  
**Constraints**: 100% draft preservation during account creation; zero page reloads; 100% ESLint compliance (zero errors/warnings)  
**Scale/Scope**: `JournalEntryRow.tsx`, `AccountModal.tsx`, `TransactionModal.tsx`, `NewTransactionPage` (`page.tsx`)

## Constitution Check

_GATE: Pass before Phase 0 research. Re-check post-design._

- [x] **I. Double-Entry Bookkeeping & Ledger Integrity**: Pass — Quick account creation only registers ledger accounts in Chart of Accounts; double-entry validation rules remain strictly enforced when saving transactions.
- [x] **II. Clean Architecture & SOLID**: Pass — Component interactions decouple modal presentation from API persistence via callbacks (`onQuickCreateAccount`, `onSuccess`).
- [x] **III. Monorepo & Type Safety**: Pass — Uses shared `@sistema-contable/shared` or centralized TypeScript types (`Account`, `CreateAccountRequest`).
- [x] **IV. Budgetary Control**: Pass — Created expense/income accounts dynamically participate in budget checks.
- [x] **V. Strict TDD & Quality Verification**: Pass — TDD mandatory. Automated unit tests for `JournalEntryRow` quick creation shortcuts and modal callback handling must pass with 100% coverage on financial workflows.
- [x] **VI. Prevention of Magic Strings**: Pass — Uses typed enums/unions (`ASSET`, `LIABILITY`, `EQUITY`, `INCOME`, `EXPENSE`).
- [x] **VII. Mandatory ESLint Compliance**: Pass — Zero ESLint errors and zero warnings required before completion.

## Project Structure

### Documentation (this feature)

```text
specs/018-create-account-in-dropdown/
├── plan.md              # Implementation plan
├── research.md          # Phase 0 research findings
├── data-model.md        # Phase 1 data model & state flow
├── quickstart.md        # End-to-end manual & automated validation guide
└── contracts/
    └── account-quick-create.md # API endpoint contract for account creation
```

### Source Code (repository root)

```text
frontend/
├── src/
│   ├── app/
│   │   └── transactions/
│   │       └── new/
│   │           └── page.tsx        # Dedicated transaction form page
│   ├── components/
│   │   ├── JournalEntryRow.tsx     # Account combobox dropdown with quick-create trigger
│   │   ├── AccountModal.tsx        # Pre-filled account creation modal dialog
│   │   └── TransactionModal.tsx    # Transaction entry modal dialog
│   └── tests/
│       ├── JournalEntryRow.test.tsx # Unit tests for quick create dropdown shortcuts
│       └── TransactionModal.test.tsx# Unit tests for inline creation & auto-selection
```

**Structure Decision**: Monorepo Web Application. Changes focused strictly on `frontend/` UI components and test suites.

## Complexity Tracking

> No constitution violations detected. Standard Clean Architecture and TDD workflow applies.
