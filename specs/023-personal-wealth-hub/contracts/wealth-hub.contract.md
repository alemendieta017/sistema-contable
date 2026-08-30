# API Contract: Personal Wealth Hub & Continuous Financial Forecasting

**Feature Branch**: `023-personal-wealth-hub`  
**Date**: 2026-08-27  
**Base URL**: `/api`

---

## 1. Continuous Periods & Auto-Provisioning

### 1.1 List User Periods

- **Endpoint**: `GET /api/periods`
- **Auth**: Bearer JWT (`JwtAuthGuard`)
- **Query Parameters**:
  - `startPeriod` (optional, string `YYYY-MM`): Filter starting month.
  - `endPeriod` (optional, string `YYYY-MM`): Filter ending month.
- **Success Response (200 OK)**:

```json
[
  {
    "id": "c1f72a44-2451-4e78-8cf0-21a4fef7c001",
    "name": "2026-08",
    "startDate": "2026-08-01",
    "endDate": "2026-08-31",
    "status": "OPEN",
    "userId": "9663a7de-d523-4eeb-8ece-6b2b388ee046"
  }
]
```

### 1.2 Ensure / Auto-Provision Period

- **Endpoint**: `POST /api/periods/ensure`
- **Auth**: Bearer JWT
- **Request Body**:

```json
{
  "period": "2027-04"
}
```

- **Validation**:
  - `period` matches `^\d{4}-(0[1-9]|1[0-2])$`.
- **Success Response (200 OK / 201 Created)**:

```json
{
  "id": "d2f83b55-3562-4f89-9dg1-32b5fgf8d002",
  "name": "2027-04",
  "startDate": "2027-04-01",
  "endDate": "2027-04-30",
  "status": "OPEN",
  "userId": "9663a7de-d523-4eeb-8ece-6b2b388ee046",
  "created": true
}
```

---

## 2. Four-Quadrant Budget Matrix & Rolling Cash Flow Forecast

### 2.1 Get Rolling Budget Matrix

- **Endpoint**: `GET /api/budgets/matrix`
- **Auth**: Bearer JWT
- **Query Parameters**:
  - `startPeriod` (optional, string `YYYY-MM`, default: current month)
  - `months` (optional, integer, default: `12`, min: `1`, max: `24`)
  - `categoryId` (optional, string)
- **Success Response (200 OK)**:

