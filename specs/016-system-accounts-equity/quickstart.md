# Quickstart & Validation Guide: Equity System Accounts

## Prerequisites

- Node.js v18+ & npm
- PostgreSQL database running locally or via Docker (`npm run test:e2e` / local environment)

## Setup Commands

```bash
# Navigate to backend directory
cd backend

# Run database migrations
npm run migration:run

# Seed database scenarios (includes system accounts)
npm run seed
```

## Running Automated Verification Tests

```bash
# Run unit & integration test suite in backend
cd backend
npm run test

# Run specific annual closing and balance sheet integration tests
npm run test -- tests/integration/annual-closing.spec.ts
npm run test -- tests/integration/fast-reports.spec.ts
```

## Manual Verification Scenario

1. **Balance Sheet Injection & Hiding Zero Balances**:
   - Query `GET /api/periods/balance-sheet?mode=date&date=YYYY-MM-DD`.
   - Verify `equity` array contains real account UUIDs for `Resultado del Ejercicio` and `Resultados Acumulados`.
   - Verify no synthetic IDs (`virtual-net-income`) exist in output.
   - Verify that any Equity system account with balance `0.00` is omitted from the `equity` list.

2. **Fiscal Year Closing Workflow**:
   - Post to `POST /api/periods/fiscal-years/:id/close` with `{}` body.
   - Verify HTTP 200 response.
   - Verify closing journal entry posts discrepancy to the company's real `RETAINED_EARNINGS` account.

3. **Manual Entry Restrictions on System Accounts**:
   - Open New Journal Entry UI form (or send `POST /api/entries`).
   - Verify `Resultado del Ejercicio` (`NET_INCOME`) is excluded from account dropdown options, while `Resultados Acumulados / Utilidades Retenidas` (`RETAINED_EARNINGS`) is visible and selectable.
   - Send `POST /api/entries` payload with a line item targeting `NET_INCOME` account ID and verify server returns HTTP 400 Bad Request error.
