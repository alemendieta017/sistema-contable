# API Contract: Fiscal Years, Periods & Balances Operations

This document defines the REST API endpoints to manage fiscal years, accounting periods, annual closing processes, and period balance queries.

---

## 1. List Fiscal Years
Retrieves a list of all fiscal years for the authenticated user.

- **URL**: `/api/fiscal-years`
- **Method**: `GET`
- **Headers**:
  - `Authorization: Bearer <JWT_TOKEN>`

### Responses
#### 200 OK
```json
[
  {
    "id": "7b8e19ab-34cd-56ef-7890-abcdef123456",
    "name": "2026",
    "startDate": "2026-01-01T00:00:00.000Z",
    "endDate": "2026-12-31T23:59:59.999Z",
    "status": "OPEN"
  }
]
```

---

## 2. Create Fiscal Year
Creates a new fiscal year and automatically generates 12 monthly periods nested inside it.

- **URL**: `/api/fiscal-years`
- **Method**: `POST`
- **Headers**:
  - `Authorization: Bearer <JWT_TOKEN>`
  - `Content-Type: application/json`
- **Body**:
```json
{
  "year": 2026
}
```

### Responses
#### 201 Created
```json
{
  "id": "7b8e19ab-34cd-56ef-7890-abcdef123456",
  "name": "Ejercicio 2026",
  "startDate": "2026-01-01T04:00:00.000Z",
  "endDate": "2027-01-01T03:59:59.999Z",
  "status": "OPEN",
  "periods": [
    {
      "id": "period-uuid-1",
      "name": "2026-01",
      "startDate": "2026-01-01T04:00:00.000Z",
      "endDate": "2026-02-01T03:59:59.999Z",
      "status": "OPEN"
    },
    ...
  ]
}
```

---

## 3. List Periods
Retrieves all periods, optionally filtered by fiscal year.

- **URL**: `/api/periods`
- **Method**: `GET`
- **Headers**:
  - `Authorization: Bearer <JWT_TOKEN>`
- **Query Parameters**:
  - `fiscalYearId` (optional): Filter periods belonging to a specific fiscal year.

### Responses
#### 200 OK
```json
[
  {
    "id": "period-uuid-1",
    "fiscalYearId": "7b8e19ab-34cd-56ef-7890-abcdef123456",
    "name": "2026-01",
    "startDate": "2026-01-01T04:00:00.000Z",
    "endDate": "2026-02-01T03:59:59.999Z",
    "status": "OPEN"
  }
]
```

---

## 4. Open/Close a Period
Locks or unlocks a monthly period.

- **URL**: `/api/periods/:id`
- **Method**: `PATCH`
- **Headers**:
  - `Authorization: Bearer <JWT_TOKEN>`
  - `Content-Type: application/json`
- **Body**:
```json
{
  "status": "CLOSED"
}
```

### Responses
#### 200 OK
```json
{
  "id": "period-uuid-1",
  "fiscalYearId": "7b8e19ab-34cd-56ef-7890-abcdef123456",
  "name": "2026-01",
  "startDate": "2026-01-01T04:00:00.000Z",
  "endDate": "2026-02-01T03:59:59.999Z",
  "status": "CLOSED"
}
```

---

## 5. Close Fiscal Year (Annual Close Procedure)
Triggers the automatic year-end closing process for a fiscal year.

- **URL**: `/api/fiscal-years/:id/close`
- **Method**: `POST`
- **Headers**:
  - `Authorization: Bearer <JWT_TOKEN>`
  - `Content-Type: application/json`
- **Body**:
```json
{
  "retainedEarningsAccountId": "acc-uuid-retained-earnings"
}
```

### Responses
#### 200 OK
```json
{
  "message": "Fiscal year closed successfully",
  "closingTransactionId": "closing-tx-uuid"
}
```

#### 400 Bad Request
Returned if the fiscal year is already closed or invalid.
```json
{
  "statusCode": 400,
  "message": "Fiscal year is already closed"
}
```

---

## 6. Reconstruct Balances
Manually triggers the full reconstruction of the `account_period_balances` table from raw journal entries.

- **URL**: `/api/reports/reconstruct-balances`
- **Method**: `POST`
- **Headers**:
  - `Authorization: Bearer <JWT_TOKEN>`

