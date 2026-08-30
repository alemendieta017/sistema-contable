# Feature Specification: La Estrategia Correcta para Periodos y Fechas

**Feature Branch**: `012-pure-date-periods-refactor`

**Created**: 2026-07-03

**Status**: Draft

**Input**: User description: "/speckit-specify La Estrategia Correcta para Periodos y Fechas"

## Clarifications

### Session 2026-07-03

- **Scope expansion**: The refactor also applies to the transactions screen, transaction counters, existing migrations, seed scripts, and any date filters/reads/writes across the application.
- **English Naming & Schema Mapping**: The new date field must be named `accountingDate` (mapped to database column `accounting_date` of type `DATE`). The existing `date` column (`TIMESTAMPTZ`) will be renamed/merged into `createdAt` (`created_at`, type `TIMESTAMPTZ`) representing the audit creation time. All database columns and application entities must be in English.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Accurate Monthly Reports Across Timezones (Priority: P1)

As a Paraguay-based accountant, when I run a balance sheet or income statement, I want all transactions recorded on the last day of the month to be correctly included in that month's totals, even if the backend server runs in UTC or a different time zone.

**Why this priority**: Extremely critical to ensure financial reporting accuracy and compliance with local tax authorities.

**Independent Test**: Register a transaction on June 30th at 23:30 local time. Run the June Balance Sheet and verify it is included.

**Acceptance Scenarios**:

1. **Given** a transaction created at local time 23:30 on June 30th (which corresponds to July 1st in UTC), **When** the accountant specifies the date "2026-06-30" as the accounting date (`accountingDate`) and posts it, **Then** the transaction is included in the June monthly balance sheet.
2. **Given** a balance sheet request for June, **When** the system aggregates transactions, **Then** it filters transactions where `accountingDate` is between "2026-06-01" and "2026-06-30", ignoring any timezone offsets or hour ranges.

---

### User Story 2 - Strict Period Locking Validation (Priority: P2)

As a financial administrator, when a monthly period is marked closed, I want the system to block any new transactions or modifications in that period, based on a simple date-string comparison.

**Why this priority**: Prevents changes to finalized accounting books and ensures audit compliance.

**Independent Test**: Attempt to post a transaction with a date within a closed period and verify it is blocked.

**Acceptance Scenarios**:

1. **Given** a closed monthly period with `startDate` "2026-06-01" and `endDate` "2026-06-30", **When** a user attempts to create a transaction with `accountingDate` "2026-06-15", **Then** the operation is rejected.
2. **Given** a transaction in an open period "2026-07" (`accountingDate` "2026-07-05"), **When** the user attempts to change its `accountingDate` to "2026-06-15" (which is closed), **Then** the modification is rejected.

---

### User Story 3 - Clean Creation of Fiscal Years and Periods (Priority: P3)

As a business administrator, when I initialize a new Fiscal Year, the system should generate periods defined by pure dates (YYYY-MM-DD) without hour offsets or zone assumptions.

**Why this priority**: Simplifies system setup and alignment with accounting standards.

**Independent Test**: Create a new Fiscal Year and verify that the periods have pure YYYY-MM-DD boundaries.

**Acceptance Scenarios**:

1. **Given** the creation of Fiscal Year 2026, **When** the system creates the periods, **Then** the monthly periods have `startDate` and `endDate` in "YYYY-MM-DD" format in the database (DATE type).

---

### Edge Cases

- **Timezone boundary shifts**: If a transaction is created exactly at midnight (00:00:00 local time), it must not drift to the previous day when stored in the database. Storing the date as a pure YYYY-MM-DD string/DATE type prevents this.
- **Period Reopening**: If a period is reopened, historical balances must recalculate correctly from transaction `accountingDate` dates rather than transaction creation timestamps.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: Transactions MUST have an `accountingDate` field stored as a PostgreSQL `DATE` (represented as a string in `YYYY-MM-DD` format at the API/TypeScript layer, and database column `accounting_date`).
- **FR-002**: Transactions MUST have a `createdAt` field stored as PostgreSQL `TIMESTAMPTZ` (database column `created_at`) representing the exact mechanical/audit creation time. The existing `date` column is renamed/migrated to this field.
- **FR-003**: Fiscal Years and monthly Periods MUST store their `startDate` (database column `start_date`) and `endDate` (database column `end_date`) boundaries as PostgreSQL `DATE` (represented as `YYYY-MM-DD` string in TypeScript).
- **FR-004**: Period lock validations for transaction entry/modification MUST use pure string comparisons or Date objects without hours/offsets:
  `period.startDate <= transaction.accountingDate && period.endDate >= transaction.accountingDate`.
- **FR-005**: Reports (Balance Sheet, Income Statement) MUST aggregate transactions using the `accountingDate` DATE field, completely ignoring the `createdAt` timestamp.
- **FR-006**: The frontend transactions screen and transaction forms MUST display, read, and write transaction dates using `accountingDate` in `YYYY-MM-DD` format.
- **FR-007**: A database migration MUST be created to rename the existing transaction `date` column to `created_at` (TIMESTAMPTZ) if not already aligned, add `accounting_date` (DATE) to transactions, and alter the start/end dates of periods and fiscal years from `TIMESTAMPTZ` to `DATE`.
- **FR-008**: Transaction counters (e.g. total transactions in period, daily counts) MUST be calculated using `accountingDate` (DATE type) with timezone-agnostic aggregations.
- **FR-009**: All seed scripts MUST be updated to generate transaction, period, and fiscal year dates in pure `YYYY-MM-DD` string format.
- **FR-010**: All application queries, filters, and list views that filter by date (including dashboard charts and ledger views) MUST use pure date comparisons on `accountingDate` (DATE).

### Key Entities _(include if feature involves data)_

- **Transaction**: Represents a financial transaction. Attributes: `id`, `accountingDate` (pure DATE, column `accounting_date`), `createdAt` (TIMESTAMPTZ, column `created_at`), `description`, etc.
- **FiscalYear**: Represents an accounting fiscal year. Attributes: `id`, `year` (int), `startDate` (pure DATE, column `start_date`), `endDate` (pure DATE, column `end_date`), `status` (OPEN/CLOSED).
- **Period**: Represents a monthly accounting period. Attributes: `id`, `fiscalYearId`, `startDate` (pure DATE, column `start_date`), `endDate` (pure DATE, column `end_date`), `status` (OPEN/CLOSED).

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Financial reports match 100% of the transactions registered with a specific `accountingDate` date, regardless of the client browser's local timezone offset or the database server timezone setting.
- **SC-002**: Reopening a closed period or updating transaction dates triggers validations using simple string comparisons that take less than 1ms of application CPU time.
- **SC-003**: 100% of automated tests pass when checking period bounds using timezone-neutral tests.

## Assumptions

- Paraguay local time timezone/DST shifts do not affect transaction dates because no time or offset is saved or evaluated in the accounting date calculations.
- Existing historical transactions can be migrated by setting `accounting_date` to the YYYY-MM-DD date component extracted from their old `date` timestamp.
