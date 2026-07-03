# Feature Specification: Accounting Balances and Period Tracking Engine

**Feature Branch**: `011-accounting-balances-tracking`

**Created**: 2026-06-30

**Status**: Draft

**Input**: User description:
> Mira, se viene un cambio grande al core de la aplicación y como quiero orientar su funcionamiento similar a un ERP profesional. Surge la necesidad de que se genere un tracking de los saldos de las cuentas, para mejorar reportes de saldo actual de cuentas, libro mayor, asientos de cierre, periodos, etc. Te voy a adjuntar una especificación de hacia donde apuntamos, quizás los nombres de las tablas sean algo diferentes pero quiero que captures la esencia del requerimiento para adaptarlo al actual funcionamiento de la aplicación.
> 
> (The user attached a comprehensive specification covering core principles, database schema for accounts, fiscal years, periods, journal entries/lines, performance aggregates (account_period_balances), monthly/annual closing procedures, and reporting logic.)

## Clarifications

### Session 2026-07-01

- Q: Account schema extension (adding codes and nature columns vs metadata) → A: No physical account code column is required; accounts continue to use their UUID/name primary identification. The normal balance nature is dynamically derived from the account type (ASSET/EXPENSE = DEBIT, LIABILITY/EQUITY/INCOME = CREDIT).
- Q: Multi-currency aggregation in `account_period_balances` → A: Track period balances exclusively in the system's base currency (`amount_base`).
- Q: Presentación del Resultado Acumulado en el Balance General → A: Añadir como una línea dentro de Patrimonio Neto con el nombre "Resultado del Ejercicio".
- Q: Gestión de Bloqueo de Períodos Mensuales y API de Actualización → A: Reincorporar los botones y controles de cierre, reapertura y recálculo de períodos mensuales en la interfaz de usuario en un módulo de "Años Fiscales / Bloqueos".

### Session 2026-07-02

- Q: Selección de períodos comparativos en Balance General → A: Selección manual de 2 a 3 períodos arbitrarios mediante dropdowns (Opción A).
- Q: Flujo de recálculo en cascada y estado de la UI → A: Ejecución automática al guardar asientos modificados en períodos reabiertos, bloqueando la UI con una pantalla de carga de "Actualizando saldos históricos..." (Opción A).
- Q: Jerarquía de cuentas y filtro de profundidad en Balance General → A: Eliminar el filtro de profundidad del Balance General para simplificar la interfaz, dado que no hay jerarquías para cuentas de Activo, Pasivo o Patrimonio (Opción C).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Real-time Period Balance Aggregation (Priority: P1)

As a system, when a journal entry is posted or reversed within an open period, automatically and incrementally update the associated account period balance records, so that reports can retrieve instantaneous balances without full historical scans.

**Why this priority**: Core architectural change to separate the ledger transaction log (immutable) from query performance aggregates.

**Independent Test**: Post a new balanced transaction with debit/credit entries for a specific date, and verify that the corresponding `account_period_balances` rows for that period are created/updated with correct incremental amounts.

**Acceptance Scenarios**:

1. **Given** a new transaction is posted on `2026-03-15` with $100 debit on Caja and $100 credit on Ventas, **When** the transaction is committed, **Then** the `account_period_balances` table for period `2026-03` increases total debits of Caja by $100, increases total credits of Ventas by $100, and updates their respective closing balances.
2. **Given** a transaction on `2026-03-15` is reversed, **When** the reversal is posted, **Then** the `account_period_balances` table for period `2026-03` is updated to reflect the corresponding reverse entry changes, and the final balances adjust accordingly.

---

### User Story 2 - Monthly Period Closure and Lock (Priority: P2)

As an accountant, I want to close a monthly accounting period so that no further transactions can be posted, modified, or reversed in that timeframe, ensuring the integrity of published financial statements. I also want to be able to reopen a closed period, triggering automatic recalculation of balances for that period and all subsequent periods.

**Why this priority**: Prevents modification of audited historical data while allowing corrected modifications through controlled reopening.

**Independent Test**: Close period `2026-03`, attempt to post a new transaction on `2026-03-10` and verify it is blocked. Reopen period `2026-03`, post the transaction, and verify that the balances of `2026-03` and subsequent periods (e.g. `2026-04`) are automatically recalculated.

**Acceptance Scenarios**:

