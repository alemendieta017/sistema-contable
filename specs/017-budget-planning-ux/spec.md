# Feature Specification: Budget Planning Matrix & Execution Control UX

**Feature Branch**: `017-budget-planning-ux`

**Created**: 2026-08-12

**Status**: Draft

**Input**: User description: "Rediseño de Módulo de Presupuestos: Grid unificado con edición inline de 12 meses, carga inteligente mediante drivers/reglas, pre-poblado desde Plan de Cuentas, y Tablero de Control de Ejecución y Disponible Residual mensual con semáforos visuales."

11: ## Clarifications
12:
13: ### Session 2026-08-12
14:
15: - Q: ¿Cómo se deben gestionar los colores de dark/light theme, los labels del selector de año y el idioma de las leyendas en la UI? → A: Se debe respetar estrictamente el contraste en ambos temas (oscuro y claro), asegurando visibilidad en selects y leyendas. El selector de año debe llamarse simplemente "Año". Toda la UI debe estar 100% en español ("Ingresos", "Egresos", "Activos", "Pasivos", "Patrimonio Neto", etc.), eliminando cualquier término en inglés ("TOTAL EXPENSES", "TOTAL ASSET", "asset", "liability", etc.).
16: - Q: ¿Qué ajustes visuales y de interacción se requieren para mobile y la vista del grid? → A: La app debe ser Mobile First Responsive, garantizando visibilidad e interacción óptima en pantallas móviles de la planilla de 12 meses. Se elimina la leyenda redundante "Grid interactivo 12 Meses".
17: - Q: ¿Cómo visualizar y editar la planilla de 12 meses en dispositivos móviles? → A: Option A - Grid con columna izquierda de nombre de cuenta fija (sticky) y desplazamiento horizontal suave (`overflow-x: auto` con scroll/swipe indicators) para los 12 meses.
18: - Q: ¿Cómo se deben tratar las cuentas de Activo y Pasivo dentro de la grilla unificada del presupuesto? → A: Mediante Switches de Intención de Flujo por fila: para Pasivos, toggle entre 'PAGAR' (Amortización de deuda / Salida) y 'RECIBIR' (Nuevo préstamo / Entrada); para Activos, toggle entre 'INVERTIR' (CAPEX / Salida), 'AHORRAR' (Reserva de liquidez) y 'DESINVERTIR' (Venta de activo / Entrada), acompañados de badges visuales de impacto en caja (+ Entrada / - Salida).
19:

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Annual Matrix Inline Planning & Direct Cell Editing (Priority: P1)

As a financial planner or manager on desktop or mobile device, I want an interactive 12-month matrix view (`/budgets/matrix`) with responsive mobile layout, inline grid editing, and keyboard navigation (Enter, Tab, Escape), so that I can rapidly view, enter, and adjust budget allocations across all accounts without navigating to isolated single-month edit forms.

**Why this priority**: Eliminates context-switching friction and provides the core data entry interface required for high-velocity annual budget creation across the chart of accounts on any device.

**Independent Test**: A user can open `/budgets/matrix` on mobile or desktop, navigate through cells, update values inline, cancel edits with `Esc`, and save changes cleanly.

**Acceptance Scenarios**:

1. **Given** a user viewing the Annual Budget Matrix (`/budgets/matrix`) on mobile or desktop, **When** they view or click on any monthly cell, **Then** the cell and dropdown text are clearly legible in both Light and Dark themes, with 100% Spanish labels ("Ingresos", "Egresos", "Activos", "Pasivos", "Patrimonio Neto") and the year selector labeled simply "Año".
2. **Given** a user editing a cell in the matrix on desktop, **When** they press `Tab` or `Enter`, **Then** the current edit is accepted and focus moves smoothly to the next month cell (Tab) or the same month in the row below (Enter).
3. **Given** a user selecting a multi-cell range in an external spreadsheet, **When** they copy and paste (`Ctrl+C` / `Ctrl+V`) into the matrix grid on desktop, **Then** the system parses numeric values into the corresponding target months and accounts.

---

