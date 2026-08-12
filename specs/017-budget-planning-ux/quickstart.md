# Quickstart & Verification Guide: Budget Planning Matrix & Execution Control UX

**Branch**: `017-budget-planning-ux` | **Date**: 2026-08-12 | **Spec**: [spec.md](file:///C:/Users/amend/.gemini/antigravity/worktrees/sistema-contable/redesign_budget_planning_ux/specs/017-budget-planning-ux/spec.md)

---

## 1. Automated Verification Commands

Run the following test suites to verify backend business logic, matrix operations, distribution drivers, baseline pre-population, and budget transfers:

```bash
# Run unit tests for budget drivers and calculations
npm --prefix backend test -- tests/unit/budget-drivers.spec.ts

# Run integration tests for matrix endpoints and budget execution control
npm --prefix backend test -- tests/integration/budget-matrix.spec.ts

# Run linting across monorepo packages
npm run lint
```

---

## 2. Manual End-to-End Walkthrough

### Scenario A: Annual Matrix Interactive Planning (`/budgets/matrix`)

1. Start backend and frontend servers:
   ```bash
   npm --prefix backend run start:dev
   npm --prefix frontend run dev
   ```
2. Navigate to `http://localhost:3000/budgets/matrix`.
3. Select an active Fiscal Year (e.g. `2026`).
4. Click on cell for January under an expense account (e.g. "Sueldos y Salarios") and type `10000`.
5. Press `Tab` to navigate to February, type `10000`, press `Enter` to navigate to the row below.
6. Verify that row total and category total recalculate immediately.
7. Select an annual target for an account, click **Acciones > Prorrateo Plano**, enter `120000`, and verify all 12 monthly cells update to `10000`.
8. Click **Traer Real del Año Anterior (+5% ajuste)** and verify that non-zero actual historical transactions populate the 12 months with a 5% increase.

---

### Scenario B: Executive Monthly Execution Control (`/budgets/control`)

1. Switch top view toggle to **Control Mensual** (`/budgets/control`).
2. Select active period (e.g., `Agosto 2026`).
3. Check category gauge bars:
   - Green bar for categories under 75% consumption.
   - Yellow bar for categories between 75% and 99%.
   - Red bar for categories at or over 100%.
4. Verify residual available balance calculation: $\text{Available} = \text{Budgeted} - \text{Executed} - \text{Committed}$.
5. Click **Reasignar Presupuesto** on an account row:
   - Select Source Account with positive available balance.
   - Enter transfer amount (e.g. `2000`).
   - Enter reason and submit.
   - Verify available balances update immediately for both accounts.
