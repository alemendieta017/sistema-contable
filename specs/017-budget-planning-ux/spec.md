# Feature Specification: Budget Planning Matrix & Execution Control UX

**Feature Branch**: `017-budget-planning-ux`

**Created**: 2026-08-12

**Updated**: 2026-08-14

**Status**: Ready for Planning

**Input**: User description: "Rediseño de Módulo de Presupuestos: Grid unificado con edición inline de 12 meses, carga inteligente mediante autorelleno simplificado, pre-poblado desde Plan de Cuentas, modal unificado de activo/pasivo sin verbosidad, menú de opciones de 3 puntitos, aprovechamiento al 100% del ancho de pantalla sin barra sticky de caja, separación de pantallas de Matriz y Control de Ejecución, y Tablero de Control de Ejecución y Disponible Residual mensual con semáforos visuales."

## Clarifications

### Session 2026-08-12

- Q: ¿Cómo se deben gestionar los colores de dark/light theme, los labels del selector de año y el idioma de las leyendas en la UI? → A: Se debe respetar strictly el contraste en ambos temas (oscuro y claro), asegurando visibilidad en selects y leyendas. El selector de año debe llamarse simplemente "Año". Toda la UI debe estar 100% en español ("Ingresos", "Egresos", "Activos", "Pasivos", "Patrimonio Neto", etc.), eliminando cualquier término en inglés ("TOTAL EXPENSES", "TOTAL ASSET", "asset", "liability", etc.).
- Q: ¿Qué ajustes visuales y de interacción se requieren para mobile y la vista del grid? → A: La app debe ser Mobile First Responsive, garantizando visibilidad e interacción óptima en pantallas móviles de la planilla de 12 meses. Se elimina la leyenda redundante "Grid interactivo 12 Meses".
- Q: ¿Cómo visualizar y editar la planilla de 12 meses en dispositivos móviles? → A: Grid con columna izquierda de nombre de cuenta fija (sticky) y desplazamiento horizontal suave (`overflow-x: auto` con scroll/swipe indicators) para los 12 meses.

### Session 2026-08-13

- Q: ¿Cómo estructurar las secciones de la matriz presupuestaria y la carga de cuentas de Balance (Activos y Pasivos)? → A: La matriz y vista de control se dividen en 4 bloques financieros ejecutivos: 1. 🟢 INGRESOS (P&L, carga automática de cuentas de ingreso, flujo +), 2. 🔴 GASTOS DE VIDA (P&L, carga automática de cuentas de gasto, flujo -), 3. 🔵 AHORRO E INVERSIONES (Movimientos de Activo a demanda con botón [+ Presupuestar Activo]: Aporte/Inversión [-] o Rescate/Desinversión [+]), y 4. 🟣 DEUDAS Y FINANCIACIÓN (Movimientos de Pasivo a demanda con botón [+ Presupuestar Deuda]: Pago/Amortización [-] o Nuevo Préstamo/Financiación [+]). Una misma cuenta de balance puede tener ambas filas independientes si aplica.
- Q: ¿Cómo debe calcular el motor de ejecución (/budgets/control) el importe real ejecutado (Executed) para las cuentas de Balance (Activos y Pasivos) a partir de los asientos contables? → A: Mapear por partida doble de forma independiente: Para Salidas ([-] Aporte/Inversión y [-] Pago de Deuda) computar la suma de Débitos del mes; para Entradas ([+] Rescate/Desinversión y [+] Nuevo Préstamo) computar la suma de Créditos del mes.
- Q: ¿Cómo debe gestionarse el guardado de los datos ingresados en la matriz anual de 12 meses? → A: Guardado atómico explícito mediante botón [ 💾 Guardar Todo ] con estado de cambios pendientes (dirty state) y confirmación/advertencia al intentar abandonar la página con cambios sin guardar.
- Q: ¿Cómo deben agruparse y visualizarse las cuentas de P&L (Ingresos y Gastos) en la matriz anual: en árbol jerárquico colapsable con subtotales por grupo contable o en listado plano? → A: Árbol jerárquico colapsable con subtotales calculados automáticamente de sólo lectura por rubro/categoría padre, permitiendo expandir/colapsar ramas y editar únicamente las cuentas hijas imputables.
- Q: ¿Se debe permitir la reasignación/traspaso de presupuesto entre cuentas de distintos bloques financieros (ej. transferir disponible residual de Gastos de Vida a Ahorro e Inversiones) o restringirlo únicamente dentro del mismo bloque? → A: Permitir reasignaciones entre cuentas de cualquier bloque financiero siempre que compartan la misma dirección de flujo de caja (Salida ↔ Salida [ej. Gastos a Inversiones o Deuda] y Entrada ↔ Entrada [ej. Ingresos a Financiación]).
- Q: ¿Se debe unificar el modelo de datos utilizando exclusivamente CashFlowDirection (INGRESO_EFECTIVO | EGRESO_EFECTIVO) en combinación con el tipo contable de la cuenta (account.type), prescindiendo de un enum FlowIntention adicional? → A: Reutilizar CashFlowDirection (INGRESO_EFECTIVO / EGRESO_EFECTIVO) y derivar la semántica contable y visual de la tupla (account.type, cashFlowDirection), eliminando la necesidad de un enum FlowIntention separado.

