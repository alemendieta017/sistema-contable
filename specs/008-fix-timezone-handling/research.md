# Research: Timezone and Date Handling Design

This document consolidates findings, design decisions, and alternatives considered for resolving timezone date shifts in the monorepo.

## Findings & Current Code Behavior

1. **Database Schema**:
   The table `transactions` uses column `date` of type `timestamp with time zone`. PostgreSQL stores this in UTC-0.
   - Example transaction ("Salario") is saved as `2026-06-01 00:00:00+00` (UTC).

2. **Frontend Read Flow**:
   - `CalendarView.tsx` parses using `new Date(tx.date)` and extracts values using local timezone methods (`.getFullYear()`, `.getMonth()`, `.getDate()`).
   - For an absolute UTC midnight timestamp like `2026-06-01 00:00:00+00`, users with negative browser timezone offsets (e.g. UTC-3 or UTC-4) see this converted to `2026-05-31 21:00:00` or `2026-05-31 20:00:00` respectively.
   - This shifts the transaction into **May**, causing incorrect placement in the calendar and exclusion from June's monthly summaries.

3. **Frontend Write Flow**:
   - `TransactionModal.tsx` and `asiento-libre/page.tsx` take date input (e.g. `"2026-06-01"`) and convert it using `new Date(date).toISOString()`, which evaluates it as UTC midnight and sends `"2026-06-01T00:00:00.000Z"` to the backend. This creates the mismatch on read.

4. **Monthly Reports / Statistics**:
   - `/api/reports/statistics` evaluates the monthly range strictly using pure UTC limits:
     `startDate = new Date(Date.UTC(year, month - 1, 1))`
     `endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999))`
   - Transactions recorded with timezone shifts near month boundaries get grouped into the wrong month relative to the user's local timezone.

---

## Design Decisions

### 1. Write Flow: Client Timezone Offset Preservation
- **Decision**: The frontend must send transaction timestamps containing the browser's exact timezone offset at the selected calendar date.
- **Implementation**: Create a helper function `formatLocalDateWithOffset(dateStr: string): string` in `frontend/src/lib/utils.ts`. It takes a `"YYYY-MM-DD"` value, constructs a local start-of-day date, computes the timezone offset in minutes, and generates the ISO-8601 string.
  - *Example*: A browser in UTC-4 selecting June 1st sends `2026-06-01T00:00:00.000-04:00`.
- **Backend processing**: The backend parses this string natively into a JS Date which is automatically saved by TypeORM in UTC format (`2026-06-01 04:00:00+00`).

### 2. Read Flow: Local Timezone Representation
- **Decision**: Keep using the local representation methods (`.getFullYear()`, `.getMonth()`, `.getDate()`) on the frontend, as they correctly convert the UTC timestamp from the database back into the user's local timezone.
  - *Example*: `2026-06-01 04:00:00+00` parsed in UTC-4 converts back to `2026-06-01 00:00:00-04:00` (June 1st).
- **Updates**:
  - Refactor `DailyView.tsx` to group transactions by their local calendar day string (instead of `.toISOString()`), so that all frontend views display consistent dates.
  - Refactor components (`CalendarView.tsx`, `MonthlyView.tsx`, etc.) to parse and manipulate dates consistently using local timezone methods.

### 3. Statistics Endpoint Timezone Integration
- **Decision**: Update `/api/reports/statistics` to support a `timezoneOffset` query parameter.
- **Implementation**: The Next.js frontend will append its current timezone offset (e.g. `new Date().getTimezoneOffset()`) to the API request. The backend will use this offset to shift the start and end boundaries of the requested month into the corresponding UTC values.
  - *Example*: For June 2026 and offset +240 (UTC-4), the boundaries will shift from UTC-midnight to:
    - Start: `2026-06-01T04:00:00.000Z`
    - End: `2026-07-01T03:59:59.999Z`

### 4. Transactions List Endpoint Timezone Integration
- **Decision**: Send date range query limits (`startDate` and `endDate`) containing timezone offsets as ISO-8601 strings from the frontend, and parse them natively on the backend.
- **Implementation**: The Next.js frontend will use helper functions to format the selected calendar boundaries (`T00:00:00.000` for start date, `T23:59:59.999` for end date) with the browser's local timezone offset. The backend list endpoint (`GET /api/transactions`) simply instantiates these parameters using the native JS `Date` constructor, resolving the exact UTC boundaries natively without needing separate offset parameters.
  - *Example*: A client in UTC-3 queries June 1st to June 30th.
    - Frontend sends: `startDate=2026-06-01T00:00:00.000-03:00&endDate=2026-06-30T23:59:59.999-03:00`
    - Backend parses to UTC: `startDate = 2026-06-01T03:00:00.000Z`, `endDate = 2026-07-01T02:59:59.999Z`

---

## Alternatives Considered

1. **Timezone-Agnostic Database Persistence (Pure Dates)**:
   - *Alternative*: Store dates as text fields `"YYYY-MM-DD"` or as UTC midnight dates and force the frontend to always parse them using UTC methods (e.g., `getUTCDate()`).
   - *Why rejected*: Storing dates without timezone offsets throws away audit capability and prevents logging precise creation moments. PostgreSQL's native `timestamp with time zone` is the standard for monorepos, and preserving the user's exact input offset on write allows standard database features (indexing, grouping) to function correctly.
