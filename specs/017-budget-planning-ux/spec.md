# Feature Specification: Budget Planning Matrix & Execution Control UX

**Feature Branch**: `017-budget-planning-ux`

**Created**: 2026-08-12

**Status**: Draft

**Input**: User description: "Rediseño de Módulo de Presupuestos: Grid unificado con edición inline de 12 meses, carga inteligente mediante drivers/reglas, pre-poblado desde Plan de Cuentas, y Tablero de Control de Ejecución y Disponible Residual mensual con semáforos visuales."

## Clarifications

### Session 2026-08-12

- Q: ¿Cómo se deben gestionar los colores de dark/light theme, los labels del selector de año y el idioma de las leyendas en la UI? → A: Se debe respetar strictly el contraste en ambos temas (oscuro y claro), asegurando visibilidad en selects y leyendas. El selector de año debe llamarse simplemente "Año". Toda la UI debe estar 100% en español ("Ingresos", "Egresos", "Activos", "Pasivos", "Patrimonio Neto", etc.), eliminando cualquier término en inglés ("TOTAL EXPENSES", "TOTAL ASSET", "asset", "liability", etc.).
- Q: ¿Qué ajustes visuales y de interacción se requieren para mobile y la vista del grid? → A: La app debe ser Mobile First Responsive, garantizando visibilidad e interacción óptima en pantallas móviles de la planilla de 12 meses. Se elimina la leyenda redundante "Grid interactivo 12 Meses".
- Q: ¿Cómo visualizar y editar la planilla de 12 meses en dispositivos móviles? → A: Option A - Grid con columna izquierda de nombre de cuenta fija (sticky) y desplazamiento horizontal suave (`overflow-x: auto` con scroll/swipe indicators) para los 12 meses.

### Session 2026-08-13

- Q: ¿Cómo se debe determinar el saldo inicial de caja/bancos para calcular el "Saldo Final Proyectado en Bancos" en la barra de resumen inferior (sticky footer)? → A: Mostrar únicamente el Flujo Neto del Mes y el Flujo Neto Acumulado (Δ Caja acumulado), sin proyectar el saldo bancario absoluto.
- Q: ¿Cómo estructurar las secciones de la matriz presupuestaria y la carga de cuentas de Balance (Activos y Pasivos)? → A: La matriz y vista de control se dividen en 4 bloques financieros ejecutivos: 1. 🟢 INGRESOS (P&L, carga automática de cuentas de ingreso, flujo +), 2. 🔴 GASTOS DE VIDA (P&L, carga automática de cuentas de gasto, flujo -), 3. 🔵 AHORRO E INVERSIONES (Movimientos de Activo a demanda con botón [+ Presupuestar Activo]: Aporte/Inversión [-] o Rescate/Desinversión [+]), y 4. 🟣 DEUDAS Y FINANCIACIÓN (Movimientos de Pasivo a demanda con botón [+ Presupuestar Deuda]: Pago/Amortización [-] o Nuevo Préstamo/Financiación [+]). Una misma cuenta de balance puede tener ambas filas independientes si aplica.
- Q: ¿Cómo debe calcular el motor de ejecución (/budgets/control) el importe real ejecutado (Executed) para las cuentas de Balance (Activos y Pasivos) a partir de los asientos contables? → A: Mapear por partida doble de forma independiente: Para Salidas ([-] Aporte/Inversión y [-] Pago de Deuda) computar la suma de Débitos del mes; para Entradas ([+] Rescate/Desinversión y [+] Nuevo Préstamo) computar la suma de Créditos del mes.
- Q: ¿Cómo debe gestionarse el guardado de los datos ingresados en la matriz anual de 12 meses? → A: Guardado atómico explícito mediante botón [ 💾 Guardar Todo ] con estado de cambios pendientes (dirty state) y confirmación/advertencia al intentar abandonar la página con cambios sin guardar.
- Q: ¿Cómo deben agruparse y visualizarse las cuentas de P&L (Ingresos y Gastos) en la matriz anual: en árbol jerárquico colapsable con subtotales por grupo contable o en listado plano? → A: Árbol jerárquico colapsable con subtotales calculados automáticamente de sólo lectura por rubro/categoría padre, permitiendo expandir/colapsar ramas y editar únicamente las cuentas hijas imputables.
- Q: ¿Se debe permitir la reasignación/traspaso de presupuesto entre cuentas de distintos bloques financieros (ej. transferir disponible residual de Gastos de Vida a Ahorro e Inversiones) o restringirlo únicamente dentro del mismo bloque? → A: Permitir reasignaciones entre cuentas de cualquier bloque financiero siempre que compartan la misma dirección de flujo de caja (Salida ↔ Salida [ej. Gastos a Inversiones o Deuda] y Entrada ↔ Entrada [ej. Ingresos a Financiación]).
- Q: ¿Se debe unificar el modelo de datos utilizando exclusivamente CashFlowDirection (INGRESO_EFECTIVO | EGRESO_EFECTIVO) en combinación con el tipo contable de la cuenta (account.type), prescindiendo de un enum FlowIntention adicional? → A: Reutilizar CashFlowDirection (INGRESO_EFECTIVO / EGRESO_EFECTIVO) y derivar la semántica contable y visual de la tupla (account.type, cashFlowDirection), eliminando la necesidad de un enum FlowIntention separado.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Annual Matrix Inline Planning & Direct Cell Editing (Priority: P1)

