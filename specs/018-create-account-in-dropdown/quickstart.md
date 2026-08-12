# Quickstart & End-to-End Validation Guide

This guide describes how to run automated tests and manually verify the quick account creation feature from transaction account dropdowns.

## Prerequisites

- Node.js v18+ and npm installed
- Working directory set to repo root

## Automated Test Execution

Run the frontend test suite to verify component behavior and account auto-selection:

```bash
cd frontend
npm test -- src/tests/JournalEntryRow.test.tsx src/tests/TransactionModal.test.tsx
```

Run ESLint to verify zero lint errors:

```bash
cd frontend
npx eslint src/components/JournalEntryRow.tsx src/components/AccountModal.tsx src/app/transactions/new/page.tsx
```

## Manual Verification Scenarios

### Scenario 1: Quick Create from Search Query

1. Start development servers or log into local application.
2. Navigate to **Asiento Libre** / **Nuevo Asiento Contable** (`/transactions/new`).
3. Fill in header fields:
   - **Fecha**: Today's date
   - **Descripción**: "Pago de servicio de internet no registrado"
4. In Line #1 account selector, type `"Servicios de Internet Tigo"`.
5. Observe the dropdown option: `"+ Crear cuenta 'Servicios de Internet Tigo'"`.
6. Click the creation shortcut option.
7. Verify `AccountModal` opens pre-filled with `"Servicios de Internet Tigo"`.
8. Select **Tipo de Rubro**: `EGRESO (Gastos, Comida, Servicios)`.
9. Click **Crear Cuenta**.
10. **Expected Outcomes**:
    - `AccountModal` closes smoothly.
    - Line #1 account selector automatically selects `"Servicios de Internet Tigo"`.
    - All header fields (`Fecha`, `Descripción`) and Line #1 inputs remain intact.
    - Line #2 account dropdown now includes `"Servicios de Internet Tigo"` in its selection list.

### Scenario 2: Cancel Safety & Draft Preservation

1. In `/transactions/new`, enter line amounts (Debe: 150000 PYG, Haber: 150000 PYG).
2. Open account dropdown in Line #2 and click `"+ Crear Cuenta"`.
3. In `AccountModal`, click **Cancelar** or press **Escape**.
4. **Expected Outcomes**:
   - `AccountModal` closes without creating an account.
   - All entered amounts, dates, and descriptions on the transaction form remain 100% intact.
