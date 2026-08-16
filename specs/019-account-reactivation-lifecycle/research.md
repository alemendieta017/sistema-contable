# Research: Account Reactivation & Lifecycle Management

## Overview

In double-entry bookkeeping (Partida Doble) and GAAP/IFRS standards, the lifecycle of accounts must balance operational usability with ledger integrity. When an account (e.g., a credit card, bank account, or expense category) is retired, it must never be physically deleted if it contains historical journal entries, as doing so would destroy historical audit trails and violate foreign key constraints. Instead, accounts must support logical deactivation (`INACTIVE`) and seamless reactivation (`ACTIVE`) whenever required.

This research establishes the technical patterns, API contracts, domain validation guards, and user interface workflows to support account lifecycle management, reactivation, deletion protection, and transaction selector filtering.

---

## Technical Decisions & Alternatives Evaluated

### 1. Account Status Transition & Reactivation API

- **Decision**: Extend `UpdateAccountUseCase` and `PATCH /api/accounts/:id` to accept `{ name?: string; isCashOrBank?: boolean; status?: 'ACTIVE' | 'INACTIVE' }`, supported by typed client methods (`api.accounts.update(...)`).
- **Rationale**:
  - `PATCH /api/accounts/:id` already operates under a database transaction with user authorization verification.
  - Adding `status` to the DTO allows atomic updates to account lifecycle state while keeping the REST surface consistent and clean.
  - Idempotent: Reactivating an already `ACTIVE` account or deactivating an already `INACTIVE` account succeeds cleanly without side effects.
- **Alternatives Considered**:
  - _Dedicated endpoints (`POST /api/accounts/:id/reactivate`, `POST /api/accounts/:id/deactivate`)_: Introduces redundant RPC-style endpoints in a RESTful resource architecture.
  - _Soft-delete flags using timestamps (`deletedAt`)_: Creates ambiguity between soft deletion (intended to be permanent removal) and administrative operational pause/retirement (`INACTIVE`), which is expected to be reactivatable.

### 2. Strict Physical Deletion vs Deactivation Enforcement

- **Decision**: In `DeleteAccountUseCase`, check whether associated `JournalEntryEntity` records exist for the given `accountId`.
  - If `entriesCount > 0`: System throws `BadRequestException` (HTTP 400) with message: `"Cannot delete account with existing transactions. Deactivate the account instead."`.
  - If `entriesCount === 0`: System performs physical deletion (`entityManager.delete(AccountEntity, { id: accountId })`) and returns `{ success: true, action: 'DELETED' }`.
- **Rationale**:
  - Strictly fulfills Principle I (Ledger Integrity & Immutability) and User Story 2 / FR-004.
  - Eliminates silent behavior where a user clicking "Delete" unexpectedly had the account deactivated instead of receiving clear feedback.
  - Guarantees that accidental deletion of active ledger data is prevented at the database and application boundary.
- **Alternatives Considered**:
  - _Silently deactivating on DELETE request_: Confusing to API clients and users who expect HTTP DELETE to remove resources; breaks explicit validation expectations.
  - _Allowing CASCADE deletion of journal entries_: Catastrophic violation of accounting principles (destroys double-entry ledger balance).

### 3. Inactive Account Filtering in Selectors & Forms

- **Decision**:
  - Update `GET /api/accounts` in `AccountController` to support `@Query('status') status?: 'ACTIVE' | 'INACTIVE' | 'ALL'`.
  - For transaction creation (`NewTransactionPage`, `TransactionModal`, `asiento-libre`) and budget assignment modals (`BudgetAccountModal`), query with `status=ACTIVE` (or default to `ACTIVE` when unspecified).
  - For Chart of Accounts views (`/accounts`, `/accounts/manage`), use `GET /api/accounts/summary` (or `status=ALL`), which returns all accounts along with their current status (`ACTIVE` or `INACTIVE`) and computed balances.
  - On the client side, add defensive filtering in transaction row comboboxes to ensure inactive accounts are never rendered as selectable options for new entries.
- **Rationale**:
  - Prevents human error by guaranteeing users cannot post new transactions or allocate budgets to retired accounts.
  - Keeps dropdown lists compact and focused on operational accounts.
- **Alternatives Considered**:
  - _Returning all accounts and filtering exclusively on frontend_: Leaves backend API open to invalid client requests and wastes bandwidth.

### 4. User Interface Workflows in Chart of Accounts & Management Table

- **Decision**:
  - In `AccountsManagePage` (`frontend/src/app/accounts/manage/page.tsx`):
    - Replace the static text `"Deshabilitado"` in the action column for inactive accounts with an interactive `"Reactivar"` button.
    - Provide a `"Desactivar"` button for active accounts.
    - When clicking "Reactivar", call `api.accounts.update(id, { status: 'ACTIVE' })` and update table state immediately.
  - In `AccountsList.tsx` / `frontend/src/app/accounts/page.tsx`:
    - Render an `"Inactiva"` badge next to inactive account names.
    - For inactive accounts, provide a `"Reactivar"` action button.
    - For active accounts without system roles, provide a `"Desactivar"` action (and `"Eliminar"` if 0 movements).
    - If deactivating an account with a non-zero balance, display a warning dialog confirming that the account will be retired with an existing balance.
- **Rationale**:
  - Delivers a 1-click reactivation workflow satisfying SC-001 (<2 clicks).
  - Clear visual feedback using Tailwind badges and Lucide icons consistent with the monorepo design system.
- **Alternatives Considered**:
  - _Complex multi-step wizard for status changes_: Unnecessary friction for routine operational tasks.

### 5. Historical Financial Reporting Invariants

- **Decision**: Retain existing reporting query logic in `BalanceSheetUseCase` and `IncomeStatementUseCase`:
  - Zero-balance inactive accounts are excluded from current-period balance sheets to avoid report clutter.
  - Accounts with historical journal entries within a queried past period render completely with their original names and balances, regardless of current active/inactive status.
- **Rationale**:
  - Meets GAAP/IFRS retrospective reporting requirements and fulfills FR-008 and SC-004.

---

## Summary of Decisions

| Area                    | Decision                                                                         | Rationale                                                        |
| :---------------------- | :------------------------------------------------------------------------------- | :--------------------------------------------------------------- |
| **Reactivation API**    | `PATCH /api/accounts/:id` with `{ status: 'ACTIVE' \| 'INACTIVE' }`              | Clean REST pattern, transactional, type-safe across monorepo     |
| **Deletion Guard**      | Block DELETE with HTTP 400 if `entriesCount > 0`; allow if `entriesCount === 0`  | Guarantees ledger immutability and clear error communication     |
| **Selector Filtering**  | `GET /api/accounts?status=ACTIVE` + client combobox guards                       | Eliminates human error in posting to retired accounts            |
| **UI Actions**          | Direct "Reactivar" button on inactive rows in `/accounts` and `/accounts/manage` | 1-click reactivation (SC-001), immediate responsive state update |
| **Reporting Integrity** | Hide zero-balance inactive accounts in current period; show in past periods      | Clean presentation without loss of audit history                 |
