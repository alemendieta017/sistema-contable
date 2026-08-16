# Quickstart & Verification Guide: Dual-Mode Transaction Creation

**Feature**: Dual-Mode Transaction Creation & Accounting UX Optimization  
**Branch**: `022-dual-mode-transactions`  
**Date**: 2026-08-16

---

## 1. Prerequisites & Environment Setup

Ensure the PostgreSQL database and backend service are running locally:

```bash
# Terminal 1 - Backend API (port 3001)
cd backend
npm run start:dev

# Terminal 2 - Frontend Application (port 3000)
cd frontend
npm run dev
```

Navigate to `http://localhost:3000/transactions/new` or click **"+ Nuevo Asiento"** from the Sidebar or Transactions list.

---

## 2. Automated Test Suite Execution

Run frontend and backend automated tests verifying double-entry validations, auto-balancing calculations, keyboard shortcuts, and responsive UI components:

```bash
# 1. Run Frontend Jest Suite
npm --prefix frontend test -- --watchAll=false

# 2. Run Backend Ledger Use Case Tests
npm --prefix backend test -- src/application/ledger

# 3. Verify Monorepo ESLint Compliance (Zero warnings, Zero errors)
npm --prefix frontend run lint
npm --prefix backend run lint
```

---

## 3. End-to-End Manual Verification Scenarios

### Scenario 1: Quick Transaction - Routine Expense Recording (Priority: P1)

1. Open `/transactions/new` (defaults to **Transacción Rápida** with **Gasto** selected).
2. Follow the 5-step linear field sequence:
   - **1. Fecha/Hora**: Leave default (today's date).
   - **2. Cuenta**: Select a monetary account (e.g., "Banco Familiar" / "Caja Chica").
   - **3. Categoría**: Select an expense category (e.g., "Alimentación y Supermercado").
   - **4. Monto**: Type `150.00`.
   - **5. Concepto**: Type `Compra semanal de insumos`.
3. Press `Guardar` or `Ctrl + Enter`.
4. **Expected Outcome**:
   - Transaction submits in under 1 second.
   - Redirects to `/transactions`.
   - Transaction list shows debit to `Alimentación y Supermercado` ($150.00) and credit to `Banco Familiar` ($150.00). Ledger is 100% balanced.

---

### Scenario 2: Quick Transaction - Internal Transfer (Priority: P1)

1. On `/transactions/new`, click the **Transferencia** pill.
2. Follow the sequence:
   - **1. Fecha/Hora**: Today.
   - **2. Cuenta Origen**: Select "Banco Familiar".
   - **3. Cuenta Destino**: Select "Caja Chica".
   - **4. Monto**: Type `200.00`.
   - **5. Concepto**: Type `Reposición fondo fijo caja chica`.
3. Press `Guardar`.
4. **Expected Outcome**:
   - Ledger records balanced journal entry: Debit `Caja Chica` ($200.00) and Credit `Banco Familiar` ($200.00).

---

### Scenario 3: Free Journal Entry - Tabular Grid with Auto-Balancing (Priority: P1)

1. On `/transactions/new`, toggle mode selector to **Asiento Libre**.
2. Set `Descripción`: `Liquidación de Sueldos y Cargas Sociales`.
3. **Row 1**:
   - Select Account: `Sueldos y Jornales` (Expense).
   - Type in **Debe**: `1000.00`. Notice **Haber** remains empty.
4. **Row 2**:
   - Notice **Haber** automatically pre-fills with `1000.00`.
   - Select Account: `Retenciones IPS a Pagar` (Liability).
   - Change **Haber** to `95.00`.
   - Notice Difference indicator displays `905.00` in amber, submit button disabled.
5. Click **"+ Agregar Apunte"** to create **Row 3**:
   - Notice **Row 3** automatically pre-fills with remaining difference (`905.00`) in **Haber**.
   - Select Account: `Banco Familiar` (Asset).
   - Notice Difference drops to `0.00`, green check badge appears, submit button enabled.
6. Press `Ctrl + Enter`.
7. **Expected Outcome**:
   - Multi-leg balanced transaction committed to database with 3 journal entries.

---

### Scenario 4: Desktop Pure Keyboard Navigation (Priority: P2)

1. Open `/transactions/new` on desktop.
2. Keep hands off the mouse:
   - Focus `Fecha` input, press `Tab` to move to `Cuenta`.
   - Type `banc`, press `Down Arrow` and `Enter` to select "Banco Familiar". Focus moves to `Categoría`.
   - Type `serv`, press `Down Arrow` and `Enter` to select "Servicios Públicos". Focus moves to `Monto`.
   - Type `75.50`, press `Tab` to move to `Concepto`.
   - Type `Pago factura de luz ANDE`.
   - Press `Ctrl + Enter` (or `Cmd + Enter` on macOS).
3. **Expected Outcome**:
   - Whole transaction completed in ~5 seconds with zero mouse clicks.

---

### Scenario 5: Mobile Responsive & Bottom Sheet Picker (Priority: P2)

1. Open browser DevTools, switch to Mobile Device Viewport (e.g., iPhone 14 Pro, 393x852).
2. Navigate to `/transactions/new`.
3. Tap on `Cuenta`:
   - Bottom sheet slides up smoothly with fixed top search bar and horizontal category tabs.
   - Tap an account: sheet closes immediately, updating field without scrolling distortions.
4. Tap `Monto`:
   - Virtual decimal keypad is invoked.
5. Switch to **Asiento Libre**:
   - Grid renders as clean stacked cards per line item with touch-accessible numeric inputs and row remove icons.
   - Sticky bottom action bar displays total debits, total credits, and a single "Guardar Asiento" button.
6. **Expected Outcome**:
   - 0 horizontal scrolling, 0 clipped dropdowns, and fluid touch interactions.