### Session 2026-08-14

- Q: ¿Cómo se deben simplificar y unificar los modales y controles para presupuestar cuentas de balance (Ahorro e Inversiones, Deudas y Financiación)? → A: Se unifican en un único modal directo y no verboso denominado "Presupuestar Cuenta" (o "Presupuestar Activo/Pasivo") con solo 3 campos esenciales: 1. Selector de cuenta contable ("Seleccionar cuenta"), 2. Dirección de flujo con selector directo `[Salida de efectivo]` y `[Entrada de efectivo]`, y 3. Concepto / Descripción. Se eliminan textos redundantes y explicaciones extensas. Se elimina el botón inline "+ Agregar sub-línea" dentro de las filas, centralizando la adición en los botones de sección "+ Presupuestar Activo" y "+ Presupuestar Deuda".
- Q: ¿Cómo reemplazar la columna MOTOR y el botón interactivo de dirección de flujo en la matriz? → A: Se reemplaza la columna "MOTOR" por una columna de opciones con un botón de 3 puntitos (`•••`). El menú desplegable incluye: 1. "Rellenar" (abre el modal simplificado de autorelleno), 2. "Editar" (para cuentas de balance, abre el modal unificado para modificar la dirección de flujo o concepto), y 3. "Eliminar" (para cuentas de balance agregadas a demanda, con confirmación). Se retira el botón interactivo inline "EGRESO EFECTIVO" / "INGRESO EFECTIVO" de la celda de cuenta, reemplazándolo por una etiqueta visual informativa discreta.
- Q: ¿Cómo simplificar la terminología y opciones del modal de distribución automática? → A: Se reemplaza el término "Motor de Distribución Inteligente" y su jerga compleja por un modal limpio y directo de "Autorellenar Presupuesto", con opciones claras en lenguaje natural: "Distribuir monto total parejo en los 12 meses", "Replicar valor a los meses siguientes", "Incremento porcentual mensual (%)", "Ponderación histórica" y "Traer valores reales del año anterior".
- Q: ¿Cómo optimizar el aprovechamiento de pantalla (UI) y qué hacer con la barra sticky inferior de totales de caja? → A: La tabla y la pantalla deben ocupar el 100% del ancho disponible (`w-full`) sin contenedores que limiten el espacio horizontal. Se elimina la barra sticky inferior de totales de flujo de caja (Total Entradas, Total Salidas, Flujo Neto del Mes, Flujo Neto Acumulado), ya que esos análisis corresponden de manera exclusiva a la pantalla dedicada de Flujo de Caja.
- Q: ¿Cómo estructurar la navegación entre la Matriz Anual y el Control de Ejecución Mensual? → A: Deben ser dos pantallas independientes en el sistema y en el menú de navegación principal (Sidebar): 1. "Planificación Presupuestaria" / "Matriz Anual" (`/budgets/matrix`), y 2. "Control de Ejecución" (`/budgets/control`), en lugar de una vista única compartida con un toggle de cabecera.
- Q: ¿Cuál es el requerimiento de corrección para el selector de Año Fiscal? → A: El selector de año debe desplegar correctamente el nombre del año fiscal (`name`, ej. "2025", "2026") y el estado de cierre (`(Cerrado)` si `status === 'CLOSED'`), corrigiendo la visualización en blanco producida por referencias a propiedades inexistentes.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Annual Matrix Inline Planning & Direct Cell Editing (Priority: P1)

