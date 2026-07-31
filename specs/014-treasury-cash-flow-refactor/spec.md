# Feature Specification: Treasury Cash Accounts and Cash Flow Refactor

**Feature Branch**: `014-treasury-cash-flow-refactor`

**Created**: 2026-07-31

**Status**: Draft

**Input**: User description: "Rediseño del Módulo de Cuentas de Dinero y Optimización de Flujo de Caja"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Default Money Accounts Initialization (Priority: P1)

As a financial user initializing a new ledger, I want default cash and bank accounts to be automatically marked as money/liquid accounts upon creation, so that the cash flow report operates correctly from day one without requiring manual grid toggles.

**Why this priority**: Correct initialization of liquid accounts is critical because unmarked cash accounts cause the cash flow engine to classify cash balance movements as non-liquid expense/asset transactions, invalidating cash flow calculations.

**Independent Test**: Can be tested by executing system account initialization and verifying that default accounts (such as Cash and Bank Account) are created with the money account flag set to true.

**Acceptance Scenarios**:

1. **Given** a new user account initialization process, **When** default accounts are generated, **Then** accounts designated as Cash (`Efectivo`) and Bank (`Cuenta Bancaria`) are created with the money account status enabled by default (`isCashOrBank = true`).
2. **Given** default accounts exist, **When** navigating to the Cash Flow report for the first time, **Then** opening and closing cash balances accurately reflect default money account transactions without configuration adjustments.

---

### User Story 2 - Account Creation and Editing Modal (Priority: P1)

As an accountant or business owner creating or editing an account, I want a explicit, guided toggle for money accounts in the account modal, with intelligent default suggestions based on account naming, so that managing account liquidity is unambiguous and user-friendly.

**Why this priority**: Replacing inline table checkboxes with a clear form toggle prevents accidental edits and improves account configuration governance.

**Independent Test**: Can be tested independently by opening the account creation modal, typing account names (e.g., "Caja Central", "MercadoPago"), selecting Asset type, and observing toggle defaults and state saves.

**Acceptance Scenarios**:

1. **Given** the account creation modal, **When** selecting the Asset account type, **Then** a clear toggle option *"¿Es cuenta de dinero / efectivo?"* is visible.
2. **Given** an account name containing liquidity keywords (e.g., "Efectivo", "Caja", "Banco", "MP"), **When** typing the account name while Asset type is selected, **Then** the money account toggle is automatically enabled by default.
3. **Given** an account saved with the money account toggle enabled, **When** viewing the account in the ledger grid, **Then** a distinct visual badge (e.g., "Caja/Banco") is displayed instead of an editable checkbox.

---

### User Story 3 - Liquidity Flag Immutability (Priority: P2)

As a financial administrator, I want the system to prevent changing the money account status once an account has posted journal entries, so that historical cash flow reports remain accurate and auditably consistent.

**Why this priority**: Mutating the liquidity classification of an active account with ledger history corrupts past cash flow reports and period balance reconciliation.

**Independent Test**: Can be tested by attempting to modify the money account toggle on an account with posted transactions, verifying that UI editing is locked and server validation rejects the request.

**Acceptance Scenarios**:

1. **Given** an account that has at least one posted accounting transaction (journal entry), **When** opening the account edit modal, **Then** the money account toggle is disabled with a security indicator (lock icon).
2. **Given** an account with posted transactions, **When** a request is submitted to alter its money account status, **Then** the system rejects the modification with a clear validation error stating that liquidity classification cannot be changed for accounts with existing entries.

---

### User Story 4 - High-Performance Direct Cash Flow Report (Priority: P1)

As a financial officer reviewing company liquidity, I want the Cash Flow report to render instantaneously using pre-aggregated period balances while accurately excluding money accounts from non-liquid breakdown lines, so that performance remains high as transaction history grows.

**Why this priority**: Cash flow analysis requires fast, accurate reporting that scales efficiently regardless of transaction volume.

**Independent Test**: Can be tested by populating ledger transactions across multiple periods and verifying that cash flow reports compute net cash movement and category breakdowns instantaneously using period balances.

**Acceptance Scenarios**:

1. **Given** ledger periods with posted transactions, **When** loading the Cash Flow report, **Then** net cash flow and period balances are computed directly from aggregated period balance records.
2. **Given** transactions involving money accounts (`isCashOrBank = true`) and non-liquid accounts (`isCashOrBank = false`), **When** viewing the cash flow breakdown, **Then** money accounts contribute exclusively to opening/closing cash balances and net cash movement, while non-liquid accounts are itemized under their respective activity categories.

---

### Edge Cases

- What happens when a user attempts to delete or convert a default money account? The system enforces account deletion protection rules and prevents converting active money accounts with history.
- How does the system handle an account with zero balance and zero entries? The money account toggle remains fully editable until the first transaction is posted.
- What happens if no money accounts exist in the system? The Cash Flow report displays zero opening/closing cash balance and informs the user to configure at least one money account.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST automatically initialize default Cash (`Efectivo`) and Bank (`Cuenta Bancaria`) accounts with the money account flag (`isCashOrBank = true`).
- **FR-002**: System MUST provide a dedicated toggle in the account form for Asset accounts allowing users to specify if an account is a money/liquid account (`isCashOrBank`).
- **FR-003**: System MUST auto-enable the money account toggle when the entered account name contains common cash/bank keywords ("Efectivo", "Caja", "Banco", "MP").
- **FR-004**: System MUST display a non-interactive visual indicator badge on money accounts in account list views instead of editable inline controls.
- **FR-005**: System MUST enforce immutability of the money account flag (`isCashOrBank`) once an account has one or more recorded accounting journal entries.
- **FR-006**: System MUST reject any API payload attempting to modify `isCashOrBank` for an account with posted journal entries with an explicit domain validation error.
- **FR-007**: System MUST calculate the Direct Cash Flow report using aggregated period balance records (`AccountPeriodBalanceEntity`) to ensure instant report generation.
- **FR-008**: System MUST exclude liquid accounts (`isCashOrBank = true`) from the non-liquid breakdown lines of the Cash Flow report, routing them solely to cash balance reconciliation.

### Key Entities

- **Account**: Financial entity representing a ledger account with properties including code, name, type (e.g., Asset, Liability, Equity, Revenue, Expense), parent account, and money account indicator (`isCashOrBank`).
- **Account Period Balance**: Aggregated accounting entity tracking accumulated debits, credits, opening balance, and closing balance for a specific account within a designated financial period.
- **Cash Flow Report**: Financial statement presenting net cash movements and itemized non-liquid cash inflow/outflow activities for a given date range.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Default account setup creates 100% of initial cash/bank accounts with valid money account classification without requiring user intervention.
- **SC-002**: Cash Flow report loads and renders in under 500 milliseconds across historical multi-year accounting periods.
- **SC-003**: 100% of attempts to modify liquidity status on accounts with posted journal entries are blocked, ensuring zero data inconsistency in historical reports.
- **SC-004**: User confusion regarding liquid account assignment is eliminated by replacing inline table controls with explicit modal toggles and status badges.

## Assumptions

- Standard accounting principles apply: cash and cash equivalents (e.g., physical cash, bank accounts, digital wallets) are categorized under Asset account types.
- Period balance aggregation records (`AccountPeriodBalanceEntity`) are automatically updated when transactions are posted or reversed.
- Existing ledger accounts without posted entries can have their liquidity status modified freely.