```json
{
  "startPeriod": "2026-08",
  "monthsCount": 12,
  "periods": [
    {
      "id": "c1f72a44-2451-4e78-8cf0-21a4fef7c001",
      "name": "2026-08",
      "friendlyName": "Agosto 2026",
      "status": "OPEN"
    }
  ],
  "sections": [
    {
      "sectionKey": "INGRESOS",
      "sectionTitle": "Ingresos Operativos",
      "rows": [
        {
          "accountId": "a1111111-1111-1111-1111-111111111111",
          "accountCode": "SUELDO",
          "accountName": "Salario Principal",
          "accountType": "INCOME",
          "isParent": false,
          "amounts": {
            "c1f72a44-2451-4e78-8cf0-21a4fef7c001": 3500.0
          },
          "rowTotal": 42000.0
        }
      ],
      "sectionTotals": {
        "c1f72a44-2451-4e78-8cf0-21a4fef7c001": 3500.0,
        "total": 42000.0
      }
    },
    {
      "sectionKey": "EGRESOS",
      "sectionTitle": "Egresos",
      "rows": [],
      "sectionTotals": {
        "c1f72a44-2451-4e78-8cf0-21a4fef7c001": 1800.0,
        "total": 21600.0
      }
    },
    {
      "sectionKey": "AHORRO_INVERSIONES",
      "sectionTitle": "Ahorro e Inversiones",
      "rows": [],
      "sectionTotals": {
        "c1f72a44-2451-4e78-8cf0-21a4fef7c001": 500.0,
        "total": 6000.0
      }
    },
    {
      "sectionKey": "DEUDAS_FINANCIACION",
      "sectionTitle": "Deudas y Financiación",
      "rows": [],
      "sectionTotals": {
        "c1f72a44-2451-4e78-8cf0-21a4fef7c001": 400.0,
        "total": 4800.0
      }
    }
  ],
  "cashFlowForecast": {
    "totalInflows": {
      "c1f72a44-2451-4e78-8cf0-21a4fef7c001": 3500.0,
      "total": 42000.0
    },
    "operatingExpenses": {
      "c1f72a44-2451-4e78-8cf0-21a4fef7c001": 1800.0,
      "total": 21600.0
    },
    "operatingSurplus": {
      "c1f72a44-2451-4e78-8cf0-21a4fef7c001": 1700.0,
      "total": 20400.0
    },
    "investmentsAndSavings": {
      "c1f72a44-2451-4e78-8cf0-21a4fef7c001": 500.0,
      "total": 6000.0
    },
    "debtFinancing": {
      "c1f72a44-2451-4e78-8cf0-21a4fef7c001": 400.0,
      "total": 4800.0
    },
    "netCashFlow": {
      "c1f72a44-2451-4e78-8cf0-21a4fef7c001": 800.0,
      "total": 9600.0
    },
    "openingCash": {
      "c1f72a44-2451-4e78-8cf0-21a4fef7c001": 2500.0
    },
    "closingCash": {
      "c1f72a44-2451-4e78-8cf0-21a4fef7c001": 3300.0
    },
    "shortfallAlerts": {
      "c1f72a44-2451-4e78-8cf0-21a4fef7c001": {
        "isNegative": false,
        "shortfall": 0.0
      }
    }
  }
}
```

### 2.2 Batch Update Budget Matrix

- **Endpoint**: `PUT /api/budgets/matrix/batch-update`
- **Auth**: Bearer JWT
- **Request Body**:

```json
{
  "updates": [
    {
      "periodId": "c1f72a44-2451-4e78-8cf0-21a4fef7c001",
      "accountId": "a1111111-1111-1111-1111-111111111111",
      "subRowId": null,
      "subRowLabel": null,
      "amount": 3750.0,
      "cashFlowDirection": "INGRESO_EFECTIVO",
      "flowIntention": "RECEIVE"
    }
  ]
}
```

- **Success Response (200 OK)**:

```json
{
  "success": true,
  "updatedCount": 1
}
```

### 2.3 Extend Budget Timeline

- **Endpoint**: `POST /api/budgets/matrix/extend`
- **Auth**: Bearer JWT
- **Request Body**:

```json
{
  "targetPeriod": "2027-08",
  "copyFromPrevious": true
}
```

- **Success Response (200 OK)**:

```json
{
  "success": true,
  "provisionedPeriod": {
    "id": "e3f94c66-4673-5g90-0eh2-43c6ghg9e003",
    "name": "2027-08",
    "startDate": "2027-08-01",
    "endDate": "2027-08-31",
    "status": "OPEN"
  },
  "itemsCopied": 24
}
```

---

## 3. Financial Statements & Net Worth Evolution

### 3.1 Net Worth Evolution (High-Speed Time Series)

- **Endpoint**: `GET /api/reports/net-worth-evolution`
- **Auth**: Bearer JWT
- **Query Parameters**:
  - `startPeriod` (optional, string `YYYY-MM`)
  - `endPeriod` (optional, string `YYYY-MM`)
- **Performance Requirement**: Latency $\le 50$ms p95 (SC-001).
- **Success Response (200 OK)**:

```json
{
  "history": [
    {
      "period": "2025-08",
      "date": "2025-08-31",
      "assets": 125000.0,
      "liabilities": 45000.0,
      "netWorth": 80000.0
    },
    {
      "period": "2026-08",
      "date": "2026-08-31",
      "assets": 148000.0,
      "liabilities": 38000.0,
      "netWorth": 110000.0
    }
  ],
  "latest": {
    "assets": 148000.0,
    "liabilities": 38000.0,
    "netWorth": 110000.0
  },
  "change12Months": 30000.0,
  "changePercentage": 37.5
}
```

