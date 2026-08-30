# API Contracts: Presupuestos y Proyecciones de Caja

This document specifies the REST API endpoints and data transfer objects (DTOs) for the budgeting and forecasting features.

---

## 1. Budget Management

### Get Budget Details for Editing

Retrieves the budget metadata and a list of budgeted items, paired with a list of remaining accounts eligible for budgeting in this period.

- **Endpoint**: `GET /api/budgets/by-period/:periodId`
- **Headers**: `Authorization: Bearer <token>`
- **Response** (`200 OK`):
  ```json
  {
    "id": "budget-uuid",
    "periodId": "period-uuid",
    "periodName": "2026-06",
    "friendlyName": "Junio 2026",
    "startDate": "2026-06-01",
    "endDate": "2026-06-30",
    "isLocked": false,
    "items": [
      {
        "accountId": "account-uuid-2",
        "accountName": "Inversiones Bolsa",
        "accountType": "ASSET",
        "parentId": "assets-parent-uuid",
        "isCashOrBank": false,
        "amount": -500000.0
      }
    ],
    "eligibleAccounts": [
      {
        "accountId": "account-uuid-1",
        "accountName": "Alquileres",
        "accountType": "EXPENSE",
        "parentId": null,
        "isCashOrBank": false
      }
    ]
  }
  ```

---

### Update Budget Items

Saves/updates the budgeted amounts. Synchronizes the list: deletes items missing from the request body, and creates/updates the rest.

- **Endpoint**: `PUT /api/budgets/by-period/:periodId/items`
- **Headers**: `Authorization: Bearer <token>`
- **Request Body**:
  ```json
  {
    "items": [
      {
        "accountId": "account-uuid-1",
        "amount": 3000000.0
      },
      {
        "accountId": "account-uuid-2",
        "amount": -500000.0
      }
    ]
  }
  ```
- **Response** (`200 OK`):
  ```json
  {
    "success": true,
    "updatedCount": 2
  }
  ```

---

### Copy Previous Period Budget

Clones all budget items from period N-1 to the current period.

- **Endpoint**: `POST /api/budgets/by-period/:periodId/copy-previous`
- **Headers**: `Authorization: Bearer <token>`
- **Response** (`200 OK`):
  ```json
  {
    "success": true,
    "copiedCount": 3
  }
  ```

---

### Replicate Budget Item to Fiscal Year

Propagates a budgeted amount for a single account across all 12 periods of the current fiscal year.

- **Endpoint**: `POST /api/budgets/replicate`
- **Headers**: `Authorization: Bearer <token>`
- **Request Body**:
  ```json
  {
    "periodId": "period-uuid",
    "accountId": "account-uuid-1",
    "amount": 3000000.0
  }
  ```
- **Response** (`200 OK`):
  ```json
  {
    "success": true,
    "replicatedPeriods": [
      "2026-01",
      "2026-02",
      "2026-03",
      "2026-04",
      "2026-05",
      "2026-06",
      "2026-07",
      "2026-08",
      "2026-09",
      "2026-10",
      "2026-11",
      "2026-12"
    ]
  }
  ```

---

## 2. Dashboard & Execution Reports

### Get Budget Execution Report

Retrieves the execution dashboard comparing plan vs. actual spending, savings, and debt servicing.