### Responses
#### 200 OK
```json
{
  "success": true,
  "message": "Account period balances reconstructed successfully from 1420 transaction lines."
}
```

---

## 7. Fetch Balance Sheet Report
Retrieves the balance sheet report (Assets, Liabilities, Equity closing balances) for a given date or period(s).

- **URL**: `/api/reports/balance-sheet`
- **Method**: `GET`
- **Headers**:
  - `Authorization: Bearer <JWT_TOKEN>`
- **Query Parameters**:
  - `mode` (optional, default `"by-period"`): `'as-of-date' | 'by-period' | 'comparative'`.
  - `periodId` (optional): The target period UUID if `mode` is `"by-period"`.
  - `date` (optional): The target date string (e.g. `2026-03-15T00:00:00.000Z`) if `mode` is `"as-of-date"`.
  - `periodIds` (optional): Comma-separated period UUIDs if `mode` is `"comparative"`.
  - `depth` (optional, default `4`, deprecated): Account level depth (1 to 4).

### Responses
#### 200 OK (Standard mode: `by-period` or `as-of-date`)
```json
{
  "period": "2026-03",
  "mode": "by-period",
  "assets": [
    { "accountId": "acc-uuid-caja", "name": "Caja", "balance": 1500.00 }
  ],
  "liabilities": [
    { "accountId": "acc-uuid-proveedores", "name": "Proveedores", "balance": 300.00 }
  ],
  "equity": [
    { "accountId": "acc-uuid-capital", "name": "Capital Social", "balance": 1000.00 },
    { "accountId": "virtual-net-income", "name": "Resultado del Ejercicio", "balance": 200.00 }
  ],
  "totalAssets": 1500.00,
  "totalLiabilities": 300.00,
  "totalEquity": 1200.00,
  "balanced": true
}
```

#### 200 OK (Comparative mode: `comparative`)
```json
{
  "mode": "comparative",
  "periods": [
    { "id": "period-uuid-1", "name": "2026-03" },
    { "id": "period-uuid-2", "name": "2025-03" }
  ],
  "assets": [
    {
      "accountId": "acc-uuid-caja",
      "name": "Caja",
      "balances": {
        "period-uuid-1": 1500.00,
        "period-uuid-2": 1200.00
      }
    }
  ],
  "liabilities": [
    {
      "accountId": "acc-uuid-proveedores",
      "name": "Proveedores",
      "balances": {
        "period-uuid-1": 300.00,
        "period-uuid-2": 250.00
      }
    }
  ],
  "equity": [
    {
      "accountId": "acc-uuid-capital",
      "name": "Capital Social",
      "balances": {
        "period-uuid-1": 1000.00,
        "period-uuid-2": 1000.00
      }
    },
    {
      "accountId": "virtual-net-income",
      "name": "Resultado del Ejercicio",
      "balances": {
        "period-uuid-1": 200.00,
        "period-uuid-2": -50.00
      }
    }
  ],
  "totals": {
    "totalAssets": {
      "period-uuid-1": 1500.00,
      "period-uuid-2": 1200.00
    },
    "totalLiabilities": {
      "period-uuid-1": 300.00,
      "period-uuid-2": 250.00
    },
    "totalEquity": {
      "period-uuid-1": 1200.00,
      "period-uuid-2": 950.00
    }
  },
  "balanced": {
    "period-uuid-1": true,
    "period-uuid-2": true
  }
}
```

---

## 8. Fetch Income Statement Report
Retrieves the income statement (Income, Expenses, Net Profit/Loss) for a specific period.

- **URL**: `/api/reports/income-statement`
- **Method**: `GET`
- **Headers**:
  - `Authorization: Bearer <JWT_TOKEN>`
- **Query Parameters**:
  - `periodId`: The target period UUID.

### Responses
#### 200 OK
```json
{
  "period": "2026-03",
  "income": [
    { "accountId": "acc-uuid-ventas", "name": "Ventas", "amount": 2000.00 }
  ],
  "expenses": [
    { "accountId": "acc-uuid-sueldos", "name": "Sueldos y Jornales", "amount": 1200.00 }
  ],
  "totalIncome": 2000.00,
  "totalExpenses": 1200.00,
  "netProfit": 800.00
}
```
