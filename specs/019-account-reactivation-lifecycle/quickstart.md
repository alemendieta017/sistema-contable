# Quickstart & Validation Guide: Account Reactivation & Lifecycle Management

This guide details automated and manual validation scenarios for verifying the account lifecycle, reactivation, deletion protection, and transaction selector filtering.

---

## 1. Automated Test Suites

### Backend Unit & Integration Tests

Run the following test commands to validate the backend use cases and controller behavior:

```bash
# Run accounts use cases unit tests
npm --prefix backend test src/application/accounts/update-account.use-case.spec.ts
npm --prefix backend test src/application/accounts/delete-account.use-case.spec.ts

# Run fast integration test suite
npm --prefix backend test tests/integration/fast-reports.spec.ts
```

### Frontend Component Tests

Run the following test commands to validate UI components:

```bash
# Run frontend account management and transaction modal tests
npm --prefix frontend test src/tests/AccountsManagePage.test.tsx
npm --prefix frontend test src/tests/TransactionModal.test.tsx
npm --prefix frontend test src/tests/JournalEntryRow.test.tsx
```

---

## 2. End-to-End Validation Scenarios

### Scenario 1: Deactivate and Reactivate an Account (User Story 1 & FR-001, FR-002)

1. Log in to the application and navigate to **Chart of Accounts** (`/accounts`) or **Administración de Rubros** (`/accounts/manage`).
2. Identify an active account (e.g., "Combustible").
3. Click the **Desactivar** button. Confirm that:
   - Account status badge updates to **Inactivo** / **Inactiva**.
   - Row visually dims to reflect inactive state.
4. Click the **Reactivar** button on the inactive account row. Confirm that:
   - Status transitions back to **Activo** / **Activa** in <2 clicks (SC-001).
   - Visual dimmed styling is removed.

### Scenario 2: Transaction Form Selector Exclusion (User Story 3 & FR-005, SC-003)

1. Deactivate an account (e.g., "Consultoría Externa").
2. Navigate to **New Transaction** (`/transactions/new`) or open the **Transaction Modal**.
3. Open the account dropdown in any debit/credit line item.
4. Search for "Consultoría Externa". Confirm that:
   - The inactive account does NOT appear in the dropdown list.
5. Reactivate "Consultoría Externa" in `/accounts/manage`.
6. Return to the transaction form and open the dropdown. Confirm that:
   - "Consultoría Externa" is now immediately available and selectable.

### Scenario 3: Prevent Physical Deletion of Accounts with History (User Story 2 & FR-003, FR-004, SC-002)

1. Identify an account that has at least 1 historical transaction line (e.g., "Efectivo" or "Comida").
2. Attempt to invoke physical deletion via API or UI.
3. Confirm that:
   - The system returns HTTP 400 Bad Request with a clear message: `"Cannot delete account with existing transactions. Deactivate the account instead."`.
   - The account and all of its historical journal entries remain 100% intact.
4. Create a brand-new account with zero transactions (e.g., "Test Unused").
5. Delete "Test Unused". Confirm that:
   - Physical deletion succeeds cleanly (`action: DELETED`).

### Scenario 4: Historical Reporting Invariant (FR-006, FR-008, SC-004)

1. Create a transaction in period 2026-01 using account "Gasto Temporal".
2. After the period closes, deactivate "Gasto Temporal" (balance becomes 0 in subsequent periods).
3. View the **Libro Mayor** (General Ledger) or **Estado de Resultados** for 2026-01:
   - "Gasto Temporal" and its movements appear with 100% accuracy.
4. View the **Balance General** for the current period:
   - "Gasto Temporal" is cleanly omitted from current reporting since its balance is 0 and status is `INACTIVE`.
