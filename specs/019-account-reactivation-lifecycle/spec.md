# Feature Specification: Account Reactivation & Lifecycle Management

**Feature Branch**: `019-account-reactivation-lifecycle`

**Created**: 2026-08-15

**Status**: Draft

**Input**: User description: "Vamos a analizar cada una de tus preguntas con total profundidad y rigor contable y técnico: 1. ¿Es o no es posible reactivar una cuenta inactiva? SÍ categórico. 2. Si una cuenta tuvo movimientos y luego se deja su saldo en ₲ 0, ¿se puede o se debe BORRAR FÍSICAMENTE del plan de cuentas? NO. NUNCA se debe borrar físicamente. 3. Implicancias de borrar físicamente: Destrucción de la Historia Contable (Violación de Auditoría y Normas GAAP/IFRS), Integridad de Base de Datos (Foreign Keys). 4. ERP Standard: 0 Asientos -> Borrado Físico permitido; >= 1 Asiento -> Inactivación/Bloqueo permanente. Cuentas inactivas no aparecen en selectores de nuevas transacciones/presupuestos, permanecen en reportes históricos, se ocultan en balance actual si saldo es 0, y pueden reactivarse en cualquier momento."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Reactivate an Inactive Account from Chart of Accounts (Priority: P1)

As a financial user or business accountant,
I want to reactivate a previously deactivated/inactive account from the Chart of Accounts interface,
So that the account becomes operational again for recording new transactions and budgets without losing any of its historical accounting records.

**Why this priority**: It solves an operational blocker where paused or temporarily retired accounts (e.g. reopened bank accounts, renewed expense categories) could not be returned to active duty.

**Independent Test**: Can be tested by marking an active account as inactive, navigating to the Chart of Accounts view, locating the inactive account, clicking "Reactivar", and confirming its status transitions to active and becomes selectable in transaction forms.

**Acceptance Scenarios**:

1. **Given** an account in `INACTIVE` status in the Chart of Accounts, **When** the user clicks the "Reactivar" (Reactivate) action and confirms, **Then** the account status updates to `ACTIVE`, visual indicators update to reflect active status, and a success confirmation is displayed.
2. **Given** an account that was reactivated to `ACTIVE`, **When** the user opens any transaction or budget creation form, **Then** the newly reactivated account appears in the selectable accounts dropdown list.

---

### User Story 2 - Enforce Ledger Integrity Rules for Inactivation vs Physical Deletion (Priority: P1)

As a system administrator or compliance auditor,
I want the system to strictly block physical deletion of any account with historical journal entries while allowing physical deletion only for unused accounts,
So that GAAP/IFRS audit trails, historical financial statements, and database integrity are permanently safeguarded.

**Why this priority**: Core accounting principle I (Ledger Integrity & Immutability). Physical deletion of accounts with historical movements breaks general ledgers, trial balances, and audit trails.

**Independent Test**: Can be tested by attempting to physically delete an account with $\ge 1$ historical journal entries (which must be rejected with a clear message suggesting inactivation), and attempting to physically delete an account with 0 movements (which must succeed).

**Acceptance Scenarios**:

1. **Given** an account with at least one historical journal entry (regardless of whether current balance is zero or non-zero), **When** a user attempts to delete the account, **Then** the system rejects physical deletion with a clear validation message informing the user that accounts with history cannot be deleted and must be set to `INACTIVE`.
2. **Given** an account that was created by mistake and has zero historical journal entries, **When** the user deletes the account, **Then** the account is cleanly removed from the system.
3. **Given** an active account with historical entries whose balance is zero, **When** the user chooses to deactivate it, **Then** the account status changes to `INACTIVE` while preserving all related historical entries intact.

---

### User Story 3 - Inactive Account Safeguards and Visibility in Operation & Reporting (Priority: P2)

As a day-to-day user creating transactions and reviewing reports,
I want inactive accounts to be shielded from daily transaction entry while remaining fully accessible in historical reports,
So that human error is minimized during data entry without compromising retrospective accounting analyses.

**Why this priority**: Keeps daily workflows clean and error-free while ensuring regulatory reporting compliance.

