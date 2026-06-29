# Feature Specification: Theme, Mobile Layout, and Shadcn Charts

**Feature Branch**: `003-ui-improvements`

**Created**: 2026-06-28

**Status**: Draft

**Input**: User description: "quiero que funcione el modo light y modo dark que no esta funcionando actualmente. Quiero que los counters de ingresos, egresos, y balance de la pantalla de transacciones ocupe menos lugar en mobile, como si fuese una sola barra y en una linea se muestren los 3 items ingresos egresos y balance. Además, quiero que todos los graficos que utilice la aplicacion utilicen graficos de shadcn, no svgs nativos porque algunos graficos no se ven bien actualmente como por ejemplo, la leyenda "total gasto" o "total ingreso" se desborda del grafico de torta."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Theme Toggling (Priority: P1)

As a user, I want the light and dark theme mode toggle to work correctly across the entire application, so that the visual styling adapts to my preference or system settings and reduces eye strain.

**Why this priority**: Correct styling is essential for user comfort, accessibility, and visual appeal, especially when viewing financial ledgers.

**Independent Test**: Can be fully tested by clicking the theme toggle switch in Settings or navigation and verifying that all components immediately transition colors without page reload, and that preference is persisted in local storage.

**Acceptance Scenarios**:

1. **Given** the application is loaded in light mode, **When** I click the theme toggle, **Then** the application switches to dark mode, all backgrounds and text colors adjust to dark palette tokens, and the setting persists on page refresh.
2. **Given** the application is loaded in dark mode, **When** I click the theme toggle, **Then** the application switches to light mode and standard light colors are applied.

---

### User Story 2 - Compact Mobile Counters (Priority: P2)

As a mobile user, I want the income, expense, and net balance counters on the transactions page to occupy less vertical space, presenting as a single horizontal bar in one line rather than taking up three stacked cards, so that I can see more ledger entries on small viewports.

**Why this priority**: Enhances mobile usability by freeing up screen real estate for the primary data table/list.

**Independent Test**: Can be tested by resizing the browser to a mobile breakpoint (e.g., width < 640px) on the Transactions page and checking that the three metrics align in a single row within a unified bar layout.

**Acceptance Scenarios**:

1. **Given** I view the Transactions page on a mobile device, **When** the page renders, **Then** the income, expense, and net balance are displayed horizontally in a single row.
2. **Given** I view the Transactions page on a desktop screen, **When** the page renders, **Then** the counters are displayed in the standard three-column grid layout with detailed icons.

---

### User Story 3 - Professional Shadcn Charts (Priority: P3)

As a user, I want the charts on the statistics and dashboard views to be rendered using Shadcn/Recharts instead of custom/native SVGs, so that the graphs look professional, and all labels and legends fit properly without overflowing or overflowing text boundaries.

**Why this priority**: Replaces amateurish native SVGs with premium interactive charts, correcting text overflow issues in doughnut/pie charts and bar charts.

**Independent Test**: Can be verified by navigating to the Stats/Dashboard view, looking at the doughnut chart (PieChart), monthly comparative chart, and net worth historical line chart, and ensuring legends and tooltips display correctly without overlapping.

**Acceptance Scenarios**:

1. **Given** the PieChart is showing expense/income distribution, **When** the center text is shown, **Then** the label "Total Gasto" or "Total Ingreso" does not overflow the chart area, and hovering segments updates the text smoothly.
2. **Given** the monthly comparative chart is rendered, **When** data is loaded, **Then** the bars use Shadcn charting components with hover-active tooltips and perfectly aligned monthly labels.

### Edge Cases

- **No Chart Data**: When a chart has empty data, the system should render a clean placeholder or informative message indicating there are no transactions.
- **Very Large Numbers in Mobile Counters**: If the balance values are extremely large (e.g., millions), the font sizes in the single-line mobile layout should adjust/scale down gracefully to prevent wrapping or truncation.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The theme engine MUST support both light and dark themes using a CSS class selector (`.dark`) compatible with Tailwind CSS v4.
- **FR-002**: The theme preference MUST be loaded immediately from local storage or system preferences on initial load to avoid layout shifts or flashing.
- **FR-003**: On mobile screens (viewports under 640px), the Transactions page summary counters MUST be laid out horizontally in a single row/container.
- **FR-004**: All SVG-based charts (NetWorthChart, IncomeStatementChart, PieChart) MUST be replaced with responsive charting components utilizing Shadcn/Recharts structures.
- **FR-005**: Doughnut charts (PieChart) MUST programmatically calculate label sizing or wrap labels in a structured legend container to prevent overflows of strings like "Total Gasto" or "Total Ingreso".

### Key Entities *(include if feature involves data)*

- **ThemePreference**: Represents the user's selected mode (light or dark), persisted client-side.
- **ChartDataPoint**: Represents formatted ledger balances mapped into chart datasets.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Theme transitions occur in less than 150ms without full-page reloads.
- **SC-002**: Mobile transaction counters occupy less than 80px in vertical height, saving over 150px of vertical space compared to the stacked mobile card layout.
- **SC-003**: 100% of charts render responsive structures without clipping legends, labels, or tooltips on both mobile and desktop screens.

## Assumptions

- Tailwind CSS v4 is used, requiring `@variant dark` configuration or class-based variant handling in CSS to allow manual theme toggling.
- RADIX UI slot utility and lucide-react are available and can be integrated into the Shadcn chart configurations.
- The NestJS backend remains unchanged as this is purely a frontend UI improvement feature.