As a financial planner or manager on desktop or mobile device, I want an interactive 12-month matrix view (`/budgets/matrix`) utilizing 100% of the available screen width, with responsive mobile layout, inline grid editing, hierarchical category tree with collapsible branches and auto-calculated subtotals, a 3-dots options menu per row (`•••`), and keyboard navigation (Enter, Tab, Escape), so that I can rapidly view, enter, and adjust budget allocations across all accounts without navigating to isolated single-month edit forms or wasting screen space.

**Why this priority**: Eliminates context-switching friction and provides the core data entry interface required for high-velocity annual budget creation across the chart of accounts on any device with maximal horizontal workspace.

**Independent Test**: A user can open `/budgets/matrix` on mobile or desktop, see the grid occupying 100% screen width, expand/collapse parent groups, navigate through cells, update values inline, verify parent subtotals update in real time, access row actions via the 3-dots menu (`•••`), cancel edits with `Esc`, and save all changes atomically via `[ 💾 Guardar Todo ]`.

**Acceptance Scenarios**:

1. **Given** a user viewing the Annual Budget Matrix (`/budgets/matrix`) on mobile or desktop, **When** the page renders, **Then** the grid expands to 100% of the viewport width without restrictive max-width bounds, the sticky footer with cash flow aggregates is absent, and the fiscal year selector dropdown correctly displays the year name (e.g. "2025", "2026") and status.
2. **Given** a user viewing P&L sections (Ingresos / Gastos), **When** reviewing categories, **Then** accounts are organized in a collapsible hierarchical tree with read-only parent subtotal rows that recalculate dynamically whenever an imputable child account is edited.
3. **Given** an account row in the matrix, **When** clicking the 3-dots menu icon (`•••`), **Then** a clean dropdown menu opens displaying available contextual actions ("Rellenar", "Editar", "Eliminar") appropriate to the row type.
4. **Given** a user editing a cell in the matrix on desktop, **When** they press `Tab` or `Enter`, **Then** the current edit is accepted and focus moves smoothly to the next month cell (Tab) or the same month in the row below (Enter).
5. **Given** unsaved edits in the matrix, **When** the user attempts to navigate away before clicking `[ 💾 Guardar Todo ]`, **Then** the system displays a dirty state confirmation dialog warning of unsaved changes.
6. **Given** a user clicking `[ 💾 Guardar Todo ]`, **When** the request succeeds, **Then** all 12-month allocations across all sections are persisted atomically in a single backend transaction.

---

### User Story 2 - Simplified Budget Auto-Fill & Baseline Loading (Priority: P2)

As a financial planner, I want a simplified, user-friendly Auto-fill tool ("Autorellenar Presupuesto") with clear options (distribuir parejo en 12 meses, replicar a los siguientes meses, incremento porcentual mensual, y traer real del año anterior), accessible directly from the 3-dots row menu (`•••`), so that I can quickly populate realistic multi-month budgets without dealing with complex jargon or manual monthly calculations.

**Why this priority**: Dramatically reduces repetitive manual calculations through an intuitive, accessible interface that fits advanced personal finance management without unnecessary complexity.

**Independent Test**: A user can click the 3-dots menu (`•••`) on an account row, select "Rellenar", choose "Distribuir monto anual equitativamente" with an annual amount of $120,000, and verify that each month is populated with $10,000 automatically.

**Acceptance Scenarios**:

1. **Given** an account row in the matrix, **When** the user clicks the 3-dots menu (`•••`) and selects "Rellenar", **Then** a simplified modal titled "Autorellenar Presupuesto" opens with clear natural language options:
   - Distribuir monto total parejo en los 12 meses (Prorrateo equitativo).
   - Replicar valor a los meses siguientes (Forward fill).
   - Incremento porcentual mensual (MoM %).
   - Ponderación histórica (según movimientos del año anterior).
   - Traer valores reales del año anterior (+ Ajuste %).
2. **Given** a user changing a value in March, **When** they trigger "Replicar hacia adelante" (`Ctrl+D` / `Cmd+D` with preventDefault or via the auto-fill modal), **Then** all subsequent months (April through December) update to match March's value.
3. **Given** a user starting a new fiscal year budget, **When** they choose "Traer Real del Año Anterior", **Then** the grid pre-populates all active accounts with actual historical ledger transactions plus the specified adjustment.

