# Feature Specification: Personal Wealth Hub & Continuous Financial Forecasting

**Feature Branch**: `023-personal-wealth-hub`

**Created**: 2026-08-27

**Status**: Draft

**Input**: User description: "Transformación integral del sistema contable en un Centro de Comando Financiero Personal y Familiar (Personal & Family Wealth OS). Eliminación de la rigidez de años fiscales y cierres forzados, adoptando un modelo de períodos mensuales continuos auto-provisionados bajo demanda (ensurePeriod). Preservación del motor de partida doble y de los snapshots de balance mensual (AccountPeriodBalance) para máximo rendimiento. Matriz de presupuestos estructurada en 4 cuadrantes (Ingresos, Egresos, Ahorro e Inversión, y Deudas / Amortización de Pasivos) que alimenta directamente el Flujo de Caja Proyectado y la liquidez futura en una grilla de Rolling Forecast (12 meses móviles continuos con navegación sin barreras anuales). Estados financieros completos (Balance General, Estado de Resultados Real y Proyectado, Flujo de Caja Real y Proyectado, Evolución del Patrimonio Neto histórico). Previsión táctica de compromisos y vencimientos a corto plazo (30-90 días) sin polución especulativa del libro diario."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Continuous Monthly Ledger & Auto-Provisioned Periods (Priority: P1)

As a personal or family finance manager, I want to record monetary transactions on any date (past, present, or future) without encountering fiscal year boundary errors or period-closed blocks, so that the system automatically provisions monthly periods (`YYYY-MM`) and maintains continuous, accurate account balance snapshots across time.

**Why this priority**: It eliminates the corporate administrative burden of opening/closing fiscal years, which previously blocked transactions outside rigid 12-month containers. It forms the foundational temporal layer for all other reporting, budgeting, and forecast operations.

**Independent Test**: Can be tested by posting a journal transaction to an uncreated past month (e.g., 6 months ago) and an uncreated future month (e.g., next calendar year) and verifying that the monthly period entities are auto-generated atomically, account period balance records are initialized carrying forward preceding balances, and retroactive modifications propagate changes forward to subsequent periods.

**Acceptance Scenarios**:

1. **Auto-Provisioning on Transaction Posting**:
   - **Given** a user posts a balanced transaction with accounting date `2027-04-15` when period `2027-04` does not yet exist,
   - **When** the transaction creation use case executes,
   - **Then** the system automatically provisions `PeriodEntity` (`name: "2027-04"`, `startDate: "2027-04-01"`, `endDate: "2027-04-30"`, `status: "OPEN"`), creates `AccountPeriodBalanceEntity` rows for all active balance accounts inheriting the closing balances from `2027-03`, and posts the journal entry without error.

2. **Retroactive Transaction Mutation & Balance Cascade**:
   - **Given** an existing sequence of periods (`2026-01`, `2026-02`, `2026-03`) with established balances,
   - **When** the user records or edits an expense in `2026-01` of $100 paid from "Banco",
   - **Then** the `closingBalance` of "Banco" in `2026-01` decreases by $100, and the change cascades forward: the `openingBalance` and `closingBalance` of "Banco" in `2026-02` and `2026-03` decrease by $100 automatically.

3. **Continuous Timeline Without Annual Lockouts**:
   - **Given** calendar year 2025 has ended and calendar year 2026 is underway,
   - **When** the user accesses or modifies transactions in December 2025,
   - **Then** the system does not require a formal "reopening" of a fiscal year nor execute closing refund entries; the ledger remains editable and recalculates snapshots transparently.

---

### User Story 2 - Four-Quadrant Budget Matrix & Rolling Cash Flow Forecast (Priority: P1)

As a head of household or personal planner, I want to budget monthly financial flows across four distinct cash quadrants (Ingresos, Egresos, Ahorro e Inversiones, Deudas y Financiación) in a continuous rolling 12-month table, so that I can see the projected liquidity and bank balance month by month without fiscal year cutoffs.