### User Story 2 - Smart Budget Distribution Drivers & Mass Loading (Priority: P2)

As a financial planner, I want smart distribution drivers (Top-down prorating, percentage growth/inflation adjustments, forward fill, and baseline copy from prior year actuals), so that I can generate realistic multi-month budgets automatically without manually calculating and typing 12 individual monthly amounts for every account.

**Why this priority**: Dramatically reduces repetitive manual calculations and enables fast scenario modeling and baseline budgeting based on historical trends or growth targets.

**Independent Test**: A user can select an account row, enter an annual total of $120,000, choose "Prorrateo Plano", and verify that each month is populated with $10,000 automatically.

**Acceptance Scenarios**:

1. **Given** an account row with an annual target total or a specific starting month value, **When** the user applies "Prorrateo Anual" or "Crecimiento % (MoM)", **Then** the system populates the 12 monthly cells according to the chosen rule (flat, inflation trend, or historical cash flow distribution).
2. **Given** a user changing a value in March, **When** they trigger "Replicar hacia adelante" (`Ctrl+D` / Fill Right), **Then** all subsequent months (April through December) update to match March's value.
3. **Given** a user starting a new fiscal year budget, **When** they choose "Traer Real del Año Anterior (+X% ajuste)", **Then** the grid pre-populates all active accounts with actual historical ledger transactions plus the specified percentage adjustment.

---

### User Story 3 - Executive Monthly Budget Execution & Availability Dashboard (Priority: P3)

As a budget owner or financial manager, I want a dedicated active month execution dashboard (`/budgets/control`) displaying real-time available residual budget ($\text{Available} = \text{Budgeted} - \text{Executed} - \text{Committed}$) with color-coded gauge bars and quick transfer controls, accessible via a top navigation view toggle switch, so that I can monitor monthly spending health and make informed operational decisions.

**Why this priority**: Separates macro annual planning from micro operational control, giving managers immediate visual clarity on available funds for the current active period.

**Independent Test**: A user can toggle to `/budgets/control` for August 2026, view visual gauge bars displaying consumption percentages (Green <75%, Yellow 75-99%, Red >=100%), and see calculated residual available balances per account.

**Acceptance Scenarios**:

1. **Given** a user on the budget module, **When** they click the top view toggle switch, **Then** the view transitions seamlessly between Annual Matrix Planning (`/budgets/matrix`) and Monthly Control Dashboard (`/budgets/control`).
2. **Given** the active period dashboard for August 2026, **When** new ledger transactions or committed orders are recorded, **Then** the dashboard calculates and displays $\text{Available} = \text{Budgeted} - \text{Executed} - \text{Committed}$ in real time for each category.
3. **Given** an account category reaching 85% budget consumption, **When** viewed in the control dashboard, **Then** its progress bar turns yellow (warning), and if it reaches 100% or higher, it turns red (overbudget alert).
4. **Given** an account category running low on available funds, **When** the user clicks "Reasignar Presupuesto", **Then** the system enables requesting a budget transfer from another account category with positive residual balance.

---

### User Story 4 - Balance Sheet Cash Flow Intention Switches (Assets & Liabilities) (Priority: P2)

As a financial planner or manager budgeting for Balance Sheet accounts (Assets & Liabilities) within the unified matrix grid, I want explicit flow intention toggles (`PAGAR` vs `RECIBIR` for Liabilities, and `INVERTIR` vs `AHORRAR` vs `DESINVERTIR` for Assets), so that I can unambiguously specify whether budgeted figures represent cash inflows (e.g. loan disbursements, asset liquidations) or cash outflows (e.g. debt principal payments, capital investments), eliminating financial ambiguity and powering accurate cash flow projections.

**Why this priority**: Resolves fundamental accounting ambiguity in unified matrix grids where positive numbers in non-P&L accounts could otherwise mean either an increase in cash or a cash drain.

**Independent Test**: A user can select a Liability account row in `/budgets/matrix`, toggle between `PAGAR` and `RECIBIR`, and verify that the cash flow direction badge updates (`- Cash Outflow` vs `+ Cash Inflow`) and affects total cash flow forecasts correctly.

