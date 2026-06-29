# Data Model: Consistent Timezone and Date Handling

This document details the data structures and validations involved in the timezone fix. No schema migrations are required, as the existing schema is already compatible.

## Existing Schema Preservation

### Transaction Entity (`transactions` table)

The schema remains unchanged. We utilize PostgreSQL's native `timestamp with time zone` to store dates.

| Column | Type | Nullable | Default | Description |
| :--- | :--- | :---: | :---: | :--- |
| **id** | `uuid` | No | `uuid_generate_v4()` | Primary key. |
| **date** | `timestamp with time zone` | No | - | The transaction date (converted to UTC-0). |
| **description** | `varchar` | No | - | Transaction summary. |
| **status** | `varchar(10)` | No | `'POSTED'` | Can be `'POSTED'` or `'REVERSED'`. |
| **reversal_of_id** | `uuid` | Yes | - | Reference to reversed transaction. |
| **created_at** | `timestamp with time zone` | No | `now()` | Audit timestamp. |

---

## Validation & Normalization Rules

### 1. Frontend Form Submission (Write)
- **Input Field**: Date string in format `YYYY-MM-DD` (captured from `<input type="date">`).
- **Transformation**: Append start-of-day time (`00:00:00.000`) and the browser's current timezone offset for that date.
  - Form: `YYYY-MM-DDT00:00:00.000[+-]HH:MM`
- **Example Validation**:
  - Input: `2026-06-01`
  - Browser Timezone: America/Asuncion (UTC-4)
  - String payload: `2026-06-01T00:00:00.000-04:00`

### 2. Backend DTO Validation & Parsing
- **DTO validation**: `CreateTransactionDto` has `date` field validated as a non-empty ISO-8601 string.
- **ORM parsing**: NestJS parses this string into a standard JS `Date` object:
  - `new Date("2026-06-01T00:00:00.000-04:00")` $\rightarrow$ `2026-06-01T04:00:00.000Z`
- **PostgreSQL Persistence**: The database driver saves it directly as `2026-06-01 04:00:00+00`.

### 3. Backend Reports Boundary Calculations
- **Input**: `period: "YYYY-MM"`, `timezoneOffset: number` (offset in minutes, e.g. `240` for UTC-4).
- **Transformation**:
  - Parse `year` and `month` from `period`.
  - Construct local start-of-month and end-of-month dates using the timezone offset to calculate the matching UTC boundaries.
  - Let $O$ be the timezone offset in minutes.
    - $\text{Start Date (UTC)} = \text{Date.UTC}(year, month - 1, 1) + O \times 60 \times 1000$ milliseconds.
    - $\text{End Date (UTC)} = \text{Date.UTC}(year, month, 0, 23, 59, 59, 999) + O \times 60 \times 1000$ milliseconds.
  - These boundaries are passed to the SQL query to select all transactions within the user's local month.

### 4. Backend Transactions List Query Calculations
- **Input**: `startDate` (ISO-8601 string), `endDate` (ISO-8601 string) containing timezone offsets.
- **Transformation**:
  - Instantiate parameters directly: `new Date(startDate)` and `new Date(endDate)`.
  - These Date objects automatically resolve to the correct UTC-0 instants matching the user's local day boundaries (e.g. `2026-06-01T00:00:00.000-04:00` $\rightarrow$ `2026-06-01T04:00:00.000Z` for UTC-4 offset).
  - The parsed UTC-0 boundaries are passed to the TypeORM query builder: `tx.date >= :startDate` and `tx.date <= :endDate`.

