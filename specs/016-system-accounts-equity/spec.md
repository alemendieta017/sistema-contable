# Feature Specification: Integration of Equity System Accounts and Fiscal Year Closing

**Feature Branch**: `016-system-accounts-equity`

**Created**: 2026-08-05

**Status**: Draft

**Input**: User description: "Establecer de manera mandatoria e incondicional las Cuentas del Sistema (System Accounts) en el grupo de Patrimonio Neto: Resultado del Ejercicio (NET_INCOME) y Resultados Acumulados (RETAINED_EARNINGS). Eliminar fallbacks sintéticos en memoria, migrar base de datos, adaptar cierre de ejercicio (CloseFiscalYearUseCase) para usar la cuenta del sistema automáticamente y ocultar saldo 0 en el Balance General."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Native Equity System Accounts in Chart of Accounts & Balance Sheet (Priority: P1)

As an accountant or business owner, I want the Balance Sheet (Balance General) to render the dynamic net income and accumulated earnings directly inside standard accounts in my Chart of Accounts (under Patrimonio Neto) rather than generating floating virtual accounts, so that my financial reporting aligns with professional ERP standards.

**Why this priority**: Core architectural requirement for enterprise accounting systems. Eliminates duplicate or disconnected line items in financial statements.

**Independent Test**: Can be verified by viewing the Chart of Accounts and Balance Sheet for any company, confirming that net income and retained earnings appear under the Equity tree hierarchy using real account roles, and that expanding/collapsing depth levels maintains proper tree aggregation.

**Acceptance Scenarios**:

1. **Given** a user viewing the Balance Sheet, **When** calculating net income for the fiscal period, **Then** the dynamic net income is mapped directly to the designated `NET_INCOME` system account under Equity, inheriting its parent group and account code.
2. **Given** a Chart of Accounts for a new or existing company, **When** initialized or migrated, **Then** mandatory system accounts with `system_role = 'NET_INCOME'` and `system_role = 'RETAINED_EARNINGS'` are unconditionally present under Equity.
3. **Given** an accounting balance report at different depth levels, **When** collapsing or expanding nodes under Equity, **Then** system accounts aggregate cleanly into parent Equity nodes based on their account hierarchy.

---

### User Story 2 - Zero-Balance Hiding for System Accounts in Financial Reports (Priority: P2)

As a financial manager, I want system accounts (such as `NET_INCOME` or `RETAINED_EARNINGS`) with a zero balance to be hidden from the Equity section of the Balance Sheet, so that financial reports remain uncluttered and focus only on active accounts.

**Why this priority**: Improves report readability and maintains clean presentation standards expected in financial reporting.

**Independent Test**: Can be verified by viewing a Balance Sheet where net income or retained earnings balance is zero, confirming the zero-balance account is omitted from display.

**Acceptance Scenarios**:

1. **Given** a fiscal period where net income calculation results in 0 (or no activity), **When** generating the Balance Sheet, **Then** the `NET_INCOME` system account is excluded from the Equity list.
2. **Given** a company with a 0 balance in `RETAINED_EARNINGS`, **When** generating the Balance Sheet, **Then** the `RETAINED_EARNINGS` system account is omitted from the Equity section.
3. **Given** a non-zero calculated net income or retained earnings, **When** generating the Balance Sheet, **Then** the account is displayed under Equity with its calculated balance.

---

### User Story 3 - Streamlined Fiscal Year Closing using System Accounts (Priority: P3)

As an accountant, I want to close a fiscal year without having to manually select or specify a target retained earnings account ID in the request, so that the closing process automatically posts to the company's designated `RETAINED_EARNINGS` system account.

**Why this priority**: Reduces manual error risk and simplifies API/UI workflows during period-end procedures.

**Independent Test**: Can be verified by executing a fiscal year close request without passing `retainedEarningsAccountId`, confirming that the system automatically resolves the account with `system_role = 'RETAINED_EARNINGS'` and records the closing entry.

