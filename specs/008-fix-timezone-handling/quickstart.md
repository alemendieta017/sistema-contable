# Quickstart: Timezone and Date Handling Validation

This document provides step-by-step instructions to validate the timezone and date handling fix in development.

## Setup & Prerequisites

1. Ensure the PostgreSQL database, backend, and frontend are running:
   ```bash
   docker-compose up
   ```
2. Open the application in your browser: `http://localhost:3000`

---

## Manual Verification Scenarios

### Scenario 1: Create Transaction in Negative Timezone (UTC-4)

1. **Set Browser Timezone**: 
   Configure your operating system or browser emulation to a negative offset (e.g. `America/Asuncion` or `America/New_York`, which corresponds to UTC-4 or UTC-3 depending on daylight savings).
   - In Chrome DevTools: Press `Esc` to open Drawer $\rightarrow$ Choose `Sensors` tab $\rightarrow$ Under `Location`, choose `Custom...` and set Timezone ID to `America/Asuncion` (or search for it). Refresh the page.
2. **Create Transaction**:
   - Open the Transaction creation form.
   - Select the date: `2026-06-01`.
   - Enter description: `"Timezone Test Entry"`.
   - Add balanced entries (e.g., Debe: `Expense` account, Haber: `Asset` account).
   - Submit the transaction.
3. **Database Verification**:
   - Query the database using `psql`:
     ```bash
     docker exec -i sistema-contable-db psql -U postgres -d sistema_contable -c "SELECT date, description FROM transactions WHERE description = 'Timezone Test Entry'"
     ```
   - **Expected Outcome**: The date column must be exactly `2026-06-01 04:00:00+00` (for UTC-4 browser) or `2026-06-01 03:00:00+00` (for UTC-3 browser).
4. **UI Verification**:
   - Go to **Libro Diario**.
   - Switch to **Diario** view: The transaction must display as June 1st.
   - Switch to **Calendario** view: The transaction must render inside the June 1st grid cell. It must NOT appear in May.
   - Switch to **Mensual** view: The transaction must be grouped and counted under June's statistics. It must NOT affect May's totals.

### Scenario 2: Verification of Monthly Reports Boundaries

1. Set the browser timezone to UTC-4 and view the **Categorías** / **Reportes** page.
2. Verify that a transaction entered on the last day of the month local time (e.g., June 30th at 23:50 local, which converts to July 1st at 03:50 UTC) remains in the June category statistics instead of shifting into July's statistics.

### Scenario 3: Verification of Transaction List Boundaries

1. Set browser timezone to UTC-3.
2. In the DB, observe that a transaction at UTC `2026-06-01 00:00:00+00` converts to May 31st 21:00:00 local time.
3. Open **Libro Diario** and select the month of June.
4. Verify that this transaction does NOT appear in the list, calendars, or daily headers of June, as the query range starts at June 1st local (which is `2026-06-01T03:00:00.000Z` UTC).

---

## Automated Tests

Run backend tests to verify transaction validation and creation integrity:
```bash
# In backend directory
npm run test
```

Run frontend tests:
```bash
# In frontend directory
npm run test
```