**Why this priority**: This is the central decision-making hub of the system ("saber si me dan los números en el mañana"). Standard budgeting tools ignore capital allocation (investments and debt principal amortizations), causing distorted cash expectations. Connecting the 4 quadrants to cash flow projection delivers true solvency foresight.

**Independent Test**: Can be tested by entering budget figures across all 4 quadrants for a 12-month rolling window, verifying that the Net Cash Flow and Projected Closing Cash balance reflect the combined impact of operational expenses, investments, and debt payments, and navigating into subsequent months seamlessly.

**Acceptance Scenarios**:

1. **Four-Quadrant Liquidity Calculation**:
   - **Given** a user is budgeting for month $M$,
   - **When** the user enters:
     - `INGRESOS`: $3,000 (Salary)
     - `EGRESOS`: $1,200 (Living expenses / P&L)
     - `AHORRO_INVERSIONES`: $400 (Deposit into investment portfolio)
     - `DEUDAS_FINANCIACION`: $500 (Loan principal amortization)
   - **Then** the system calculates:
     - Superávit Operativo = $3,000 - $1,200 = +$1,800
     - Flujo Neto de Fondos = +$1,800 - $400 - $500 = +$900
     - Saldo Final de Caja Proyectado = Saldo Inicial de Caja + $900.

2. **Rolling 12-Month Navigation**:
   - **Given** the current month is August 2026,
   - **When** the user opens the Budget & Forecast screen,
   - **Then** the grid displays a continuous 12-month window (August 2026 through July 2027) regardless of calendar year boundaries, with horizontal scrolling and previous/next navigation controls.

3. **Dynamic Month Extension**:
   - **Given** a user viewing the rolling budget grid up to December 2027,
   - **When** the user clicks `[ + Planificar Siguiente Mes ]` or scrolls to the end,
   - **Then** period `2028-01` is auto-provisioned, appended as a new column, and populated with initial balances carrying forward from December 2027, with an option to duplicate values from the previous month.

4. **Negative Liquidity Alert**:
   - **Given** budgeted outflows exceed initial liquidity plus budgeted inflows in a future month,
   - **When** the projected closing cash balance results in a negative figure,
   - **Then** the system visibly highlights the shortfall with an alert indicator for that future period.

---

### User Story 3 - Real vs Projected Financial Statements (Balance Sheet, P&L, Cash Flow) (Priority: P2)

As a user assessing my overall financial health, I want to generate my Balance General, Estado de Resultados (P&L), and Flujo de Caja across any selected monthly periods in both Real and Proyectado modes, so that I can evaluate actual historical performance and compare it to my financial plan.

**Why this priority**: Bridges the gap between recorded past reality (ledger) and future intention (budgets), providing standard financial statements with zero corporate tax bureaucracy.

**Independent Test**: Can be tested by running the Balance General, Estado de Resultados, and Flujo de Caja for historical months (displaying actual ledger totals) and future months (displaying budget-driven projections), and verifying that totals match the corresponding `AccountPeriodBalance` and `BudgetItem` records.

**Acceptance Scenarios**:

1. **Balance General from Snapshots**:
   - **Given** any monthly period $P$,
   - **When** the user requests the Balance General for $P$,
   - **Then** the report instantly aggregates `closingBalance` values from `AccountPeriodBalanceEntity` for Assets and Liabilities, displaying Net Worth as $\sum \text{Assets} - \sum \text{Liabilities}$ without scanning raw transaction rows.

2. **Real Cash Flow Statement**:
   - **Given** settled historical transactions in bank/cash accounts,
   - **When** the user generates the Real Cash Flow report for a date range,
   - **Then** the report reflects actual monetary inflows, living expense outflows, investment movements, and debt repayments executed in that period.

3. **Projected Estado de Resultados (P&L)**:
   - **Given** budgeted items in `INGRESOS` and `EGRESOS`,
   - **When** the user requests the Projected Income Statement for upcoming months,
   - **Then** the report displays budgeted operating revenues, budgeted egresos, and projected operating surplus, excluding balance sheet asset transfers and debt principal payments.

