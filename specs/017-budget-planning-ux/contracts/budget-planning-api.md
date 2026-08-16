# API Contract: Budget Planning Matrix & Execution Control UX

**Branch**: `017-budget-planning-ux` | **Date**: 2026-08-13 | **Spec**: [spec.md](file:///C:/Users/amend/.gemini/antigravity/worktrees/sistema-contable/redesign_budget_planning_ux/specs/017-budget-planning-ux/spec.md)

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
    { "id": "p-2", "name": "2026-02", "friendlyName": "Febrero 2026", "status": "OPEN" },
    { "id": "p-3", "name": "2026-03", "friendlyName": "Marzo 2026", "status": "OPEN" }
  ],
  "sections": [
    {
      "sectionKey": "INGRESOS",
      "sectionTitle": "Ingresos",
      "rows": [
        {
          "accountId": "acc-inc-parent",
          "accountCode": "4.1",
          "accountName": "Ingresos Operativos",
          "accountType": "REVENUE",
          "parentId": null,
          "isParent": true,
          "subRowId": null,
          "subRowLabel": null,
          "cashFlowDirection": "INGRESO_EFECTIVO",
          "amounts": { "p-1": 50000.0, "p-2": 50000.0, "p-3": 50000.0 },
          "rowTotal": 150000.0
        },
        {
          "accountId": "acc-inc-child",
          "accountCode": "4.1.01",
          "accountName": "Honorarios Profesionales",
          "accountType": "REVENUE",
          "parentId": "acc-inc-parent",
          "isParent": false,
          "subRowId": null,
          "subRowLabel": null,
          "cashFlowDirection": "INGRESO_EFECTIVO",
          "amounts": { "p-1": 50000.0, "p-2": 50000.0, "p-3": 50000.0 },
          "rowTotal": 150000.0
        }
      ],
      "sectionTotals": { "p-1": 50000.0, "p-2": 50000.0, "p-3": 50000.0, "total": 150000.0 }
    },
    {
      "sectionKey": "GASTOS_VIDA",
      "sectionTitle": "Gastos de Vida",
      "rows": [
        {
          "accountId": "acc-exp-1",
          "accountCode": "5.1.01",
          "accountName": "Alquiler y Expensas",
          "accountType": "EXPENSE",
          "parentId": null,
          "isParent": false,
          "subRowId": null,
          "subRowLabel": null,
          "cashFlowDirection": "EGRESO_EFECTIVO",
          "amounts": { "p-1": 20000.0, "p-2": 20000.0, "p-3": 20000.0 },
          "rowTotal": 60000.0
        }
      ],
      "sectionTotals": { "p-1": 20000.0, "p-2": 20000.0, "p-3": 20000.0, "total": 60000.0 }
    },
    {
      "sectionKey": "AHORRO_INVERSIONES",
      "sectionTitle": "Ahorro e Inversiones",
      "rows": [
        {
          "accountId": "acc-asset-1",
          "accountCode": "1.2.01",
          "accountName": "Fondo Común de Inversión",
          "accountType": "ASSET",
          "parentId": null,
          "isParent": false,
          "subRowId": "sub-inv-1",
          "subRowLabel": "Aporte Mensual FCI",
          "cashFlowDirection": "EGRESO_EFECTIVO",
          "amounts": { "p-1": 10000.0, "p-2": 10000.0, "p-3": 10000.0 },
          "rowTotal": 30000.0
        }
      ],
      "sectionTotals": { "p-1": 10000.0, "p-2": 10000.0, "p-3": 10000.0, "total": 30000.0 }
    },
    {
      "sectionKey": "DEUDAS_FINANCIACION",
      "sectionTitle": "Deudas y Financiación",
      "rows": [
        {
          "accountId": "acc-liab-1",
          "accountCode": "2.1.01",
          "accountName": "Préstamo Personal",
          "accountType": "LIABILITY",
          "parentId": null,
          "isParent": false,
          "subRowId": "sub-debt-1",
          "subRowLabel": "Pago Cuota Préstamo",
          "cashFlowDirection": "EGRESO_EFECTIVO",
          "amounts": { "p-1": 5000.0, "p-2": 5000.0, "p-3": 5000.0 },
          "rowTotal": 15000.0
        }
      ],
      "sectionTotals": { "p-1": 5000.0, "p-2": 5000.0, "p-3": 5000.0, "total": 15000.0 }
    }
  ],
  "summary": {
    "totalInflows": { "p-1": 50000.0, "p-2": 50000.0, "p-3": 50000.0, "total": 150000.0 },
    "totalOutflows": { "p-1": 35000.0, "p-2": 35000.0, "p-3": 35000.0, "total": 105000.0 },
    "netMonthlyFlow": { "p-1": 15000.0, "p-2": 15000.0, "p-3": 15000.0, "total": 45000.0 },
    "cumulativeNetFlow": { "p-1": 15000.0, "p-2": 30000.0, "p-3": 45000.0, "total": 45000.0 }
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
    {
      "periodId": "p-2",
      "accountId": "acc-exp-1",
      "subRowId": null,
      "subRowLabel": null,
      "amount": 22000.0,
      "cashFlowDirection": "EGRESO_EFECTIVO"
    },
    {
      "periodId": "p-2",
      "accountId": "acc-asset-1",
      "subRowId": "sub-inv-1",
      "subRowLabel": "Aporte Mensual FCI",
      "amount": 12000.0,
      "cashFlowDirection": "EGRESO_EFECTIVO"
    }
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
  "adjustmentPercentage": 10.0,
  "accountIds": ["acc-exp-1", "acc-inc-child"]
}
```

- **Response**: `200 OK`

```json
{
  "success": true,
  "matrix": [
    {
      "accountId": "acc-exp-1",
      "amounts": {
        "p-1": 16500.0,
        "p-2": 16500.0,
        "p-3": 17000.0
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
  "accountId": "acc-exp-1",
  "subRowId": null,
  "driverType": "FLAT_PRORATE",
  "annualTotal": 240000.0,
  "growthPercentage": null,
  "sourcePeriodId": null
}
```

- **Response**: `200 OK`

```json
{
  "success": true,
  "accountId": "acc-exp-1",
  "monthlyAmounts": {
    "p-1": 20000.0,
    "p-2": 20000.0,
    "p-3": 20000.0
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
    "totalBudgeted": 57000.0,
    "totalExecuted": 41000.0,
    "totalCommitted": 0.0,
    "totalAvailable": 16000.0,
    "overallConsumptionPercentage": 71.9,
    "overallGaugeStatus": "NORMAL"
  },
  "sections": [
    {
      "sectionKey": "INGRESOS",
      "sectionTitle": "Ingresos",
      "budgeted": 50000.0,
      "executed": 52000.0,
      "committed": 0.0,
      "available": 2000.0,
      "consumptionPercentage": 104.0,
      "gaugeStatus": "NORMAL",
      "items": [
        {
          "accountId": "acc-inc-child",
          "accountName": "Honorarios Profesionales",
          "cashFlowDirection": "INGRESO_EFECTIVO",
          "budgeted": 50000.0,
          "executed": 52000.0,
          "committed": 0.0,
          "available": 2000.0,
          "consumptionPercentage": 104.0,
          "gaugeStatus": "NORMAL"
        }
      ]
    },
    {
      "sectionKey": "GASTOS_VIDA",
      "sectionTitle": "Gastos de Vida",
      "budgeted": 22000.0,
      "executed": 19500.0,
      "committed": 0.0,
      "available": 2500.0,
      "consumptionPercentage": 88.6,
      "gaugeStatus": "WARNING",
      "items": [
        {
          "accountId": "acc-exp-1",
          "accountName": "Alquiler y Expensas",
          "cashFlowDirection": "EGRESO_EFECTIVO",
          "budgeted": 22000.0,
          "executed": 19500.0,
          "committed": 0.0,
          "available": 2500.0,
          "consumptionPercentage": 88.6,
          "gaugeStatus": "WARNING"
        }
      ]
    },
    {
      "sectionKey": "AHORRO_INVERSIONES",
      "sectionTitle": "Ahorro e Inversiones",
      "budgeted": 12000.0,
      "executed": 12000.0,
      "committed": 0.0,
      "available": 0.0,
      "consumptionPercentage": 100.0,
      "gaugeStatus": "OVERBUDGET",
      "items": [
        {
          "accountId": "acc-asset-1",
          "accountName": "Fondo Común de Inversión",
          "subRowId": "sub-inv-1",
          "subRowLabel": "Aporte Mensual FCI",
          "cashFlowDirection": "EGRESO_EFECTIVO",
          "budgeted": 12000.0,
          "executed": 12000.0,
          "committed": 0.0,
          "available": 0.0,
          "consumptionPercentage": 100.0,
          "gaugeStatus": "OVERBUDGET"
        }
      ]
    },
    {
      "sectionKey": "DEUDAS_FINANCIACION",
      "sectionTitle": "Deudas y Financiación",
      "budgeted": 5000.0,
      "executed": 5000.0,
      "committed": 0.0,
      "available": 0.0,
      "consumptionPercentage": 100.0,
      "gaugeStatus": "OVERBUDGET",
      "items": [
        {
          "accountId": "acc-liab-1",
          "accountName": "Préstamo Personal",
          "subRowId": "sub-debt-1",
          "subRowLabel": "Pago Cuota Préstamo",
          "cashFlowDirection": "EGRESO_EFECTIVO",
          "budgeted": 5000.0,
          "executed": 5000.0,
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

## 6. Transfer Budget Funds Between Accounts (Directional Reassignment)

- **Endpoint**: `POST /api/budgets/control/transfer`
- **Validation**: Source and target accounts must share the same cash flow direction (`EGRESO_EFECTIVO` $\leftrightarrow$ `EGRESO_EFECTIVO` or `INGRESO_EFECTIVO` $\leftrightarrow$ `INGRESO_EFECTIVO`).
- **Request Body**:

```json
{
  "periodId": "p-2",
  "sourceAccountId": "acc-exp-1",
  "targetAccountId": "acc-asset-1",
  "amount": 2000.0,
  "reason": "Reasignación de sobrante de alquiler hacia aporte en FCI"
}
```

- **Response**: `200 OK`

```json
{
  "success": true,
  "reassignmentId": "reassign-uuid-789",
  "updatedSourceAvailable": 500.0,
  "updatedTargetAvailable": 2000.0
}
```

- **Error Response (Direction Mismatch)**: `400 Bad Request`

```json
{
  "statusCode": 400,
  "message": "No se pueden transferir fondos entre cuentas con diferente dirección de flujo de caja (Salida vs Entrada)",
  "error": "Bad Request"
}
```
