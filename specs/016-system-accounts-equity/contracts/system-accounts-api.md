# API Contracts: System Accounts & Fiscal Year Closing

## 1. Post Fiscal Year Close

### Endpoint

`POST /api/periods/fiscal-years/:id/close`

### Request Header

`Authorization: Bearer <token>`

### Request Body (Optional / Updated DTO)

```json
{
  "retainedEarningsAccountId": "optional-uuid-string"
}
```

_Note: `retainedEarningsAccountId` is now optional. If omitted, backend resolves the mandatory account assigned with `systemRole = 'RETAINED_EARNINGS'`._

### Response (200 OK)

```json
{
  "message": "Fiscal year closed successfully",
  "closingTransactionId": "uuid-string-or-null"
}
```

---

## 2. Get Balance Sheet Report

### Endpoint

`GET /api/periods/balance-sheet?mode=date&date=2025-12-31&depth=4`

### Response (200 OK)

```json
{
  "date": "2025-12-31",
  "assets": [{ "accountId": "acc-asset-1", "name": "Efectivo", "balance": 10000.0 }],
  "liabilities": [],
  "equity": [
    {
      "accountId": "acc-retained-earnings-uuid",
      "name": "Resultados Acumulados",
      "balance": 5000.0
    },
    { "accountId": "acc-net-income-uuid", "name": "Resultado del Ejercicio", "balance": 5000.0 }
  ],
  "totalAssets": 10000.0,
  "totalLiabilities": 0.0,
  "totalEquity": 10000.0,
  "balanced": true
}
```

_Note: If `Resultado del Ejercicio` or `Resultados Acumulados` balance is 0.00, it is omitted from the `equity` array._
