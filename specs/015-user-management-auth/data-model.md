# Data Model: User Management and Authentication System

**Feature Branch**: `015-user-management-auth`
**Date**: 2026-08-01

## 1. Entities

### User Entity (`users` table)

Represents a registered account in the system.

| Attribute | Type | Constraints | Description |
|-----------|------|-------------|-------------|
| `id` | UUID | Primary Key, Generated | Unique user identifier |
| `fullName` | String | NOT NULL, Max 100 | User's full name |
| `email` | String | NOT NULL, Unique, Indexed | User's primary email address |
| `passwordHash` | String | NOT NULL | Bcrypt hashed password string |
| `isActive` | Boolean | DEFAULT true, NOT NULL | Account active flag |
| `createdAt` | TimestampTZ | DEFAULT NOW(), NOT NULL | Creation timestamp |
| `updatedAt` | TimestampTZ | DEFAULT NOW(), NOT NULL | Last modification timestamp |

**Validation Rules**:
- `fullName`: Required, 2-100 characters, no dangerous HTML tags.
- `email`: Required, valid email format regex, stored lowercase, unique across `users` table.
- `password`: Validated before hashing. Minimum 8 characters, at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character (`/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/`).

---

### PasswordResetToken Entity (`password_reset_tokens` table)

Represents a single-use token generated for password recovery.

| Attribute | Type | Constraints | Description |
|-----------|------|-------------|-------------|
| `id` | UUID | Primary Key, Generated | Unique token record ID |
| `userId` | UUID | Foreign Key -> `users(id)`, Indexed | Associated user ID |
| `tokenHash` | String | NOT NULL, Indexed | SHA-256 hash of the plain-text reset token |
| `expiresAt` | TimestampTZ | NOT NULL | Token expiration date (NOW() + 60 mins) |
| `used` | Boolean | DEFAULT false, NOT NULL | Single-use status flag |
| `createdAt` | TimestampTZ | DEFAULT NOW(), NOT NULL | Token creation timestamp |

**State Transitions**:
1. **Issued**: Created upon user request at `/forgot-password`, `used = false`, `expiresAt` set to +60 minutes.
2. **Consumed**: Set `used = true` immediately when successfully validated and password reset occurs.
3. **Expired**: Invalidated if `NOW() > expiresAt`. Reused or expired tokens result in authentication rejection.

---

### Multi-Tenant Ownership Attributes

To enforce financial isolation (FR-008, FR-011), the following existing domain entities add a `userId` foreign key column:

- `accounts` (`user_id` FK -> `users.id`)
- `transactions` (`user_id` FK -> `users.id`)
- `budgets` (`user_id` FK -> `users.id`)
- `fiscal_years` (`user_id` FK -> `users.id`)
- `accounting_periods` (`user_id` FK -> `users.id`)

---

## 2. Enums and Type Constants

To prevent magic strings (Constitution Principle VI), the following strict TypeScript types/enums are declared in `@sistema-contable/shared`:

```typescript
export enum AuthErrorCode {
  INVALID_CREDENTIALS = 'AUTH_INVALID_CREDENTIALS',
  EMAIL_ALREADY_EXISTS = 'AUTH_EMAIL_ALREADY_EXISTS',
  INVALID_CURRENT_PASSWORD = 'AUTH_INVALID_CURRENT_PASSWORD',
  EXPIRED_OR_INVALID_TOKEN = 'AUTH_EXPIRED_OR_INVALID_TOKEN',
  USER_NOT_FOUND = 'AUTH_USER_NOT_FOUND',
  WEAK_PASSWORD = 'AUTH_WEAK_PASSWORD',
}

export enum TokenType {
  ACCESS = 'ACCESS',
  PASSWORD_RESET = 'PASSWORD_RESET',
}
```

---

## 3. Relationships

```
User (1) <--- (N) PasswordResetToken
User (1) <--- (N) Account
User (1) <--- (N) Transaction
User (1) <--- (N) Budget
User (1) <--- (N) FiscalYear
User (1) <--- (N) AccountingPeriod
```
