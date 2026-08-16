# Phase 0 Research: Danger Zone Settings - Factory Reset & Account Deletion

## Overview

This research evaluates architectural decisions, data cascading patterns, security confirmation mechanisms, and baseline account re-initialization strategies for the Danger Zone functionality.

---

## 1. Data Cascading & Atomic Purge Strategy

### Context & Problem

The system stores interconnected financial and structural entities for each user:

- `users`
- `password_reset_tokens` (FK -> `users.id`)
- `accounts` (FK -> `users.id`, self-referencing `parent_id` FK -> `accounts.id`, FK -> `currencies.id`)
- `fiscal_years` (FK -> `users.id`)
- `periods` (FK -> `fiscal_years.id`)
- `account_period_balances` (FK -> `accounts.id`, FK -> `periods.id`)
- `budgets` (FK -> `users.id`, FK -> `periods.id`, FK -> `accounts.id`)
- `budget_items` (FK -> `budgets.id`, FK -> `accounts.id`)
- `budget_reassignments` (FK -> `users.id`, FK -> `periods.id`, FK -> `accounts.id`)
- `transactions` (FK -> `users.id`, self-referencing `reversal_of_id` FK -> `transactions.id`)
- `journal_entries` (FK -> `transactions.id`, FK -> `accounts.id`)

In Postgres/TypeORM, deleting accounts or transactions directly can trigger foreign key constraint errors if child records or self-referential foreign keys (`reversal_of_id`, `parent_id`) exist.

### Decision

Execute data purging within a single atomic database transaction using `SERIALIZABLE` or `REPEATABLE READ` isolation:

1. **Transaction & Journal Entries Purge**:
   - Query all transaction IDs belonging to `userId`.
   - Clear `reversal_of_id = NULL` on transactions to break self-references.
   - Delete all `journal_entries` for these transactions.
   - Delete all `transactions` for `userId`.
2. **Budget Data Purge**:
   - Delete `budget_reassignments` for `userId` (and where period/account belongs to user).
   - Delete `budget_items` for user budgets/accounts.
   - Delete `budgets` for `userId`.
3. **Period & Fiscal Year Purge**:
   - Delete `account_period_balances` associated with user accounts and user periods.
   - Delete `periods` associated with user fiscal years.
   - Delete `fiscal_years` for `userId`.
4. **Account Purge**:
   - Update `accounts` for `userId` setting `parent_id = NULL` to break hierarchical tree constraints.
   - Delete all `accounts` for `userId`.
5. **For Factory Reset**:
   - Re-seed initial base chart of accounts (`DEFAULT_CHART_OF_ACCOUNTS`) attached to the base currency.
   - Keep user record and authentication session active.
6. **For Account Deletion**:
   - Delete all `password_reset_tokens` for `userId`.
   - Delete `users` record where `id = userId`.

### Rationale

- Guaranteed 0 orphaned records and avoids FK constraint violations.
- Full transactional rollback: if any operation fails, no data is partially lost or corrupted.
- Adheres to Constitution Principle I (Double-Entry Bookkeeping & Ledger Integrity) and Principle II (Clean Architecture).

### Alternatives Considered

- **Database ON DELETE CASCADE everywhere**: Requires altering existing database schema migrations and risks unintentional cascading deletions across shared entities. Programmatic transaction-level cascading is safer, strictly scoped, and testable.
- **Soft Deletion (`deleted_at`)**: Rejected because user requirements explicitly demand permanent data purge ("eliminar todos sus datos y resetear... eliminar TODA la cuenta y que desaparezca") for privacy and fresh-start guarantees.

---

## 2. High-Friction Confirmation & Re-Authentication Pattern

### Context & Problem

Destructive actions are irreversible. Misclicks, hasty clicks, or automated CSRF/session hijackings must be prevented. The UX must provide clear danger cues (GitHub-style Danger Zone) and multi-factor confirmation.

### Decision

1. **UI Visual Presentation**:
   - Distinct "Zona de Peligro" container at the bottom of the `/settings` page.
   - Red accent border (`border-red-500/30` / `border-red-600`), warning badges (`ShieldAlert`, `AlertTriangle`), and red trigger buttons (`bg-red-600 hover:bg-red-700`).