**Acceptance Scenarios**:

1. **Given** a user budgeting for a Liability account (e.g., "Préstamos Bancarios"), **When** they select `RECIBIR`, **Then** the system interprets positive amounts as Cash Inflows (+ Cash) from financing, and when set to `PAGAR`, interprets positive amounts as Cash Outflows (- Cash) for debt principal amortization.
2. **Given** a user budgeting for an Asset account (e.g., "Maquinaria / Equipamiento"), **When** they select `INVERTIR`, **Then** the system interprets amounts as CAPEX cash outflows (- Cash) and flags the item for asset depreciation tracking, whereas selecting `AHORRAR` flags the item as a liquidity reserve transfer, and `DESINVERTIR` flags it as cash inflow from asset liquidation.
3. **Given** any Asset or Liability row in the matrix grid, **When** the flow intention switch is toggled, **Then** the grid displays real-time visual cash flow direction badges (Green `+ Cash` for Inflow, Red/Amber `- Cash` for Outflow).

---

### Edge Cases

- What happens when a user pastes tabular data containing formatted currency strings, negative numbers in parentheses, or invalid text? The matrix MUST sanitize input values, parsing valid numbers while flagging invalid cells without crashing.
- How does the "Traer Real del Año Anterior" baseline feature behave for accounts created in the current year with zero historical ledger entries? Accounts without historical records MUST default to 0 with a clear note, allowing manual or driver-based entry.
- How does the system handle concurrent edits to the same budget matrix period by different users? The system MUST validate updates and prevent silent data overwrites.
- What happens when a user attempts to edit budget figures for historical periods that have been locked/closed for accounting audit? Locked periods MUST render as read-only with a visual lock indicator.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST provide an interactive 12-month Annual Budget Matrix view (`/budgets/matrix`) displaying all active accounts grouped by financial category with inline editable monthly cells and dynamic row/category total recalculation, fully adapted for both mobile and desktop screens.
- **FR-002**: System MUST support complete keyboard navigation across matrix cells, including `Tab` (navigate to next month right), `Shift+Tab` (previous month left), `Enter` (navigate to same month next row down), `Shift+Enter` (row up), and `Esc` (cancel active cell editing).
- **FR-003**: System MUST support copy-pasting tabular numeric cell blocks from external spreadsheet applications into the matrix editor.
- **FR-004**: System MUST provide smart distribution driver actions:
  - Top-down annual prorating (flat equal monthly distribution or weighted by prior year actual monthly cash flows).
  - Monthly percentage growth / inflation trend adjustment (% MoM compounding or linear).
  - Forward fill / Fill Right (`Ctrl+D` or action button) to copy selected cell value to remaining future months.
- **FR-005**: System MUST provide a baseline setup tool ("Traer Real del Año Anterior") to pre-populate annual budget matrices based on actual accounting ledger movements with optional percentage adjustments. The baseline historical calculation MUST deterministically shift period start/end dates back by exactly 1 year (ISO 8601) and execute PostgreSQL date range queries (`tx.accounting_date >= priorStartDate AND tx.accounting_date <= priorEndDate`) to avoid reliance on fiscal year name strings or invalid `LIKE` operations on `DATE` columns.
- **FR-006**: System MUST provide a prominent top navigation toggle switch to switch seamlessly between the Annual Matrix Planning view (`/budgets/matrix`) and the Monthly Execution Control view (`/budgets/control`).
- **FR-007**: System MUST provide a Monthly Execution Control Dashboard (`/budgets/control`) for selected active periods displaying:
  - Total Budgeted Amount, Total Executed Amount to date, and Total Available Residual Balance.
  - Calculation formula: $\text{Available} = \text{Budgeted} - \text{Executed} - \text{Committed}$.
- **FR-008**: System MUST display color-coded visual progress/gauge bars for budget consumption per category:
  - **Green**: Consumption < 75%.
  - **Yellow**: Consumption 75% - 99% (Warning threshold).
  - **Red**: Consumption $\ge$ 100% (Overbudget threshold).