4. **Budget Execution / Variance Control**:
   - **Given** a period with both budget entries and actual transactions,
   - **When** the user views Budget Control,
   - **Then** the screen displays side-by-side columns (Budget, Actual, Variance $/%) and color-coded progress gauges per category.

---

### User Story 4 - Historical Net Worth Evolution (Priority: P2)

As a long-term personal wealth builder, I want to view a continuous historical chart of my Net Worth ($\text{Assets} - \text{Liabilities}$) over time, so that I can track my wealth accumulation and verify that my family's financial position is strengthening.

**Why this priority**: It is the single most motivating and meaningful metric in personal wealth management, serving as the high-level scoreboard for all financial decisions.

**Independent Test**: Can be tested by requesting the Net Worth Evolution endpoint/page across multiple historical periods and validating that the plotted values correspond exactly to the net asset position of each period's closing snapshot.

**Acceptance Scenarios**:

1. **Instant Net Worth Timeline Query**:
   - **Given** a user with 24 months of recorded transaction history,
   - **When** the user accesses the Net Worth Evolution view,
   - **Then** the system queries `AccountPeriodBalanceEntity` grouped by period and returns the full 24-point time series in under 50 milliseconds.

2. **Net Worth Trend Consistency**:
   - **Given** the net worth calculation at month $M$,
   - **When** verifying the value against month $M-1$,
   - **Then** $\text{Net Worth}(M) = \text{Net Worth}(M-1) + \text{Net Income}(M) + \Delta \text{Capital/Valuation}(M)$.

---

### User Story 5 - Tactical Short-Term Commitments & Calendar Preview (Priority: P3)

As a user managing day-to-day cash flow, I want to track recurring scheduled commitments (salaries, rent, utilities, subscriptions, credit card cutoff/due dates) in a 30-to-90-day tactical calendar view without polluting the general ledger with speculative entries, so that I can foresee immediate liquidity pinches before transactions occur.

**Why this priority**: Complements the macro monthly forecast with day-to-day operational execution, bridging the gap between today's bank balance and the next paycheck or card due date.

**Independent Test**: Can be tested by defining recurring commitment rules, viewing the upcoming 60-day calendar preview of virtual inflows and outflows, and confirming a due commitment to automatically generate a balanced journal entry.

**Acceptance Scenarios**:

1. **Virtual Projection on Calendar**:
   - **Given** a recurring commitment rule for "Alquiler" ($800, due on the 5th of each month, payable from "Banco"),
   - **When** viewing the cash flow calendar for the upcoming 60 days,
   - **Then** the event appears virtually on the 5th of each month without existing as a row in `journal_entries`.

2. **One-Click Settlement**:
   - **Given** a scheduled commitment whose due date has arrived,
   - **When** the user clicks "Confirmar y Asentar",
   - **Then** the system creates a balanced double-entry journal entry in the ledger for that date, updates `AccountPeriodBalance`, and marks the commitment occurrence as settled for that cycle.

---

### Edge Cases

- **Leap Years & Month Ends**: Transactions or recurring rules on the 29th, 30th, or 31st must correctly resolve period end dates (e.g., February 28 vs 29 in leap years) without calendar overflow.
- **Deep Historical Edits**: Modifying a transaction 24 months in the past must correctly propagate balance adjustments through all 24 intervening `AccountPeriodBalance` snapshots within a single serializable database transaction.
- **Periods with Zero Activity**: Months where no transactions are recorded must maintain valid `AccountPeriodBalance` snapshots where `openingBalance = closingBalance` and debits/credits equal 0.
- **Deactivated Accounts in Budget Matrix**: Inactive or soft-deleted accounts must be excluded from active budget data entry, while preserving historical actuals and comparative snapshots.
- **Negative Cash Projections**: The system must cleanly handle and visually flag negative projected liquidity without throwing calculation errors or corrupting downstream months.
- **Concurrent Auto-Provisioning**: Simultaneous transactions targeting an uncreated period must use atomic get-or-create logic (e.g., unique constraints and advisory locks or retry handling) to avoid duplicate period creation.

