# Feature Specification: Danger Zone Settings - Factory Reset & Account Deletion

**Feature Branch**: `021-account-danger-zone`

**Created**: 2026-08-16

**Status**: Draft

**Input**: User description: "crear la funcionalidad que permita al usuario eliminar todos sus datos y resetear la cuenta como si fuera de fabrica. Este menú tiene que estar en ajustes. También implementar un boton que permita eliminar TODA la cuenta y que desaparezca. Ser muy tajante con el usuario y pedir confirmación excesiva antes de realizar estas acciones, de hecho, en ajustes debe mostrarse como un color rojo en una sección de peligro como en github danger zone."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Settings Danger Zone Section Display (Priority: P1)

As an authenticated user visiting the Settings page, I want to see a dedicated, high-contrast "Zona de Peligro" (Danger Zone) with clear red visual cues and explicit warnings so that I can easily recognize high-risk, irreversible operations.

**Why this priority**: Core presentation foundation that houses and visually isolates destructive operations from regular settings.

**Independent Test**: An authenticated user visits `/settings`, scrolls down, and sees the red-accented Danger Zone containing two distinct destructive actions: "Restablecer datos de fábrica" (Factory Reset) and "Eliminar cuenta permanentemente" (Delete Account).

**Acceptance Scenarios**:

1. **Given** an authenticated user on the Settings page, **When** they navigate through settings, **Then** they see a distinct "Zona de Peligro" section styled with a red border, warning icons, and descriptive text emphasizing that actions are irreversible.
2. **Given** the Danger Zone section, **When** viewed by the user, **Then** it clearly separates the "Restablecer datos de fábrica" action from the "Eliminar cuenta" action, each with its own explanation and red trigger button.

---

### User Story 2 - Factory Reset (Data Wipe & Reset to Defaults) (Priority: P1)

As an authenticated user, I want to delete all my financial records (transactions, journal entries, custom accounts, accounting periods, budgets, and backups) and reset my account to factory default settings without losing my user login, so that I can start my accounting completely fresh from a clean state.

**Why this priority**: Enables users to purge test or outdated financial data while maintaining their active user account and credentials.

**Independent Test**: A user with existing transactions and custom accounts triggers "Restablecer datos de fábrica", passes strict confirmation, and observes that all financial transactions and custom data are removed while initial default accounts are recreated and the user session remains active.

**Acceptance Scenarios**:

1. **Given** a user with existing accounting data clicking "Restablecer datos de fábrica", **When** they initiate the action, **Then** a strict confirmation modal opens detailing everything that will be deleted and what will be restored.
2. **Given** the factory reset confirmation modal, **When** the user inputs the exact confirmation phrase (e.g., `RESTABLECER DATOS`) and their correct password, **Then** the confirmation button enables, and submitting it wipes all accounting data, re-creates default starter accounts, and displays a success notification without logging the user out.
3. **Given** a factory reset in progress, **When** the operation finishes, **Then** all dashboards and ledger views show zero transactions and clean default balances.

---

### User Story 3 - Permanent User Account Deletion (Priority: P1)

As an authenticated user, I want to permanently delete my user account, login credentials, and all associated personal and financial data, so that my entire presence and history disappear completely from the system.

**Why this priority**: Essential privacy and account lifecycle feature granting users full control over their account data and termination.

**Independent Test**: A user triggers "Eliminar cuenta permanentemente", passes strict multi-field confirmation, and the system permanently destroys the user record, invalidates authentication tokens, and redirects them to the signup/login landing page.

**Acceptance Scenarios**:

1. **Given** an authenticated user clicking "Eliminar cuenta permanentemente", **When** they initiate the action, **Then** a strict modal opens warning that the account and all related data will be permanently and irreversibly destroyed.
2. **Given** the account deletion confirmation modal, **When** the user types their registered email address or the exact confirmation phrase (e.g., `ELIMINAR MI CUENTA`) and their correct password, **Then** the destructive button enables.
3. **Given** valid confirmation input and password, **When** the user confirms account deletion, **Then** the user account and all cascaded data are permanently deleted, active sessions are immediately invalidated, and the user is redirected to the home/login screen with a confirmation message.
4. **Given** a deleted user account, **When** attempting to log in with previous credentials, **Then** the login is rejected with an invalid credentials message as the account no longer exists.

---

### User Story 4 - Strict Confirmation Verification & Error Protection (Priority: P2)

As a user interacting with the Danger Zone, I want the system to enforce strict safeguards (exact text matching and password verification) and allow easy cancellation, so that I cannot accidentally trigger irreversible data destruction through misclicks or partial inputs.

