# Quickstart & Verification Guide: Budget Planning Matrix & Execution Control UX (Desktop & Mobile)

**Branch**: `017-budget-planning-ux` | **Date**: 2026-08-15 | **Spec**: [spec.md](file:///C:/Users/amend/.gemini/antigravity/worktrees/sistema-contable/redesign_budget_planning_ux/specs/017-budget-planning-ux/spec.md)

---

## 1. Automated Verification Commands

Run the following test suites to verify backend business logic, 4-block matrix operations, distribution drivers, baseline pre-population, execution engine, directional budget transfers, frontend components, and monorepo code quality:

```bash
# Run unit tests for distribution drivers and math calculations
npm --prefix backend test -- tests/unit/budget-drivers.spec.ts

# Run unit tests for execution control and directional transfer validation
npm --prefix backend test -- tests/unit/budget-control.spec.ts

# Run integration tests for matrix API, tree aggregations, and control dashboard
npm --prefix backend test -- tests/integration/budget-matrix.spec.ts

# Run frontend tests
npm --prefix frontend test

# Run linting across all monorepo packages (0 errors, 0 warnings)
npm run lint
```

---

## 2. Manual End-to-End Walkthrough

### Scenario A: Desktop 12-Month Matrix Interactive Planning (`/budgets/matrix` on Viewport $> 768\text{px}$)

1. **Start Services**:
   ```bash
   npm --prefix backend run start:dev
   npm --prefix frontend run dev
   ```
2. **Access Matrix**: Navigate to `http://localhost:3000/budgets/matrix` on a desktop viewport.
3. **Verify 100% Full-Width Layout & 4 Executive Blocks**:
   - Verify table occupies 100% of viewport width without restrictive max-width bounds.
   - 🟢 **Ingresos**: Verify active revenue accounts are listed with dynamic parent subtotals.
   - 🔴 **Gastos de Vida**: Verify active expense accounts are listed in a collapsible category tree with read-only parent subtotals.
   - 🔵 **Ahorro e Inversiones**: Verify on-demand Asset accounts with `+ Presupuestar Activo` button.
   - 🟣 **Deudas y Financiación**: Verify on-demand Liability accounts with `+ Presupuestar Deuda` button.
   - Verify fiscal year dropdown displays year name (`name`) and status (`(Cerrado)` if closed).
   - Verify row options column with 3-dots button (`•••`) containing "Rellenar", "Editar", and "Eliminar".
4. **Inline Cell Editing & Keyboard Navigation**:
   - Click cell for January under an expense account and type `250000`.
   - Press `Tab` to navigate right to February (`250000`), press `Enter` to navigate down.
   - Press `Ctrl+D` (or `Cmd+D`) to replicate selected value to all subsequent open months.
   - Verify parent category subtotals update dynamically in real time.
5. **Autorellenar Presupuesto**:
   - Click `•••` on an account row and select **Rellenar**.
   - Select "Distribuir monto total parejo en los 12 meses" with `1.200.000` ₲, submit, and verify every month receives `100.000` ₲.
6. **Dirty State & Atomic Persistence**:
   - Notice dirty state indicator on `[ 💾 Guardar Todo ]` showing pending cell count.
   - Click `[ 💾 Guardar Todo ]` and verify all allocations persist atomically in a single backend transaction.

---

### Scenario B: Mobile Adaptive Planning & Deep-Dive Bottom Sheet (`/budgets/matrix` on Viewport $\le 768\text{px}$)

1. **Open Mobile View**: Open DevTools Device Mode (e.g. iPhone 14, 390px width) at `http://localhost:3000/budgets/matrix`.
2. **Verify Active Month View & Month Strip**:
   - Verify the 12-column table is replaced by the focused **Active Month View**.
   - Verify the top horizontal **Swipeable Month Strip** (`[Ene] [Feb] [Mar] ...`).
   - Tap `[Mar]` and verify all 4 financial block cards update to display March values.
3. **Verify Mobile Ergonomics & Numeric Keypad**:
   - Tap an input field on an expense card.
   - Verify the input specifies `inputmode="numeric"` for Guaraníes (displaying native 0-9 keypad without decimal point).
   - Type `150000` and verify fluid formatting (`₲ 150.000`) without cursor jumping.
4. **Verify Mobile 3-Dots Menu Bottom Sheet**:
   - Tap `•••` on an account card.
   - Verify an ergonomic Bottom Sheet slides up from the thumb zone with options:
     - ⚡ _Replicar este monto a los meses restantes_
     - 📈 _Ajustar con % de incremento_
     - 🔍 _Ver desglose de los 12 meses de esta cuenta (Deep-Dive)_
     - ✏️ _Editar cuenta / dirección de flujo_
     - 🗑️ _Eliminar fila_
5. **Verify "Deep-Dive por Rubro" Bottom Sheet**:
   - Tap **Ver desglose de los 12 meses (Deep-Dive)**.
   - Verify the sheet displays all 12 months vertically (Ene to Dic) with thumb-friendly inputs.
   - Tap `[ Distribuir parejo ]`, enter annual total, and verify 12 monthly inputs populate evenly.
   - Tap `[ Copiar de Ene a Dic ]` and verify January's amount copies down to December.
   - Close Deep-Dive sheet.
6. **Verify Sticky Bottom Action Bar for Dirty State**:
   - Verify a floating bottom bar slides in at the bottom of the screen: `[ 💾 Guardar Cambios (N pendientes) ]` and `[ Descartar ]`.
   - Tap `[ 💾 Guardar Cambios ]` and verify changes persist atomically.

---

### Scenario C: Executive Monthly Execution Control (`/budgets/control`)

1. **Access Control Dashboard**: Open sidebar navigation and tap/click **Control de Ejecución** (`/budgets/control`).
2. **Select Active Period**: Select active period (e.g., `Agosto 2026`).
3. **Verify Execution Metrics & Gauges**:
   - Check formula: $\text{Available} = \text{Budgeted} - \text{Executed} - \text{Committed}$.
   - P&L Income calculates net credits; Expense calculates net debits.
   - Balance Outflows (`[-] Aporte` / `[-] Pago`) calculate debits; Inflows calculate credits.
   - Green gauge bar for consumption $< 75\%$.
   - Yellow gauge bar for consumption $75\% - 99\%$.
   - Red gauge bar for consumption $\ge 100\%$.
4. **Directional Inter-Account Reallocations**:
   - Click/tap **Reasignar Presupuesto** (modal on desktop, Bottom Sheet on mobile).
   - Select target account sharing the same flow direction (e.g. from an Expense account to an Investment Contribution account).
   - Enter amount (e.g. `2000`), enter reason, and submit.
   - Verify available balances update immediately and audit record is created.
   - Attempt transfer between opposite directions (e.g. Expense $\rightarrow$ Income) and verify validation error blocks transfer.