---

### User Story 3 - Executive Monthly Budget Execution & Availability Dashboard (Priority: P3)

As a budget owner or financial manager, I want a dedicated, separate Monthly Execution Control page (`/budgets/control`) in the navigation sidebar, displaying real-time available residual budget ($\text{Available} = \text{Budgeted} - \text{Executed} - \text{Committed}$) with color-coded gauge bars and cross-block budget reallocations matching cash flow direction, so that I can monitor monthly spending health and make operational decisions independently from annual planning.

**Why this priority**: Clearly separates macro annual planning from micro operational control into two dedicated screens, eliminating navigation confusion.

**Independent Test**: A user can navigate directly to "Control de Ejecución" (`/budgets/control`) from the sidebar, select August 2026, view visual gauge bars displaying consumption percentages (Green <75%, Yellow 75-99%, Red >=100%), and transfer surplus budget from an Expense account to an Investment allocation.

**Acceptance Scenarios**:

1. **Given** the system navigation sidebar, **When** viewed, **Then** "Planificación Presupuestaria" (`/budgets/matrix`) and "Control de Ejecución" (`/budgets/control`) appear as distinct, dedicated menu items leading to their respective full-screen pages.
2. **Given** the active period dashboard for August 2026, **When** new ledger transactions or committed orders are recorded, **Then** the dashboard calculates and displays $\text{Available} = \text{Budgeted} - \text{Executed} - \text{Committed}$ in real time for each category, using Debits for Outflows and Credits for Inflows.
3. **Given** an account category reaching 85% budget consumption, **When** viewed in the control dashboard, **Then** its progress bar turns yellow (warning), and if it reaches 100% or higher, it turns red (overbudget alert).
4. **Given** an account category running low on available funds, **When** the user clicks "Reasignar Presupuesto", **Then** the system allows transferring available funds from any account sharing the same flow direction (e.g. from an unspent Expense to an Investment contribution).

---

### User Story 4 - 4 Executive Financial Blocks & Streamlined Unified Balance Budgeting (Priority: P1)

As an advanced personal finance manager, I want the budget matrix organized into 4 distinct financial blocks (1. Ingresos, 2. Gastos de Vida, 3. Ahorro e Inversiones, 4. Deudas y Financiación), with automatic pre-population of P&L accounts, a single unified and non-verbose modal ("Presupuestar Cuenta") for on-demand Balance Sheet accounts with simple flow direction buttons (`[Salida de efectivo]` / `[Entrada de efectivo]`), and editing/deletion of balance rows directly via the 3-dots row menu (`•••`), so that my matrix remains clean, uncluttered, and easy to maintain.

**Why this priority**: Eliminates confusing redundant options, removes nested "+ Agregar sub-línea" buttons inside rows, and provides a direct, minimal-friction budgeting flow for investment and debt accounts.

**Independent Test**: A user can view pre-populated P&L accounts, click `+ Presupuestar Activo` or `+ Presupuestar Deuda` to open the unified modal, select a balance account, choose `[Salida de efectivo]`, enter a concept, and see the clean row added to the grid with editing and deletion options accessible via the 3-dots menu (`•••`).

**Acceptance Scenarios**:

1. **Given** the Annual Budget Matrix view (`/budgets/matrix`), **When** opened for a fiscal year, **Then** the grid displays 4 separate executive sections: 🟢 Ingresos (P&L), 🔴 Gastos de Vida (P&L), 🔵 Ahorro e Inversiones (Activos), and 🟣 Deudas y Financiación (Pasivos).
2. **Given** the Balance sections (Ahorro e Inversiones / Deudas y Financiación), **When** the user clicks `+ Presupuestar Activo` or `+ Presupuestar Deuda`, **Then** a unified, non-verbose modal opens with only 3 core fields:
   - Selector de cuenta ("Seleccionar cuenta").
   - Dirección de Flujo: direct buttons `[Salida de efectivo]` and `[Entrada de efectivo]`.
   - Concepto: text description for the budget row.
