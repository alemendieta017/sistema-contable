# API Contracts: Date Refactor Updates

This document describes the API contract updates for the date fields in request and response structures.

## 1. Transaction Endpoints

### Create Transaction (`POST /api/transactions`)

**Request Payload**:
```json
{
  "accountingDate": "2026-06-30",
  "description": "Payment to suppliers",
  "entries": [
    {
      "accountId": "a3b2c1d0-0000-0000-0000-000000000000",
      "entryType": "DEBIT",
      "amount": 150000
    },
    {
      "accountId": "a3b2c1d0-0000-0000-0000-000000000001",
      "entryType": "CREDIT",
      "amount": 150000
    }
  ]
}
```

**Response Payload**:
```json
{
  "id": "e3f4g5h6-1111-2222-3333-444455556666",
  "accountingDate": "2026-06-30",
  "description": "Payment to suppliers",
  "status": "POSTED",
  "createdAt": "2026-06-30T23:30:15.000Z",
  "entries": [
    {
      "id": "entry-uuid-1",
      "accountId": "a3b2c1d0-0000-0000-0000-000000000000",
      "entryType": "DEBIT",
      "amount": 150000,
      "amountBase": 150000,
      "rateAtDate": 1.0
    },
    {
      "id": "entry-uuid-2",
      "accountId": "a3b2c1d0-0000-0000-0000-000000000001",
      "entryType": "CREDIT",
      "amount": 150000,
      "amountBase": 150000,
      "rateAtDate": 1.0
    }
  ]
}
```

---

## 2. Fiscal Year & Period Endpoints

### Create Fiscal Year (`POST /api/fiscal-years`)

**Request Payload**:
```json
{
  "year": 2026,
  "startDate": "2026-01-01",
  "endDate": "2026-12-31"
}
```

**Response Payload**:
```json
{
  "id": "fy-uuid-1234",
  "name": "Ejercicio 2026",
  "startDate": "2026-01-01",
  "endDate": "2026-12-31",
  "status": "OPEN",
  "periods": [
    {
      "id": "period-uuid-1",
      "name": "2026-01",
      "startDate": "2026-01-01",
      "endDate": "2026-01-31",
      "status": "OPEN"
    }
    // ... remaining periods
  ]
}
```
