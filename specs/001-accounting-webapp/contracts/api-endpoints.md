# API Endpoints Contract: Web Accounting App (Sistema Contable)

This document defines the REST API contract between the NestJS backend and the Next.js frontend. All payloads are JSON unless otherwise specified.

---

## 1. Authentication

### 1.1. User Registration
`POST /api/auth/register`
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "SecurePassword123"
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "id": "uuid-user-1234",
    "email": "user@example.com",
    "created_at": "2026-06-27T00:00:00Z"
  }
  ```

### 1.2. User Login
`POST /api/auth/login`
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "SecurePassword123"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "access_token": "jwt-token-string",
    "user": {
      "id": "uuid-user-1234",
      "email": "user@example.com"
    }
  }
  ```

---

## 2. Accounts and Categories (Chart of Accounts)

### 2.1. List Accounts
`GET /api/accounts`
- **Headers**: `Authorization: Bearer <token>`
- **Response (200 OK)**:
  ```json
  [
    {
      "id": "uuid-acc-efectivo",
      "name": "Efectivo",
      "parent_id": null,
      "type": "ASSET",
      "currency_id": "uuid-cur-pyg",
      "status": "ACTIVE",
      "metadata": { "color": "#00ff00", "order_seq": 1 }
    },
    {
      "id": "uuid-acc-comida",
      "name": "Comida",
      "parent_id": null,
      "type": "EXPENSE",
      "currency_id": "uuid-cur-pyg",
      "status": "ACTIVE",
      "metadata": { "color": "#ff0000", "order_seq": 5 }
    },
    {
      "id": "uuid-acc-almuerzo",
      "name": "Almuerzo",
      "parent_id": "uuid-acc-comida",
      "type": "EXPENSE",
      "currency_id": "uuid-cur-pyg",
      "status": "ACTIVE",
      "metadata": { "order_seq": 1 }
    }
  ]
  ```

### 2.2. Create Account
`POST /api/accounts`
- **Headers**: `Authorization: Bearer <token>`
- **Request Body**:
  ```json
  {
    "name": "Ueno Caja de Ahorros",
    "parent_id": null,
    "type": "ASSET",
    "currency_id": "uuid-cur-pyg",
    "metadata": { "color": "#0000ff", "order_seq": 2 }
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "id": "uuid-acc-ueno-caja",
    "name": "Ueno Caja de Ahorros",
    "parent_id": null,
    "type": "ASSET",
    "currency_id": "uuid-cur-pyg",
    "status": "ACTIVE",
    "metadata": { "color": "#0000ff", "order_seq": 2 }
  }
  ```

---

## 3. Transactions (Double-Entry Ledger)

### 3.1. Register Transaction (Asiento Libre / Multi-Item)
`POST /api/transactions`
- **Headers**: `Authorization: Bearer <token>`
- **Request Body**:
  ```json
  {
    "date": "2026-06-27T12:00:00Z",
    "description": "Compras super y farmacia",
    "entries": [
      {
        "account_id": "uuid-acc-ueno-tc",
        "entry_type": "CREDIT",
        "amount": 100000.0
      },
      {
        "account_id": "uuid-acc-comida",
        "entry_type": "DEBIT",
        "amount": 70000.0
      },
      {
        "account_id": "uuid-acc-farmacia",
        "entry_type": "DEBIT",
        "amount": 30000.0
      }
    ]
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "id": "uuid-tx-compra-1",
    "date": "2026-06-27T12:00:00Z",
    "description": "Compras super y farmacia",
    "status": "POSTED",
    "entries": [
      {
        "id": "uuid-entry-1",
        "account_id": "uuid-acc-ueno-tc",
        "entry_type": "CREDIT",
        "amount": 100000.0,
        "amount_base": 100000.0,
        "rate_at_date": 1.0
      },
      {
        "id": "uuid-entry-2",
        "account_id": "uuid-acc-comida",
        "entry_type": "DEBIT",
        "amount": 70000.0,
        "amount_base": 70000.0,
        "rate_at_date": 1.0
      },
      {
        "id": "uuid-entry-3",
        "account_id": "uuid-acc-farmacia",
        "entry_type": "DEBIT",
        "amount": 30000.0,
        "amount_base": 30000.0,
        "rate_at_date": 1.0
      }
    ]
  }
  ```

### 3.2. List Transactions
`GET /api/transactions`
- **Headers**: `Authorization: Bearer <token>`
- **Query Params**: `startDate`, `endDate`, `accountId` (optional)
- **Response (200 OK)**:
  ```json
  [
    {
      "id": "uuid-tx-compra-1",
      "date": "2026-06-27T12:00:00Z",
      "description": "Compras super y farmacia",
      "status": "POSTED",
      "entries": [...]
    }
  ]
  ```

### 3.3. Reverse/Void Transaction (Inmutabilidad)
`POST /api/transactions/:id/reverse`
- **Headers**: `Authorization: Bearer <token>`
- **Response (201 Created)**:
  ```json
  {
    "id": "uuid-tx-reversal-1234",
    "date": "2026-06-27T13:00:00Z",
    "description": "Reversión de asiento: Compras super y farmacia",
    "status": "POSTED",
    "reversal_of_id": "uuid-tx-compra-1",
    "entries": [
      {
        "account_id": "uuid-acc-ueno-tc",
        "entry_type": "DEBIT",
        "amount": 100000.0
      },
      {
        "account_id": "uuid-acc-comida",
        "entry_type": "CREDIT",
        "amount": 70000.0
      },
      {
        "account_id": "uuid-acc-farmacia",
        "entry_type": "CREDIT",
        "amount": 30000.0
      }
    ]
  }
  ```

---

## 4. Budgets

### 4.1. List Budgets with Consumption
`GET /api/budgets`
- **Headers**: `Authorization: Bearer <token>`
- **Query Params**: `period` (Format: `YYYYMM`, e.g. `202606`)
- **Response (200 OK)**:
  ```json
  [
    {
      "id": "uuid-budget-comida",
      "account_id": "uuid-acc-comida",
      "account_name": "Comida",
      "period": 202606,
      "limit_amount": 700000.0,
      "spent_amount": 350000.0,
      "remaining_amount": 350000.0,
      "percentage": 50.0
    }
  ]
  ```

---

## 5. Reports and Exports

### 5.1. Excel Export
`GET /api/reports/excel`
- **Headers**: `Authorization: Bearer <token>`
- **Query Params**: `startDate`, `endDate`
- **Response (200 OK)**: Stream of file with Content-Type `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`.