**Acceptance Scenarios**:

1. **Given** an open fiscal year ready for closing, **When** initiating fiscal year close, **Then** the system automatically selects the account with `system_role = 'RETAINED_EARNINGS'` for the company without requiring account selection input.
2. **Given** a closing request payload, **When** sent to the application backend, **Then** `retainedEarningsAccountId` is optional/removed from the request DTO.

---

### Edge Cases

- **Missing System Account Assignment on Legacy Data**: Data migration ensures all existing companies receive designated `NET_INCOME` and `RETAINED_EARNINGS` system roles attached to valid Equity accounts (or creates default Equity accounts if absent).
- **Zero Balance vs Non-Zero Balance Visibility**: If net income is non-zero (even $0.01 positive or negative), it must be visible in Equity; only exact $0.00 balances are hidden.
- **Hierarchical Aggregation at shallow depth (e.g. Level 1 or Level 2)**: When collapsing the Balance Sheet to parent levels, zero-balance child system accounts should not contribute floating entries, while non-zero child system accounts must sum correctly into total Equity.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST unconditionally require two mandatory Equity system accounts per company: `NET_INCOME` (Resultado del Ejercicio) and `RETAINED_EARNINGS` (Resultados Acumulados).
- **FR-002**: System MUST NOT rely on synthetic or in-memory fallback account objects (such as `'virtual-net-income'` or `'virtual-accumulated-results'`) in financial statement calculations.
- **FR-003**: System MUST execute a database migration that assigns the `system_role` values (`NET_INCOME` and `RETAINED_EARNINGS`) to existing Equity accounts or creates them automatically for existing companies.
- **FR-004**: System MUST inject calculated fiscal period net income directly into the real `NET_INCOME` account within the Chart of Accounts tree structure during Balance Sheet generation.
- **FR-005**: System MUST hide any system account (including `NET_INCOME` and `RETAINED_EARNINGS`) from the Equity section of the Balance Sheet if its balance evaluates to zero ($0.00).
- **FR-006**: System MUST update `CloseFiscalYearUseCase` to automatically retrieve and utilize the company's designated account with `systemRole = 'RETAINED_EARNINGS'` without requiring a target account ID parameter in the HTTP DTO.
- **FR-007**: System MUST preserve hierarchical tree structure, account code, and grouping when rendering system accounts in the Balance Sheet across all depth levels.

### Key Entities

- **Account**: System entity representing a node in the Chart of Accounts. Attributes include `id`, `code`, `name`, `type` (e.g., Equity / Patrimonio Neto), `parentId`, and `systemRole` (`NET_INCOME`, `RETAINED_EARNINGS`, etc.).
- **BalanceSheetReport**: Financial report entity representing Assets, Liabilities, and Equity hierarchy, where Equity accounts dynamically reflect period outcomes mapped to real system account nodes.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 100% of companies in the system have explicit `NET_INCOME` and `RETAINED_EARNINGS` system accounts configured in their Chart of Accounts without synthetic virtual fallbacks.
- **SC-002**: 100% of zero-balance system accounts are omitted from the Equity section in generated Balance Sheets across all account tree depth levels.
- **SC-003**: Fiscal year closing execution succeeds without requiring manual selection of retained earnings account IDs in 100% of test scenarios.
- **SC-004**: Tree view consolidation under Equity accurately reflects proper mathematical totals across depth expansion levels 1 through 5.

## Assumptions

- **Existing Account Models**: The domain model already has support for `systemRole` or a similar tagging mechanism on accounts, which will be strictly enforced for `NET_INCOME` and `RETAINED_EARNINGS`.
- **Chart of Accounts Defaults**: Default Chart of Accounts setup scripts for new companies will automatically provision `Resultado del Ejercicio` and `Resultados Acumulados` accounts under Equity.
- **Currency Precision**: Zero balance checks evaluate to standard financial zero ($0.00) after rounding to 2 decimal places.