3. **Given** an existing Balance account row in the matrix, **When** reviewing the row, **Then** no "+ Agregar sub-línea" button is shown inside the item, and no inline toggle button is displayed; instead, the row displays a discreet flow badge and provides "Editar" inside the 3-dots menu (`•••`) to modify flow direction or concept in the unified modal.
4. **Given** an on-demand balance row no longer needed, **When** the user selects "Eliminar" from the 3-dots menu (`•••`), **Then** the system prompts for confirmation and removes the row and its associated records for that fiscal year.

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
- **FR-004**: System MUST provide a simplified Auto-fill modal ("Autorellenar Presupuesto") replacing complex jargon with clear, natural language options:
  - Distribuir monto total parejo en los 12 meses (flat prorate).
  - Replicar valor a los meses siguientes (forward fill / `Ctrl+D` / `Cmd+D`).
  - Incremento porcentual mensual (MoM %).
  - Ponderación histórica (según estacionalidad del año anterior).
  - Traer valores reales del año anterior (+ Ajuste %).
- **FR-005**: System MUST provide a baseline setup tool ("Traer Real del Año Anterior") to pre-populate annual budget matrices based on actual accounting ledger movements with optional percentage adjustments. The baseline historical calculation MUST deterministically shift period start/end dates back by exactly 1 year (ISO 8601) and execute PostgreSQL date range queries (`tx.accounting_date >= priorStartDate AND tx.accounting_date <= priorEndDate`) to avoid reliance on fiscal year name strings or invalid `LIKE` operations on `DATE` columns.
- **FR-006**: System MUST separate Annual Budget Planning (`/budgets/matrix`) and Monthly Execution Control (`/budgets/control`) into two independent, dedicated pages accessible directly from the main sidebar navigation.
- **FR-007**: System MUST provide a Monthly Execution Control Dashboard (`/budgets/control`) for selected active periods displaying:
  - Total Budgeted Amount, Total Executed Amount to date, and Total Available Residual Balance per section and account.
  - Calculation formula: $\text{Available} = \text{Budgeted} - \text{Executed} - \text{Committed}$.
  - Ledger mapping for `Executed`: For P&L accounts, Revenue calculates sum of Credits and Expense calculates sum of Debits. For Balance Sheet accounts, Outflows (`cashFlowDirection = 'EGRESO_EFECTIVO'`: Aportes a Inversión y Pagos de Deuda) calculate sum of Debits, while Inflows (`cashFlowDirection = 'INGRESO_EFECTIVO'`: Rescates de Inversión y Nuevos Préstamos) calculate sum of Credits.
- **FR-008**: System MUST display color-coded visual progress/gauge bars for budget consumption per category:
  - **Green**: Consumption < 75%.
  - **Yellow**: Consumption 75% - 99% (Warning threshold).
  - **Red**: Consumption $\ge$ 100% (Overbudget threshold).
- **FR-009**: System MUST provide quick budget re-allocation/transfer controls on the monthly dashboard allowing movement of available funds between accounts that share the same `cashFlowDirection` (Salida ↔ Salida [e.g. Gastos a Inversiones o Pagos de deuda] y Entrada ↔ Entrada [e.g. Ingresos a Nuevos Préstamos]) within the active period.
- **FR-010**: System MUST provide a single unified, non-verbose modal workflow ("Presupuestar Cuenta" / "Presupuestar Activo/Pasivo") for Balance Sheet accounts with 3 essential fields:
  1. **Seleccionar cuenta**: Account selector of active Balance accounts.
  2. **Dirección de Flujo**: Direct toggle/buttons `[Salida de efectivo]` and `[Entrada de efectivo]`.
  3. **Concepto**: Text input for the budget row description/concept.