As a financial planner or manager on desktop or mobile device, I want an interactive 12-month matrix view (`/budgets/matrix`) with responsive mobile layout, inline grid editing, hierarchical category tree with collapsible branches and auto-calculated subtotals, and keyboard navigation (Enter, Tab, Escape), so that I can rapidly view, enter, and adjust budget allocations across all accounts without navigating to isolated single-month edit forms.

**Why this priority**: Eliminates context-switching friction and provides the core data entry interface required for high-velocity annual budget creation across the chart of accounts on any device.

**Independent Test**: A user can open `/budgets/matrix` on mobile or desktop, expand/collapse parent groups, navigate through cells, update values inline, verify parent subtotals update in real time, cancel edits with `Esc`, and save all changes atomically via `[ 💾 Guardar Todo ]`.

**Acceptance Scenarios**:

1. **Given** a user viewing the Annual Budget Matrix (`/budgets/matrix`) on mobile or desktop, **When** they view or click on any monthly cell, **Then** the cell and dropdown text are clearly legible in both Light and Dark themes, with 100% Spanish labels ("Ingresos", "Gastos de Vida", "Ahorro e Inversiones", "Deudas y Financiación") and the year selector labeled simply "Año".
2. **Given** a user viewing P&L sections (Ingresos / Gastos), **When** reviewing categories, **Then** accounts are organized in a collapsible hierarchical tree with read-only parent subtotal rows that recalculate dynamically whenever an imputable child account is edited.
3. **Given** a user editing a cell in the matrix on desktop, **When** they press `Tab` or `Enter`, **Then** the current edit is accepted and focus moves smoothly to the next month cell (Tab) or the same month in the row below (Enter).
4. **Given** unsaved edits in the matrix, **When** the user attempts to navigate away before clicking `[ 💾 Guardar Todo ]`, **Then** the system displays a dirty state confirmation dialog warning of unsaved changes.
5. **Given** a user clicking `[ 💾 Guardar Todo ]`, **When** the request succeeds, **Then** all 12-month allocations across all sections are persisted atomically in a single backend transaction.

---

### User Story 2 - Smart Budget Distribution Drivers & Mass Loading (Priority: P2)

As a financial planner, I want smart distribution drivers (Top-down prorating, percentage growth/inflation adjustments, forward fill, and baseline copy from prior year actuals), so that I can generate realistic multi-month budgets automatically without manually calculating and typing 12 individual monthly amounts for every account.

**Why this priority**: Dramatically reduces repetitive manual calculations and enables fast scenario modeling and baseline budgeting based on historical trends or growth targets.

**Independent Test**: A user can select an account row, enter an annual total of $120,000, choose "Prorrateo Plano", and verify that each month is populated with $10,000 automatically.

**Acceptance Scenarios**:

1. **Given** an account row with an annual target total or a specific starting month value, **When** the user applies "Prorrateo Anual" or "Crecimiento % (MoM)", **Then** the system populates the 12 monthly cells according to the chosen rule (flat, inflation trend, or historical cash flow distribution).
2. **Given** a user changing a value in March, **When** they trigger "Replicar hacia adelante" (`Ctrl+D` / `Cmd+D` with preventDefault / Fill Right), **Then** all subsequent months (April through December) update to match March's value.
3. **Given** a user starting a new fiscal year budget, **When** they choose "Traer Real del Año Anterior (+X% ajuste)", **Then** the grid pre-populates all active accounts with actual historical ledger transactions plus the specified percentage adjustment.

---

### User Story 3 - Executive Monthly Budget Execution & Availability Dashboard (Priority: P3)

