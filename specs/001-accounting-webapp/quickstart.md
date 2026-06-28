# Quickstart & Verification Guide: Web Accounting App (Sistema Contable)

This guide outlines the steps to spin up the local development environment and run verification scripts to validate the double-entry accounting engine.

---

## 1. Prerequisites

- Docker and Docker Compose installed.
- Node.js (v24 LTS recommended for local tooling) and npm.

---

## 2. Dev Environment Setup

1. **Clone and Initialize**:
   Initialize the npm workspaces from the root of the project:
   ```bash
   npm install
   ```

2. **Spin Up via Docker Compose**:
   Run the following command from the root directory to build and start the PostgreSQL database, the NestJS backend, and the Next.js frontend with hot-reload enabled:
   ```bash
   docker-compose up --build
   ```

   - **Backend URL**: `http://localhost:3001`
   - **Frontend URL**: `http://localhost:3000`
   - **Postgres Port**: `localhost:5432` (Username: `postgres`, Password: `postgres_password`, Database: `sistema_contable`)

---

## 3. Automated Verification Scenarios

We verify the accounting engine using strict integration tests defined in the backend service.

### Scenario 1: Double-Entry Balancing Verification (Positive Path)
Verify that balanced transactions are successfully posted and update the account balances correctly.
- **Run command**:
  ```bash
  npm run test:integration --prefix backend -- --grep "Double-Entry Balance"
  ```
- **Expected Outcome**:
  - Test creates a transaction with $70,000 debit to "Comida", $30,000 debit to "Ropa", and $100,000 credit to "Tarjeta de Crédito".
  - Transaction succeeds with status `POSTED`.
  - Tarjeta de Crédito balance decreases by $100,000.
  - Comida and Ropa expense accounts increase by $70,000 and $30,000 respectively.

### Scenario 2: Double-Entry Unbalanced Rejection (Negative Path)
Verify that unbalanced transactions are rejected with validation errors.
- **Run command**:
  ```bash
  npm run test:integration --prefix backend -- --grep "Unbalanced Rejection"
  ```
- **Expected Outcome**:
  - Test attempts to create a transaction with $100,000 debit to "Comida" and $95,000 credit to "Efectivo" (discrepancy of $5,000).
  - Transaction fails with `400 Bad Request` containing the message: `"Transaction is unbalanced by 5000"`.
  - Database rolls back the transaction. No record is stored.

### Scenario 3: Budget Tracking
Verify that budget consumption updates dynamically in response to new transactions.
- **Run command**:
  ```bash
  npm run test:integration --prefix backend -- --grep "Budget Consumption"
  ```
- **Expected Outcome**:
  - Test creates a monthly budget for "Comida" of $700,000.
  - Test posts a transaction of $200,000 to "Comida".
  - Fetching the budget returns limit: $700,000, spent: $200,000, remaining: $500,000, percentage: 28.57%.

---

## 4. Manual UI Verification

1. Navigate to the local URL `http://localhost:3000` on a mobile browser or in mobile preview mode.
2. Sign up and log in.
3. Access the **Cuentas** tab, and add a cash account "Efectivo" with a starting balance (creates a credit to Equity and debit to Cash).
4. Access the **Transacciones** tab, click "+" and select "Gasto". Pick "Efectivo", Category "Comida", amount "50000". Click Save.
5. Verify the daily transaction list updates and shows the transaction, and the cash balance displays as adjusted.
6. Click "+" and choose "Asiento Libre" to verify you can add multiple line items, balance them, and save.
