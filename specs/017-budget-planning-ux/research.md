# Phase 0 Research & Technical Decisions: Budget Planning Matrix & Execution Control UX (Desktop & Mobile)

**Branch**: `017-budget-planning-ux` | **Date**: 2026-08-15 | **Spec**: [spec.md](file:///C:/Users/amend/.gemini/antigravity/worktrees/sistema-contable/redesign_budget_planning_ux/specs/017-budget-planning-ux/spec.md)

---

## 1. Matrix Layout & Financial Structure: 4 Executive Blocks

### Decision

Organize the Annual Planning Matrix (`/budgets/matrix`) and Execution Control Dashboard (`/budgets/control`) into **4 distinct executive financial blocks**:

1. 🟢 **INGRESOS (P&L)**: Automatic pre-population of all active `REVENUE` accounts from the Chart of Accounts. Structured as a collapsible hierarchical tree with dynamic, read-only parent subtotals. Standard cash inflow direction (`+`).
2. 🔴 **GASTOS DE VIDA (P&L)**: Automatic pre-population of all active `EXPENSE` accounts. Structured as a collapsible hierarchical tree with dynamic, read-only parent subtotals. Standard cash outflow direction (`-`).
3. 🔵 **AHORRO E INVERSIONES (Balance - Activos)**: On-demand budgeting for `ASSET` accounts added via `+ Presupuestar Activo` with specific intention:
   - `[-] Aporte / Inversión`: Salida de efectivo (Outflow / `EGRESO_EFECTIVO`).
   - `[+] Rescate / Desinversión`: Entrada de efectivo (Inflow / `INGRESO_EFECTIVO`).
4. 🟣 **DEUDAS Y FINANCIACIÓN (Balance - Pasivos)**: On-demand budgeting for `LIABILITY` accounts added via `+ Presupuestar Deuda` with specific intention:
   - `[-] Pago / Amortización de Cuota`: Salida de efectivo (Outflow / `EGRESO_EFECTIVO`).
   - `[+] Nuevo Préstamo / Financiación`: Entrada de efectivo (Inflow / `INGRESO_EFECTIVO`).

### Rationale

- **Clutter Elimination**: Listing all balance sheet accounts automatically would overwhelm the user with dozens of inactive asset/liability accounts (accumulated depreciation, historical equipment, inactive loan accounts). On-demand loading keeps the matrix focused on active cash decisions.
- **Financial Rigor**: P&L items are inherently unidirectional (Revenue adds cash/equity, Expense consumes cash/equity), whereas Balance Sheet items are bidirectional. Distinguishing contributions vs redemptions and loan payments vs new borrowing eliminates sign ambiguity and maintains clarity for cash flow projections.
- **Dual Rows for Single Accounts**: A user may have a credit card or loan account where they both pay monthly installments (`Salida`) and plan financing for major equipment (`Entrada`). Modeling these as independent rows with unique `(accountId, subRowId, cashFlowDirection)` keys provides full flexibility.

### Alternatives Considered

- **Flat List of All Accounts (P&L + Balance)**: Rejected because it clutters the UI with 50+ irrelevant accounts and forces users to manually assign cash flow signs to standard expenses and revenues.
- **Single Mixed "Financiamiento y Ahorro" Section**: Rejected in favor of separating Ahorro e Inversiones (Assets) and Deudas y Financiación (Liabilities) to give executive clarity on wealth generation vs leverage.

---

## 2. Dual-Axis Paradigm & Mobile Viewport Strategy

### Decision

Implement the **Paradigma de Doble Eje (Dual-Axis Paradigm)** across responsive breakpoints ($768\text{px}$ boundary):

- **🖥️ Desktop Viewport ($> 768\text{px}$)**:
  - 100% full-width (`w-full`) interactive 12-month spreadsheet grid.
  - Inline editing with spreadsheet keyboard navigation (`Tab`, `Shift+Tab`, `Enter`, `Shift+Enter`, `Esc`, `Ctrl+D` / `Cmd+D`).
  - Native clipboard paste handling for multi-cell tabular input.
  - Collapsible category tree with dynamic parent rollups.
- **📱 Mobile Viewport ($\le 768\text{px}$)**:
  - **Active Month View ("Mes Activo")**: Displays one month at a time with a horizontal swipeable Month Selector Strip (`[Ene] [Feb] [Mar] ...`).
  - **4 Financial Block Accordions**: Collapsible sections (🟢 Ingresos, 🔴 Gastos de Vida, 🔵 Ahorro e Inversiones, 🟣 Deudas y Financiación) displaying monthly subtotal sums in each accordion header.
  - **Touch-Friendly Account Cards**: High-target card layout ($\ge 44\times 44\text{px}$ touch targets), account code/name, contextual stats (_"Promedio anual: ₲ 120.000"_ or _"Mes anterior: ₲ 115.000"_), clean numeric input, and 3-dots contextual menu (`•••`).
  - **"Deep-Dive por Rubro" Bottom Sheet**: Vertical 12-month breakdown for a single account with mass-distribution tools.

### Rationale

- Spreadsheets with 12+ columns are inherently frustrating on 390px mobile screens (requiring excessive horizontal panning, tiny text, and difficult cell selection).
- Separating macro 12-month desktop editing from focused single-month mobile review + vertical single-account deep-dive provides peak productivity on both form factors without compromising functionality.

### Alternatives Considered

- **Forced 12-Column Horizontal Scroll on Mobile**: Rejected due to horizontal scroll fatigue, clipped content, and accidental cell tapping.
- **Separate Mobile-Only App**: Rejected in favor of a single unified Next.js responsive component architecture sharing identical React state and backend endpoints.

---

## 3. Mobile Deep-Dive por Rubro & Mass Distribution Actions

### Decision

When a user taps an account card or chooses "Ver desglose de los 12 meses" in mobile view, open a modal Bottom Sheet (Drawer) that displays:

1. **Header Toolbar**: Account name, code, total annual sum, and quick mass distribution action buttons:
   - `[ Distribuir parejo ]`: Prorates a total annual amount equally across 12 months.
   - `[ Copiar de Ene a Dic ]` (Replicar): Copies January's value to months February through December.
   - `[ Traer Real del Año Anterior + % ]`: Loads prior-year historical ledger actuals with percentage adjustment.
2. **Vertical 12-Month List**: Stacked list of all 12 months (Ene a Dic) with large, finger-friendly numeric inputs, locked-period badges, and smooth scroll behavior.

### Rationale

- Vertical scrolling is natural and ergonomic on phones. A user can rapidly budget a full year for a specific account in seconds using either mass distribution buttons or vertical thumb inputs.

### Alternatives Considered

- **Multi-step wizard**: Rejected as too slow and rigid compared to a direct vertical list with instant mass action shortcuts.

---

## 4. Mobile Ergonomics & Micro-Interactions

### Decision

Implement tactile mobile optimizations:

1. **Teclado Numérico Nativo (`inputmode="numeric"`)**:
   - For currencies with 0 decimal places (e.g. Paraguayan Guaraní `PYG` / `₲`), set `inputmode="numeric"` and `pattern="[0-9]*"`. This immediately invokes the clean 10-key numeric keypad (0-9) on iOS and Android without confusing decimal points or text keys.
   - For currencies with decimals (e.g. `USD`), dynamically set `inputmode="decimal"`.
2. **Fluid Currency Masking (Guaraníes Thousands Dot)**:
   - Apply thousands separators (e.g. `150.000`) without jumping the cursor position or losing focus during rapid typing.
3. **Thumb Zone Optimization & Sticky Bottom Action Bar**:
   - Primary actions (Guardar Cambios, Descartar, Selector de mes, 3-dots menus) are positioned within the lower half of the screen.
   - When modifications occur (`dirtyCells.size > 0`), slide in a **Sticky Bottom Action Bar**:
     - `[ 💾 Guardar Cambios (N pendientes) ]` (accented primary action).
     - `[ Descartar ]` (outline secondary action).
4. **Bottom Sheets (Drawers) in Place of Centered Modales**:
   - All mobile dialogs (Autorellenar, Presupuestar Cuenta, Reasignar Fondos, Menú 3 puntos, Deep-Dive) render as bottom sheets anchored to the screen bottom with `env(safe-area-inset-bottom)` padding, backdrop dismiss, and swipe-down gestures.
5. **Touch Targets**:
   - All interactive touch targets maintain a minimum dimension of $44\times 44\text{px}$.

### Rationale

- Enhances thumb reachability, prevents virtual keyboard overlap, and ensures rapid micro-sessions on mobile devices.

---

## 5. P&L Hierarchical Tree Structure & Real-Time Rollups

### Decision

Render P&L accounts (Ingresos and Gastos de Vida) as a hierarchical category tree:

- Parent category rows display auto-calculated, read-only monthly subtotals rolled up from their descendant child accounts.
- Parent nodes can be expanded or collapsed.
- Only leaf (imputable) accounts have editable input cells.

### Rationale

- Users can collapse entire expenditure branches while reviewing higher-level category totals, keeping cognitive load low.
- Subtotals calculate dynamically in real time on the client, ensuring instant responsiveness without network overhead.

---

## 6. Smart Distribution Drivers & Historical Baseline Engine

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

## 7. Executive Execution Control Engine & Residual Available Calculation

### Decision

Calculate monthly budget execution status in `/budgets/control` as:
$$\text{Available} = \text{Budgeted} - \text{Executed} - \text{Committed}$$

### Ledger Mapping for `Executed` (Partida Doble Mapping)

- **🟢 Ingresos (P&L `REVENUE` / `INCOME`)**: $\text{Executed} = \sum \text{Credits} - \sum \text{Debits}$ (Net Revenue).
- **🔴 Gastos de Vida (P&L `EXPENSE`)**: $\text{Executed} = \sum \text{Debits} - \sum \text{Credits}$ (Net Expense).
- **🔵 Ahorro e Inversiones (Activos `ASSET`)**:
  - `[-] Aporte / Inversión` (Salida / `EGRESO_EFECTIVO`): $\text{Executed} = \sum \text{Debits}$ (Asset increase via cash payment).
  - `[+] Rescate / Desinversión` (Entrada / `INGRESO_EFECTIVO`): $\text{Executed} = \sum \text{Credits}$ (Asset decrease generating cash).
- **🟣 Deudas y Financiación (Pasivos `LIABILITY`)**:
  - `[-] Pago / Amortización` (Salida / `EGRESO_EFECTIVO`): $\text{Executed} = \sum \text{Debits}$ (Liability decrease via debt repayment).
  - `[+] Nuevo Préstamo / Financiación` (Entrada / `INGRESO_EFECTIVO`): $\text{Executed} = \sum \text{Credits}$ (Liability increase via loan disbursement).

### Consumption Gauges

- **Green (Normal)**: Consumption $< 75\%$.
- **Yellow (Warning)**: Consumption $75\% - 99\%$.
- **Red (Overbudget)**: Consumption $\ge 100\%$.

---

## 8. Directional Inter-Account Budget Reallocations

### Decision

Allow budget reassignments between accounts across any block, provided both accounts share the **same cash flow direction**:

- **Salida $\leftrightarrow$ Salida**: Transfers permitted between Gastos de Vida, Aportes a Inversión, and Pagos de Deuda (e.g. reallocating surplus unspent dining budget to an investment contribution).
- **Entrada $\leftrightarrow$ Entrada**: Transfers permitted between Ingresos, Rescates de Inversión, and Nuevos Préstamos.
- Reassignments modify `BudgetItemEntity` amounts transactionally and create an immutable audit record in `budget_reassignments`.

---

## 9. 100% Screen Width & Elimination of Sticky Cash Flow Footer

### Decision

The desktop budget planning matrix layout occupies 100% of the available screen width (`w-full`). The sticky footer summary bar with cash flow aggregates is completely eliminated from the budget matrix, as cash flow aggregates are exclusively managed in the dedicated Cash Flow module.
