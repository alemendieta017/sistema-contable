# Quickstart: Dedicated Transaction Entry Page & Operations

This document details the validation flows to verify the implementation of the Dedicated Transaction Entry page and transaction management operations (Create, Edit, Clone, Delete).

## Prerequisites

1. Ensure the docker containers are running:
   ```bash
   docker compose up -d
   ```
2. Re-compile the shared types if any schemas changed:
   ```bash
   docker exec -w /app/shared sistema-contable-backend npm run build
   ```

---

## 1. Automated Verification

Verify that all automated backend and frontend tests pass:

```bash
# Run backend tests
docker exec -w /app/backend sistema-contable-backend npm run test

# Run frontend tests
docker exec -w /app/frontend sistema-contable-frontend npm run test
```

---

## 2. Manual Verification Scenarios

### Scenario A: Navigating to the Dedicated Page
1. Open the application in your browser (usually `http://localhost:3000`).
2. Log in with your credentials.
3. Click on the sidebar **Nueva Transacción** button or click **Nueva Transacción** in the page header.
4. **Expected Outcome**: The browser redirects to `http://localhost:3000/transactions/new`. On desktop, the sidebar is visible, but the transaction form occupies the spacious main content area. On mobile viewports (< 640px), the sidebar, header, and bottom navigation bar are hidden, rendering the form in fullscreen distraction-free mode.

### Scenario B: Recording a Transaction (Create Mode)
1. Navigate to `/transactions/new`.
2. Enter a date and time (using the new date-time local input).
3. Enter a description: `"Compra de suministros oficina"`.
4. In row 1: Select account `"Gasto Suministros"`, type `"DEBE"`, and enter amount `100.50`.
5. Click **Agregar Apunte**.
6. **Expected Outcome**: Row 2 is created with `"HABER"` selected automatically and amount pre-filled to `100.50` (to balance the transaction).
7. Select account `"Caja Chica"` for Row 2.
8. Click **Guardar Asiento**.
9. **Expected Outcome**: The transaction is saved. You are redirected to `/transactions` showing the new entry in the list.

### Scenario C: Editing an Existing Transaction (Edit Mode)
1. Go to the transaction list `/transactions`.
2. Locate `"Compra de suministros oficina"` and click the **Editar** button.
3. **Expected Outcome**: You are redirected to `/transactions/new?edit=<id>`. The form is populated with the transaction's description, date/time, and entries.
4. Change the description to `"Compra de suministros oficina (Actualizado)"`.
5. Modify Row 1's amount to `120.00`.
6. **Expected Outcome**: The difference indicator turns orange/amber, and the save button is disabled until Row 2 is also updated to `120.00`.
7. Update Row 2's amount to `120.00`.
8. Click **Guardar Asiento**.
9. **Expected Outcome**: The transaction is updated. You are redirected to `/transactions` showing the updated description and balanced amount.

### Scenario D: Cloning a Transaction (Clone Mode)
1. In `/transactions`, find the updated transaction and click **Copiar** (Clone).
2. **Expected Outcome**: You are redirected to `/transactions/new?cloneFrom=<id>`. The description and entries are populated, but the date defaults to Today's current date/time instead of the original transaction date.
3. Keep the values as is and click **Guardar Asiento**.
4. **Expected Outcome**: A brand new transaction is created. The original transaction remains unaffected.

### Scenario E: Deletion Confirmation
1. In `/transactions`, find the cloned transaction.
2. Click the **Eliminar** (Delete) button.
3. **Expected Outcome**: An explicit confirmation dialog modal appears asking if you want to permanently delete the transaction.
4. Click **Confirmar**.
5. **Expected Outcome**: The transaction is permanently deleted, list totals update, and it disappears from the list views.