**Independent Test**: Can be tested by verifying that inactive accounts are omitted from new transaction/transfer account selectors, but still render properly when viewing past ledger periods or historical journal entries.

**Acceptance Scenarios**:

1. **Given** an account in `INACTIVE` status, **When** a user opens the transaction creation form or transfer modal, **Then** the inactive account is excluded from the list of selectable accounts.
2. **Given** an account in `INACTIVE` status with a balance of zero in the current period, **When** generating the current period Balance Sheet, **Then** the account is omitted from the report to prevent clutter.
3. **Given** an account in `INACTIVE` status that participated in transactions during a prior historical period, **When** generating the General Ledger (Libro Mayor) or Trial Balance for that prior period, **Then** the account and its movements render accurately with full accounting details.

---

### Edge Cases

- **Reactivating an already active account**: The system should gracefully handle or disallow redundant reactivation requests with an appropriate informational response without causing state inconsistency.
- **Inactivating an account with a non-zero balance**: The system should warn the user if an account still holds an active balance, advising them to reclassify or transfer the balance to zero before deactivation, or confirm deactivation as a frozen balance.
- **Parent-Child account hierarchy**: Inactivating a parent category account must either cascade or prevent child accounts from accepting transactions without breaking the chart hierarchy; reactivating a child account whose parent is inactive should handle parent availability gracefully.
- **Concurrent status update**: If multiple users edit the account status simultaneously, optimistic or transactional checks must prevent race conditions.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST support updating an account's operational status between `ACTIVE` and `INACTIVE` through the account management interface and API.
- **FR-002**: System MUST allow users to trigger a "Reactivate" action on any `INACTIVE` account, restoring its status to `ACTIVE`.
- **FR-003**: System MUST permit physical deletion of an account IF AND ONLY IF the account has exactly zero historical journal entries/movements.
- **FR-004**: System MUST strictly prohibit physical deletion of any account that possesses one or more historical journal entries, returning a descriptive error indicating that inactivation must be used instead.
- **FR-005**: System MUST exclude `INACTIVE` accounts from dropdowns, pickers, and selectors used to record new transactions, transfers, and budgets.
- **FR-006**: System MUST preserve all historical journal entries, ledger records, and audit logs linked to `INACTIVE` accounts without modification or data loss.
- **FR-007**: System MUST clearly display the `INACTIVE` status badge in the Chart of Accounts list and provide actions to edit, reactivate, or view details.
- **FR-008**: System MUST hide zero-balance inactive accounts from the current period Balance Sheet report while retaining their visibility in past historical period reports.

### Key Entities

- **Account (Cuenta)**:
  - `id`: Unique account identifier.
  - `code`: Chart of accounts hierarchical code (e.g. "1.1.01.01").
  - `name`: Account name (e.g. "Banco Itaú Cta Cte").
  - `type`: Accounting class/type (Asset, Liability, Equity, Revenue, Expense).
  - `status`: Lifecycle state (`ACTIVE` | `INACTIVE`).
  - `balance`: Calculated current net balance.
  - `has_movements`: Boolean / indicator determining if historical journal lines exist.
- **Journal Entry Line (Línea de Asiento)**:
  - `id`: Unique line identifier.
  - `account_id`: Foreign key reference to the Account (protected by referential integrity).
  - `debit` / `credit`: Monetary amounts.
  - `entry_id`: Parent transaction / journal entry reference.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Users can reactivate any inactive account in under 2 clicks from the Chart of Accounts screen.
- **SC-002**: 100% of physical deletion attempts on accounts with historical movements are blocked, maintaining zero data corruption or broken foreign key constraints.
- **SC-003**: 100% of newly created transaction forms filter out inactive accounts, preventing accidental posting to retired accounts.
- **SC-004**: Historical audit reports (General Ledger, Trial Balance) for past periods retain 100% accuracy and display the original account names and movements regardless of current active/inactive status.
- **SC-005**: Account status modification takes effect immediately across all client forms and selectors without requiring a full application restart.

## Assumptions

- Account status is restricted to two deterministic states: `ACTIVE` and `INACTIVE`.
- Archival or inactivation does not alter any existing journal lines or computed past balances.
- Administrative users with account management permissions are authorized to both deactivate and reactivate accounts in accordance with organizational authorization policies.