- **Endpoint**: `GET /api/budgets/execution-report`
- **Query Params**: `periodId=<period-uuid>`
- **Response** (`200 OK`):
  ```json
  {
    "periodName": "2026-06",
    "friendlyName": "Junio 2026",
    "startDate": "2026-06-01",
    "endDate": "2026-06-30",
    "consumos": {
      "income": [
        {
          "accountId": "inc-1",
          "accountName": "Salario",
          "budgeted": 10000000.0,
          "real": 10000000.0,
          "deviation": 0.0,
          "isNegativeDeviation": false
        }
      ],
      "expense": [
        {
          "accountId": "exp-1",
          "accountName": "Alquiler",
          "budgeted": 3000000.0,
          "real": 3200000.0,
          "available": -200000.0,
          "isNegativeDeviation": true
        }
      ],
      "totalBudgetedIncome": 10000000.0,
      "totalRealIncome": 10000000.0,
      "totalBudgetedExpense": 3000000.0,
      "totalRealExpense": 3200000.0
    },
    "ahorrosInversiones": [
      {
        "accountId": "ast-inv",
        "accountName": "Fondo Mutuo",
        "budgeted": -500000.0,
        "real": -600000.0,
        "deviation": -100000.0,
        "isNegativeDeviation": true
      }
    ],
    "deudasTarjetas": [
      {
        "accountId": "lbl-debt",
        "accountName": "Préstamo Vehículo",
        "budgeted": -1000000.0,
        "real": -1000000.0,
        "deviation": 0.0,
        "isNegativeDeviation": false
      }
    ],
    "resumenLiquidez": {
      "saldoCajaInicialReal": 5000000.0,
      "flujoNetoConsumos": {
        "budgeted": 7000000.0,
        "real": 6800000.0
      },
      "flujoNetoFinanciero": {
        "budgeted": -1500000.0,
        "real": -1600000.0
      },
      "flujoCajaNetoMes": {
        "budgeted": 5500000.0,
        "real": 5200000.0
      },
      "saldoCajaFinal": {
        "projected": 10500000.0,
        "real": 10200000.0
      }
    }
  }
  ```

---

## 3. Financial Forecast Reports

### Get Income Statement (Real vs. Projected)

Retrieves monthly income statement data. Supports calendar year range or rolling 12-month window.

- **Endpoint**: `GET /api/reports/income-statement/real-vs-projected`
- **Query Params**: `fiscalYearId=<fiscal-year-uuid>&rolling=<boolean>`
- **Response** (`200 OK`):
  ```json
  {
    "fiscalYearName": "Ejercicio 2026",
    "months": [
      {
        "periodId": "period-jan-uuid",
        "periodName": "2026-01",
        "status": "CLOSED",
        "income": 10000000.0,
        "expense": 2800000.0,
        "netProfit": 7200000.0,
        "isReal": true
      },
      {
        "periodId": "period-feb-uuid",
        "periodName": "2026-02",
        "status": "OPEN",
        "income": 10000000.0,
        "expense": 3000000.0,
        "netProfit": 7000000.0,
        "isReal": false
      }
    ]
  }
  ```

---

### Get Cash Flow Statement (Real vs. Projected)

Retrieves monthly cash flow data. Supports calendar year range or rolling 12-month window.

- **Endpoint**: `GET /api/reports/cash-flow/real-vs-projected`
- **Query Params**: `fiscalYearId=<fiscal-year-uuid>&rolling=<boolean>`
- **Response** (`200 OK`):
  ```json
  {
    "fiscalYearName": "Ejercicio 2026",
    "months": [
      {
        "periodId": "period-jan-uuid",
        "periodName": "2026-01",
        "status": "CLOSED",
        "initialCash": 5000000.0,
        "netFlow": 5500000.0,
        "finalCash": 10500000.0,
        "isReal": true
      },
      {
        "periodId": "period-feb-uuid",
        "periodName": "2026-02",
        "status": "OPEN",
        "initialCash": 10500000.0,
        "netFlow": 5200000.0,
        "finalCash": 15700000.0,
        "isReal": false
      }
    ]
  }
  ```

---

## 4. Accounts Configuration

### Update Account

Updates account details, notably the `isCashOrBank` flag.

- **Endpoint**: `PATCH /api/accounts/:id`
- **Headers**: `Authorization: Bearer <token>`
- **Request Body**:
  ```json
  {
    "isCashOrBank": true
  }
  ```
- **Response** (`200 OK`):
  ```json
  {
    "id": "account-uuid-1",
    "name": "Caja Principal",
    "type": "ASSET",
    "isCashOrBank": true,
    "status": "ACTIVE"
  }
  ```
- **Error Response** (`400 Bad Request`):
  ```json
  {
    "statusCode": 400,
    "message": "Cannot change the Cash/Bank flag of an account that already has transactions associated"
  }
  ```
