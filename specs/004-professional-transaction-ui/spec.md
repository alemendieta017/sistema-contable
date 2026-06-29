# Feature Specification: Professional Transaction UI

**Feature Branch**: `004-professional-transaction-ui`

**Created**: 2026-06-29

**Status**: Draft

**Input**: User description: "debemos mejorar la ui de transacciones para que tenga un look and feel mas profesional similar a un programa de contabilidad profesional. Debe ser mas compacto, aprovechar mejor los espacios, no tener tantos bordes redondeados, y mejorar el tamaño de los textos para no ser grandes en vano. Mejorar la seccion de filtros, la seccion de filtros puede ser mejorada, la temporalidad debe tener un selector de mes para que facilmente se pueda naveagar entre meses, y el selector de fecha desde hasta es una opcion CUSTOM que debe ser un filtro pero solo si el usuario lo quiere, lo mas sencillo es que en la vista de transaccioens diario se pueda mover entre mes a mes sencillamente, y solo si el usuario quiere modificar la temporalidad en fechas desde hasta, mas los filtros de las cuentas o rubros normalmente. Los counters debe decir Ingreso, Egresos (no gasto), saldo neto esta bien, pero en vista mobile ya no cabe. Formulario de nuevo asiento contable. Se debe mejorar muchisimo, esta horrible, debe verse como un formulario de un verdadero programa contable. Sobre todo facilitar la visualización e introduccion de rubros. La introduccion de montos en moneda debe ser facil, ahora es muy repetitivo, se debe repetir la introduccion tanto en el debe y haber y el programa deberia facilitar estas cosas optimizando la experiencia de carga de transacciones y llevandolo al maximo nivel glorificado. Ninguna menc a partida doble debe verse. Que es esto un programa para niños? Ya se sabe que un programa contable profesional funciona por partida doble. La seleccion de rubros al cargar el apunte tambien debe enaltecerse y llevarse al maximo nivel de experiencia, debe haber un buscador de rubros por nombre para encontrar facilmente el rubro buscado."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Compact and Professional Ledger View (Priority: P1)

As an accountant or financial administrator, I want to view my transaction records in a compact, highly dense table layout with clean, straight edges and appropriate text sizes so that I can see more information on my screen at once and work in a professional environment.

**Why this priority**: High priority as it defines the visual baseline and aesthetic improvement of the transaction records list page.

**Independent Test**: Can be fully tested by loading the transactions view, comparing text sizes and padding/borders with standard density patterns, and verifying that information density has increased.

**Acceptance Scenarios**:
1. **Given** a user loads the transactions screen, **When** they view the transaction rows, **Then** they see compact table cells, minimal/zero rounded corners (sharp corporate look), and readable but small typography (no wasted large text spaces).
2. **Given** a user is on the transactions view, **When** they look at the headers, **Then** there is no explicit mention of the words "partida doble" (double entry) in headers or descriptive labels.

---

### User Story 2 - Simplified Date Filtering and Navigation (Priority: P1)

As an accountant, I want to navigate my ledger transactions month-by-month via a simple selector, and only toggle custom date range parameters (from/to) when I explicitly need to run customized queries.

**Why this priority**: Essential to streamline the daily/monthly navigation without cluttering the screen with date range fields by default.

**Independent Test**: Can be tested by navigating months with next/prev buttons or a month dropdown, and toggling custom date fields to input custom ranges.

**Acceptance Scenarios**:
1. **Given** the user is viewing the transactions page, **When** they view the time filter section, **Then** they see a primary selector to easily switch between calendar months (e.g., month/year dropdown or back-and-forth controls).
2. **Given** the user wants to input custom start and end dates, **When** they click or toggle the "Rango de fechas personalizado" option, **Then** the start/end date input fields are revealed.
3. **Given** the custom range selector is closed, **When** the user changes the month, **Then** the list is automatically filtered by that selected calendar month.

---

### User Story 3 - Professional Transaction Form (Asiento Contable) (Priority: P1)

As an accountant, I want to record new financial entries using a layout optimized for ledger entry, featuring account searching by name/code and automatic balancing/distribution of credit/debit entries without repetitive typing.

**Why this priority**: Critical user interaction improvement to speed up ledger entry, reduce typos, and match professional accounting software patterns.

**Independent Test**: Can be tested by initiating a new journal entry, searching for account codes, typing a single debit amount, and observing if the system facilitates setting or balancing the corresponding credit amount without manual duplication.

