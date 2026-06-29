# Feature Specification: Improve Accounting Entry Form

**Feature Branch**: `006-improve-accounting-entry-form`

**Created**: 2026-06-29

**Status**: Draft

**Input**: User description: "mejorar el formulario de entrada de asientos contables, debe verse cool, genial, los rubros deben ser entradas por líneas, no por cards. Diseño clean. Las palabras debe haber estan muy grandes desproporcional al resto. la pantalla de cargar nuevo asiento contable debe respetar la moneda por defecto, y en este caso, tambien los decimales y el simbolo. no se esta actualmente respetando la cantidad de decimales en los placeholders de los formularios ni tampoco los simbolos de la moneda por defecto"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Clean Line-Based Entry Creation (Priority: P1)

As an accountant or user, I want to record journal entries using a compact, line-based table layout rather than block-like cards, so that I can see all lines clearly at a glance and quickly enter transaction data.

**Why this priority**: Core layout request from the user. Replaces cards with rows for a cleaner and more professional accounting feel.

**Independent Test**: Navigate to the "Asiento Libre" page or open the "Registrar Asiento Contable" modal, verify that entries are presented as table-like rows instead of cards.

**Acceptance Scenarios**:
1. **Given** the Asiento Libre page, **When** I add multiple entry lines, **Then** they appear in a clean table/grid line-by-line layout.
2. **Given** the entries list, **When** I view the "Debe" and "Haber" text/labels/buttons, **Then** their size and formatting are balanced and proportionate with the rest of the text inputs.

---

### User Story 2 - Respect Default Currency, Decimals, and Symbols (Priority: P1)

As a user, I want the entry form and its validation to respect my system's default (base) currency, showing its correct currency symbol and decimals in placeholders (e.g. `0` for PYG / `0.00` for USD) and totals.

**Why this priority**: Ensures currency consistency across screens and prevents layout/placeholder mismatches.

**Independent Test**: If base currency is PYG (decimalPlaces: 0, symbol: ₲), verify that the amount input placeholder is `0` and currency symbol prefix/suffix displays `₲`. If base currency is USD, verify placeholder is `0.00` and symbol is `$`.

**Acceptance Scenarios**:
1. **Given** default currency is configured, **When** the entry form loads, **Then** all input placeholders for amounts use the correct decimal places format (e.g., `0.00` or `0`).
2. **Given** the balance summary cards or footers, **When** total Debe, total Haber, and Difference are shown, **Then** they display the default currency symbol and decimals.

---

### User Story 3 - Keyboard and Action Flow in Rows (Priority: P2)

As a power user, I want to easily add and remove entry lines in the row-based layout without losing focus, allowing rapid bookkeeping input.

**Why this priority**: Keeps the user experience smooth and efficient.

**Independent Test**: Add 3 lines, delete the second line, and verify that the layout adapts instantly and correctly calculates total Debe, total Haber, and Difference.

**Acceptance Scenarios**:
1. **Given** 3 entry rows, **When** I click the delete icon on the second row, **Then** that row is removed and the remaining rows shift up smoothly.
2. **Given** a new entry row is added, **When** I select a account and enter amounts, **Then** totals and status indicators are updated in real-time.

---

### Edge Cases

- **Very narrow screens (mobile)**: On mobile viewports, the multi-column row could overflow. The layout must adjust gracefully using responsive wrappers or compact flex behaviors to prevent text truncation or broken alignments.
- **Long account names**: If an account has a long hierarchical name (e.g. "Activo › Corriente › Caja y Bancos › Caja Chica"), the selector must handle the text smoothly without expanding the row height disproportionally.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The entries / items (rubros) in `AsientoLibrePage` MUST be displayed as clean rows in a table/grid layout rather than separate card components.
- **FR-002**: The text labels, status badges, and toggle buttons for "Debe" and "Haber" MUST be styled with proportionate, clean typography (e.g., standard text size like `text-xs` or `text-sm` instead of loud, over-sized fonts).
- **FR-003**: The entry row layout MUST align columns for "Cuenta / Categoría", "Tipo (Debe/Haber)", "Monto", and "Acciones (Eliminar)" cleanly.
- **FR-004**: The design MUST use subtle colors, border lines, and consistent padding to achieve a "cool, premium, clean" aesthetic matching the recent UI/UX improvements.
- **FR-005**: Both the Asiento Libre page and the Transaction Modal components MUST share or align on this clean, line-based layout.
- **FR-006**: Both forms MUST fetch/detect the system's default currency and apply its specific currency symbol and decimal formatting to the amount input placeholders (e.g. `0` for 0 decimals, `0.00` for 2 decimals), totals, and difference labels.

### Key Entities

- **JournalEntry**: Represents a single line within a transaction. Includes:
  - `accountId`: Reference to the selected account.
  - `entryType`: "DEBIT" (Debe) or "CREDIT" (Haber).
  - `amount`: Numeric value of the entry.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can view up to 10 entry lines on a single screen without scrolling, due to the compact row layout.
- **SC-002**: Typography size for "Debe/Haber" matches or is subordinate to the default input field font sizes (e.g. 12px/14px).
- **SC-003**: Input placeholders for entry amounts automatically render with the exact number of decimal places defined by the base currency (e.g. no decimals for PYG, 2 decimals for USD).
- **SC-050**: The form achieves a cohesive visual design validated manually against modern Tailwind CSS style standards.

## Assumptions

- Tailwind CSS v4 or standard Tailwind classes will be used for spacing, sizing, and colors.
- The state logic and endpoint integrations of `api.transactions.create` remain completely unchanged; this is a pure UI/UX clean-up.
