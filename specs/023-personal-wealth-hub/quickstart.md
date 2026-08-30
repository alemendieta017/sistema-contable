# Quickstart Validation Guide: Personal Wealth Hub & Continuous Financial Forecasting

**Feature Branch**: `023-personal-wealth-hub`  
**Date**: 2026-08-27  
**Spec Reference**: `specs/023-personal-wealth-hub/spec.md`  
**Data Model**: [data-model.md](data-model.md)  
**Contracts**: [contracts/wealth-hub.contract.md](contracts/wealth-hub.contract.md)

---

## 1. Overview & Objectives

This guide documents the end-to-end scenarios required to validate that the **Personal Wealth Hub & Continuous Financial Forecasting** feature is working as intended across the entire monorepo stack:

1. **Auto-provisioning & Zero Period Blocks**: Verify posting transactions to past and future uncreated dates automatically provisions monthly buckets and snapshot balances.
2. **Balance Cascade**: Verify retroactive transactions propagate closing and opening balance adjustments to all subsequent months.
3. **Four-Quadrant Budget Matrix & Rolling Forecast**: Verify entering figures across the 4 quadrants calculates Operating Surplus, Net Cash Flow, and roll-forward liquidity across a 12-month rolling window.
4. **Instant Balance General & Net Worth Evolution**: Verify queries execute under 50ms and return accurate historical net worth points.
5. **Tactical Commitments & One-Click Settlement**: Verify recurring rules generate virtual projections on the calendar and settle into the ledger with a single action.

---

## 2. Prerequisites & Setup

### 2.1 Dependencies & Environment

Ensure the local database is running and monorepo packages are compiled:

```bash
# 1. Verify Node and database connectivity
npm run build --workspace=@sistema-contable/shared

# 2. Run database migrations / synchronization if needed
npm run type-check
```

### 2.2 Seed Data

Use an authenticated test user (e.g. `test@wealthhub.com`) with the standard starter chart of accounts:

- **Cash/Bank Account**: "Banco Principal" (`type: ASSET`, `isCashOrBank: true`)
- **Income Category**: "Salario" (`type: INCOME`)
- **Living Expense Category**: "Alquiler" (`type: EXPENSE`), "Supermercado" (`type: EXPENSE`)
- **Investment Account**: "Fondo de Inversión" (`type: ASSET`, `isCashOrBank: false`)
- **Debt Account**: "Préstamo Personal" (`type: LIABILITY`)

---

## 3. End-to-End Validation Scenarios

### Scenario 1: Unconstrained Future & Past Transaction Posting (User Story 1, SC-002)

**Goal**: Verify that posting a transaction to an uncreated date (e.g., 6 months in the future) succeeds with zero `"No accounting period found"` errors, auto-provisioning the target period and intervening periods.

1. **Execute Request**: Post a transaction for date `2027-03-15`:
   - Debit: "Banco Principal" $3,000.00
   - Credit: "Salario" $3,000.00
2. **Verification Command / Check**:
   ```bash
   curl -X POST http://localhost:3001/api/transactions \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "accountingDate": "2027-03-15",
       "description": "Bono Futuro",
       "entries": [
         { "accountId": "'$BANCO_ID'", "entryType": "DEBIT", "amount": 3000 },
         { "accountId": "'$SALARIO_ID'", "entryType": "CREDIT", "amount": 3000 }
       ]
     }'
   ```
3. **Expected Outcome**:
   - HTTP 201 Created.
   - `PeriodEntity` `2027-03` is created with `status: 'OPEN'`, `startDate: '2027-03-01'`, `endDate: '2027-03-31'`.
   - `AccountPeriodBalanceEntity` rows exist for all intervening months, carrying forward previous closing balances.

---

### Scenario 2: Retroactive Modification & Chronological Cascade (User Story 1)

**Goal**: Verify modifying a past transaction correctly updates the snapshot and cascades forward to subsequent periods.

1. **Initial State**:
   - `2026-01` Banco closing balance: $5,000.00
   - `2026-02` Banco opening balance: $5,000.00, closing balance: $5,500.00
   - `2026-03` Banco opening balance: $5,500.00, closing balance: $6,000.00