As a budget owner or financial manager, I want a dedicated active month execution dashboard (`/budgets/control`) displaying real-time available residual budget ($\text{Available} = \text{Budgeted} - \text{Executed} - \text{Committed}$) with color-coded gauge bars and cross-block budget reallocations matching cash flow direction, accessible via a top navigation view toggle switch, so that I can monitor monthly spending health and make informed operational decisions.

**Why this priority**: Separates macro annual planning from micro operational control, giving managers immediate visual clarity on available funds for the current active period.

**Independent Test**: A user can toggle to `/budgets/control` for August 2026, view visual gauge bars displaying consumption percentages (Green <75%, Yellow 75-99%, Red >=100%), and transfer surplus budget from a Gasto category to an Ahorro/Inversión allocation.

**Acceptance Scenarios**:

1. **Given** a user on the budget module, **When** they click the top view toggle switch, **Then** the view transitions seamlessly between Annual Matrix Planning (`/budgets/matrix`) and Monthly Control Dashboard (`/budgets/control`).
2. **Given** the active period dashboard for August 2026, **When** new ledger transactions or committed orders are recorded, **Then** the dashboard calculates and displays $\text{Available} = \text{Budgeted} - \text{Executed} - \text{Committed}$ in real time for each category, using Debits for Outflows and Credits for Inflows.
3. **Given** an account category reaching 85% budget consumption, **When** viewed in the control dashboard, **Then** its progress bar turns yellow (warning), and if it reaches 100% or higher, it turns red (overbudget alert).
4. **Given** an account category running low on available funds, **When** the user clicks "Reasignar Presupuesto", **Then** the system allows transferring available funds from any account sharing the same flow direction (e.g. from an unspent Expense to an Investment contribution).

---

### User Story 4 - 4 Executive Financial Blocks & On-Demand Balance Budgeting (Priority: P1)

As an advanced personal finance manager, I want the budget matrix and control screens clearly organized into 4 distinct financial blocks (1. Ingresos, 2. Gastos de Vida, 3. Ahorro e Inversiones, 4. Deudas y Financiación), with automatic pre-population of all P&L accounts and on-demand modal loading of Balance Sheet accounts by movement intention, so that my matrix remains clean, uncluttered, and mathematically coherent with cash flow reality.

**Why this priority**: Prevents clutter from dozens of inactive balance sheet accounts while allowing clear, explicit cash flow budgeting for investment and debt decisions without sign confusion.

**Independent Test**: A user can view all P&L income and expense accounts pre-populated automatically, click `+ Presupuestar Activo` to budget an ETF investment (`[-] Aporte`), click `+ Presupuestar Deuda` to budget a mortgage payment (`[-] Pago de Cuota`), and verify that monthly totals and the sticky footer reflect Total Entradas (+), Total Salidas (-), and Flujo Neto del Mes.

**Acceptance Scenarios**:

1. **Given** the Annual Budget Matrix view (`/budgets/matrix`), **When** opened for a fiscal year, **Then** the grid displays 4 separate executive sections: 🟢 Ingresos (P&L), 🔴 Gastos de Vida (P&L), 🔵 Ahorro e Inversiones (Activos), and 🟣 Deudas y Financiación (Pasivos).
2. **Given** the P&L sections (Ingresos y Gastos), **When** the page loads, **Then** all active revenue and expense accounts from the Chart of Accounts are listed automatically with their predefined flow directions (`+` for Ingresos, `-` for Gastos) and collapsible category subtotals.
3. **Given** the Balance sections (Ahorro e Inversiones / Deudas y Financiación), **When** the user clicks `+ Presupuestar Activo` or `+ Presupuestar Pasivo`, **Then** a modal opens allowing selection of an active balance account and the movement intention:
   - For Assets: `[-] Aporte / Inversión (Salida de caja)` (`cashFlowDirection = 'EGRESO_EFECTIVO'`) or `[+] Rescate / Desinversión (Entrada de caja)` (`cashFlowDirection = 'INGRESO_EFECTIVO'`).
   - For Liabilities: `[-] Pago / Amortización de Cuota (Salida de caja)` (`cashFlowDirection = 'EGRESO_EFECTIVO'`) or `[+] Nuevo Préstamo / Financiación (Entrada de caja)` (`cashFlowDirection = 'INGRESO_EFECTIVO'`).