---

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST represent accounting periods strictly as calendar monthly units (`PeriodEntity`) formatted as `YYYY-MM` with fixed calendar month start (`YYYY-MM-01`) and end dates (`YYYY-MM-28..31`).
- **FR-002**: System MUST decouple `PeriodEntity` from `FiscalYearEntity`, associating periods directly with the tenant/user context (`userId`).
- **FR-003**: System MUST auto-provision `PeriodEntity` records on demand (`ensurePeriod`) whenever a transaction, budget item, or view targets a monthly period that does not yet exist.
- **FR-004**: System MUST maintain pre-aggregated balance snapshots (`AccountPeriodBalanceEntity`) per `(accountId, periodId)` storing `openingBalance`, `totalDebits`, `totalCredits`, and `closingBalance`.
- **FR-005**: System MUST automatically propagate balance adjustments forward in time across subsequent `AccountPeriodBalance` snapshots whenever a past transaction is created, updated, or reversed.
- **FR-006**: System MUST enforce double-entry ledger balance ($\sum \text{Debits} = \sum \text{Credits}$) for all posted transactions.
- **FR-007**: System MUST support Dual-Mode transaction creation: a guided Quick Transaction mode (date/time, account, category/destination, amount, concept) and an advanced Free Journal Entry mode (tabular Debit/Credit grid with auto-balancing).
- **FR-008**: System MUST organize the Budget Matrix into four distinct functional quadrants: `INGRESOS`, `EGRESOS`, `AHORRO_INVERSIONES`, and `DEUDAS_FINANCIACION`.
- **FR-009**: System MUST calculate the Monthly Net Cash Flow ($\Delta \text{Efectivo}$) as:
  $$\Delta \text{Efectivo} = \sum \text{INGRESOS} - \sum \text{EGRESOS} - \sum \text{AHORRO\_INVERSIONES} - \sum \text{DEUDAS\_FINANCIACION}$$
- **FR-010**: System MUST project future cash balances month-by-month in a continuous roll-forward: $\text{Closing Cash}(t) = \text{Closing Cash}(t-1) + \Delta \text{Efectivo}(t)$.
- **FR-011**: System MUST render the Budget Matrix and Cash Flow Forecast in a Rolling 12-Month view by default, spanning from the current month to $M+11$.
- **FR-012**: System MUST support forward and backward navigation across the rolling timeline and allow dynamic addition of future months without artificial annual cutoffs.
- **FR-013**: System MUST display historical actuals for past months, hybrid actual-to-date vs budget for the active month, and pure budgeted figures for future months.
- **FR-014**: System MUST provide a streamlined executive Balance General (Statement of Financial Position) displaying Total Assets, Total Liabilities, and Net Worth directly ($\text{Net Worth} = \sum \text{Assets} - \sum \text{Liabilities}$) for any specified monthly period, date, or comparative date range, eliminating synthetic corporate equity account injections from the UI.
- **FR-015**: System MUST designate exactly one single system account `Capital` (`type: 'EQUITY'`, `systemRole: 'CAPITAL'`) per user as the offsetting leg for starting account balances and external capital injections, omitting zero-balance equity rows from financial statements.
- **FR-016**: System MUST provide a Net Worth Evolution report returning the historical time series of net worth per monthly period.
- **FR-017**: System MUST provide a Real Cash Flow statement detailing actual historical cash movements across operational, investing, and financing categories.
- **FR-018**: System MUST provide both a Real Estado de Resultados (actual income minus actual egresos) and a Projected Estado de Resultados (budgeted income minus budgeted egresos).
- **FR-019**: System MUST provide Budget Execution / Control comparing budgeted amounts against actual expenditures per category with variance metrics and progress indicators.
- **FR-020**: System MUST support recurring commitment rules (frequency, due day, estimated amount, source account, category) for near-term tactical cash flow preview (30 to 90 days).
- **FR-021**: System MUST keep recurring commitments virtual until confirmed by the user, preventing speculative entries in the general ledger.
- **FR-022**: System MUST format all monetary amounts with tabular digits (`tabular-nums`), right-aligned numeric values, and standard financial conventions.
- **FR-023**: System MUST exclude corporate fiscal year operations (fiscal year creation wizards, fiscal year closing locks, tax refunding entries) from the core user workflow.
- **FR-024**: System MUST reject core period configurations based on weekly or bi-weekly buckets, preserving monthly calendar periods as the atomic database snapshot unit.

