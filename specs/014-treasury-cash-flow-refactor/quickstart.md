# Quickstart Validation Guide: Treasury Cash Accounts & Cash Flow Refactor

## Validation Overview

This quickstart guide walks through end-to-end verification of the money account setup, modal UX, immutability rules, and Direct Cash Flow engine calculations.

---

## 1. Automated Test Execution

### Backend Tests

Execute backend unit and integration tests for accounts and reports use cases:

```bash
cd backend
npm test -- src/application/accounts/update-account.use-case.spec.ts
npm test -- src/application/reports/get-cash-flow.use-case.spec.ts
```

### Frontend Component Tests

Execute frontend tests for accounts management UI:

```bash
cd frontend
npm test
```

---

## 2. Manual Verification Workflow

### Step A: Verify Default Accounts Creation

1. Clear existing accounts or start with a clean test user account.
2. In the frontend, navigate to **Cuentas y Rubros** (`/accounts`).
3. Click **"Generar Cuentas Predetermindas"**.
4. **Expected Result**:
   - Accounts `Efectivo` and `Cuenta Bancaria` are generated.
   - Both show the `Caja/Banco` badge in the accounts table.
   - Neither shows an inline table checkbox.

### Step B: Verify Account Creation Modal & Auto-Keywords

1. On `/accounts`, click **"Agregar Cuenta"**.
2. Select **Tipo de Rubro**: `ACTIVO`.
3. Verify that the toggle _"¿Es cuenta de dinero / efectivo?"_ is visible.
4. Type `"Caja Chica"` into **Nombre de la Cuenta**.
5. **Expected Result**: The toggle automatically switches to active (`checked = true`).
6. Save the account and verify it appears with the `Caja/Banco` badge in the grid.

### Step C: Verify Liquidity Flag Immutability

1. Create a new journal entry or transaction involving `Efectivo`.
2. Open the edit modal for `Efectivo`.
3. **Expected Result**: The money account toggle is disabled (locked) in the UI.
4. Attempt an API payload edit via `PATCH /api/accounts/:id` with `{ "isCashOrBank": false }`.
5. **Expected Result**: Server responds with HTTP 400 Bad Request: `"Cannot change the Cash/Bank flag of an account that already has transactions associated"`.

### Step D: Verify Direct Cash Flow Report

1. Navigate to **Flujo de Caja** (`/reports/cash-flow`).
2. Post income into `Efectivo` from `Sueldo` (e.g. +5,000,000) and an expense from `Efectivo` to `Comida` (e.g. -1,500,000).
3. **Expected Result**:
   - Initial Cash Balance: Opening cash amount.
   - Final Cash Balance: Initial + 3,500,000.
   - Net Cash Flow: +3,500,000.
   - Non-liquid breakdown shows `Sueldo` (+5,000,000) and `Comida` (-1,500,000). `Efectivo` is excluded from category rows.
