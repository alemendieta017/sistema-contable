# Quickstart & Validation Guide: User Management and Auth System

**Feature Branch**: `015-user-management-auth`
**Date**: 2026-08-01

This guide describes end-to-end verification scenarios to validate user registration, login, profile menu actions, password change, recovery links, and multi-tenant data isolation.

## Prerequisites

1. PostgreSQL database running (via `docker-compose.dev.yml` or local dev instance).
2. Backend NestJS application compiled and running (`npm --prefix backend run start:dev`).
3. Frontend Next.js application running (`npm --prefix frontend run dev`).

---

## Scenario 1: User Self-Registration & Immediate Activation (US1)

1. Open browser to `http://localhost:3000/signup` (or click "Register" on login screen).
2. Enter full name: `Juan Pérez`, email: `juan.perez@example.com`, password: `Password123!`.
3. Click **Register**.
4. **Expected Outcome**:
   - Account is created and activated immediately.
   - User is redirected to dashboard (`/dashboard` or `/`).
   - Top-right corner displays avatar badge with initials `JP`.

---

## Scenario 2: Duplicate Email Rejection (US1)

1. Navigate to `/signup`.
2. Enter details using the same email (`juan.perez@example.com`).
3. Submit registration form.
4. **Expected Outcome**:
   - Form displays validation error: `"Email already registered"`.

---

## Scenario 3: Login, Profile Dropdown, and Logout (US2)

1. Navigate to `/login`.
2. Enter credentials (`juan.perez@example.com` / `Password123!`).
3. Click **Log In**.
4. Click top-right avatar menu icon (`JP`).
5. Verify dropdown menu displays:
   - Header with full name "Juan Pérez" and email "juan.perez@example.com".
   - Link/Option for "Profile / Security Settings".
   - Option for "Logout".
6. Click **Logout**.
7. **Expected Outcome**:
   - Session is cleared.
   - User is redirected to `/login`.

---

## Scenario 4: Change Password (US3)

1. Log in as `juan.perez@example.com`.
2. Click profile header -> **Profile / Security Settings**.
3. In "Change Password" section:
   - Current password: `Password123!`.
   - New password: `NewPassword456!`.
4. Click **Update Password**.
5. Log out and attempt logging in with old password (`Password123!`).
6. **Expected Outcome**:
   - Old password is rejected (`Invalid credentials`).
   - Login succeeds with new password (`NewPassword456!`).

---

## Scenario 5: Forgot Password & Recovery Link (US4)

1. On `/login` page, click **Forgot password?**.
2. Enter email `juan.perez@example.com` and submit.
3. Check dev log / email inbox for the reset link containing `?token=...`.
4. Open the reset link URL in browser (`/reset-password?token=<TOKEN>`).
5. Enter a new password: `FinalPassword789!`.
6. Submit form.
7. **Expected Outcome**:
   - Success message is displayed.
   - User can log in using `FinalPassword789!`.

---

## Scenario 6: Multi-Tenant Data Isolation (US5)

1. Register User A (`usera@example.com`) and create 2 accounting categories and 1 transaction.
2. Register User B (`userb@example.com`) and log in.
3. Navigate to transactions list and accounts chart.
4. **Expected Outcome**:
   - User B sees 0 accounts and 0 transactions from User A.
   - User B's workspace is completely private and segregated.

---

## Automated Test Verification

Run automated backend tests for auth module and multi-tenancy:

```bash
npm --prefix backend test -- --testPathPattern=auth
```

Run end-to-end integration tests:

```bash
npm --prefix backend test:e2e
```
