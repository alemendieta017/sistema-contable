# Phase 0 Research & Technical Decisions: Budget Planning Matrix & Execution Control UX

**Branch**: `017-budget-planning-ux` | **Date**: 2026-08-13 | **Spec**: [spec.md](file:///C:/Users/amend/.gemini/antigravity/worktrees/sistema-contable/redesign_budget_planning_ux/specs/017-budget-planning-ux/spec.md)

---

## 1. Matrix Layout & Financial Structure: 4 Executive Blocks

### Decision

Organize the Annual Planning Matrix (`/budgets/matrix`) and Execution Control Dashboard (`/budgets/control`) into **4 distinct executive financial blocks**:

1. 🟢 **INGRESOS (P&L)**: Automatic pre-population of all active `REVENUE` accounts from the Chart of Accounts. Structured as a collapsible hierarchical tree with dynamic, read-only parent subtotals. Standard cash inflow direction (`+`).
2. 🔴 **GASTOS DE VIDA (P&L)**: Automatic pre-population of all active `EXPENSE` accounts. Structured as a collapsible hierarchical tree with dynamic, read-only parent subtotals. Standard cash outflow direction (`-`).
3. 🔵 **AHORRO E INVERSIONES (Balance - Activos)**: On-demand budgeting for `ASSET` accounts added via `+ Presupuestar Activo` with specific intention:
   - `[-] Aporte / Inversión`: Salida de Caja (Outflow).
   - `[+] Rescate / Desinversión`: Entrada de Caja (Inflow).
4. 🟣 **DEUDAS Y FINANCIACIÓN (Balance - Pasivos)**: On-demand budgeting for `LIABILITY` accounts added via `+ Presupuestar Deuda` with specific intention:
   - `[-] Pago / Amortización de Cuota`: Salida de Caja (Outflow).
   - `[+] Nuevo Préstamo / Financiación`: Entrada de Caja (Inflow).

### Rationale

- **Clutter Elimination**: Listing all balance sheet accounts automatically would overwhelm the user with dozens of inactive asset/liability accounts (accumulated depreciation, historical equipment, inactive loan accounts). On-demand loading keeps the matrix focused on active cash decisions.
- **Financial Rigor**: P&L items are inherently unidirectional (Revenue adds cash/equity, Expense consumes cash/equity), whereas Balance Sheet items are bidirectional. Distinguishing contributions vs redemptions and loan payments vs new borrowing eliminates sign ambiguity and maintains clarity for cash flow projections.
- **Dual Rows for Single Accounts**: A user may have a credit card or loan account where they both pay monthly installments (`Salida`) and plan financing for major equipment (`Entrada`). Modeling these as independent rows with unique `(accountId, subRowId, cashFlowDirection)` keys provides full flexibility.

### Alternatives Considered

- **Flat List of All Accounts (P&L + Balance)**: Rejected because it clutters the UI with 50+ irrelevant accounts and forces users to manually assign cash flow signs to standard expenses and revenues.
- **Single Mixed "Financiamiento y Ahorro" Section**: Rejected in favor of separating Ahorro e Inversiones (Assets) and Deudas y Financiación (Liabilities) to give executive clarity on wealth generation vs leverage.

---

## 2. P&L Hierarchical Tree Structure & Real-Time Client Rollups

### Decision

Render P&L accounts (Ingresos and Gastos de Vida) as an interactive hierarchical category tree. Parent category rows display auto-calculated, read-only monthly subtotals rolled up from their descendant child accounts. Parent nodes can be expanded or collapsed; only leaf (imputable) accounts have editable input cells.

### Rationale

- **Cognitive Load Reduction**: Users can collapse entire expenditure areas (e.g. "Gastos de Vehículo", "Servicios Básicos") while reviewing higher-level category totals.
- **Data Consistency**: Subtotals are dynamically calculated client-side in real time whenever an imputable child account cell changes, eliminating out-of-sync subtotal values.

### Alternatives Considered

- **Flat Account List without Hierarchy**: Rejected as it makes navigation in large charts of accounts tedious and lacks high-level financial overview.
- **Editable Parent Rows with Auto-distribution to Children**: Rejected due to ambiguity in how distribution ratios should be maintained across multi-tiered category trees.

---

## 3. Inline Grid Cell Editing, Mobile-First Responsive & Keyboard Navigation

### Decision

Implement a custom lightweight React Matrix Grid component with:

- **Mobile First Responsive Layout**: Fixed sticky account name column on the left with smooth horizontal touch-scrolling (`overflow-x: auto`) for the 12 month columns.
- **Desktop Keyboard Navigation**: `Tab` (next month right), `Shift+Tab` (previous month left), `Enter` (same month next row down), `Shift+Enter` (row up), and `Esc` (revert active cell).
- **Clipboard Paste Support**: Native `onPaste` handler parsing `\n` and `\t` delimited data with number sanitization (handling currency symbols, negative formats like `(100)`, and commas/dots).
- **Atomic Persistence & Dirty State Tracking**: An explicit `[ 💾 Guardar Todo ]` button with dirty state tracking, preventing accidental navigation via `beforeunload` events and custom modal confirmation.

### Rationale

- **Performance**: Direct matrix state management in React enables sub-100ms response times and 60fps rendering without the bundle overhead of heavy commercial grids (AG-Grid, Handsontable).
- **Mobile Usability**: Users accessing the budget planner on mobile or tablet viewports can view account names cleanly fixed while swiping through the 12 months.

---

## 4. Smart Distribution Drivers & Historical Baseline Engine

### Decision

Provide client-side math distribution drivers for instant feedback, combined with backend historical baseline loading:

1. `FLAT_PRORATE`: $\text{Monthly} = \text{AnnualTotal} / 12$.
2. `WEIGHTED_HISTORICAL`: Distribute annual total according to prior year monthly cash flow weight ratios ($W_m = \text{Actual}_m / \text{Actual}_{\text{Total}}$).
3. `PERCENTAGE_GROWTH`: Monthly compounding or linear growth ($V_m = V_{m-1} \times (1 + g)$).
4. `FORWARD_FILL` (`Ctrl+D` / Fill Right): Replicate selected cell value to all subsequent months in the fiscal year.
5. `PRIOR_YEAR_ACTUAL`: Backend use case (`GetPriorYearActualsUseCase`) querying actual ledger transactions from the prior fiscal year using deterministic ISO date shifting (`shiftYear(date, -1)`) and B-Tree indexed PostgreSQL date range queries (`tx.accounting_date >= priorStartDate AND tx.accounting_date <= priorEndDate`), applying an optional percentage adjustment.

### Rationale

- Instant browser-side calculation allows planners to model growth or flat scenarios before saving.
- Deterministic ISO date shifting avoids reliance on fiscal year name strings or SQL `LIKE` operations on `DATE` columns, ensuring 100% database query reliability.

---

## 5. Executive Execution Control Engine & Residual Available Calculation

### Decision

Calculate monthly budget execution status in `/budgets/control` as:
$$\text{Available} = \text{Budgeted} - \text{Executed} - \text{Committed}$$

### Ledger Mapping for `Executed` (Partida Doble Mapping)

- **🟢 Ingresos (P&L `REVENUE`)**: $\text{Executed} = \sum \text{Credits} - \sum \text{Debits}$ (Net Revenue).
- **🔴 Gastos de Vida (P&L `EXPENSE`)**: $\text{Executed} = \sum \text{Debits} - \sum \text{Credits}$ (Net Expense).
- **🔵 Ahorro e Inversiones (Activos `ASSET`)**:
  - `[-] Aporte / Inversión` (Salida): $\text{Executed} = \sum \text{Debits}$ (Asset increase via cash payment).
  - `[+] Rescate / Desinversión` (Entrada): $\text{Executed} = \sum \text{Credits}$ (Asset decrease generating cash).
- **🟣 Deudas y Financiación (Pasivos `LIABILITY`)**:
  - `[-] Pago / Amortización` (Salida): $\text{Executed} = \sum \text{Debits}$ (Liability decrease via debt repayment).
  - `[+] Nuevo Préstamo / Financiación` (Entrada): $\text{Executed} = \sum \text{Credits}$ (Liability increase via loan disbursement).

### Consumption Gauges

- **Green (Normal)**: Consumption $< 75\%$.
- **Yellow (Warning)**: Consumption $75\% - 99\%$.
- **Red (Overbudget)**: Consumption $\ge 100\%$.

---

## 6. Directional Inter-Account Budget Reallocations

### Decision

Allow budget reassignments between accounts across any block, provided both accounts share the **same cash flow direction**:

- **Salida $\leftrightarrow$ Salida**: Transfers permitted between Gastos de Vida, Aportes a Inversión, and Pagos de Deuda (e.g. reallocating surplus unspent dining budget to an investment contribution).
- **Entrada $\leftrightarrow$ Entrada**: Transfers permitted between Ingresos, Rescates de Inversión, and Nuevos Préstamos.
- Reassignments modify `BudgetItemEntity` amounts transactionally and create an immutable audit record in `budget_reassignments`.

### Rationale

- Transfers between opposite flow directions (e.g., trying to move available budget from an Income item to an Expense item) would create mathematical and financial inconsistencies. Enforcing directional parity guarantees valid cash flow governance.

---

## 7. Sticky Footer Summary Metrics

### Decision

The sticky footer summary bar displays 4 cash flow metrics in real time:

1. **Total Entradas (+)**: Sum of Ingresos, Rescates de Inversión, and Nuevos Préstamos.
2. **Total Salidas (-)**: Sum of Gastos de Vida, Aportes a Inversión, and Pagos de Deuda.
3. **Flujo Neto del Mes**: $\text{Total Entradas} - \text{Total Salidas}$.
4. **Flujo Neto Acumulado**: $\sum_{m=1}^{12} \text{Flujo Neto}_m$ (Cumulative cash flow delta over the 12 months).

Absolute bank balance projections are intentionally omitted to avoid assumptions about unverified starting liquid balances.
