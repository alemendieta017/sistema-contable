# Research: Quick Account Creation from Account Dropdown in Journal Entry

## Overview

When entering journal entries or transactions in `NewTransactionPage` (`frontend/src/app/transactions/new/page.tsx`) or `TransactionModal` (`frontend/src/components/TransactionModal.tsx`), users select ledger accounts via `JournalEntryRow` (`frontend/src/components/JournalEntryRow.tsx`). Frequently, users encounter accounts that do not exist yet in the Chart of Accounts.

This research evaluates the technical approach for inserting an inline quick account creation option into the dropdown of `JournalEntryRow`, connecting it to `AccountModal` while maintaining in-progress transaction state and auto-selecting the newly created account.

## Technical Decisions & Alternatives Evaluated

### 1. Dropdown UI Integration in `JournalEntryRow`

- **Decision**: Add a fixed "+ Add New Account" / "+ Crear Cuenta" option at the top or bottom of `JournalEntryRow`'s dropdown list, as well as a dynamic "+ Create account '{search}'" / "+ Crear cuenta '{search}'" option when a non-matching search string is entered in the combobox input.
- **Rationale**:
  - Direct keyboard & mouse access without breaking the existing tabbed filter bar (Todos, Activos, Pasivos, etc.).
  - Explicit requirement FR-001 & FR-002: Always visible action button and dynamic search shortcut when search yields no exact matches.
- **Alternatives Considered**:
  - _Adding a separate button next to the input_: Takes up extra horizontal space in the line item row, breaking desktop/mobile responsive alignment.
  - _Redirecting to the accounts page_: Destroys in-progress transaction state and violates SC-003.

### 2. Modal Orchestration & State Preservation

- **Decision**: Trigger `AccountModal` from `JournalEntryRow` (or parent form state callback `onQuickCreateAccount(lineIndex, initialName)`). When `AccountModal` saves:
  1. Call `api.accounts.create(...)` which persists the account to the database.
  2. The server returns the created `Account` object (`{ id, name, type, parentId, ... }`).
  3. Parent form receives the new account, updates its `accounts` state array, and sets `entries[targetIndex].accountId = newAccount.id`.
  4. `AccountModal` closes, returning focus to the active line item.
- **Rationale**:
  - Guarantees 100% preservation of all filled header fields (`accountingDate`, `description`) and line items (`debits`, `credits`).
  - Ensures newly created account is instantly available to all other line item dropdowns in the same transaction session without page reload.
- **Alternatives Considered**:
  - _Page reload after account creation_: Wipes uncommitted transaction entries (violates FR-007).

### 3. Reusing `AccountModal` vs Dedicated Quick Account Drawer

- **Decision**: Reuse the existing `AccountModal` component (`frontend/src/components/AccountModal.tsx`) with props for `initialName` and `parentCandidates`.
- **Rationale**:
  - `AccountModal` already implements account creation with fields for `name`, `type`, `isCashOrBank`, `currencyId`, and `parentId`.
  - Reusing `AccountModal` guarantees consistent validation, styling, and business rules across the application.
- **Alternatives Considered**:
  - _Building a duplicate mini-modal inside `JournalEntryRow`_: Leads to code duplication, inconsistent validation, and maintenance overhead.

## Summary of Decisions

| Subject         | Decision                                                    | Rationale                                                     |
| --------------- | ----------------------------------------------------------- | ------------------------------------------------------------- |
| Dropdown Action | Fixed button + dynamic search shortcut in `JournalEntryRow` | Adheres to FR-001/FR-002; ergonomic inline experience         |
| Modal Component | Reuse `AccountModal.tsx` with `initialName` prop            | Ensures single source of truth for account schema             |
| State Flow      | Parent state update + auto-select line item                 | Preserves transaction draft; satisfies FR-005, FR-006, FR-007 |
