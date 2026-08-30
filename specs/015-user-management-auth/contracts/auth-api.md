# API Contracts: User Management and Authentication

**Feature Branch**: `015-user-management-auth`
**Date**: 2026-08-01

## Endpoints Summary

| Method | Endpoint                       | Auth Required | Description                                    |
| ------ | ------------------------------ | ------------- | ---------------------------------------------- |
| `POST` | `/api/v1/auth/register`        | No            | Register new user account and activate session |
| `POST` | `/api/v1/auth/login`           | No            | Authenticate user with credentials             |
| `GET`  | `/api/v1/auth/me`              | Yes (Bearer)  | Get current authenticated user profile         |
| `POST` | `/api/v1/auth/change-password` | Yes (Bearer)  | Change current user's password                 |
| `POST` | `/api/v1/auth/forgot-password` | No            | Request password recovery reset link email     |
| `POST` | `/api/v1/auth/reset-password`  | No            | Reset password using single-use recovery token |

---

## 1. Register Account

- **URL**: `/api/v1/auth/register`
- **Method**: `POST`
- **Request Body**:

```json
{
  "fullName": "Juan Pérez",
  "email": "juan.perez@example.com",
  "password": "Password123!"
}
```

- **Success Response** (`201 Created`):

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsIn...",
  "user": {
    "id": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
    "fullName": "Juan Pérez",
    "email": "juan.perez@example.com",
    "createdAt": "2026-08-01T12:00:00Z"
  }
}
```

- **Error Responses**:
  - `400 Bad Request`: Password fails complexity check or invalid email format.
  - `409 Conflict`: Email already in use (`AUTH_EMAIL_ALREADY_EXISTS`).

---

## 2. Login

- **URL**: `/api/v1/auth/login`
- **Method**: `POST`
- **Request Body**:

```json
{
  "email": "juan.perez@example.com",
  "password": "Password123!"
}
```

- **Success Response** (`200 OK`):

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsIn...",
  "user": {
    "id": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
    "fullName": "Juan Pérez",
    "email": "juan.perez@example.com"
  }
}
```

- **Error Responses**:
  - `401 Unauthorized`: Invalid credentials (`AUTH_INVALID_CREDENTIALS`).

---

## 3. Get Current User Profile (`/me`)

- **URL**: `/api/v1/auth/me`
- **Method**: `GET`
- **Headers**: `Authorization: Bearer <token>`
- **Success Response** (`200 OK`):

```json
{
  "id": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
  "fullName": "Juan Pérez",
  "email": "juan.perez@example.com",
  "createdAt": "2026-08-01T12:00:00Z"
}
```

- **Error Responses**:
  - `401 Unauthorized`: Missing or expired access token.

---

## 4. Change Password

- **URL**: `/api/v1/auth/change-password`
- **Method**: `POST`
- **Headers**: `Authorization: Bearer <token>`
- **Request Body**:

```json
{
  "currentPassword": "Password123!",
  "newPassword": "NewPassword456!"
}
```

- **Success Response** (`200 OK`):

```json
{
  "message": "Password updated successfully"
}
```

- **Error Responses**:
  - `400 Bad Request`: `newPassword` fails complexity rules or is identical to current.
  - `401 Unauthorized`: `currentPassword` verification failed (`AUTH_INVALID_CURRENT_PASSWORD`).

---

## 5. Forgot Password

- **URL**: `/api/v1/auth/forgot-password`
- **Method**: `POST`
- **Request Body**:

```json
{
  "email": "juan.perez@example.com"
}
```

- **Success Response** (`200 OK`):

```json
{
  "message": "If the email is registered, a password reset link has been sent."
}
```

_(Note: Returns 200 OK regardless of whether email exists to prevent email enumeration attacks)._

---

## 6. Reset Password

- **URL**: `/api/v1/auth/reset-password`
- **Method**: `POST`
- **Request Body**:

```json
{
  "token": "b8f2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
  "newPassword": "NewPassword456!"
}
```

- **Success Response** (`200 OK`):

```json
{
  "message": "Password reset successfully. You may now log in with your new password."
}
```

- **Error Responses**:
  - `400 Bad Request`: Token expired, already used, invalid format, or new password weak (`AUTH_EXPIRED_OR_INVALID_TOKEN`).
