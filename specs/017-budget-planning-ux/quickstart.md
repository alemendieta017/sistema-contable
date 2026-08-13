# Quickstart & Verification Guide: Budget Planning Matrix & Execution Control UX

**Branch**: `017-budget-planning-ux` | **Date**: 2026-08-13 | **Spec**: [spec.md](file:///C:/Users/amend/.gemini/antigravity/worktrees/sistema-contable/redesign_budget_planning_ux/specs/017-budget-planning-ux/spec.md)

---

## 1. Automated Verification Commands

Run the following test suites to verify backend business logic, 4-block matrix operations, distribution drivers, baseline pre-population, execution engine, directional budget transfers, and monorepo code quality:

```bash
# Run unit tests for distribution drivers and math calculations
npm --prefix backend test -- tests/unit/budget-drivers.spec.ts

# Run unit tests for execution control and directional transfer validation
npm --prefix backend test -- tests/unit/budget-control.spec.ts

# Run integration tests for matrix API, tree aggregations, and control dashboard
npm --prefix backend test -- tests/integration/budget-matrix.spec.ts

# Run linting across all monorepo packages (0 errors, 0 warnings)
npm run lint
```

---

## 2. Manual End-to-End Walkthrough

### Scenario A: Annual Matrix Interactive Planning (`/budgets/matrix`)

1. **Start Services**:
   ```bash
   npm --prefix backend run start:dev
   npm --prefix frontend run dev
   ```
2. **Access Matrix**: Navigate to `http://localhost:3000/budgets/matrix`.
3. **Inspect 4 Executive Blocks**:
   - 🟢 **Ingresos**: Verify active revenue accounts are listed with `(+) Entrada` badges.
   - 🔴 **Gastos de Vida**: Verify active expense accounts are listed in a collapsible category tree with read-only parent subtotals and `(-) Salida` badges.
   - 🔵 **Ahorro e Inversiones**: Verify empty state with `+ Presupuestar Activo` button.
   - 🟣 **Deudas y Financiación**: Verify empty state with `+ Presupuestar Deuda` button.
4. **On-Demand Balance Budgeting**:
   - Click `+ Presupuestar Activo`, select an investment account, choose `[-] Aporte / Inversión (Salida de caja)`, and add row.
   - Click `+ Presupuestar Deuda`, select a credit card or loan account, choose `[-] Pago / Amortización (Salida de caja)`, and add row.
5. **Inline Cell Editing & Keyboard Navigation**:
   - Click cell for January under an expense account and type `25000`.
   - Press `Tab` to navigate to February (`25000`), press `Enter` to navigate down.
   - Verify parent category subtotals and sticky footer update in real time.
6. **Drivers & Baseline**:
   - Select an account row, click **Acciones > Prorrateo Plano**, enter `120000`, and verify all 12 monthly cells become `10000`.
   - Click **Traer Real del Año Anterior (+5% ajuste)** and verify non-zero historical actuals populate the 12 months with a 5% increase.
7. **Dirty State & Atomic Persistence**:
   - Notice dirty state indicator on `[ 💾 Guardar Todo ]`.
   - Click `[ 💾 Guardar Todo ]` and verify all allocations persist atomically.

---

### Scenario B: Executive Monthly Execution Control (`/budgets/control`)

1. **Access Control Dashboard**: Switch top view toggle to **Control Mensual** (`/budgets/control`).
2. **Select Active Period**: Select active period (e.g., `Agosto 2026`).
3. **Verify Execution Metrics**:
   - Check formula: $\text{Available} = \text{Budgeted} - \text{Executed} - \text{Committed}$.
   - P&L Income calculates net credits; Expense calculates net debits.
   - Balance Outflows (`[-] Aporte` / `[-] Pago`) calculate debits; Inflows calculate credits.
4. **Visual Gauge Status**:
   - Green gauge bar for consumption $< 75\%$.
   - Yellow gauge bar for consumption $75\% - 99\%$.
   - Red gauge bar for consumption $\ge 100\%$.
5. **Directional Inter-Account Reallocations**:
   - Click **Reasignar Presupuesto** on an account row.
   - Select target account sharing the same flow direction (e.g. from an Expense account to an Investment Contribution account).
   - Enter amount (e.g. `2000`), enter reason, and submit.
   - Verify available balances update immediately and audit record is created.
   - Attempt transfer between opposite directions (e.g. Expense $\rightarrow$ Income) and verify validation error blocks transfer.