- **FR-011**: System MUST allow adding the same Balance Sheet account multiple times with distinct `cashFlowDirection` values (e.g., one row for loan disbursement inflow `INGRESO_EFECTIVO` and one row for loan repayment outflow `EGRESO_EFECTIVO`).
- **FR-012**: System MUST render discreet, non-clickable visual cash flow direction badges on balance rows (`Salida de efectivo` / `Entrada de efectivo`). Direction modification MUST be performed via the "Editar" option inside the row's 3-dots menu (`•••`), reopening the unified modal.
- **FR-013**: System MUST layout the budget planning matrix to occupy 100% of the available screen width (`w-full`) without artificial max-width container constraints. The bottom sticky summary bar with cash flow aggregates (Entradas, Salidas, Flujo Neto) is eliminated from the budget matrix, as cash flow aggregates are exclusively managed in the dedicated Cash Flow Statement screen.
- **FR-014**: System MUST adhere strictly to active Dark/Light theme color tokens across all components. The fiscal year selector label MUST read simply "Año", and the dropdown options MUST correctly render the fiscal year name string (`fy.name`, e.g. "2025", "2026") and status indicator (`(Cerrado)` when `fy.status === 'CLOSED'`).
- **FR-015**: System MUST present 100% of user interface strings, category labels, section headers, and totals in Spanish ("Ingresos", "Gastos de Vida", "Ahorro e Inversiones", "Deudas y Financiación", "Salida de efectivo", "Entrada de efectivo", "Autorellenar", "Concepto"), completely eliminating mixed English terminology.
- **FR-016**: System MUST provide a 3-dots options menu (`•••`) column on each row, replacing the "MOTOR" column, containing context-appropriate options: "Rellenar" (opens simplified auto-fill modal), "Editar" (opens unified modal for balance accounts), and "Eliminar" (for on-demand balance rows).
- **FR-017**: System MUST provide a Mobile First Responsive layout for the 12-month budget planning matrix (`/budgets/matrix`) utilizing a fixed sticky account name column on the left with smooth horizontal touch-scrolling (`overflow-x: auto`) for the 12 month columns.
- **FR-018**: System MUST eliminate the "+ Agregar sub-línea" button inside balance account rows. Balance rows are added exclusively via the section header buttons `+ Presupuestar Activo` and `+ Presupuestar Deuda`, and removed via "Eliminar" in the 3-dots menu (`•••`) with user confirmation.
- **FR-019**: System MUST persist all 12-month matrix modifications atomically via an explicit `[ 💾 Guardar Todo ]` button, providing a dirty state visual indicator when changes are pending and alerting the user if navigating away with unsaved changes.

### Key Entities

- **Budget Matrix Allocation**: Represents a multi-period budget model containing monthly allocated numeric values mapped to specific accounting categories, fiscal years, and explicit `cashFlowDirection` (`INGRESO_EFECTIVO` | `EGRESO_EFECTIVO`). Combined with `account.type` (`REVENUE`, `EXPENSE`, `ASSET`, `LIABILITY`), it completely determines visual labeling, double-entry ledger matching, and net cash flow aggregation.
- **Budget Auto-Fill Parameter**: Parameterized auto-fill definition (flat prorate, trend %, historical weighting, forward fill) applied to compute monthly allocation distributions.
- **Monthly Execution Summary**: Period-specific calculated entity aggregating budgeted limits, actual ledger debits/credits, committed balances, remaining residual balance, and consumption percentage across the 4 financial blocks.
- **Budget Reassignment Record**: Audit record of funds transferred between account categories sharing the same `cashFlowDirection` within a budget period.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Financial planners can complete full 12-month multi-account annual budget entry in under 5 minutes using inline matrix editing and simplified auto-fill tools (70% time reduction compared to single-form entry).
- **SC-002**: 100% of cell edits and auto-fill calculations in the matrix respond within 100ms with 60fps spreadsheet grid keyboard-only navigation supported on desktop and touch navigation on mobile across 100% viewport width.
- **SC-003**: Budget owners can access "Control de Ejecución" directly from the sidebar navigation and identify account categories near or over budget limit within 3 seconds of viewing the page on both desktop and mobile viewports.
- **SC-004**: 95% of accidental overbudgeting scenarios are prevented due to real-time color-coded visual gauge indicators and residual balance calculations on the active month dashboard.
- **SC-005**: 100% of UI elements, fiscal year select options, and dropdown items maintain compliant WCAG AA color contrast in both Dark and Light themes with zero untranslated English strings or missing year labels.

## Assumptions

- The chart of accounts structure and account hierarchies are defined and active in the core ledger system.
- Historical accounting ledger transactions exist or can be queried for prior-year actual baseline calculations.
- The 12-month budget matrix occupies 100% available screen width with a Mobile First Responsive design and sticky account column navigation for mobile viewports, while supporting desktop keyboard shortcuts (Tab/Enter/Copy-Paste).
- Cash flow statement aggregations belong to the dedicated Cash Flow module and are omitted from the budget planning matrix.
- Period lock statuses (closed fiscal months) are enforced by the core accounting system.
