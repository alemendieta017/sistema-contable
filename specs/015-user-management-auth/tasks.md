# Tasks: User Management and Authentication System

**Input**: Design documents from `/specs/015-user-management-auth/`

**Prerequisites**: [plan.md](file:///home/amend/dev/sistema-contable/specs/015-user-management-auth/plan.md), [spec.md](file:///home/amend/dev/sistema-contable/specs/015-user-management-auth/spec.md), [research.md](file:///home/amend/dev/sistema-contable/specs/015-user-management-auth/research.md), [data-model.md](file:///home/amend/dev/sistema-contable/specs/015-user-management-auth/data-model.md), [auth-api.md](file:///home/amend/dev/sistema-contable/specs/015-user-management-auth/contracts/auth-api.md), [quickstart.md](file:///home/amend/dev/sistema-contable/specs/015-user-management-auth/quickstart.md)

**Tests**: Tests are included in accordance with project Constitution Principle V (Mandatory Test-Driven Development & Quality Verification).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story?] Description with file path`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4, US5)
- Exact file paths included in all descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, shared types, DTOs, and error codes

- [X] T001 Define shared authentication types, request DTOs (`RegisterDto`, `LoginDto`, `ChangePasswordDto`, `ForgotPasswordDto`, `ResetPasswordDto`), and `AuthErrorCode` enum in `shared/src/index.ts`
- [X] T002 [P] Export auth validation schemas and regex helpers for password complexity in `shared/src/index.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core database entities, schema migration, email port, and NestJS auth infrastructure that MUST be complete before user stories can proceed

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T003 Create TypeORM database entities and migrations for `UserEntity` (`fullName`, `email`, `passwordHash`, `isActive`) and `PasswordResetTokenEntity` in `backend/src/infrastructure/database/entities/`
- [X] T004 [P] Add `userId` foreign key relation to domain entities (`AccountEntity`, `TransactionEntity`, `BudgetEntity`, `FiscalYearEntity`, `AccountingPeriodEntity`) in `backend/src/infrastructure/database/entities/`
- [X] T005 [P] Implement `EmailService` port and console/logger development email adapter in `backend/src/infrastructure/mail/email.service.ts`
- [X] T006 Configure NestJS `AuthModule`, `JwtStrategy`, `JwtAuthGuard`, and `@CurrentUser()` parameter decorator in `backend/src/infrastructure/auth/`

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - User Self-Registration & Immediate Activation (Priority: P1) 🎯 MVP

**Goal**: Allow new users to register an account with full name, email, and secure password, immediately activating the account and starting a logged-in session.

**Independent Test**: A guest user visits `/signup`, submits valid registration details, gets an active account created, and is immediately redirected to their logged-in dashboard.

### Tests for User Story 1

- [X] T007 [P] [US1] Unit test for user registration service and password complexity validator in `backend/src/infrastructure/auth/auth.service.spec.ts`
- [X] T008 [P] [US1] Integration E2E test for POST `/api/v1/auth/register` (success & duplicate email rejection) in `backend/test/auth-register.e2e-spec.ts`

### Implementation for User Story 1

- [X] T009 [P] [US1] Update `UserEntity` in `backend/src/infrastructure/database/entities/user.entity.ts` to include `fullName` and `updatedAt` attributes
- [X] T010 [US1] Implement `register` method in `backend/src/infrastructure/auth/auth.service.ts` with duplicate email check, password hashing, and immediate JWT token issuance (depends on T009)
- [X] T011 [US1] Expose `POST /api/v1/auth/register` controller endpoint in `backend/src/infrastructure/controllers/auth.controller.ts` (depends on T010)
- [X] T012 [P] [US1] Create registration UI page and form with real-time password complexity validation in `frontend/src/app/signup/page.tsx`
- [X] T013 [US1] Integrate signup page form with frontend `auth.service.ts` API client and auto-login navigation in `frontend/src/services/auth.service.ts` (depends on T011, T012)

**Checkpoint**: User Story 1 (MVP) is fully functional and testable independently.

---

## Phase 4: User Story 2 - User Login, Session Management, and Profile Header (Priority: P1)

**Goal**: Registered users can log in securely and interact with a top-right profile header dropdown displaying user initials/avatar, profile details, and logout action.

**Independent Test**: A user authenticates at `/login`, sees their initials avatar in the top-right header menu, opens the dropdown to view details, and clicks "Logout" to clear the session and return to `/login`.

