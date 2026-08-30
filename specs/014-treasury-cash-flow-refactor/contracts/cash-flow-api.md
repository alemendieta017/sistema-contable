# API Contract: Direct Cash Flow Report (`/api/reports/cash-flow`)

## Get Direct Cash Flow Report

`GET /api/reports/cash-flow?startDate=2026-07-01&endDate=2026-07-31`

### Query Parameters

- `startDate` (ISO 8601 Date string, e.g., `2026-07-01`): Start of period range.
- `endDate` (ISO 8601 Date string, e.g., `2026-07-31`): End of period range.

### Response (`200 OK`)

```json
{
  "startDate": "2026-07-01",
  "endDate": "2026-07-31",
  "initialCashBalance": 5000000.0,
  "finalCashBalance": 7500000.0,
  "netCashFlow": 2500000.0,
  "categories": [
    {
      "categoryName": "Ingresos Operativos",
      "total": 5000000.0,
      "accounts": [
        {
          "accountId": "c3d4e5f6-a7b8-9012-cdef-123456789012",
          "accountName": "Sueldo",
          "amount": 5000000.0
        }
      ]
    },
    {
      "categoryName": "Gastos Operativos",
      "total": -2500000.0,
      "accounts": [
        {
          "accountId": "d4e5f6a7-b8c9-0123-def1-234567890123",
          "accountName": "Comida",
          "amount": -1500000.0
        },
        {
          "accountId": "e5f6a7b8-c9d0-1234-ef12-345678901234",
          "accountName": "Transporte",
          "amount": -1000000.0
        }
      ]
    }
  ]
}
```

### Calculation Rules

1. `initialCashBalance`: Sum of `openingBalance` for all accounts with `isCashOrBank = true` in periods covering `startDate`.
2. `finalCashBalance`: Sum of `closingBalance` for all accounts with `isCashOrBank = true` in periods covering `endDate`.
3. `netCashFlow`: `finalCashBalance - initialCashBalance`.
4. `categories`: Sum of period balance changes (`debits - credits` or `credits - debits`) for accounts with `isCashOrBank = false` grouped by account category. Liquid accounts are strictly excluded from category breakdown.
