# Research: Integration of Equity System Accounts and Fiscal Year Closing

## Decisions & Technical Rationale

### 1. Account Entity Schema & System Roles

- **Decision**: Add a `system_role` column (`varchar(30)`, nullable, indexed with `user_id`) to `accounts` table.
- **Roles**: `'NET_INCOME'` (Resultado del Ejercicio) and `'RETAINED_EARNINGS'` (Resultados Acumulados).
- **Rationale**: Elevates system accounts to first-class entities in the Chart of Accounts while maintaining flexibility for other system roles in future enterprise accounting modules (e.g. Tax Payable, FX Gain/Loss). A unique index on `(user_id, system_role)` enforces that each company/user has exactly one designated account per system role.

### 2. Elimination of Virtual Fallbacks in Balance Sheet

- **Decision**: Remove `'virtual-net-income'` and `'virtual-accumulated-results'` string IDs in `BalanceSheetUseCase`.
- **Rationale**: Professional ERP systems (SAP, Odoo, NetSuite) map period net income and retained earnings directly onto designated nodes within the Chart of Accounts hierarchy under Equity. Injecting calculated figures into real account nodes allows normal tree aggregation and depth collapsing without creating artificial orphan lines.

### 3. Hiding Zero Balances in Equity Section

- **Decision**: Filter out accounts with a balance of `0.00` (or `Math.abs(balance) < 0.0001`) from the Equity list in `BalanceSheetUseCase`.
- **Rationale**: Fulfills FR-005. Keeps financial reports clean and readable by hiding non-active system accounts or zero-result periods.

### 4. Direct Retrieval in Fiscal Year Closing

- **Decision**: Update `CloseFiscalYearUseCase` to automatically retrieve the account where `userId = :userId AND systemRole = 'RETAINED_EARNINGS'`.
- **Rationale**: Simplifies the API DTO by making `retainedEarningsAccountId` optional or redundant. Prevents user error during annual closing procedures.

### 5. Automated Data Migration & Seeding

- **Decision**: Include a database migration script and update `baseScenario` / user registration to auto-provision mandatory `NET_INCOME` and `RETAINED_EARNINGS` accounts if missing.
- **Rationale**: Guarantees backwards compatibility for existing database records while enforcing mandatory existence for all new users.

### 6. System Account Operability Restrictions in Journal Entries

- **Decision**: Mark `NET_INCOME` (*Resultado del Ejercicio*) as non-operable (`allowManualEntry = false`), filtering it out from UI entry selectors and rejecting manual debit/credit postings in `CreateJournalEntryUseCase`. Ensure `RETAINED_EARNINGS` (*Resultados Acumulados / Utilidades Retenidas*) remains operable (`allowManualEntry = true`).
- **Rationale**: Fulfills FR-008 and FR-009. Prevents manual journal entries from corrupting the real-time net income calculation ($\text{Ingresos} - \text{Egresos} = \text{Resultado del Ejercicio}$) and breaking double-entry synchronization between the Income Statement and Balance Sheet. Retained earnings must remain operable for valid equity operations such as dividend distributions, legal reserve allocations, and prior-period adjustments.

