# API Contract: Transaction Operations

## 1. Retrieve Single Transaction
Retrieves full details for a single journal entry transaction.

- **URL**: `/api/transactions/:id`
- **Method**: `GET`
- **Headers**:
  - `Authorization: Bearer <JWT_TOKEN>`

### Responses

#### 200 OK
```json
{
  "id": "278c772c-7b70-4cb6-8809-5489be42fb14",
  "userId": "user-uuid-1234",
  "date": "2026-06-30T09:00:00.000-04:00",
  "description": "Pago de alquiler oficina",
  "status": "POSTED",
  "reversalOfId": null,
  "createdAt": "2026-06-30T13:01:00.000Z",
  "entries": [
    {
      "id": "e9cb8194-e0c6-48c5-9276-8096fcf22880",
      "accountId": "a3b90e9d-12ab-34cd-56ef-7890abcdef12",
      "entryType": "DEBIT",
      "amount": 2500.00,
      "amountBase": 2500.00,
      "rateAtDate": 1.00,
      "account": {
        "id": "a3b90e9d-12ab-34cd-56ef-7890abcdef12",
        "name": "Gastos de Alquiler",
        "type": "EXPENSE",
        "currency": {
          "id": "curr-usd-uuid",
          "code": "USD",
          "symbol": "$",
          "decimalPlaces": 2
        }
      }
    },
    {
      "id": "f8d7b322-12f3-4d4b-90f9-a29239849202",
      "accountId": "b4c80f0e-23cd-45ef-67gh-8901bcdefg34",
      "entryType": "CREDIT",
      "amount": 2500.00,
      "amountBase": 2500.00,
      "rateAtDate": 1.00,
      "account": {
        "id": "b4c80f0e-23cd-45ef-67gh-8901bcdefg34",
        "name": "Caja Principal",
        "type": "ASSET",
        "currency": {
          "id": "curr-usd-uuid",
          "code": "USD",
          "symbol": "$",
          "decimalPlaces": 2
        }
      }
    }
  ]
}
```

#### 404 Not Found
Returned if the transaction ID does not exist or does not belong to the authenticated user.
```json
{
  "statusCode": 404,
  "message": "Transaction with ID 278c772c-7b70-4cb6-8809-5489be42fb14 not found"
}
```

---

## 2. Update Transaction
Modifies an existing transaction. Overwrites its header fields and completely replaces its entry lines.

- **URL**: `/api/transactions/:id`
- **Method**: `PUT`
- **Headers**:
  - `Authorization: Bearer <JWT_TOKEN>`
  - `Content-Type: application/json`
- **Body**:
```json
{
  "date": "2026-06-30T10:00:00.000-04:00",
  "description": "Pago de alquiler oficina (modificado)",
  "entries": [
    {
      "accountId": "a3b90e9d-12ab-34cd-56ef-7890abcdef12",
      "entryType": "DEBIT",
      "amount": 2600.00
    },
    {
      "accountId": "b4c80f0e-23cd-45ef-67gh-8901bcdefg34",
      "entryType": "CREDIT",
      "amount": 2600.00
    }
  ]
}
```

### Responses

#### 200 OK
Returns the updated transaction representation.

#### 400 Bad Request
Returned if the request payload fails validation (e.g. less than 2 entries, unbalanced, negative amounts, inactive account, or if the transaction is reversed or is a reversal).
```json
{
  "statusCode": 400,
  "message": "Transaction is unbalanced by 100"
}
```

---

## 3. Delete Transaction
Permanently deletes a transaction and cascades to delete all its entries.

- **URL**: `/api/transactions/:id`
- **Method**: `DELETE`
- **Headers**:
  - `Authorization: Bearer <JWT_TOKEN>`

### Responses

#### 204 No Content
Success response indicating the transaction has been deleted.

#### 404 Not Found
Returned if the transaction ID does not exist or does not belong to the user.
