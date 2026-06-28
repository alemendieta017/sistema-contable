# Quickstart & Verification Guide: Accounting Dashboard

This guide describes how to run and verify the core dashboard features end-to-end.

## Prerequisites

1. Ensure the PostgreSQL database, backend NestJS app, and frontend Next.js app are running.
2. From the root directory, launch the development environment:
   ```bash
   docker-compose up --build
   ```
   Or run the backend and frontend locally:
   - Backend: `cd backend && npm run start:dev` (runs on port 3001)
   - Frontend: `cd frontend && npm run dev` (runs on port 3000)

---

## Verification Scenarios

### Scenario 1: Double-Entry Balancing Validation (Floating Form)

**Goal**: Verify that the dynamic transaction creation modal rejects unbalanced entries and correctly saves balanced multi-item entries.

1. Navigate to `http://localhost:3000/transactions`.
2. Click the persistent **floating action button (+)** in the bottom right.
3. In the modal, fill the transaction header:
   - **Fecha**: Today's date
   - **Descripción**: "Compra Completa Supermercado"
4. Add three entries:
   - **Entry 1**: Account: "Alimentos" (EXPENSE), Type: `DEBIT`, Amount: `70.00`
   - **Entry 2**: Account: "Artículos de Limpieza" (EXPENSE), Type: `DEBIT`, Amount: `40.00`
   - **Entry 3**: Account: "Efectivo" (ASSET), Type: `CREDIT`, Amount: `100.00`
5. **Validation 1**: Try clicking "Guardar". The system should block or show a warning: "El asiento está descuadrado por 10.00".
6. **Validation 2**: Change Entry 3's amount to `110.00` (so total DEBITS equal total CREDITS). Click "Guardar".
7. **Expected Outcome**: The modal closes, a success toast is shown, and the new transaction appears in the transaction history.

---

### Scenario 2: Responsive Navigation Layout & Global Search

**Goal**: Verify sidebar rendering on desktop, bottom-bar drawer on mobile, and immediate substring transaction search.

1. **Desktop view**: Access the app on a display width > 1024px.
   - **Expected Outcome**: The left-hand sidebar is permanently visible showing "Transacciones", "Estadísticas", "Cuentas", and "Configuración".
2. **Mobile view**: Toggle Chrome DevTools device mode to responsive iPhone viewport (< 768px).
   - **Expected Outcome**: The sidebar is hidden. In its place, a bottom bar displays shortcuts to "Transacciones", "Estadísticas", and a "Más" drawer button for accounts/settings.
3. **Global Search**: Type "Supermercado" in the top header search bar.
   - **Expected Outcome**: The transaction list immediately filters down, displaying only the "Compra Completa Supermercado" transaction. Clear the search to restore the full list.

---

### Scenario 3: Transacciones Multi-View (Daily, Calendar, Monthly)

**Goal**: Verify switching transaction representation forms.

1. Navigate to `/transactions`.
2. Click **Diario**: Confirm transactions are grouped by day with correct sub-headers showing sum of debits/credits.
3. Click **Calendario**: Confirm a calendar grid is shown for the current month. Each calendar square should display income, expense, and net values matching daily transactions.
4. Click **Mensual**: Select the current year and verify a list of months is shown with summed income, expense, and net columns.

---

### Scenario 4: Account Aggregates & Grouping (Cuentas)

**Goal**: Verify account sub-group and net totals display.

1. Navigate to `/accounts` (or Click **Cuentas** -> **Gestor de Cuentas**).
2. **Expected Outcome**:
   - Three cards display at the top: **Total Activos**, **Total Pasivos**, and **Patrimonio Neto**.
   - Asset accounts (e.g. Cash, Banks) are listed in a table grouped under "Activos" with individual balances on the right, and the foot of the table shows the subtotal of all assets.
   - Liabilities (e.g. Credit Cards) are grouped under "Pasivos" with subtotals.
