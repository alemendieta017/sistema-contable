# Research: User Management and Authentication System

**Feature Branch**: `015-user-management-auth`
**Date**: 2026-08-01

## 1. Password Hashing & Complexity Validation

### Decision
Use `bcrypt` for password hashing with a cost factor of 10. Implement password validation rules using `class-validator` / `zod` schemas shared in `@sistema-contable/shared`.

### Rationale
- `bcrypt` is already present in `backend/package.json` and currently used in `AuthService`.
- Password complexity requirements (minimum 8 characters, requiring mixed case, numbers, and special characters) can be cleanly enforced at both frontend input forms and backend NestJS `ValidationPipe` using standard regex validation.

### Alternatives Considered
- `argon2`: Superior security against GPU attacks, but adds native binary dependencies to Node.js container builds. `bcrypt` is already established and meets high security standards.

---

## 2. Password Reset Token Management & Secure Link Generation

### Decision
Create a `PasswordResetTokenEntity` stored in PostgreSQL with indexed hashed token (`tokenHash`), expiration time (`expiresAt` = creation time + 60 minutes), and single-use flag (`used`). The plain-text token (UUIDv4 or random 32-byte hex string) will be emailed to the user as part of a reset URL parameter (`/reset-password?token=...`).

### Rationale
- Storing hashed tokens (`crypto.createHash('sha256').update(token).digest('hex')`) in the database ensures that a database leak does not expose valid reset tokens.
- Single-use flag and expiration check prevent token replay attacks or stale reset link reuse.
- Generic response for non-existent emails during `forgot-password` prevents email enumeration attacks (CWE-204).

### Mailer Strategy
- Implement a modular `EmailService` interface in `backend/src/application/ports/email-service.interface.ts`.
- In development/test environments, log reset links to console/logger or mock service. Provide SMTP / Nodemailer configuration capability for production environments via environment variables (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`).

---

## 3. Profile Details & Full Name Management

### Decision
Extend `UserEntity` to include `fullName: string` (and `updatedAt: Date`). Update shared registration DTOs to include `fullName`.

### Rationale
- The user specification requires registration with personal information (full name) and displaying full name / initials in the top-right profile header dropdown.
- Adding `fullName` to domain models and TypeORM entities supports profile management cleanly.

---

## 4. Top-Right Header Profile UI & Session Management

### Decision
Update the header component in `frontend/src/components/` to present an interactive profile dropdown:
- Displays user initials in an avatar circle (e.g. "JD" for John Doe).
- Menu items: User's full name & email header, "Profile & Security Settings" (opens modal/page for changing password), and "Logout".
- Logout clears the JWT token from `localStorage` / HTTP cookies, resets client state via auth Context / Zustand store, and navigates to `/login`.

### Rationale
- Reuses existing UI patterns with shadcn/ui dropdown-menu components.
- Seamless user experience for logged-in users to manage security settings or end active sessions.

---

## 5. Multi-Tenant Private Workspace Scoping

### Decision
Enforce user ownership (`userId`) on key financial domain entities (`AccountEntity`, `TransactionEntity`, `BudgetEntity`, `FiscalYearEntity`, `AccountingPeriodEntity`).
Filter all database queries in services/repositories by `currentUser.id` extracted from the JWT token in `@CurrentUser()` decorator.

### Rationale
- Guarantees strict privacy (FR-008, FR-011) so User A cannot read or modify User B's financial data under any circumstance.
- Relational foreign keys (`user_id`) on primary domain entities enforce strict multi-tenant data isolation at the DB level.
