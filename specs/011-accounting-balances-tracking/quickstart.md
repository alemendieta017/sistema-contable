# Quickstart: Accounting Balances and Period Tracking Engine

This document details the step-by-step validation scenarios to verify the Accounting Balances and Period Tracking features.

---

## Prerequisites

1. Ensure the monorepo dev environment is running.
2. Re-compile the shared types:
   ```bash
   [ -s "$HOME/.nvm/nvm.sh" ] && \. "$HOME/.nvm/nvm.sh" && npm run shared:build
   ```

---

## 1. Automated Verification

Verify that all unit, integration, and contract tests pass:

```bash
# Run backend tests
[ -s "$HOME/.nvm/nvm.sh" ] && \. "$HOME/.nvm/nvm.sh" && npm run test --workspace=backend
```

---

## 2. Manual Verification Scenarios

### Scenario A: Fiscal Year & Period Creation
1. Open the application and navigate to **Ajustes del Sistema** (Settings).
2. Click on the new **Periodos Contables** section (or navigate to `/periods`).
3. Click **Crear Ejercicio**, select or enter year `"2026"`. Save it.
4. **Expected Outcome**: A new Fiscal Year `"Ejercicio 2026"` is created in the `OPEN` state spanning Jan 1st 2026 to Dec 31st 2026, and 12 monthly periods (`2026-01` to `2026-12`) are generated inside it, all initially marked as `OPEN`.

### Scenario B: Period Locking Constraints
1. Post a transaction dated `2026-03-15`. Ensure it succeeds.
2. Select period `2026-03` and trigger closing the period (monthly periods can be closed via backend API for testing).
3. Try to modify or delete the transaction dated `2026-03-15`.
4. **Expected Outcome**: The system rejects the request with a validation error indicating that the period is closed.

### Scenario C: Real-time Period Balance Aggregation
1. Post a transaction dated `2026-04-15` with $500 debit on `Caja` and $500 credit on `Ventas`.
2. Check the `account_period_balances` for period `2026-04` (via database query or reporting screen).
3. **Expected Outcome**:
   - `Caja` (Debit nature) shows `totalDebits` increased by $500, and `closingBalance` increased by $500.
   - `Ventas` (Credit nature) shows `totalCredits` increased by $500, and `closingBalance` increased by $500.

### Scenario D: Reopening a Period & Roll-Forward Propagation
1. Period `2026-04` has a closing balance of $500 for `Caja`. Period `2026-05` has opening balance $500 and closing balance $500.
2. Select period `2026-04` and reopen it (via API).
3. Post an additional transaction in `2026-04` with $100 debit on `Caja` and $100 credit on `Ventas`.
4. **Expected Outcome**:
   - The closing balance of `Caja` in `2026-04` automatically recalculates to $600.
   - The opening balance of `Caja` in `2026-05` is rolled forward automatically to $600, and its closing balance recalculates to $600.

### Scenario E: Annual Fiscal Year Closing
1. Ensure the next Fiscal Year `2027` is created and open.
2. Click **Cerrar Ejercicio** (Close Fiscal Year) for `2026`. Specify the `Retained Earnings` account.
3. **Expected Outcome**:
   - The system automatically closes all 12 monthly periods in the fiscal year.
   - A closing entry matching the fiscal year's end date (e.g. `2027-01-01T03:59:59.999Z` if user timezone is UTC-4) is generated, debiting all credit-balance income accounts, crediting all debit-balance expense accounts, and posting the net profit/loss to the designated Retained Earnings account.

   - The status of Fiscal Year `2026` becomes `CLOSED`.
   - In period `2027-01`, temporary accounts start with opening balance $0, while permanent accounts carry their correct opening balances from the closing balances of `2026-12`.