### Tests for User Story 2

- [X] T014 [P] [US2] Unit test for credential verification and JWT token generation in `backend/src/infrastructure/auth/auth.service.spec.ts`
- [X] T015 [P] [US2] Integration E2E test for `POST /api/v1/auth/login` and `GET /api/v1/auth/me` in `backend/test/auth-login.e2e-spec.ts`

### Implementation for User Story 2

- [X] T016 [US2] Implement `login` and `getProfile` methods in `backend/src/infrastructure/auth/auth.service.ts` and expose `POST /api/v1/auth/login` and `GET /api/v1/auth/me` in `backend/src/infrastructure/controllers/auth.controller.ts`
- [X] T017 [P] [US2] Update `AuthContext` / `AuthProvider` in `frontend/src/context/AuthContext.tsx` to handle user state, local storage / token persistence, and `logout()` method
- [X] T018 [P] [US2] Create login UI page with error alert display in `frontend/src/app/login/page.tsx`
- [X] T019 [US2] Create top-right header profile dropdown menu component (`HeaderProfileMenu`) displaying initials avatar, name, email, profile link, and Logout action in `frontend/src/components/layout/HeaderProfileMenu.tsx` (depends on T017)

**Checkpoint**: User Stories 1 AND 2 are both fully functional and testable independently.

---

## Phase 5: User Story 3 - Change Password (Priority: P2)

**Goal**: Authenticated users can update their account password from profile security settings after verifying their current password.

**Independent Test**: A logged-in user enters current and new passwords in the security settings modal, submits, logs out, and successfully logs in with the new password.

### Tests for User Story 3

- [X] T020 [P] [US3] Unit test for `changePassword` logic (current password validation & new password hashing) in `backend/src/infrastructure/auth/auth.service.spec.ts`
- [X] T021 [P] [US3] Integration E2E test for `POST /api/v1/auth/change-password` in `backend/test/auth-change-password.e2e-spec.ts`

### Implementation for User Story 3

- [X] T022 [US3] Implement `changePassword` method in `backend/src/infrastructure/auth/auth.service.ts` and expose `POST /api/v1/auth/change-password` endpoint in `backend/src/infrastructure/controllers/auth.controller.ts`
- [X] T023 [P] [US3] Create profile security settings modal (`ChangePasswordModal`) in `frontend/src/components/profile/ChangePasswordModal.tsx`
- [X] T024 [US3] Connect header dropdown "Profile / Security Settings" item to open `ChangePasswordModal` in `frontend/src/components/layout/HeaderProfileMenu.tsx` (depends on T019, T023)

**Checkpoint**: User Stories 1, 2, and 3 are functional and testable independently.

---

## Phase 6: User Story 4 - Forgot Password via Secure Reset Link (Priority: P2)

**Goal**: Unauthenticated users who forgot their password can request a single-use recovery link via email valid for 60 minutes and reset their password.

**Independent Test**: User clicks "Forgot Password", inputs registered email, receives reset link containing token, accesses `/reset-password?token=...`, sets new password, and logs in.

### Tests for User Story 4

- [X] T025 [P] [US4] Unit test for reset token generation, token SHA-256 hashing, expiration check (60m), and single-use validation in `backend/src/infrastructure/auth/auth.service.spec.ts`
- [X] T026 [P] [US4] Integration E2E test for `POST /api/v1/auth/forgot-password` and `POST /api/v1/auth/reset-password` in `backend/test/auth-forgot-password.e2e-spec.ts`

### Implementation for User Story 4

- [X] T027 [P] [US4] Create `PasswordResetTokenEntity` TypeORM entity in `backend/src/infrastructure/database/entities/password-reset-token.entity.ts`
- [X] T028 [US4] Implement `requestForgotPassword` (generating hashed token & emailing reset URL) and `resetPassword` (verifying token & updating password) in `backend/src/infrastructure/auth/auth.service.ts` (depends on T027, T005)
- [X] T029 [US4] Expose `POST /api/v1/auth/forgot-password` and `POST /api/v1/auth/reset-password` in `backend/src/infrastructure/controllers/auth.controller.ts` (depends on T028)
- [X] T030 [P] [US4] Create forgot password UI page in `frontend/src/app/forgot-password/page.tsx`
- [X] T031 [P] [US4] Create reset password UI page with token URL parsing and new password form in `frontend/src/app/reset-password/page.tsx`

