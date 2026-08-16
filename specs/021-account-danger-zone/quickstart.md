# Quickstart Validation Guide: Danger Zone

## Prerequisites

1. Ensure the PostgreSQL database is running.
2. Build shared contracts:
   ```bash
   npm run shared:build
   ```
3. Start backend and frontend development servers:
   ```bash
   npm run backend:dev
   npm run frontend:dev
   ```

---

## Scenario 1: Settings Page Danger Zone UI Check

1. Log in to the application and navigate to `/settings`.
2. Scroll to the bottom of the page.
3. **Verify**:
   - The "Zona de Peligro" section is rendered with prominent red borders, caution badges, and descriptive alert text.
   - Two distinct action cards exist: "Restablecer datos de fábrica" and "Eliminar cuenta permanentemente".
   - Both action cards have distinct red confirmation trigger buttons.

---

## Scenario 2: Factory Reset Verification (Wipe Data + Base Reseed)

1. Create test transactions, custom accounts, and budget items.
2. Navigate to `/settings` and click "Restablecer datos de fábrica".
3. Verify that the confirmation modal opens:
   - Type an incorrect phrase (e.g., `test`) -> Verify confirm button remains disabled.
   - Type exact phrase `RESTABLECER DATOS` but enter wrong password -> Submit -> Verify error message "Contraseña actual incorrecta".
   - Enter valid password and submit.
4. **Verify Outcome**:
   - Modal closes and success notification is displayed.
   - User remains logged in.
   - Navigating to `/transactions` shows 0 transactions.
   - Navigating to `/accounts` shows default starter accounts (`Caja y Efectivo`, `Cuenta Bancaria`, `Resultado del Ejercicio`, `Utilidades Retenidas`, etc.) ready for use.

---

## Scenario 3: Account Deletion Verification (Permanent Removal & Logout)

1. Navigate to `/settings` and click "Eliminar cuenta permanentemente".
2. Verify that the confirmation modal opens:
   - Type an incorrect phrase -> Verify confirm button remains disabled.
   - Type exact phrase `ELIMINAR MI CUENTA` and enter valid password -> Click confirm.
3. **Verify Outcome**:
   - System terminates session, clears `auth_token` and `auth_user` from `localStorage`.
   - Browser redirects to `/login` with an informational confirmation message.
   - Attempting to log in with deleted email/password fails with "Invalid email or password".
   - Database verification: 0 records remain in `users`, `accounts`, `transactions`, `budgets`, or `periods` for that user ID.

---

## Automated Test Suites

Run automated unit and integration tests covering Danger Zone use cases:

```bash
npm run test --workspace=backend
npm run test:integration --workspace=backend
```

Run ESLint verification to ensure 0 errors and 0 warnings:

```bash
npm run lint
```
