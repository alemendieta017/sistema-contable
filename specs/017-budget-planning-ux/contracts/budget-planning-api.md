# API Contract: Budget Planning Matrix & Execution Control UX

**Branch**: `017-budget-planning-ux` | **Date**: 2026-08-12 | **Spec**: [spec.md](file:///C:/Users/amend/.gemini/antigravity/worktrees/sistema-contable/redesign_budget_planning_ux/specs/017-budget-planning-ux/spec.md)

---

## 1. Get Fiscal Year Matrix Data

- **Endpoint**: `GET /api/budgets/matrix`
- **Query Parameters**:
  - `fiscalYearId` (string, required): UUID of the fiscal year.
  - `categoryId` (string, optional): Account category filter.
- **Response**: `200 OK`

```json
{
  "fiscalYearId": "fy-uuid-123",
  "fiscalYearName": "2026",
  "periods": [
    { "id": "p-1", "name": "2026-01", "friendlyName": "Enero 2026", "status": "CLOSED" },
    { "id": "p-2", "name": "2026-02", "friendlyName": "Febrero 2026", "status": "OPEN" }
  ],
  "rows": [
    {
      "accountId": "acc-1",
      "accountCode": "5.1.01",
      "accountName": "Sueldos y Salarios",
      "accountType": "EXPENSE",
      "parentId": null,
      "amounts": {
        "p-1": 15000.0,
        "p-2": 15000.0
      },
      "rowTotal": 30000.0
    }
  ],
  "categoryTotals": {
    "EXPENSE": {
      "p-1": 15000.0,
      "p-2": 15000.0,
      "total": 30000.0
    }
  }
}
```

---

## 2. Bulk Batch Update Matrix

- **Endpoint**: `PUT /api/budgets/matrix/batch-update`
- **Request Body**:

```json
{
  "fiscalYearId": "fy-uuid-123",
  "updates": [
    { "periodId": "p-2", "accountId": "acc-1", "amount": 16000.0 },
    { "periodId": "p-3", "accountId": "acc-1", "amount": 16000.0 }
  ]
}
```

- **Response**: `200 OK`

```json
{
  "success": true,
  "updatedCount": 2
}
```

---

## 3. Pre-Populate Matrix from Prior Year Actuals

- **Endpoint**: `POST /api/budgets/matrix/baseline-actuals`
- **Request Body**:

```json
{
  "fiscalYearId": "fy-uuid-123",
  "adjustmentPercentage": 5.0,
  "accountIds": ["acc-1", "acc-2"]
}
```

- **Response**: `200 OK`

```json
{
  "success": true,
  "matrix": [
    {
      "accountId": "acc-1",
      "amounts": {
        "p-1": 10500.0,
        "p-2": 10500.0
      }
    }
  ]
}
```

---

## 4. Apply Smart Distribution Driver

- **Endpoint**: `POST /api/budgets/matrix/apply-driver`
- **Request Body**:

```json
{
  "fiscalYearId": "fy-uuid-123",
  "accountId": "acc-1",
  "driverType": "FLAT_PRORATE",
  "annualTotal": 120000.0,
  "growthPercentage": null,
  "sourcePeriodId": null
}
```

- **Response**: `200 OK`

```json
{
  "success": true,
  "accountId": "acc-1",
  "monthlyAmounts": {
    "p-1": 10000.0,
    "p-2": 10000.0,
    "p-3": 10000.0
  }
}
```

---

## 5. Get Monthly Execution Control Dashboard Data

- **Endpoint**: `GET /api/budgets/control`
- **Query Parameters**:
  - `periodId` (string, required): UUID of the active period.
- **Response**: `200 OK`

```json
{
  "periodId": "p-2",
  "periodName": "2026-02",
  "friendlyName": "Febrero 2026",
  "isLocked": false,
  "summary": {
    "totalBudgeted": 50000.0,
    "totalExecuted": 35000.0,
    "totalCommitted": 0.0,
    "totalAvailable": 15000.0,
    "overallConsumptionPercentage": 70.0,
    "overallGaugeStatus": "NORMAL"
  },
  "categories": [
    {
      "categoryName": "Gastos Operativos",
      "accountType": "EXPENSE",
      "budgeted": 20000.0,
      "executed": 17500.0,
      "committed": 0.0,
      "available": 25000.0,
      "consumptionPercentage": 87.5,
      "gaugeStatus": "WARNING",
      "items": [
        {
          "accountId": "acc-1",
          "accountName": "Sueldos y Salarios",
          "budgeted": 10000.0,
          "executed": 10000.0,
          "committed": 0.0,
          "available": 0.0,
          "consumptionPercentage": 100.0,
          "gaugeStatus": "OVERBUDGET"
        }
      ]
    }
  ]
}
```

---

## 6. Transfer Budget Funds Between Accounts

- **Endpoint**: `POST /api/budgets/control/transfer`
- **Request Body**:

```json
{
  "periodId": "p-2",
  "sourceAccountId": "acc-2",
  "targetAccountId": "acc-1",
  "amount": 2000.0,
  "reason": "Reasignación para cubrir desfase en sueldos"
}
```

- **Response**: `200 OK`

```json
{
  "success": true,
  "reassignmentId": "reassign-uuid-456",
  "updatedSourceAvailable": 3000.0,
  "updatedTargetAvailable": 2000.0
}
```
