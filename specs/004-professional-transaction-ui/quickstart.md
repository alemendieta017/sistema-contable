# Verification Guide (Quickstart): Professional Transaction UI

This guide lists the validation scenarios to confirm that the professional transaction UI improvements meet the specified requirements.

## Prerequisites
- A running NestJS backend (configured on port 3001 or equivalent).
- Next.js development server running.

## Verification Scenarios

### Scenario 1: Compact View and Rounded Corners Check
1. Open the browser to `/transactions`.
2. Inspect the table grid:
   - Verify that cells have dense padding (`py-1.5` or `py-2` instead of `py-4`).
   - Check that border-radius is minimal (`rounded-sm` or `rounded-none`).
3. Verify that the subheader no longer contains "libro diario contable por partida doble".

### Scenario 2: Month Navigation and Custom Toggle
1. Go to the filters section at `/transactions`.
2. Verify you see a month selector (e.g. `< Junio 2026 >`). Click the arrows and verify that the transaction list is filtered to that month.
3. Locate the custom date toggle (e.g. "Rango personalizado").
4. Click the toggle to reveal the start and end date pickers. Select a custom date range and verify the records filter correctly.
5. Untoggle "Rango personalizado" and verify the date pickers are hidden and the view falls back to month-based filtering.

### Scenario 3: Asiento Contable Form and Account Autocomplete
1. Click "Registrar Asiento Contable" to open the creation modal.
2. Verify the modal title does not mention "Partida Doble".
3. Click on the "Cuenta / Categoría" input field:
   - Type an account name (e.g., "Caja").
   - Verify that search results filter dynamically.
   - Use Arrow Keys + Enter to select the account.

### Scenario 4: Auto-Balancing Amount Input
1. In the new transaction form, add an entry with account A, set Type to "DEBIT" and amount to `1000`.
2. Click "Agregar Apunte".
3. Check the default amount of the new credit row:
   - Verify the form auto-fills or suggests `1000` under "HABER" or shows a "Balancear" helper that fills the difference.
4. Set the second entry's amount to `1000`. Verify the "Diferencia" becomes `0.00` and the "Guardar Asiento" button is enabled.
