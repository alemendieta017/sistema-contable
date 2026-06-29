# Feature Specification: Monthly View Tabular Format

**Feature Branch**: `007-monthly-view-tabular`

**Created**: 2026-06-29

**Status**: Draft

**Input**: User description: "la vista mensual debe mostrar la info en formato tabular, una bonita tabla clean UX/UI, no en cards"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Tabular Monthly Summary (Priority: P1)

As a user, I want to see my monthly financial summary for the selected year in a clean, professional tabular format rather than as individual card blocks, so that I can easily compare months side-by-side and read the details in a standard spreadsheet-like flow.

**Why this priority**: Primary user request to switch from cards to a clean table layout.

**Independent Test**: Navigate to the Libro Diario, select the "Mensual" view, and verify that the 12 months are listed as rows in a single clean table instead of a grid of separate card blocks.

**Acceptance Scenarios**:

1. **Given** the "Mensual" view, **When** the page loads, **Then** I see a single tabular layout with columns for Month (Mes), Transactions Count (Transacciones), Income (Ingresos), Expenses (Gastos), and Net Balance (Neto).
2. **Given** the tabular layout, **When** a month has zero transactions, **Then** it is still displayed in the table but formatted to look inactive or empty (e.g., lower opacity or dashes) to preserve the tabular structure of the full year.

---

### User Story 2 - Responsive Clean UX/UI with Micro-animations (Priority: P2)

As a user, I want the table to feel premium, featuring subtle hover highlights, clean borders, professional typography, and responsive horizontal scrolling on small viewports so the data doesn't overflow or break layout.

**Why this priority**: Enhances the user experience and satisfies the "bonita tabla clean UX/UI" requirement.

**Independent Test**: Hover over table rows to see micro-interactions (e.g., subtle bg color change) and resize the screen to check horizontal scrolling.

**Acceptance Scenarios**:

1. **Given** a row in the monthly table, **When** I hover over it, **Then** it highlights with a light background transition.
2. **Given** a small mobile screen, **When** I view the monthly table, **Then** it allows horizontal scrolling without breaking the layout.

---

### Edge Cases

- **Year with no transactions at all**: The table should render all 12 months with 0 values and 0 transactions count, rather than showing a blank screen or error.
- **Large currency numbers**: PYG values can be long (e.g., ₲150.000.000). The table columns must have adequate spacing and alignment (text-right for numbers) so values do not run into each other.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The Monthly view (`MonthlyView` component) MUST display the 12 months of the selected year as rows in a tabular format instead of separate cards/blocks.
- **FR-002**: The table MUST have clear header labels: "Mes" (Month), "Transacciones" (Transactions count), "Ingresos" (Income), "Gastos" (Expenses), and "Saldo Neto" (Net Balance).
- **FR-003**: The table columns for numeric financial values (Ingresos, Gastos, Saldo Neto) MUST be right-aligned (`text-right`) for proper alignment and professional bookkeeping look.
- **FR-004**: The styling MUST be modern and clean, utilizing consistent borders, text sizes (e.g., `text-xs` or `text-sm`), and spacing aligned with Tailwind CSS and the rest of the updated UI.
- **FR-005**: The table rows MUST feature hover styles and smooth transitions to improve readability and interaction.
- **FR-006**: The net balance column MUST format values with colored indicators (e.g., green for positive/surplus, red for negative, or standard text colors fitting dark/light modes).
- **FR-007**: The table MUST respect the system's default currency symbol and decimal formatting.

### Key Entities

- **MonthlySummaryRow**: Represents a calculated row for a single month. Attributes:
  - `monthName`: Name of the month (e.g., "Enero", "Febrero").
  - `txCount`: Number of transactions in that month.
  - `income`: Sum of all incomes in that month in base currency.
  - `expense`: Sum of all expenses in that month in base currency.
  - `net`: Net balance (income - expense) in base currency.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All 12 months are visible on a single screen without vertical scrolling of individual card containers.
- **SC-002**: Financial columns are perfectly aligned vertically to the decimal/right margin, making scanning and comparing values quick.
- **SC-003**: Row hover delay is under 150ms, with a smooth background color fade.
- **SC-004**: Fully responsive, fitting perfectly on screen widths down to 320px via horizontal overflow scroll.

## Assumptions

- The logic for grouping/aggregating transactions by month in the `MonthlyView` component remains intact.
- No new database columns or backend modifications are required.