---

### Key Entities _(include if feature involves data)_

- **`Period`**: Represents an atomic calendar monthly bucket. Key attributes: `id` (UUID), `userId` (UUID), `name` (e.g. "2026-08"), `startDate` (DATE), `endDate` (DATE), `status` (OPEN). Independent of fiscal years.
- **`AccountPeriodBalance`**: Pre-aggregated balance snapshot for an account within a period. Key attributes: `id` (UUID), `accountId` (UUID), `periodId` (UUID), `openingBalance` (DECIMAL), `totalDebits` (DECIMAL), `totalCredits` (DECIMAL), `closingBalance` (DECIMAL), `lastUpdated` (TIMESTAMP).
- **`Budget`**: Represents the budget container for a specific period. Key attributes: `id` (UUID), `userId` (UUID), `periodId` (UUID, 1:1 with Period), `name` (STRING).
- **`BudgetItem`**: Individual line item in the budget matrix. Key attributes: `id` (UUID), `budgetId` (UUID), `accountId` (UUID), `subRowId` (STRING, optional), `subRowLabel` (STRING, optional), `amount` (DECIMAL), `cashFlowDirection` (INFLOW / OUTFLOW), `flowIntention` (PAY, RECEIVE, INVEST, SAVE, DIVEST).
- **`RecurringSchedule`**: Tactical short-term recurring commitment rule. Key attributes: `id` (UUID), `userId` (UUID), `accountId` (UUID), `categoryId` (UUID), `name` (STRING), `estimatedAmount` (DECIMAL), `frequency` (MONTHLY, BIWEEKLY, ANNUALLY), `dueDay` (INTEGER), `isActive` (BOOLEAN).

---

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Balance General and Net Worth Evolution queries across 36+ monthly periods execute with a response latency of under 50ms at the 95th percentile, utilizing pre-aggregated `AccountPeriodBalanceEntity` snapshots.
- **SC-002**: Zero blocking errors (`"No accounting period found"`) when users post transactions to any past or future calendar date; periods are auto-provisioned within 15ms.
- **SC-003**: 100% mathematical consistency in the cash flow forecast: $\text{Closing Cash}(t) = \text{Opening Cash}(t) + \Delta \text{Efectivo}(t)$ across all 12+ projected months.
- **SC-004**: Users can seamlessly view and edit a continuous 12-to-24 month rolling budget and cash flow forecast across calendar year boundaries without encountering year-end walls or page splits.
- **SC-005**: 100% test coverage maintained on balance cascade services, cash flow calculation engines, and double-entry validation logic.
- **SC-006**: 0 ESLint errors, 0 ESLint warnings, and zero TypeScript type errors across all monorepo workspaces (`npm run validate`).

---

## Assumptions

- Gregorian calendar months (`YYYY-MM`) serve as the universal atomic period unit; users manage day-to-day timing variations within the monthly container.
- The application is in active pre-production development; `FiscalYearEntity` is completely eliminated without requiring backward compatibility, allowing a clean breaking refactor to pure monthly periods.
- Double-entry ledger records remain the sole authoritative source of truth for settled financial transactions.
- Future cash projections are derived deterministically from initial liquidity and user-defined budget matrix inputs.
- Recurring commitments represent planning aids and do not replace formal transaction confirmation in the ledger.
