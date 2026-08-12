# Interface Contract: Quick Account Creation API

## Endpoint Summary

- **Method**: `POST`
- **Path**: `/api/accounts`
- **Authentication**: Bearer JWT Token (`Authorization: Bearer <token>`)
- **Content-Type**: `application/json`

## Request Payload

```json
{
  "name": "Servicios de Internet",
  "type": "EXPENSE",
  "currencyId": "c8d7f8e0-1234-4567-89ab-cdef01234567",
  "parentId": null,
  "isCashOrBank": false
}
```

### Field Requirements

| Field          | Type          | Required | Description                                                |
| -------------- | ------------- | -------- | ---------------------------------------------------------- |
| `name`         | String        | Yes      | Account name                                               |
| `type`         | String        | Yes      | One of `ASSET`, `LIABILITY`, `EQUITY`, `INCOME`, `EXPENSE` |
| `currencyId`   | String (UUID) | Yes      | Valid currency ID                                          |
| `parentId`     | String (UUID) | No       | Optional parent account ID                                 |
| `isCashOrBank` | Boolean       | No       | Indicates cash/bank account                                |

## Response

### 201 Created

```json
{
  "id": "acc-99887766-5544-3322-1100-a1b2c3d4e5f6",
  "name": "Servicios de Internet",
  "type": "EXPENSE",
  "currencyId": "c8d7f8e0-1234-4567-89ab-cdef01234567",
  "parentId": null,
  "isCashOrBank": false,
  "systemRole": null,
  "companyId": "comp-1234-5678-90ab",
  "createdAt": "2026-08-12T01:30:00.000Z",
  "updatedAt": "2026-08-12T01:30:00.000Z"
}
```

### 400 Bad Request (Validation Error)

```json
{
  "statusCode": 400,
  "message": [
    "name must be a string",
    "type must be one of ASSET, LIABILITY, EQUITY, INCOME, EXPENSE"
  ],
  "error": "Bad Request"
}
```

### 401 Unauthorized

```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```
