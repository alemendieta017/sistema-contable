# Implementation Plan: User Management and Authentication System

**Branch**: `015-user-management-auth` | **Date**: 2026-08-01 | **Spec**: [spec.md](file:///home/amend/dev/sistema-contable/specs/015-user-management-auth/spec.md)

**Input**: Feature specification from `/specs/015-user-management-auth/spec.md`

## Summary

Implement a full-featured user management and authentication system for the accounting web application. This includes user self-registration with immediate account activation, credential login with JWT session management, an interactive top-right profile header menu (displaying user initials/avatar, details, security link, and logout action), authenticated password change functionality, self-service forgot password flow via secure email reset tokens, and strict multi-tenant financial ledger isolation per user account.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20+
**Primary Dependencies**: NestJS (backend), Next.js 14+ / React (frontend), `@nestjs/jwt`, `bcrypt`, `class-validator`, `shadcn/ui`, `TailwindCSS` v4.3
**Storage**: PostgreSQL with TypeORM (`users`, `password_reset_tokens`, and multi-tenant domain tables `accounts`, `transactions`, `budgets`, `fiscal_years`, `accounting_periods`)
**Testing**: Jest (unit and integration tests), Supertest (NestJS e2e tests)
**Target Platform**: Linux server container (Dokploy / Docker Compose), Modern web browsers
**Project Type**: Full-stack Monorepo web application (`backend/`, `frontend/`, `shared/`)
**Performance Goals**: Auth endpoints <150ms response time; Password reset token generation <200ms
**Constraints**: Password complexity rules (min 8 chars, mixed case, numbers, symbols); Single-use token expiration strictly set to 60 minutes; Zero plain-text credentials in database or API responses.
**Scale/Scope**: Multi-user tenancy with individual account isolation.

## Constitution Check

*GATE: Passed before Phase 0 research. Re-evaluated after Phase 1 design.*

| Principle | Compliance Status | Rationale |
|-----------|-------------------|-----------|
| **I. Double-Entry Bookkeeping & Ledger Integrity** | PASS | Multi-tenancy isolation (`user_id` foreign keys) ensures double-entry balance and ledger integrity are preserved per user ledger without cross-user leakage. |
| **II. Clean Architecture & SOLID Principles** | PASS | Auth logic is isolated in NestJS `AuthModule`, domain entities remain framework-agnostic in `domain/`, use cases encapsulated in application services. |
| **III. Monorepo Organization & Unified Type Safety** | PASS | All authentication request/response DTOs, schemas, types, and error enums are exported from `@sistema-contable/shared` package for end-to-end type safety. |
| **IV. Budgetary Control and Personal/Family Domain** | PASS | Budget entities are scoped to the authenticated user ID. |
| **V. Strict Test-Driven Development (TDD) & Quality Verification** | PASS | Tests for `AuthService`, token validation, password hashing, and endpoint authorization will be written prior to feature implementation. |
| **VI. Prevention of Magic Strings & Strict Type Constants** | PASS | Auth error codes, token types, and route paths use strict TypeScript enums/consts in `shared`. |

## Project Structure

### Documentation (this feature)

```text
specs/015-user-management-auth/
├── spec.md              # Feature specification
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
└── contracts/           # Phase 1 output (/speckit-plan command)
    └── auth-api.md      # API contract for authentication endpoints
```

### Source Code (repository root)

```text
shared/
└── src/
    ├── types/           # User & Auth interfaces, JWT payload types
    ├── dtos/            # Register, Login, ChangePassword, ForgotPassword DTOs
    └── enums/           # AuthErrorCode, TokenType

backend/
└── src/
    ├── domain/
    │   └── entities/    # User & PasswordResetToken domain interfaces
    ├── application/
    │   ├── auth/        # Register, Login, ResetPassword, ChangePassword use cases
    │   └── ports/       # EmailService interface, UserRepository interface
    └── infrastructure/
        ├── auth/        # AuthService, JwtStrategy, CurrentUser decorator, AuthGuard
        ├── database/
        │   └── entities/# UserEntity, PasswordResetTokenEntity, tenant-scoped Entities
        ├── mail/        # ConsoleEmailService / SmtpEmailService implementation
        └── controllers/ # AuthController (`/api/v1/auth/*`)

frontend/
└── src/
    ├── app/
    │   ├── login/       # Login page
    │   ├── signup/      # Registration page
    │   ├── forgot-password/ # Password recovery request page
    │   └── reset-password/  # Password reset page
    ├── components/
    │   ├── header/      # Interactive top-right user profile header dropdown
    │   └── profile/     # Change Password & Profile settings modal/view
    ├── context/         # AuthContext / AuthProvider (token management & state)
    └── services/        # Auth API client integration
```

**Structure Decision**: Web application layout utilizing the standard `backend/`, `frontend/`, and `shared/` monorepo package structure.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| *None* | N/A | Implementation fully complies with all project principles and clean architecture constraints. |
