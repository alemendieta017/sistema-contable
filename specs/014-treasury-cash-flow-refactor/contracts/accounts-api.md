# API Contract: Accounts Management (`/api/accounts`)

## 1. Create Account

`POST /api/accounts`

### Request Body

```json
{
  "name": "Efectivo USD",
  "type": "ASSET",
  "currencyId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "parentId": null,
  "isCashOrBank": true
}
```

### Response (`217 Created` or `201 Created`)

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "name": "Efectivo USD",
  "type": "ASSET",
  "currencyId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "parentId": null,
  "isCashOrBank": true,
  "status": "ACTIVE",
  "createdAt": "2026-07-31T00:00:00.000Z"
}
```

---

## 2. Update Account

`PATCH /api/accounts/:id`

### Request Body

```json
{
  "name": "Caja Central",
  "isCashOrBank": true
}
```

### Success Response (`200 OK`)

```json
{
  "success": true
}
```

### Error Response (`400 Bad Request`) - Immutability Triggered

Occurs when `isCashOrBank` is modified on an account that has posted journal entries.

```json
{
  "statusCode": 400,
  "message": "Cannot change the Cash/Bank flag of an account that already has transactions associated",
  "error": "Bad Request"
}
```

---

## 3. Accounts Summary

`GET /api/accounts/summary`

### Response (`200 OK`)

```json
{
  "netWorth": 15000000.0,
  "totalAssets": 20000000.0,
  "totalLiabilities": 5000000.0,
  "accounts": [
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "name": "Efectivo",
      "type": "ASSET",
      "balance": 10000000.0,
      "currencyCode": "PYG",
      "currencySymbol": "₲",
      "decimalPlaces": 0,
      "parentId": null,
      "status": "ACTIVE",
      "isCashOrBank": true
    },
    {
      "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
      "name": "Cuenta Bancaria",
      "type": "ASSET",
      "balance": 10000000.0,
      "currencyCode": "PYG",
      "currencySymbol": "₲",
      "decimalPlaces": 0,
      "parentId": null,
      "status": "ACTIVE",
      "isCashOrBank": true
    }
  ]
}
```
