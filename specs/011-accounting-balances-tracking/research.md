# Research: Accounting Balances and Period Tracking Engine

This document details the architectural decisions, database entity designs, business rules, and calculation logic for the accounting balances, periods, and year-end closing processes.

---

## 1. Domain Models & Database Schemas

We will introduce three new TypeORM entities and their corresponding domain models:

### A. FiscalYear
Represents the accounting year (e.g. `2026`).
- **Entity name**: `fiscal_years`
- **Fields**:
  - `id`: UUID (Primary Key)
  - `userId`: UUID (Foreign Key to `users`)
  - `name`: VARCHAR (e.g. "2026", unique for `(userId, name)`)
  - `startDate`: Timestamp with timezone
  - `endDate`: Timestamp with timezone
  - `status`: VARCHAR ('OPEN' | 'CLOSED', default 'OPEN')
- **Indices**:
  - Unique index on `(userId, name)`

### B. Period
A monthly slice inside a `FiscalYear`.
- **Entity name**: `periods`
- **Fields**:
  - `id`: UUID (Primary Key)
  - `fiscalYearId`: UUID (Foreign Key to `fiscal_years`, onDelete CASCADE)
  - `name`: VARCHAR (e.g. "2026-03", unique for `(fiscalYearId, name)`)
  - `startDate`: Timestamp with timezone
  - `endDate`: Timestamp with timezone
  - `status`: VARCHAR ('OPEN' | 'CLOSED', default 'OPEN')
- **Indices**:
  - Unique index on `(fiscalYearId, name)`

### C. AccountPeriodBalance
Maintains the query performance aggregates.
- **Entity name**: `account_period_balances`
- **Fields**:
  - `id`: UUID (Primary Key)
  - `accountId`: UUID (Foreign Key to `accounts`, onDelete CASCADE)
  - `periodId`: UUID (Foreign Key to `periods`, onDelete CASCADE)
  - `openingBalance`: DECIMAL(18, 4) (base currency, default 0.0000)
  - `totalDebits`: DECIMAL(18, 4) (base currency, default 0.0000)
  - `totalCredits`: DECIMAL(18, 4) (base currency, default 0.0000)
  - `closingBalance`: DECIMAL(18, 4) (base currency, default 0.0000)
  - `lastUpdated`: Timestamp with timezone (default now())
- **Indices**:
  - Unique index on `(accountId, periodId)`

---

## 2. Dynamic Account Nature & Balance Calculation

We derive the normal balance nature dynamically based on the `AccountType`:
- **Debit Nature (ASSET, EXPENSE)**:
  - Balances increase with Debits and decrease with Credits.
  - **Closing Balance Formula**:
    $$ClosingBalance = OpeningBalance + TotalDebits - TotalCredits$$
- **Credit Nature (LIABILITY, EQUITY, INCOME)**:
  - Balances increase with Credits and decrease with Debits.
  - **Closing Balance Formula**:
    $$ClosingBalance = OpeningBalance + TotalCredits - TotalDebits$$

---

## 3. Atomic Updates & Roll-Forward Propagation

When a transaction is created, updated, reversed, or deleted, the system must update period balances.

### Step 1: Identify Period
Retrieve the period for the transaction's date (`tx.date` between `period.startDate` and `period.endDate`). If the period is closed, block the operation.

### Step 2: Update local period balance
For each affected account in the transaction:
1. Find or create the `AccountPeriodBalance` record for `(accountId, periodId)`.
2. Compute the net change in debits and credits from the transaction entries:
   - For `Create`: Add to `totalDebits` / `totalCredits`.
   - For `Delete`: Subtract from `totalDebits` / `totalCredits`.
   - For `Update`: Subtract old amounts and add new amounts.
3. Compute the new `closingBalance` using the account nature formula.

