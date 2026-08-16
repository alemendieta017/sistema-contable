# Danger Zone API Contract

## Base Paths

- Prefix: `/api/v1/danger-zone` (and fallback alias `/api/danger-zone`)
- Authentication: Bearer JWT Token (`Authorization: Bearer <token>`)

---

## 1. Factory Reset (Restablecer datos de fábrica)

Purges all user financial records, transactions, budgets, periods, and custom accounts, then re-seeds default starter accounts. Leaves the user account active.

- **Method**: `POST`
- **Endpoint**: `/api/v1/danger-zone/reset-data`
- **Guards**: `JwtAuthGuard`

### Request Body (`application/json`)

```json
{
  "confirmationPhrase": "RESTABLECER DATOS",
  "currentPassword": "userCurrentPassword123"
}
```

### Responses

#### 200 OK

```json
{
  "success": true,
  "message": "Todos los datos contables han sido restablecidos de fábrica con éxito.",
  "action": "FACTORY_RESET",
  "timestamp": "2026-08-16T12:00:00.000Z"
}
```

#### 400 Bad Request (Invalid phrase format or missing fields)

```json
{
  "statusCode": 400,
  "message": "Debe escribir exactamente \"RESTABLECER DATOS\"",
  "error": "Bad Request"
}
```

#### 401 Unauthorized (Invalid current password)

```json
{
  "statusCode": 401,
  "message": "Contraseña actual incorrecta",
  "error": "Unauthorized",
  "code": "AUTH_INVALID_CURRENT_PASSWORD"
}
```

---

## 2. Permanent Account Deletion (Eliminar cuenta permanentemente)

Permanently destroys the user account, login credentials, tokens, and all associated personal and accounting records.

- **Method**: `POST` (or `DELETE`)
- **Endpoint**: `/api/v1/danger-zone/delete-account`
- **Guards**: `JwtAuthGuard`

### Request Body (`application/json`)

```json
{
  "confirmationPhrase": "ELIMINAR MI CUENTA",
  "currentPassword": "userCurrentPassword123"
}
```

### Responses

#### 200 OK

```json
{
  "success": true,
  "message": "La cuenta y todos los datos asociados han sido eliminados permanentemente.",
  "action": "DELETE_ACCOUNT",
  "timestamp": "2026-08-16T12:00:00.000Z"
}
```

#### 400 Bad Request (Invalid phrase format or missing fields)

```json
{
  "statusCode": 400,
  "message": "Debe escribir exactamente \"ELIMINAR MI CUENTA\"",
  "error": "Bad Request"
}
```

#### 401 Unauthorized (Invalid current password)

```json
{
  "statusCode": 401,
  "message": "Contraseña actual incorrecta",
  "error": "Unauthorized",
  "code": "AUTH_INVALID_CURRENT_PASSWORD"
}
```