- **FR-009**: System MUST provide quick budget re-allocation/transfer controls on the monthly dashboard to move available funds between accounts within the active period.
- **FR-010**: System MUST allow filtering the matrix view by account categories (e.g., Operating Expenses, Administrative Expenses, Revenue, Debt Service) to maintain visual focus on specific budget segments.
- **FR-011**: System MUST provide explicit Flow Intention Switches on matrix rows for Balance Sheet accounts:
  - **Liability Accounts**: Toggle between `PAGAR` (Debt Principal Payment / Cash Outflow) and `RECIBIR` (New Loan Disbursement / Cash Inflow).
  - **Asset Accounts**: Toggle between `INVERTIR` (Capital Expenditure / Cash Outflow), `AHORRAR` (Liquidity Reserve Transfer), and `DESINVERTIR` (Asset Liquidation / Cash Inflow).
- **FR-012**: System MUST render real-time color-coded cash flow impact badges (`+ Cash Inflow` / `- Cash Outflow`) on matrix rows based on account type and the active Flow Intention Switch setting.
- **FR-013**: System MUST compute net cash flow impact and balance sheet projections using the configured Flow Intention settings.
- **FR-014**: System MUST adhere strictly to active Dark/Light theme color tokens across all components, guaranteeing high-contrast text and option visibility inside `<select>` dropdowns. The year selector label MUST read simply "Año".
- **FR-015**: System MUST present 100% of user interface strings, category labels, and totals in Spanish ("Ingresos", "Egresos", "Activos", "Pasivos", "Patrimonio Neto", etc.), completely eliminating mixed English terminology (such as "TOTAL EXPENSES", "TOTAL ASSET", "TOTAL INCOME", "asset", "liability").
- **FR-016**: System MUST omit redundant layout headers (such as "Grid interactivo 12 Meses") to streamline UI visual hierarchy and maximize screen space.
- **FR-017**: System MUST provide a Mobile First Responsive layout for the 12-month budget planning matrix (`/budgets/matrix`) utilizing a fixed sticky account name column on the left with smooth horizontal touch-scrolling (`overflow-x: auto`) for the 12 month columns.

### Key Entities

- **Budget Matrix Allocation**: Represents a multi-period budget model containing monthly allocated numeric values mapped to specific accounting categories, fiscal years, and optional `flowIntention` flags for balance sheet accounts.
- **Budget Distribution Rule / Driver**: Parameterized rule definition (flat prorate, trend %, historical weighting, forward fill) applied to compute monthly allocation distributions.
- **Monthly Execution Summary**: Period-specific calculated entity aggregating budgeted limits, actual ledger debits/credits, committed balances, remaining residual balance, and consumption percentage.
- **Budget Reassignment Record**: Audit record of funds transferred between account categories within a budget period.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Financial planners can complete full 12-month multi-account annual budget entry in under 5 minutes using inline matrix editing and distribution drivers (70% time reduction compared to single-form entry).
- **SC-002**: 100% of cell edits and driver calculations in the matrix respond within 100ms with 60fps spreadsheet grid keyboard-only navigation supported on desktop and touch navigation on mobile.
- **SC-003**: Budget owners can identify account categories near or over budget limit on the monthly control dashboard within 3 seconds of viewing the page on both desktop and mobile viewports.
- **SC-004**: 95% of accidental overbudgeting scenarios are prevented due to real-time color-coded visual gauge indicators and residual balance calculations on the active month dashboard.
- **SC-005**: 100% of UI elements and dropdown options maintain compliant WCAG AA color contrast in both Dark and Light themes with zero untranslated English strings.

## Assumptions

- The chart of accounts structure and account hierarchies are defined and active in the core ledger system.
- Historical accounting ledger transactions exist or can be queried for prior-year actual baseline calculations.
- The 12-month budget matrix features a Mobile First Responsive design with sticky account column navigation for mobile viewports, while supporting desktop keyboard shortcuts (Tab/Enter/Copy-Paste).
- Period lock statuses (closed fiscal months) are enforced by the core accounting system.