### 3.2 Instant Balance General (Statement of Financial Position)

- **Endpoint**: `GET /api/reports/balance-sheet`
- **Auth**: Bearer JWT
- **Query Parameters**:
  - `periodId` (string UUID, or period name `YYYY-MM`)
  - `depth` (optional, integer)
- **Success Response (200 OK)**:

```json
{
  "period": "2026-08",
  "assets": {
    "currentAssets": 25000.0,
    "nonCurrentAssets": 123000.0,
    "total": 148000.0,
    "accounts": []
  },
  "liabilities": {
    "currentLiabilities": 8000.0,
    "nonCurrentLiabilities": 30000.0,
    "total": 38000.0,
    "accounts": []
  },
  "netWorth": 110000.0,
  "isBalanced": true
}
```

---

## 4. Tactical Short-Term Commitments & Calendar Preview

### 4.1 List Recurring Commitments

- **Endpoint**: `GET /api/recurring-schedules`
- **Auth**: Bearer JWT
- **Success Response (200 OK)**:

```json
[
  {
    "id": "f4a05d77-5784-6h01-1fi3-54d7hih0f004",
    "name": "Alquiler Departamento",
    "flowType": "OUTFLOW",
    "estimatedAmount": 750.0,
    "frequency": "MONTHLY",
    "dueDay": 5,
    "accountId": "b2222222-2222-2222-2222-222222222222",
    "categoryId": "c3333333-3333-3333-3333-333333333333",
    "isActive": true
  }
]
```

### 4.2 Create Recurring Commitment Rule

- **Endpoint**: `POST /api/recurring-schedules`
- **Auth**: Bearer JWT
- **Request Body**:

```json
{
  "name": "Alquiler Departamento",
  "flowType": "OUTFLOW",
  "estimatedAmount": 750.0,
  "frequency": "MONTHLY",
  "dueDay": 5,
  "accountId": "b2222222-2222-2222-2222-222222222222",
  "categoryId": "c3333333-3333-3333-3333-333333333333"
}
```

- **Success Response (201 Created)**: Returns created `RecurringScheduleDto`.

### 4.3 Virtual Calendar Preview (30–90 Days)

- **Endpoint**: `GET /api/recurring-schedules/calendar-preview`
- **Auth**: Bearer JWT
- **Query Parameters**:
  - `days` (optional, integer, default: `60`, min: `7`, max: `120`)
- **Success Response (200 OK)**:

```json
{
  "startDate": "2026-08-27",
  "endDate": "2026-10-26",
  "virtualEvents": [
    {
      "scheduleId": "f4a05d77-5784-6h01-1fi3-54d7hih0f004",
      "name": "Alquiler Departamento",
      "flowType": "OUTFLOW",
      "date": "2026-09-05",
      "estimatedAmount": 750.0,
      "accountId": "b2222222-2222-2222-2222-222222222222",
      "accountName": "Banco Principal",
      "categoryId": "c3333333-3333-3333-3333-333333333333",
      "categoryName": "Alquiler y Vivienda",
      "isSettled": false
    }
  ],
  "projectedNetCommitments": -750.0
}
```

### 4.4 One-Click Settlement

- **Endpoint**: `POST /api/recurring-schedules/:id/settle`
- **Auth**: Bearer JWT
- **Request Body**:

```json
{
  "occurrenceDate": "2026-09-05",
  "actualAmount": 750.0,
  "description": "Pago Alquiler Depto - Septiembre 2026"
}
```

- **Success Response (200 OK / 201 Created)**:

```json
{
  "success": true,
  "transactionId": "t5b16e88-6895-7i12-2gj4-65e8iji1g005",
  "settledDate": "2026-09-05",
  "amount": 750.0,
  "balanceCascadeUpdated": true
}
```