4. **Given** a balance account requiring both inflow and outflow budgeting in the same fiscal year (e.g. Credit Card monthly payment vs financed purchase), **When** added through the modal twice with different intentions, **Then** the system renders two clean independent rows under that section with explicit badges and delete actions (`🗑️`).
5. **Given** the Sticky Footer summary bar, **When** monthly figures are edited, **Then** it updates in real time to display Total Entradas (+), Total Salidas (-), Flujo Neto del Mes ($\text{Entradas} - \text{Salidas}$), and Flujo Neto Acumulado ($\Delta$ Caja acumulado).

---

### Edge Cases

- What happens when a user pastes tabular data containing formatted currency strings, negative numbers in parentheses, or invalid text? The matrix MUST sanitize input values, parsing valid numbers while flagging invalid cells without crashing.
- How does the "Traer Real del Año Anterior" baseline feature behave for accounts created in the current year with zero historical ledger entries? Accounts without historical records MUST default to 0 with a clear note, allowing manual or driver-based entry.
- How does the system handle removing an on-demand balance row with existing monthly values? The system MUST ask for confirmation before deleting the row and clearing its associated allocations.
- What happens when a user attempts to edit budget figures for historical periods that have been locked/closed for accounting audit? Locked periods MUST render as read-only with a visual lock indicator.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST organize the budget matrix (`/budgets/matrix`) and control dashboard (`/budgets/control`) into four executive financial blocks:
  1. 🟢 **INGRESOS (P&L)**: Automatic listing of all active Revenue accounts (`type === 'REVENUE'`), organized in a collapsible hierarchical tree with dynamic read-only parent subtotals and standard cash inflow direction (`cashFlowDirection = 'INGRESO_EFECTIVO'`).
  2. 🔴 **GASTOS DE VIDA (P&L)**: Automatic listing of all active Expense accounts (`type === 'EXPENSE'`), organized in a collapsible hierarchical tree with dynamic read-only parent subtotals and standard cash outflow direction (`cashFlowDirection = 'EGRESO_EFECTIVO'`).
  3. 🔵 **AHORRO E INVERSIONES (Activos)**: On-demand listing of Asset accounts (`type === 'ASSET'`) added via `+ Presupuestar Activo`.
  4. 🟣 **DEUDAS Y FINANCIACIÓN (Pasivos)**: On-demand listing of Liability accounts (`type === 'LIABILITY'`) added via `+ Presupuestar Deuda`.
- **FR-002**: System MUST support complete keyboard navigation across matrix cells, including `Tab` (navigate to next month right), `Shift+Tab` (previous month left), `Enter` (navigate to same month next row down), `Shift+Enter` (row up), and `Esc` (cancel active cell editing).
- **FR-003**: System MUST support copy-pasting tabular numeric cell blocks from external spreadsheet applications into the matrix editor.
- **FR-004**: System MUST provide smart distribution driver actions:
  - Top-down annual prorating (flat equal monthly distribution or weighted by prior year actual monthly cash flows).
  - Monthly percentage growth / inflation trend adjustment (% MoM compounding or linear).
  - Forward fill / Fill Right (`Ctrl+D` / `Cmd+D` with preventDefault or action button) to copy selected cell value to remaining future months.
- **FR-005**: System MUST provide a baseline setup tool ("Traer Real del Año Anterior") to pre-populate annual budget matrices based on actual accounting ledger movements with optional percentage adjustments. The baseline historical calculation MUST deterministically shift period start/end dates back by exactly 1 year (ISO 8601) and execute PostgreSQL date range queries (`tx.accounting_date >= priorStartDate AND tx.accounting_date <= priorEndDate`) to avoid reliance on fiscal year name strings or invalid `LIKE` operations on `DATE` columns.
- **FR-006**: System MUST provide a prominent top navigation toggle switch to switch seamlessly between the Annual Matrix Planning view (`/budgets/matrix`) and the Monthly Execution Control view (`/budgets/control`).
- **FR-007**: System MUST provide a Monthly Execution Control Dashboard (`/budgets/control`) for selected active periods displaying:
  - Total Budgeted Amount, Total Executed Amount to date, and Total Available Residual Balance per section and account.
  - Calculation formula: $\text{Available} = \text{Budgeted} - \text{Executed} - \text{Committed}$.
  - Ledger mapping for `Executed`: For P&L accounts, Revenue calculates sum of Credits and Expense calculates sum of Debits. For Balance Sheet accounts, Outflows (`cashFlowDirection = 'EGRESO_EFECTIVO'`: Aportes a Inversión y Pagos de Deuda) calculate sum of Debits, while Inflows (`cashFlowDirection = 'INGRESO_EFECTIVO'`: Rescates de Inversión y Nuevos Préstamos) calculate sum of Credits.
