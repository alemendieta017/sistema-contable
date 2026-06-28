# API Contracts: Dashboard and Core Modules

All API endpoints are prefixed with `/api`. Requests must include an `Authorization: Bearer <JWT_TOKEN>` header if protected.

---

## 1. Authentication

### POST `/auth/register`
Creates a new user.
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "securepassword"
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "id": "uuid-string",
    "email": "user@example.com",
    "created_at": "ISO-date-string"
  }
  ```

### POST `/auth/login`
Authenticates a user.
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "securepassword"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "access_token": "jwt-token-string",
    "user": {
      "id": "uuid-string",
      "email": "user@example.com"
    }
  }
  ```

---

## 2. Accounts Module

### GET `/accounts`
Lists all accounts for the current user.
- **Response (200 OK)**:
  ```json
  [
    {
      "id": "uuid-string",
      "name": "Efectivo",
      "type": "ASSET",
      "currencyId": "uuid-string",
      "parentId": null,
      "status": "ACTIVE",
      "metadata": null
    }
  ]
  ```

### GET `/accounts/summary`
Returns summarized balances (Assets, Liabilities, Net Balance) along with current balances for each account.
- **Response (200 OK)**:
  ```json
  {
    "netWorth": 2500.0,
    "totalAssets": 3000.0,
    "totalLiabilities": 500.0,
    "accounts": [
      {
        "id": "uuid-string",
        "name": "Efectivo",
        "type": "ASSET",
        "currencyId": "uuid-string",
        "currencyCode": "USD",
        "parentId": null,
        "status": "ACTIVE",
        "balance": 1500.0
      }
    ]
  }
  ```

### POST `/accounts`
Creates a new account.
- **Request Body**:
  ```json
  {
    "name": "Caja Fuerte",
    "type": "ASSET",
    "currencyId": "uuid-string",
    "parentId": null,
    "metadata": {
      "initialBalance": 100
    }
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "id": "uuid-string",
    "name": "Caja Fuerte",
    "type": "ASSET",
    "currencyId": "uuid-string",
    "parentId": null,
    "status": "ACTIVE",
    "metadata": {
      "initialBalance": 100
    }
  }
  ```

### DELETE `/accounts/:id`
Deletes or deactivates an account.
- **Response (200 OK or 204 No Content)**

---

## 3. Transactions Module

### GET `/transactions`
Lists transactions within an optional date range.
- **Query Parameters**:
  - `startDate`: ISO Date String (e.g. `2026-06-01`)
  - `endDate`: ISO Date String (e.g. `2026-06-30`)
- **Response (200 OK)**:
  ```json
  [
    {
      "id": "uuid-string",
      "date": "2026-06-27T00:00:00.000Z",
      "description": "Compra supermercado",
      "entries": [
        {
          "id": "uuid-string",
          "accountId": "uuid-string",
          "entryType": "DEBIT",
          "amount": 100.0,
          "amountBase": 100.0,
          "account": {
            "id": "uuid-string",
            "name": "Alimentos",
            "type": "EXPENSE"
          }
        },
        {
          "id": "uuid-string",
          "accountId": "uuid-string",
          "entryType": "CREDIT",
          "amount": 100.0,
          "amountBase": 100.0,
          "account": {
            "id": "uuid-string",
            "name": "Efectivo",
            "type": "ASSET"
          }
        }
      ]
    }
  ]
  ```

### POST `/transactions`
Creates a double-entry transaction.
- **Request Body**:
  ```json
  {
    "date": "2026-06-27T00:00:00.000Z",
    "description": "Compra dividida",
    "entries": [
      {
        "accountId": "uuid-expense-1",
        "entryType": "DEBIT",
        "amount": 60.0
      },
      {
        "accountId": "uuid-expense-2",
        "entryType": "DEBIT",
        "amount": 40.0
      },
      {
        "accountId": "uuid-asset-1",
        "entryType": "CREDIT",
        "amount": 100.0
      }
    ]
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "id": "uuid-string",
    "date": "2026-06-27T00:00:00.000Z",
    "description": "Compra dividida"
  }
  ```

---

## 4. Reports & Currencies

### GET `/reports/statistics`
Returns category aggregates for a specific period and transaction type.
- **Query Parameters**:
  - `period`: string (`YYYY-MM`)
  - `type`: string (`INCOME` or `EXPENSE`)
- **Response (200 OK)**:
  ```json
  [
    {
      "accountId": "uuid-string",
      "accountName": "Comida",
      "amount": 350.0,
      "percentage": 70.0
    },
    {
      "accountId": "uuid-string",
      "accountName": "Transporte",
      "amount": 150.0,
      "percentage": 30.0
    }
  ]
  ```

### GET `/currencies`
Lists all available currencies.
- **Response (200 OK)**:
  ```json
  [
    {
      "id": "uuid-string",
      "code": "USD",
      "symbol": "$",
      "rateToBase": 1.0,
      "isBase": true
    }
  ]
  ```
