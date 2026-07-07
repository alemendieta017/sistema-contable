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

## 3. Validation Scenario 2: Form Edits and Year-Wide Replication

Verify that editing budget items persists correctly and replicates across all periods of the fiscal year.

### Execution
1. Send a request to save budget limits for a single period:
   ```bash
   curl -X PUT http://localhost:4000/api/budgets/by-period/<period-id>/items \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer <token>" \
     -d '{"items": [{"accountId": "<account-id>", "amount": 3000000}]}'
   ```
2. Trigger replication for that account:
   ```bash
   curl -X POST http://localhost:4000/api/budgets/replicate \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer <token>" \
     -d '{"periodId": "<period-id>", "accountId": "<account-id>", "amount": 3000000}'
   ```

### Expected Outcome
- Saving the budget items returns `{"success": true, "updatedCount": 1}`.
- Triggering replication returns `{"success": true, "replicatedPeriods": [...]}` containing all 12 periods.
- Querying other periods in the same fiscal year verifies that the budgeted amount is now `3000000` for that account.

---

## 4. Validation Scenario 3: Real vs. Projected Cash Flow Report

Verify that the cash flow projection report blends actual bank balances with future budget plan inputs.

### Execution
Query the real vs. projected cash flow endpoint:
```bash
curl "http://localhost:4000/api/reports/cash-flow/real-vs-projected?fiscalYearId=<fiscal-year-id>" \
  -H "Authorization: Bearer <token>"
```

### Expected Outcome
- For closed periods (`isReal: true`), the response returns `initialCash`, `netFlow` (debits - credits of cash/bank accounts), and `finalCash` computed entirely from actual ledger journal entries.
- For open/future periods (`isReal: false`), the response computes `initialCash` as the `finalCash` of the preceding period and adds the budgeted cash flow (`Sum(INCOME) - Sum(EXPENSE) + Sum(ASSET) + Sum(LIABILITY)`) to project the new `finalCash`.