- **FR-008**: System MUST display color-coded visual progress/gauge bars for budget consumption per category:
  - **Green**: Consumption < 75%.
  - **Yellow**: Consumption 75% - 99% (Warning threshold).
  - **Red**: Consumption $\ge$ 100% (Overbudget threshold).
- **FR-009**: System MUST provide quick budget re-allocation/transfer controls on the monthly dashboard allowing movement of available funds between accounts that share the same `cashFlowDirection` (Salida ↔ Salida [e.g. Gastos a Inversiones o Pagos de deuda] y Entrada ↔ Entrada [e.g. Ingresos a Nuevos Préstamos]) within the active period.
- **FR-010**: System MUST provide an on-demand modal workflow for Balance Sheet accounts:
  - `+ Presupuestar Activo`: Selects an Asset account and movement intention (`[-] Aporte / Inversión` [`EGRESO_EFECTIVO`] or `[+] Rescate / Desinversión` [`INGRESO_EFECTIVO`]).
  - `+ Presupuestar Deuda`: Selects a Liability account and movement intention (`[-] Pago / Amortización` [`EGRESO_EFECTIVO`] or `[+] Nuevo Préstamo / Financiación` [`INGRESO_EFECTIVO`]).
- **FR-011**: System MUST allow adding the same Balance Sheet account multiple times with distinct `cashFlowDirection` values (e.g., one row for loan disbursement inflow `INGRESO_EFECTIVO` and one row for loan repayment outflow `EGRESO_EFECTIVO`).
- **FR-012**: System MUST render real-time color-coded cash flow impact badges on all rows:
  - `(+) Entrada` for `cashFlowDirection = 'INGRESO_EFECTIVO'`.
  - `(-) Salida` for `cashFlowDirection = 'EGRESO_EFECTIVO'`.
- **FR-013**: System MUST provide a sticky footer / summary bar on the matrix displaying:
  - Total Entradas de Caja (+)
  - Total Salidas de Caja (-)
  - Flujo Neto del Mes ($\text{Entradas} - \text{Salidas}$)
  - Flujo Neto Acumulado ($\Delta$ Caja acumulado de los 12 meses)
- **FR-014**: System MUST adhere strictly to active Dark/Light theme color tokens across all components, guaranteeing high-contrast text and option visibility inside `<select>` dropdowns. The year selector label MUST read simply "Año".
- **FR-015**: System MUST present 100% of user interface strings, category labels, section headers, and totals in Spanish ("Ingresos", "Gastos de Vida", "Ahorro e Inversiones", "Deudas y Financiación", "Aporte / Inversión", "Rescate / Desinversión", "Pago / Amortización", "Nuevo Préstamo"), completely eliminating mixed English terminology.
- **FR-016**: System MUST omit redundant layout headers (such as "Grid interactivo 12 Meses") to streamline UI visual hierarchy and maximize screen space.
- **FR-017**: System MUST provide a Mobile First Responsive layout for the 12-month budget planning matrix (`/budgets/matrix`) utilizing a fixed sticky account name column on the left with smooth horizontal touch-scrolling (`overflow-x: auto`) for the 12 month columns.
- **FR-018**: System MUST allow deleting any on-demand balance row via a delete icon button (`🗑️`), prompting for user confirmation and removing the row's budget records for that fiscal year.
- **FR-019**: System MUST persist all 12-month matrix modifications atomically via an explicit `[ 💾 Guardar Todo ]` button, providing a dirty state visual indicator when changes are pending and alerting the user if navigating away with unsaved changes.

### Key Entities

- **Budget Matrix Allocation**: Represents a multi-period budget model containing monthly allocated numeric values mapped to specific accounting categories, fiscal years, and explicit `cashFlowDirection` (`INGRESO_EFECTIVO` | `EGRESO_EFECTIVO`). Combined with `account.type` (`REVENUE`, `EXPENSE`, `ASSET`, `LIABILITY`), it completely determines visual labeling, double-entry ledger matching, and net cash flow aggregation.
- **Budget Distribution Rule / Driver**: Parameterized rule definition (flat prorate, trend %, historical weighting, forward fill) applied to compute monthly allocation distributions.
- **Monthly Execution Summary**: Period-specific calculated entity aggregating budgeted limits, actual ledger debits/credits, committed balances, remaining residual balance, and consumption percentage across the 4 financial blocks.
- **Budget Reassignment Record**: Audit record of funds transferred between account categories sharing the same `cashFlowDirection` within a budget period.

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
