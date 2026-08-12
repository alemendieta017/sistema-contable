# Feature Specification: Create Account from Dropdown in Transaction Entry

**Feature Branch**: `018-create-account-in-dropdown`

**Created**: 2026-08-12

**Status**: Draft

**Input**: User description: "Agregar cuenta desde menu selector de cuentas en carga de asiento contable. por si haya una cuenta que no exista aun, facilitar la creación de dicha cuenta desde el desplegable de cuentas. esto para facilitar la carga de cuentas desde el menu de transacciones"

## Clarifications

### Session 2026-08-12

- Q: ¿Qué campos debe solicitar el modal de creación rápida de cuenta desde el desplegable del asiento contable? → A: Reutilizar exactamente la misma interfaz y campos del modal de creación existente ("Crear Cuenta o Categoría"): Nombre de la cuenta, Tipo de rubro, Checkbox "Es cuenta de Efectivo/Banco" (para flujo de caja) y Moneda (por defecto PYG).

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Quick Account Creation from Account Dropdown (Priority: P1)

As a bookkeeper or accountant entering a journal entry or transaction, I want an inline "+ Add New Account" option inside the account selector dropdown (including when typing a search term that doesn't exist), so that I can create missing accounts on the fly without abandoning my transaction entry.

**Why this priority**: Core workflow optimization. Eliminates friction and lost work when encountering unrecorded accounts during batch transaction loading or entry.

**Independent Test**: Can be verified by opening the journal entry or transaction creation form, opening an account selection dropdown, selecting the "+ Add New Account" option or searching for a non-existent account name, creating the account, and verifying that it is saved and immediately selected in the active line item.

**Acceptance Scenarios**:

1. **Given** a user filling out line items in a transaction form, **When** opening the account selector dropdown, **Then** an explicit "+ Add New Account" action button is visible at the top or bottom of the dropdown list.
2. **Given** a user searching for an account name in the dropdown (e.g. "Servicios de Internet") that does not match any existing active account, **When** no exact matches are found, **Then** the dropdown displays a shortcut option: "+ Create account 'Servicios de Internet'".
3. **Given** a user selecting the quick account creation action, **When** triggered, **Then** a focused account creation modal or drawer opens while preserving all filled transaction form fields (header, dates, descriptions, line debits/credits).

---

### User Story 2 - Account Creation Modal with Auto-Selection (Priority: P2)

As a user creating a new account from the transaction dropdown, I want a concise modal dialog to input essential account details (Account Name, Type/Category, Parent Account, Code) and automatically select the new account in the active line upon saving.

**Why this priority**: Ensures data integrity in the Chart of Accounts while maintaining seamless user velocity during transaction entry.

**Independent Test**: Can be verified by opening the quick account creation modal, submitting valid account details, and verifying that the modal closes, the new account appears in the Chart of Accounts, and the active line item immediately selects the newly created account.

**Acceptance Scenarios**:

1. **Given** the quick account creation modal is open with a prefilled name from the search input, **When** the user provides mandatory attributes (e.g. Account Type and Parent Account) and submits, **Then** the account is persisted to the company's Chart of Accounts.
2. **Given** successful account creation, **When** the modal closes, **Then** the newly created account is automatically set as the selected value for the transaction line item that triggered the creation.
3. **Given** successful account creation, **When** opening account selector dropdowns on other lines within the same transaction form, **Then** the newly created account is available in their selection list without requiring a page refresh.

---

### User Story 3 - Draft Preservation & Cancel Safety (Priority: P3)

As a user mid-way through entering a multi-line journal entry, I want to cancel or dismiss the quick account creation dialog at any time without losing any previously typed line data or form state.

**Why this priority**: Prevents user frustration and data loss from accidental clicks or decision changes during account creation.

**Independent Test**: Fill multiple lines of a transaction, open the quick account modal, press Cancel or hit Escape, and verify that all original form inputs remain completely intact.

**Acceptance Scenarios**:

1. **Given** a transaction form with multiple partially filled debit and credit lines, **When** opening and subsequently canceling the quick account modal, **Then** all entered values (amounts, descriptions, dates, pre-selected accounts) remain unchanged.
2. **Given** an invalid input in the quick account modal (e.g. duplicate account code), **When** submission fails, **Then** an inline error is displayed within the modal, preserving the user's typed values in the modal without closing it or clearing the transaction draft.

---

### Edge Cases

- What happens when a user creates an account with a name or code that already exists? The system MUST display an explicit validation error inside the quick creation modal and highlight the conflicting field.
- What happens if the user closes the modal via the backdrop or Escape key? The system MUST close the modal cleanly, return focus to the account dropdown, and preserve all transaction line inputs without creating any partial account record.
- What happens if the company has strict automatic code generation rules? The system MUST pre-fill or compute the next available account code based on the selected Parent Account/Category.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The account selection component used in journal entry and transaction forms MUST render an explicit "+ Add New Account" (or "+ Crear Cuenta") action element.
- **FR-002**: When a user inputs a search query in the account dropdown that yields no exact match, the dropdown MUST present a dynamic quick-create option using the search string as the default proposed account name.
- **FR-003**: Triggering the quick-create action MUST open an inline modal/slide-over dialog without navigating away from the transaction page or causing a page reload.
- **FR-004**: The quick account creation modal MUST reuse the standard account creation schema, capturing Account Name (Nombre de la cuenta), Category/Type (Tipo de rubro), Cash/Bank flag (Es cuenta de Efectivo/Banco), and Currency (Moneda, defaulting to PYG).
- **FR-005**: Upon successful account creation, the system MUST automatically set the newly created account as the selected account on the active transaction line item.
- **FR-006**: The system MUST update the in-memory accounts cache/list of the active transaction session so that all subsequent line items in the same form can immediately select the new account.
- **FR-007**: The system MUST preserve 100% of filled transaction header fields (date, description, reference, currency) and line item entries (debits, credits, existing selected accounts) throughout the account creation interaction.
- **FR-008**: The account creation backend/service invocation MUST observe multi-tenant isolation, assigning the created account strictly to the active company context.

### Key Entities

- **Account (Cuenta Contable)**: Represents a ledger account within the company's Chart of Accounts (Plan de Cuentas). Key attributes include `id`, `code`, `name`, `type`, `parentId`, `companyId`, `isActive`.
- **Journal Entry / Transaction Line Item (Línea de Asiento / Transacción)**: Represents an individual debit or credit entry within a transaction form, referencing an `Account`.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Bookkeepers can create and select a missing account directly within a transaction entry form in under 15 seconds.
- **SC-002**: 100% of in-progress transaction draft data (header and line items) is preserved when creating a new account inline.
- **SC-003**: Zero page reloads or full-page navigations required during inline account creation.
- **SC-004**: Zero validation errors or unhandled exceptions when immediately using the newly created account in double-entry balance validation.

## Assumptions

- The active user possesses the necessary permissions (e.g. Accountant or Admin role) to create accounts in the active company's Chart of Accounts.
- The system supports hierarchical Chart of Accounts structure where new accounts are nested under existing asset, liability, equity, revenue, or expense categories.
- Standard double-entry ledger balance rules apply to transactions created using newly added accounts.
