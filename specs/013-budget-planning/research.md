# Research Notes: Presupuestos Financieros (Budgeting) y Proyecciones de Caja

## 1. Budget Data Model Refactoring

### Decision
Refactor the flat `BudgetEntity` structure to a hierarchical relationship.
- **BudgetEntity** (`budgets` table)
  - `id`: UUID (Primary Key)
  - `userId`: UUID (Foreign Key to users)
  - `periodId`: UUID (Unique Foreign Key to periods)
  - `name`: String (Friendly identifier, e.g. "Enero 2026")
  - `createdAt`: Timestamp
  - `updatedAt`: Timestamp
- **BudgetItemEntity** (`budget_items` table)
  - `id`: UUID (Primary Key)
  - `budgetId`: UUID (Foreign Key to budgets, cascade delete)
  - `accountId`: UUID (Foreign Key to accounts, cascade delete)
  - `amount`: Decimal (18, 4) (Budgeted amount, positive or negative)
  - *Constraint*: Unique index on `[budgetId, accountId]` to prevent duplicate budget limits for the same account in a period.

### Rationale
- Strictly aligns with requirement **FR-001** and **FR-002**.
- Separates the budget metadata (period reference, creation timestamps) from individual account-based limits.
- Supports transactions where a user edits and saves multiple account budget limits simultaneously.

### Alternatives considered
- Keeping the flat `budgets` table and adding a `periodId` column. This was rejected because a 1-to-1 relationship with `Period` is impossible if we store a row in `budgets` for every account-period combination.

---

## 2. Cash and Bank Accounts Identification

### Decision
Extend `AccountEntity` with a new column:
- `isCashOrBank`: Boolean, default `false`.

Add validation in the update/edit account flow:
- Block updates to `isCashOrBank` if the account already has journal entries associated.

### Rationale
- Essential for **FR-008** to differentiate operative cash/bank accounts from other assets (like investments, which are non-liquid and budgetable).
- Prevents database state corruption by blocking the flag modification for accounts with transactions (**FR-014** and **FR-015**).

---

## 3. Real vs. Projected Cash Flow Calculations

### Decision
The cash flow calculations will follow different rules based on the period status:
1. **Real Cash Flow (Closed Periods)**:
   - Sum of DEBIT amounts minus CREDIT amounts of journal entries where `account.isCashOrBank = true` and `transaction.accountingDate` is within the period's date range.
   - Initial cash balance = sum of actual opening balances of cash/bank accounts.
   - Ending cash balance = sum of actual closing balances of cash/bank accounts.
2. **Projected Cash Flow (Open/Future/Planning Periods)**:
   - Initial cash balance of period `P` = Ending cash balance of period `P-1`. (If no preceding period exists, use the actual opening balances of cash/bank accounts for `P`).
   - Net cash flow = `Sum(INCOME.budgeted) - Sum(EXPENSE.budgeted) + Sum(ASSET.budgeted) + Sum(LIABILITY.budgeted)`.
   - Ending cash balance = Initial cash balance + Net cash flow.

### Rationale
- Adheres to requirement **FR-013**.
- Accurately models cash inflows/outflows for assets and liabilities (where asset savings and liability repayments are negative flows, and loan receipts or asset liquidations are positive flows).

---

## 4. Period and Fiscal Year Status

### Decision
Introduce three states for the period and fiscal year entities:
- `CLOSED` (Cerrado): Read-only period for past data.
- `OPEN` (Abierto): Active period for posting actual entries and comparing with budgets.
- `PLANNING` (Planificación): Future virtual period. Blocks real ledger entries but allows full budgeting and forecasting.

---

## 5. Dynamic Tabular Budget Sync

### Decision
Instead of pre-populating all accounts in the database or UI:
- `GET /api/budgets/by-period/:periodId` returns only the budgeted `BudgetItemEntity` entries that have non-zero limits, along with a list of `eligibleAccounts`.
- `PUT /api/budgets/by-period/:periodId/items` performs a full synchronization: deletes existing database records that are omitted from the incoming payload, and creates/updates the remaining.