2. **Confirmation Modals**:
   - **Factory Reset**:
     - Explicit warning list of what is wiped (transactions, journals, budgets, periods, custom accounts).
     - Required confirmation phrase: `RESTABLECER DATOS`.
     - Required input: Current account password.
     - Action button disabled until input matches exactly (case-sensitive) and password is non-empty.
   - **Account Deletion**:
     - Critical warning that account profile, login, and all data will be permanently wiped.
     - Required confirmation phrase: `ELIMINAR MI CUENTA` or user email.
     - Required input: Current account password.
     - Action button disabled until input matches exactly and password is non-empty.
3. **Backend Password Verification**:
   - Both backend use cases require `currentPassword`.
   - The backend retrieves `UserEntity.passwordHash`, runs `bcrypt.compare(currentPassword, hash)`, and throws `UnauthorizedException(AuthErrorCode.INVALID_CURRENT_PASSWORD)` if invalid.

### Rationale

- Introduces deliberate friction, eliminating accidental triggers (SC-001, SC-002).
- Server-side password validation prevents unauthorized client-side tampering.

---

## 3. Starter Accounts Strategy on Factory Reset

### Context & Problem

After a factory reset, the user needs an initial functional accounting structure to immediately record new transactions without manual setup from scratch.

### Decision

Define a centralized `DEFAULT_STARTER_ACCOUNTS` specification in the application/domain layer:

1. **Activos**:
   - `Caja y Efectivo` (Type: `ASSET`, `isCashOrBank: true`)
   - `Cuenta Bancaria` (Type: `ASSET`, `isCashOrBank: true`)
2. **Pasivos**:
   - `Tarjetas de Crédito` (Type: `LIABILITY`)
   - `Cuentas por Pagar` (Type: `LIABILITY`)
3. **Patrimonio Neto**:
   - `Capital Inicial` (Type: `EQUITY`)
   - `Resultado del Ejercicio` (Type: `EQUITY`, `systemRole: 'NET_INCOME'`)
   - `Utilidades Retenidas` (Type: `EQUITY`, `systemRole: 'RETAINED_EARNINGS'`)
4. **Ingresos**:
   - `Sueldo y Salarios` (Type: `INCOME`)
   - `Ingresos Extraordinarios` (Type: `INCOME`)
5. **Gastos**:
   - `Alimentación y Supermercado` (Type: `EXPENSE`)
   - `Servicios Básicos (Luz, Agua, Internet)` (Type: `EXPENSE`)
   - `Transporte y Movilidad` (Type: `EXPENSE`)
   - `Salud y Cuidado Personal` (Type: `EXPENSE`)
   - `Otros Gastos` (Type: `EXPENSE`)

All accounts are linked to the system base currency (`PYG` or the first active currency).

### Rationale

- Immediately provides the essential system roles (`NET_INCOME`, `RETAINED_EARNINGS`) required for fiscal closing and balance sheet generation.
- Covers basic personal/family finance categories out-of-the-box.

---

## 4. Session Termination & Client Cleanup on Account Deletion

### Context & Problem

When an account is deleted, active tokens in local storage or memory must be eradicated, and the user must be redirected to the login/landing page. Subsequent API calls from any active tab must fail gracefully with 401.

### Decision

1. Server invalidates/destroys the user entity and related reset tokens.
2. Frontend `api.auth.logout()` is called, removing `auth_token` and `auth_user` from `localStorage`.
3. Frontend redirects the user to `/login?deleted=true` or `/` with an informative notification.

---

## Summary of Technical Choices

| Topic               | Selected Choice                                    | Rationale                                               |
| ------------------- | -------------------------------------------------- | ------------------------------------------------------- |
| Data Purging        | Transactional programmatic cascade                 | Ensures 0 orphaned records and atomic rollback          |
| Security            | Phrase match + Backend bcrypt check                | Deliberate friction prevents accidental data loss       |
| Base Seeding        | Standard starter accounts with System Roles        | Immediate post-reset usability with system roles intact |
| Module Architecture | Clean Architecture use cases in `DangerZoneModule` | Separation of concerns, testability, SOLID compliance   |