1. **Given** period `2026-03` is closed, **When** a user attempts to post a transaction dated `2026-03-15`, **Then** the system rejects the request with a validation error indicating the period is closed.
2. **Given** period `2026-03` has a closing balance of $1,200 for Caja and period `2026-04` has an opening balance of $1,200, **When** period `2026-03` is reopened, a $100 debit transaction is posted in it, and the period is closed again, **Then** the closing balance for `2026-03` and the opening/closing balances for `2026-04` are updated to $1,300.

---

### User Story 3 - Fiscal Year Annual Closing (Priority: P3)

As an accountant, I want to close a fiscal year so that all temporary accounts (Income and Expense) are reset to zero, their net difference (profit/loss) is transferred to Retained Earnings, and the closing balances of permanent accounts (Assets, Liabilities, Equity) are carried forward as the opening balances of the new fiscal year.

**Why this priority**: Required for compliance with professional accounting standards and starting a new cycle cleanly.

**Independent Test**: Run the annual closing process for fiscal year `2026`, verify that a closing journal entry is generated, that income/expense accounts show an opening balance of $0 in `2027-01`, and that permanent accounts carry their correct balances.

**Acceptance Scenarios**:

1. **Given** a fiscal year `2026` with $10,000 in Ventas (Income) and $7,000 in Sueldos (Expense), **When** the annual closing process is executed, **Then** a closing transaction is posted that debits Ventas by $10,000, credits Sueldos by $7,000, and credits Retained Earnings (Equity) by $3,000, resetting Ventas and Sueldos to $0.
2. **Given** Caja (Asset) has a closing balance of $5,000 at the end of `2026-12`, **When** the fiscal year is closed and `2027` is opened, **Then** Caja has an opening balance of $5,000 in `2027-01`.

---

### User Story 4 - Balance General with Advanced Period Filters (Priority: P2)

As an accountant, I want to query a Balance Sheet with flexible date/period filters so that I can analyze financial status at any point in time and compare periods.

**Why this priority**: Directly impacts decision making by enabling customizable reporting without heavy client-side calculations.

**Independent Test**: Load the Balance Sheet screen, verify that filtering by "As of date" calculates correct historical accumulated balances up to the chosen date, that filtering by "Period" displays correct balances from the period's `AccountPeriodBalance` cache, and that "Comparative" shows columns side by side for manually selected periods.

**Acceptance Scenarios**:

1. **Given** a selected mode of "Por Periodo" for `2026-03`, **When** the Balance Sheet is loaded, **Then** the system fetches and displays account values directly from `account_period_balances` for period `2026-03`.
2. **Given** a selected mode of "Comparativo" with custom periods `2026-03` and `2025-03`, **When** the Balance Sheet is loaded, **Then** two columns are shown side by side displaying values for both periods.

---

### Edge Cases

- **Transaction dated exactly on period boundaries**: Transactions posted on `2026-03-31T23:59:59.999Z` vs `2026-04-01T00:00:00.000Z` must fall precisely into their respective periods based on timezone-aware dates.
- **OutOfOrder transaction dates**: When a transaction is posted with a past date (e.g. posting on `2026-04-10` but dated `2026-03-15`), the system must update the `account_period_balances` for `2026-03` and roll forward the balances to `2026-04` if the target period is open.
- **Reversal of a transaction from a closed period**: If a transaction from `2026-03` needs to be reversed, but `2026-03` is closed, the reversal transaction must be posted in the currently open period (e.g. `2026-04`), referencing the original transaction ID.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST support the definition of `Fiscal Years` created by selecting a calendar year (e.g. 2026). The start date, end date, and descriptive name (e.g. "Ejercicio 2026") are set automatically. The start and end dates must respect the user's local timezone (e.g., if the user's local timezone is UTC-4, the start date in the DB must be equivalent to Jan 1st 04:00:00 UTC, and the end date equivalent to Jan 1st 03:59:59.999 UTC of the following year).

- **FR-002**: System MUST support the definition of `Periods` nested within a Fiscal Year (typically 12 monthly periods per year) with properties: start date, end date, status (Open, Closed). The start and end dates of each period must respect the user's local timezone offset (e.g., if the user's local timezone is UTC-4, period `2026-01` must start at Jan 1st 04:00:00 UTC and end at Feb 1st 03:59:59.999 UTC).
- **FR-003**: System MUST validate that every transaction has a date matching an active, open Period.


- **FR-004**: System MUST reject any creation, modification, or deletion of ledger entries inside a closed Period.
- **FR-005**: System MUST maintain a derived performance table/collection `Account Period Balances` tracking:
  - Account ID
  - Period ID
  - Opening Balance
  - Total Debits (sum of base amount debits in the period)
  - Total Credits (sum of base amount credits in the period)
  - Closing Balance
