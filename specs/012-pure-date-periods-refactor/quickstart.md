# Quickstart & Validation Guide

This guide details how to verify that the pure date periods refactor has been successfully implemented and is functionally correct.

## 1. Setup & Environment

Reset the database and seed it with test data (using updated string-date scenarios):

```bash
# In the backend directory
npm run db:reset
```

Run the backend test suite to verify tests pass:

```bash
npm run test
```

## 2. Validation Scenarios

### Scenario 1: Verify Timezone-Agnostic Transaction Inclusion in monthly reports

1. **Action**: Register a transaction with an accounting date on the boundary of a month, e.g. `"2025-06-30"`, with some debit/credit entries.
2. **Action**: Run the June 2025 Balance Sheet or Category Statistics report.
3. **Verify**: The transaction must be included in the totals, regardless of whether your local machine is in Paraguay, UTC, or elsewhere. No date shifts or day boundaries drift should occur.

### Scenario 2: Verify Strict Period Lock Validation

1. **Action**: Set monthly period `"2025-06"` to status `CLOSED`.
2. **Action**: Attempt to create a transaction with `accountingDate` `"2025-06-15"`.
3. **Verify**: The backend must reject the request with `BadRequestException: The accounting period for the transaction date is closed`.
4. **Action**: Attempt to update a transaction from an open period to `accountingDate` `"2025-06-20"`.
5. **Verify**: The backend must reject the request.

### Scenario 3: Verify Fiscal Year monthly periods creation

1. **Action**: Call the endpoint or use the UI to create Fiscal Year `2026` starting `"2026-01-01"` and ending `"2026-12-31"`.
2. **Verify**: Check in the database (or via periods list endpoint) that all 12 generated periods have pure DATE values (e.g., period 1 has `startDate: "2026-01-01"`, `endDate: "2026-01-31"`) with no hour or offset information.