### Step 3: Propagate (Roll-Forward) to subsequent periods
Find all future periods for the user sorted chronologically (`startDate > currentPeriod.endDate` ascending).
For each future period $P_k$:
1. Find or create the `AccountPeriodBalance` record for `(accountId, P_k.id)`.
2. Determine `openingBalance` for $P_k$:
   - If $P_k$ is the first period of a new Fiscal Year **AND** the account is a temporary account (`INCOME`, `EXPENSE`), then `openingBalance` is `0.0`.
   - Otherwise, `openingBalance` is the `closingBalance` of the previous period $P_{k-1}$.
3. Recalculate `closingBalance` for $P_k$:
   - For Debit Nature (Asset, Expense):
     $$closingBalance = openingBalance + totalDebits - totalCredits$$
   - For Credit Nature (Liability, Equity, Income):
     $$closingBalance = openingBalance + totalCredits - totalDebits$$
4. Save the record.

---

## 4. Monthly Closure & Reopening Logic

- **Closing Period**: Simply set `status` to `'CLOSED'`.
- **Reopening Period**: Set `status` to `'OPEN'`. This does not modify transaction history, but allows future edits.
- **Verification Gate**: Any attempt to write, modify, or delete a transaction check:
  ```typescript
  const period = await getPeriodForDate(userId, tx.date);
  if (!period || period.status === 'CLOSED') {
    throw new BadRequestException('Transaction date falls in a closed or undefined period');
  }
  ```

---

## 5. Annual Closing Procedure (Fiscal Year Close)

This occurs when a user closes a Fiscal Year:
1. **Validation**: Check that the target Fiscal Year is `'OPEN'`.
2. **Close Nested Periods**: Automatically update the status of all 12 nested monthly periods in this fiscal year to `'CLOSED'` in the database.
3. **Retrieve Balances**: Fetch all non-zero closing balances of temporary accounts (`INCOME`, `EXPENSE`) at the end of the last period of this Fiscal Year (usually period 12, e.g. `2026-12`).
4. **Generate Closing Journal Entry**:
   - Create a balanced transaction at the end date of the fiscal year (`fiscalYear.endDate`).

   - For temporary accounts with debit balances, credit them to zero.
   - For temporary accounts with credit balances, debit them to zero.
   - Post the net difference to the designated `retainedEarningsAccountId` (EQUITY).
   - *Note*: Since the closing entry is posted inside this last period, we temporarily bypass the period lock ONLY for this system-generated transaction.
5. **Set Status**: Set the Fiscal Year status to `'CLOSED'`.
6. **Create Next Year Balances**:
   - Ensure the next Fiscal Year and its periods exist.
   - Propagate closing balances of permanent accounts (Assets, Liabilities, Equity) to the opening balance of the next year's first period.
   - Reset temporary accounts' opening balances for the next year to zero.

---

## 6. Performance Optimization & Balance Sheet Equating

Instead of querying raw `journal_entries` which can grow to over 1M lines, reports like the **Balance Sheet** and **Income Statement** will query `account_period_balances` directly.
- **Balance Sheet**: Returns the closing balance of Assets, Liabilities, and Equity for a given period.
  - To ensure that the Balance Sheet is balanced prior to the definitive annual closing, the system dynamically calculates the cumulative net income (sum of `INCOME` closing balances minus sum of `EXPENSE` closing balances) for the current year up to the queried period.
  - This calculated net income is appended to the Equity section as a virtual account named **"Resultado del Ejercicio"**.
  - Once the fiscal year is closed, the actual Income/Expense balances are zeroed, and this virtual amount naturally becomes zero, while the real Retained Earnings account reflects the closed amount. This guarantees that the Balance Sheet balances perfectly for both open and closed periods.
- **Income Statement**: Returns the net sum of total debits/credits or closing balances of Income and Expense accounts for a given period.
- **Query Complexity**: $O(A)$ where $A$ is the number of accounts ($A \approx 100$ vs $1M+$ transaction lines), yielding response times under 10ms.