- **FR-006**: System MUST update the corresponding `Account Period Balance` atomically when a transaction is posted or reversed.
- **FR-007**: System MUST provide a management action to completely reconstruct the `Account Period Balances` table from the base transaction lines in case of audit or corruption.
- **FR-008**: System MUST trigger an automatic roll-forward of balances to all subsequent periods when a past period's balances change (due to a reopening and adjustment).
- **FR-009**: System MUST perform the annual closing procedure:
  - Validate that the fiscal year is in an Open status.
  - Automatically generate and post a Closing Journal Entry that balances all temporary (Income/Expense) accounts to zero and transfers the net difference to a designated Retained Earnings account.
  - Set the fiscal year status to Closed.
  - Carry forward closing balances of permanent accounts (Assets, Liabilities, Equity) as opening balances of the next fiscal year's first period.
  - Set opening balances of temporary accounts in the next fiscal year to zero.
- **FR-010**: System MUST determine the normal balance nature (Debit vs Credit) dynamically based on the account type (ASSET and EXPENSE have a Debit nature; LIABILITY, EQUITY, and INCOME have a Credit nature). Accounts will continue to be identified by their UUID/name without requiring a hierarchical code column.
- **FR-011**: System MUST track period balances (opening_balance, total_debit, total_credit, closing_balance) exclusively in the system's base currency (amount_base).
- **FR-012**: System MUST calculate the cumulative net income (Income minus Expense) for the current fiscal year up to the queried period, and dynamically include it as a line item named "Resultado del Ejercicio" in the Equity section of the Balance Sheet report so that the balance sheet always balances.
- **FR-013**: System MUST provide a "Gestión de Periodos" / "Configuración Financiera" module in the UI. It will display a list of Fiscal Years (e.g. [Año Fiscal 2026] (Abierto)). Expanding a year will show the 12 monthly periods, each with a toggle switch component showing its status [ Abierto / Cerrado ].
- **FR-014**: System MUST support three time-filtering modes for the Balance General:
  - **A la fecha (As of Date)**: Computes the accumulated balance from the beginning of records up to the specified date.
  - **Por Periodo (By Period)**: Fetches and returns the balances directly from the `AccountPeriodBalance` records corresponding to the selected period.
  - **Comparativo (Comparative)**: Displays columns side-by-side representing 2 or 3 manually selected periods.
- **FR-015**: [DELETED - Depth filter on Balance Sheet is no longer required since accounts of Assets, Liabilities, and Equity do not support hierarchy creation in the UI.]
- **FR-016**: System MUST automatically trigger a forward cascade recalculation when a past period is modified. During this process, the backend will process the recalculation, and the frontend MUST display a blocking loading overlay stating "Actualizando saldos históricos..." to prevent concurrent modifications.

### Key Entities *(include if feature involves data)*

- **FiscalYear**: Represents an accounting year (e.g. 2026).
  - Attributes: Name/Code (unique), Start Date, End Date, Status (OPEN, CLOSED).
- **Period**: A monthly slice within a FiscalYear.
  - Attributes: FiscalYear reference, Name (e.g., "2026-03"), Start Date, End Date, Status (OPEN, CLOSED).
- **AccountPeriodBalance**: Aggregated snapshot for quick reporting.
  - Attributes: Account reference, Period reference, Opening Balance (base currency), Total Debits (base currency), Total Credits (base currency), Closing Balance (base currency), Last Updated Timestamp.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Balance Sheet and Income Statement queries for any given period must resolve in less than 100ms, even with over 1 million total transaction lines in the ledger database, by reading directly from `AccountPeriodBalances`.
- **SC-002**: 100% of transaction entries must be strictly blocked from being posted, modified, or reversed in closed periods.
- **SC-003**: In a full audit reconstruction test, the rebuilt `AccountPeriodBalances` closing balances must match the transaction ledger balances perfectly with 0% discrepancy.
- **SC-004**: Users can execute monthly period closure and annual fiscal year closure via simple user-facing controls, completing the process in under 5 seconds.

## Assumptions

- **A-001**: The system timezone is normalized (e.g. UTC) for all transactions to prevent date overlap between periods.
- **A-002**: Budget checks will run against the computed period balances instead of scanning transaction lines.
- **A-003**: The currency conversion rate is fixed at the transaction date, and any exchange difference is recorded as a standard journal entry line during transaction posting.