2. **Action**: Post an expense of $200.00 on date `2026-01-10` from "Banco Principal" to "Supermercado".
3. **Expected Outcome**:
   - `2026-01` Banco closing balance becomes $4,800.00 (-$200.00).
   - `2026-02` Banco opening balance becomes $4,800.00; closing balance becomes $5,300.00 (-$200.00).
   - `2026-03` Banco opening balance becomes $5,300.00; closing balance becomes $5,800.00 (-$200.00).

---

### Scenario 3: Four-Quadrant Budgeting & Rolling Cash Forecast (User Story 2, SC-003, SC-004)

**Goal**: Verify that entering budget items across all 4 quadrants produces an exact rolling cash flow forecast.

1. **Input Matrix Values** for Month $M$ (`2026-09`):
   - `INGRESOS`: Salario = $3,500.00
   - `EGRESOS`: Alquiler = $800.00, Supermercado = $400.00 (Total = $1,200.00)
   - `AHORRO_INVERSIONES`: Fondo de Inversión = $500.00
   - `DEUDAS_FINANCIACION`: Préstamo Personal = $300.00
2. **Execute Rolling Matrix Query**:
   ```bash
   curl -X GET "http://localhost:3001/api/budgets/matrix?startPeriod=2026-09&months=12" \
     -H "Authorization: Bearer $TOKEN"
   ```
3. **Expected Calculations**:
   - Superávit Operativo = $3,500.00 - $1,200.00 = +$2,300.00.
   - Flujo Neto de Fondos ($\Delta \text{Efectivo}$) = $2,300.00 - $500.00 - $300.00 = +$1,500.00.
   - Projected Closing Cash = Opening Cash + $1,500.00.
   - Mathematical check: $\text{Closing Cash}(t) = \text{Opening Cash}(t) + \Delta \text{Efectivo}(t)$ holds for all 12 periods.

---

### Scenario 4: Negative Liquidity Alert Flag (User Story 2)

**Goal**: Verify system detects and warns of upcoming cash deficits without failing computations.

1. **Action**: In month $M+2$, set a debt balloon payment of $10,000.00 when projected opening cash is $2,000.00 and inflows are $3,000.00.
2. **Expected Outcome**:
   - Projected Closing Cash is -$5,000.00.
   - `shortfallAlerts[M+2]` returns `{ "isNegative": true, "shortfall": 5000.00 }`.
   - UI prominently highlights month $M+2$ in warning/shortfall styling.

---

### Scenario 5: High-Speed Net Worth Evolution Query (User Story 4, SC-001)

**Goal**: Validate response latency $<50$ms and accuracy of historical net worth points.

1. **Execute Query**:
   ```bash
   curl -X GET "http://localhost:3001/api/reports/net-worth-evolution" \
     -H "Authorization: Bearer $TOKEN"
   ```
2. **Expected Outcome**:
   - Response time $<50$ms.
   - Array of points matching $\text{Assets} - \text{Liabilities}$ for each monthly period.
   - No table scan of individual transactions.

---

### Scenario 6: Tactical Commitment Calendar Preview & One-Click Settlement (User Story 5)

**Goal**: Verify virtual projection on the calendar and subsequent single-action settlement into the double-entry ledger.

1. **Create Schedule**:
   - Name: "Alquiler Depto"
   - Amount: $750.00, Due Day: 5, Frequency: MONTHLY
   - Source Account: "Banco Principal", Category: "Alquiler"
2. **Preview Calendar**:
   - Call `GET /api/recurring-schedules/calendar-preview?days=60`.
   - Verify event appears on the 5th of next month as `isSettled: false`.
   - Verify `transactions` table contains NO speculative entry for this event.
3. **Settle Commitment**:
   - Call `POST /api/recurring-schedules/{id}/settle` with `{ "occurrenceDate": "2026-09-05" }`.
4. **Expected Outcome**:
   - Balanced double-entry posted in ledger (Debit Alquiler $750, Credit Banco $750).
   - "Banco Principal" snapshot in `2026-09` decreases by $750 and cascades forward.
   - Preview calendar reflects event as `isSettled: true`.

---

## 4. Automated Verification Commands

Run the full monorepo quality gates to ensure complete stability:

```bash
# Static types and linting
npm run type-check
npm run lint

# Automated unit and integration tests
npm test

# Single comprehensive validation command
npm run validate
```
