# Quickstart Validation Guide: Presupuestos y Proyecciones de Caja

This guide outlines the steps to run validation scenarios that prove the budgeting and cash flow projection features work end-to-end.

## 1. Prerequisites

Before running the validations, ensure the database is initialized and seeded with the baseline accounts structure.

```bash
# In the backend directory
npm run db:reset
```

Refer to the [API Contracts](file:///Users/ale/dev/sistema-contable/specs/013-budget-planning/contracts/api-contracts.md) and [Data Model](file:///Users/ale/dev/sistema-contable/specs/013-budget-planning/data-model.md) for full parameter specifications and database entity relations.

---

## 2. Validation Scenario 1: Initializing Fiscal Year and Auto-Budgeting

Verify that creating a new fiscal year automatically initializes corresponding budget records.

### Execution

Run the automated integration tests:

```bash
# Run the specific integration test suite
npm run test -- tests/integration/period-creation.spec.ts
```

### Expected Outcome

- The test suite executes successfully.
- The output confirms that saving a new `FiscalYearEntity` generates 12 monthly periods and creates 12 empty `BudgetEntity` entries linked 1-to-1 to each period.

---

## 3. Validation Scenario 2: Form Edits, Syncing, and Copy Previous

Verify that editing budget items dynamically synchronizes the list and allows copying the budget from the previous month.

### Execution

1. Send a request to save budget limits for a single period (adding/saving items):
   ```bash
   curl -X PUT http://localhost:4000/api/budgets/by-period/<period-id>/items \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer <token>" \
     -d '{"items": [{"accountId": "<account-id-1>", "amount": 3000000}, {"accountId": "<account-id-2>", "amount": -500000}]}'
   ```
2. Retrieve the budget detail for the period to verify the list only returns these items and `eligibleAccounts` contains the rest:
   ```bash
   curl http://localhost:4000/api/budgets/by-period/<period-id> \
     -H "Authorization: Bearer <token>"
   ```
3. Send a copy request for the next period to clone these items:
   ```bash
   curl -X POST http://localhost:4000/api/budgets/by-period/<next-period-id>/copy-previous \
     -H "Authorization: Bearer <token>"
   ```

### Expected Outcome

- Saving budget items returns `{"success": true, "updatedCount": 2}`.
- Retrieving details returns `items` with size 2, and `eligibleAccounts` listing other active non-equity/non-liquid accounts.
- Copying returns `{"success": true, "copiedCount": 2}`. Retrieving `<next-period-id>` budget details shows the same cloned accounts and amounts.

---

## 4. Validation Scenario 3: Real vs. Projected Cash Flow Report with Rolling Forecast

Verify that the cash flow projection report blends actual bank balances with future budget plan inputs, supporting a rolling 12-month window.

### Execution

Query the real vs. projected cash flow endpoint with rolling forecast enabled:

```bash
curl "http://localhost:4000/api/reports/cash-flow/real-vs-projected?fiscalYearId=<fiscal-year-id>&rolling=true" \
  -H "Authorization: Bearer <token>"
```

### Expected Outcome

- The response returns a rolling window of 12 months: last closed month (`isReal: true`, computed from actual ledger journal entries) plus 11 future months (`isReal: false`, calculated using budgets and cascading cash balances).