**Why this priority**: Safeguards user financial data from accidental destruction by introducing deliberate friction and verification checks.

**Independent Test**: Verify that confirmation action buttons remain disabled until the exact required phrase is typed, that entering an incorrect password blocks execution with a clear error, and that canceling the modal closes it safely without changes.

**Acceptance Scenarios**:

1. **Given** a destructive confirmation modal open, **When** the user has not typed the exact required confirmation phrase or leaves the password field empty, **Then** the destructive execution button remains strictly disabled.
2. **Given** the exact confirmation phrase typed but an incorrect password provided, **When** the user attempts confirmation, **Then** the system rejects the operation, displays an authentication error, and keeps data intact.
3. **Given** a destructive confirmation modal open, **When** the user clicks "Cancelar" or closes the modal, **Then** the dialog closes immediately and no data is modified.

---

### Edge Cases

- What happens if a network failure occurs during the reset or deletion process? The backend transaction must be atomic (all-or-nothing rollback) so that no partial deletion or orphaned data remains.
- What happens if an account has open/locked accounting periods or pending closing entries? The reset and deletion processes must cascade cleanly through all dependencies (entries, periods, budgets, backups, tokens) without foreign key constraint violations.
- What happens if multiple browser tabs or sessions are active for the user when the account is deleted? The auth token/session is invalidated so subsequent requests from other tabs receive unauthorized (401) responses and redirect to login.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST display a dedicated "Zona de Peligro" (Danger Zone) section at the bottom of the Settings view, visually highlighted with red borders, alert badges, and clear cautionary descriptions.
- **FR-002**: System MUST provide a "Restablecer datos de fábrica" (Factory Reset) option within the Danger Zone that deletes all transactions, journal entries, accounting periods, budgets, and custom accounts for the authenticated user.
- **FR-003**: System MUST re-seed standard initial accounts (Plan de Cuentas base) upon completing a Factory Reset, allowing the user to immediately continue using their account.
- **FR-004**: System MUST keep the user logged in and active after executing a Factory Reset.
- **FR-005**: System MUST provide an "Eliminar cuenta permanentemente" (Delete Account) option within the Danger Zone that permanently deletes the user account, credentials, and all associated personal and financial records.
- **FR-006**: System MUST terminate all active sessions, invalidate tokens, and redirect to the public landing/login page immediately after an account is deleted.
- **FR-007**: System MUST require high-friction confirmation before executing either destructive action, demanding that the user:
  1. Type an exact required confirmation phrase (e.g. `RESTABLECER DATOS` for reset, `ELIMINAR MI CUENTA` or the user's email for deletion).
  2. Enter their current valid password.
- **FR-008**: System MUST keep destructive execution buttons disabled until the confirmation text matches the expected value precisely (case-sensitive).
- **FR-009**: System MUST verify the user's password on the server before executing any destructive operation, rejecting the request if the password is incorrect.
- **FR-010**: System MUST execute data reset and account deletion within atomic database transactions to ensure 100% data consistency with zero orphaned records.
- **FR-011**: System MUST allow users to safely cancel or dismiss confirmation dialogs at any point with zero impact on stored data.

### Key Entities _(include if feature involves data)_

- **User**: The primary account identity entity (Attributes: ID, full name, email address, password hash, status, timestamps).
- **Financial Workspace Data**: The complete collection of user-scoped records subject to purge (Entities: Accounts, Journal Entries, Transactions, Accounting Periods, Budgets, Backups).
- **Danger Zone Verification Request**: The payload passed to validate destructive actions (Attributes: Action Type [`FACTORY_RESET` | `DELETE_ACCOUNT`], Confirmation Text, Current Password).

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 100% of destructive Danger Zone operations require both matching confirmation text and valid password verification before execution.
- **SC-002**: 0% accidental executions: Destructive buttons cannot be clicked while confirmation inputs are incomplete or mismatched.
- **SC-003**: Factory Reset completes data purging and default account re-initialization in under 3 seconds.
- **SC-004**: Account Deletion completes data purge, session termination, and UI redirection in under 3 seconds with 0 orphaned records left in the database.
- **SC-005**: 100% of users can visually identify the Danger Zone on the Settings page due to clear red styling and danger warning indicators.

## Assumptions

- Users performing these actions understand that both Factory Reset and Account Deletion are irreversible and permanent.
- The standard chart of accounts used during initial user registration will serve as the baseline template for Factory Reset re-seeding.
- Confirmation dialogs and Danger Zone UI will follow the application's existing Tailwind / shadcn styling conventions with responsive mobile and desktop support.