**Checkpoint**: User Stories 1, 2, 3, and 4 are functional and testable independently.

---

## Phase 7: User Story 5 - Multi-Tenant Private Workspace Scoping (Priority: P3)

**Goal**: Guarantee strict privacy and data isolation so that each user's financial accounts, transactions, budgets, and periods are private to their account.

**Independent Test**: User A and User B log in separately; User A's transactions and ledger entries are completely invisible and inaccessible to User B.

### Tests for User Story 5

- [X] T032 [P] [US5] E2E integration test verifying database records and API endpoints filter strictly by `userId` in `backend/test/multi-tenant-isolation.e2e-spec.ts`

### Implementation for User Story 5

- [X] T033 [US5] Update backend controllers (`account.controller.ts`, `ledger.controller.ts`, `budget.controller.ts`, `period.controller.ts`) to extract user from `@CurrentUser()` decorator and scope database queries in `backend/src/infrastructure/controllers/`
- [X] T034 [US5] Automatically inject `userId` when creating new accounts, transactions, budgets, and periods in backend application services in `backend/src/application/`

**Checkpoint**: All user stories (1-5) are implemented and independently testable.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Quality verification, formatting, test suite validation, and end-to-end quickstart execution

- [X] T035 [P] Execute linting and formatting compliance across projects (`npm run lint`)
- [X] T036 Run full automated test suite verifying 100% pass rate in `backend/` and `frontend/`
- [X] T037 Perform manual quickstart validation scenarios from `specs/015-user-management-auth/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories proceed in priority order (US1 → US2 → US3 → US4 → US5) or in parallel if staffed
- **Polish (Phase 8)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Starts after Foundational (Phase 2)
- **User Story 2 (P1)**: Starts after Foundational (Phase 2); uses registration user models from US1
- **User Story 3 (P2)**: Starts after US2 (requires logged-in user profile header navigation)
- **User Story 4 (P2)**: Starts after Foundational (Phase 2); uses user models
- **User Story 5 (P3)**: Starts after Foundational (Phase 2); updates existing ledger controllers

---

## Parallel Opportunities

- **Phase 1**: T001 and T002 can run in parallel.
- **Phase 2**: T004 (`userId` entity attributes) and T005 (`EmailService`) can run in parallel.
- **US1**: T007 & T008 (tests), T009 (UserEntity), T012 (Signup UI) can run in parallel.
- **US2**: T014 & T015 (tests), T017 (AuthContext), T018 (Login UI) can run in parallel.
- **US3**: T020 & T021 (tests), T023 (ChangePasswordModal) can run in parallel.
- **US4**: T025 & T026 (tests), T027 (ResetToken entity), T030 (Forgot UI), T031 (Reset UI) can run in parallel.
- **US5**: T032 (Multi-tenant tests) can run in parallel with setup.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001 - T002)
2. Complete Phase 2: Foundational (T003 - T006)
3. Complete Phase 3: User Story 1 (T007 - T013)
4. **VALIDATE**: Test registration & auto-login end-to-end

### Incremental Delivery

1. Setup + Foundational -> Core database & auth ready
2. User Story 1 -> Self-registration (MVP)
3. User Story 2 -> Login & Profile header menu dropdown
4. User Story 3 -> Change password from profile
5. User Story 4 -> Self-service password recovery via reset link
6. User Story 5 -> Complete multi-tenant data isolation
7. Polish -> Linting, full test suite, quickstart verification

---

## Phase 9: Convergence

- [X] T038 Create missing E2E integration test suite for POST `/api/v1/auth/register` in `backend/test/auth-register.e2e-spec.ts` per US1 / T008 (missing)
- [X] T039 Create missing E2E integration test suite for POST `/api/v1/auth/login` and GET `/api/v1/auth/me` in `backend/test/auth-login.e2e-spec.ts` per US2 / T015 (missing)
- [X] T040 Create missing E2E integration test suite for POST `/api/v1/auth/change-password` in `backend/test/auth-change-password.e2e-spec.ts` per US3 / T021 (missing)
- [X] T041 Create missing E2E integration test suite for POST `/api/v1/auth/forgot-password` and POST `/api/v1/auth/reset-password` in `backend/test/auth-forgot-password.e2e-spec.ts` per US4 / T026 (missing)