**Acceptance Scenarios**:
1. **Given** the user is creating a new transaction, **When** they need to assign a category/account (rubro) to a line item, **Then** they can search for the account by typing its name or number inside a search/autocomplete box rather than selecting from a long un-filterable dropdown.
2. **Given** the user has entered a debit amount for a line item, **When** they proceed to create the matching line item, **Then** the application should provide a quick action or auto-balancing suggestion to match the opposite side (e.g., auto-filling the balancing credit amount or warning when unbalanced).
3. **Given** the transaction entry form is displayed, **When** looking at form titles or descriptions, **Then** there are no references to "partida doble" (double entry) terminology.

---

### User Story 4 - Responsive Metric Counters (Priority: P2)

As a mobile user, I want to see the key transaction summaries (Income, Expenses, Net Balance) formatted cleanly even on narrow screen widths without layout breakage.

**Why this priority**: Fixes mobile view readability issues when text size or layout causes overflow.

**Independent Test**: Can be tested by resizing the browser to mobile width (<640px) and checking if the metrics are still fully visible and correctly labeled.

**Acceptance Scenarios**:
1. **Given** a user opens the page on a mobile device, **When** they view the counters, **Then** the cards adapt their text and layout (using "Ingresos", "Egresos", "Neto" labels) to fit the viewport without truncation or horizontal scrolling.

---

### Edge Cases

- **Mismatched Debits/Credits**: When the user tries to save an entry where total debits do not equal total credits, the form must prevent submission and clearly show the unbalanced difference.
- **Account Search with No Matches**: When a user types a search query for a rubro that does not exist, the dropdown should show "No se encontraron rubros" and allow them to clear the filter or trigger creation.
- **Year-End/Month-End Boundaries**: The month navigator must handle year-crossing gracefully (e.g. going back from January 2026 selects December 2025).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001 (Compact Look)**: The transaction list and forms MUST use a high-density spacing system with straight or very small border-radius (e.g., `rounded-sm` or `rounded-none`) to align with professional accounting ERP systems.
- **FR-002 (Text Hierarchy)**: Headings and table labels MUST use optimized text sizes (e.g., standard readable `text-sm`, `text-xs`) to prevent oversized empty gaps.
- **FR-003 (Double-Entry Anonymization)**: The user interface MUST hide explicit references to "partida doble" (double entry) to keep the layout professional, as it is an implicit backend bookkeeping standard.
- **FR-004 (Month Selector)**: The primary time filter MUST be a month-by-month navigator (previous/next controls or a month picker) that defaults to the current month.
- **FR-005 (Custom Date Range Toggle)**: The start-date and end-date input fields MUST be hidden behind a "Personalizado" toggle/button and only render when active.
- **FR-006 (Account Search/Autocomplete)**: The transaction creation form MUST include an autocomplete search input for accounts/rubros to locate them by name or code.
- **FR-007 (Smart Amount Entry)**: The transaction creation form MUST optimize the input of amounts to minimize double-typing. This includes auto-balancing suggestions or quick clone buttons for debit/credit distribution.
- **FR-008 (Updated Metric Labels)**: The metric cards MUST be labeled "Ingresos" (Income), "Egresos" (Expenses), and "Saldo Neto" (Net Balance). The label "Gastos" MUST be replaced with "Egresos".
- **FR-009 (Responsive Counters)**: The summary counters row MUST collapse or adjust to stack or use ultra-compact formatting on mobile widths so that all three metrics fit without overflow.

### Key Entities *(include if feature involves data)*

- **Journal Entry (Asiento Contable)**: Represents the overall transaction event, containing a date, overall description, status, and list of entry lines.
- **Entry Line (Apunte)**: Represents an individual debit or credit line item inside a transaction, associated with a specific account (rubro) and containing the amount and type (Debit/Credit).
- **Account/Rubro**: The financial category linked to entry lines (e.g., Assets, Liabilities, Income, Expenses).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Page density increases so that at least 25% more transaction rows are visible on a standard 1080p desktop monitor compared to the previous version.
- **SC-002**: Users can create a balanced multi-line transaction with 50% fewer clicks and keystrokes for amount entry compared to manually typing the balance in both columns.
- **SC-003**: 100% of the metric cards are fully legible on mobile devices (down to 320px viewport width) without overflow, showing the correct updated labels.
- **SC-004**: Users can find and select a rubro in the transaction creation form within 2 seconds using the autocomplete search bar.

## Assumptions

- The backend ledger API already enforces double-entry balance and handles debit/credit records correctly; this feature primarily optimizes frontend validation and UI workflows.
- The default base currency configuration remains active and dictates symbol formatting.
- Users are familiar with standard debit/credit accounting terms, so labels like "Debe" and "Haber" remain standard, but the software minimizes manual overhead.
