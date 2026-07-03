# Research: Pure Date-Based Periods and Accounting Dates

## Summary of Decisions

1. **Database Schema**:
   - Change `transactions.date` column: Rename/merge to `transactions.created_at` (type `TIMESTAMPTZ`) representing audit/creation timestamp.
   - Introduce `transactions.accounting_date` (type `DATE`) representing the accounting date.
   - Modify `fiscal_years.start_date` and `fiscal_years.end_date` from `TIMESTAMPTZ` to `DATE`.
   - Modify `periods.start_date` and `periods.end_date` from `TIMESTAMPTZ` to `DATE`.
   
2. **Type Mapping (TypeScript / Zod)**:
   - Represent PostgreSQL `DATE` columns as simple TypeScript `string` primitives formatted as `YYYY-MM-DD`.
   - Validation in Zod: `z.string().regex(/^\d{4}-\d{2}-\d{2}$/)` or simple `z.string()`.
   
3. **Period Bounds Validation**:
   - Implement timezone-agnostic string range checks: `period.startDate <= tx.accountingDate && period.endDate >= tx.accountingDate`.

---

## Rationale & Timezone Issues

### The Problem with Timestamps (TIMESTAMPTZ)
When storing transaction dates as `TIMESTAMPTZ` (timestamps with timezone offsets), the database preserves the exact point in time. However, accounting rules are based on "civil dates". 
For example, if an accountant in Paraguay (UTC-4 or UTC-3 depending on DST) enters a transaction on June 30th at 23:30, the timestamp stored in UTC is July 1st at 02:30 or 03:30.
When the system aggregates monthly transactions using database-level date functions or simple filters, the June transaction gets classified under July, corrupting the June Balance Sheet and Income Statement.

### Why Pure DATE (YYYY-MM-DD) is the Correct Strategy
1. **Timezone Immunity**: A pure `DATE` has no time components or offset info. It is recorded exactly as the user specified (e.g., `'2026-06-30'`) and is returned exactly the same way, regardless of whether the server runs in UTC or the client is in Paraguay.
2. **Deterministic String Comparisons**: Comparing `YYYY-MM-DD` strings lexicographically is natively supported in JS/TS and SQL. It executes in less than 1ms and has zero timezone translation overhead.
3. **Simplicity in Seeding & Testing**: Seed scripts can define dates as literal string constants (e.g. `'2025-01-02'`) without worrying about UTC shifts during execution.

---

## Alternatives Considered

### Alternative A: Keep TIMESTAMPTZ and offset queries dynamically in the application
- *Why rejected*: Highly complex. Every SQL query performing date grouping or filters must receive the user's timezone offset and convert the timestamp using `AT TIME ZONE`. This makes caching difficult, slows down database aggregations, and increases the likelihood of bugs on DST transition days.

### Alternative B: Store UTC midnight timestamps
- *Why rejected*: Even if stored as UTC midnight (e.g. `2026-06-30T00:00:00.000Z`), local client code or libraries converting it to local `Date` objects will drift it (e.g., displaying `2026-06-29T20:00:00` in Paraguay). Keeping the type as `DATE` (string in TS) prevents JS `Date` parser from mutating the values.
