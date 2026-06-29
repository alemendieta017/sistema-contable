# Feature Specification: Restore Transaction UI Borders and Look & Feel

**Feature Branch**: `005-restore-transaction-ui`

**Created**: 2026-06-29

**Status**: Draft

**Input**: User description: "tras el ultimo spec, la seccion de transacciones quedo bien feo. quiero que vuelva a tener los bordes y look and feel que tienen la otras pantallas"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Consistent Rounding and Card Styles (Priority: P1)

Restores the look and feel of the transaction dashboard summary cards, view switcher tabs, and layout containers to match the cards and components on other screens (like Accounts and Budgets).

**Why this priority**: Highly visible UI regression that ruins design consistency across the application.

**Independent Test**: Can be fully tested by navigating to the "Libro Diario" page and verifying visually that card borders, shadows, and tabs match the modern, rounded styling of the "Cuentas y Rubros" page.

**Acceptance Scenarios**:

1. **Given** a user is on the Transactions page, **When** they look at the top three summary cards (Ingresos, Egresos, Saldo Neto), **Then** these cards must have rounded corners matching the style of other cards in the app (e.g., `rounded-2xl` or `rounded-xl`) and standard border colors (e.g., `border-slate-100 dark:border-slate-700` or similar).
2. **Given** a user is on the Transactions page, **When** they look at the view switcher tabs (Diario, Calendario, Mensual), **Then** the outer border and the inner buttons must have consistent rounding (e.g., `rounded-xl` or similar) instead of blocky `rounded-sm` styling.

---

### User Story 2 - Consistent List and Table Views (Priority: P2)

Aligns the borders, dividers, and background colors of transaction records (Daily view, monthly lists) with the layout styling used in standard list components like `AccountsList`.

**Why this priority**: Important for clean content organization and data readability.

**Independent Test**: Can be tested by switching between "Diario", "Calendario", and "Mensual" views and checking the alignment, divider lines, and card border corners of the lists.

**Acceptance Scenarios**:

1. **Given** a user is viewing the transaction list, **When** they review the transaction rows, **Then** the list container must have rounded borders and dividers consistent with `AccountsList`.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST style the transactions summary cards using the card border radius and shadows matching the rest of the application (e.g., `rounded-2xl` or `rounded-xl`, `border-slate-100 dark:border-slate-700`).
- **FR-002**: The view switch tab container and its individual buttons MUST be styled with rounded corners and consistent hover/active states (e.g. using `rounded-xl` or similar tokens).
- **FR-003**: The transaction filter card and layout container MUST use borders, padding, and rounding consistent with other page containers.
- **FR-004**: The daily, monthly, and calendar transaction views MUST use table/list borders, dividing lines, and rounding consistent with the AccountsList component.

### Key Entities *(include if feature involves data)*

- **Transaction**: Represents an accounting transaction with Debit and Credit entries, which is displayed in the list and summary cards.
- **Account**: Represents an account or category associated with transaction entries.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of container elements on the transactions page use standard border-radius and border-color design tokens matching other views (e.g., Accounts).
- **SC-002**: Visual consistency check passes on mobile and desktop viewports, ensuring no hard-coded `rounded-sm` or mismatched gray borders remain in the transactions module.

## Assumptions

- Design tokens like `--radius` and Tailwind roundness levels (`rounded-2xl`, `rounded-xl`, etc.) are already defined and should be reused.
- The functional behavior of the transactions lists, calendar, filters, and reversal remains unchanged.
