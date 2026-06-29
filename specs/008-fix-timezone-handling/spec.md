# Feature Specification: Consistent Timezone and Date Handling

**Feature Branch**: `008-fix-timezone-handling`

**Created**: 2026-06-29

**Status**: Draft

**Input**: User description: "mira el historia de esta conversacion y resolvamos de manera integral el problema de las fechas. El problema de las fechas en la app entera debe resolverse para que no haya este tipo de inconvenientes nunca mas. La fecha desde ser centralizada en el servidor y de acuerdo a ello el frontend reaccionar. Tanto para la lectura y escritura, siempre el backend tendra que respetar lo que le mandan, si le mandan UTC-3 el automaticamente debe convertir a UTC 0, pero bajo ningun motivo hacer creer al usuario que una transaccion de 1 de junio es de mayo"

## Clarifications

### Session 2026-06-29

- Q: ¿Cómo debe enviar el frontend la fecha al crear o modificar transacciones y cómo debe interpretarse? → A: El frontend debe enviar la fecha con la zona horaria (timezone offset) local del cliente (ej. `2026-06-01T00:00:00.000-04:00` para un browser en UTC-4). El backend la recibe, realiza la conversión a UTC-0, y la persiste. Para la lectura, el frontend debe respetar el timezone local del navegador (usando métodos locales de `Date` como `.getMonth()` y `.getDate()`).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Timezone-Respectful Transaction Visualization in Calendar View (Priority: P1)

As an accounting user, I want transactions registered on a specific calendar date (e.g., June 1st) to appear on that exact day in the monthly calendar, respecting my local browser's timezone offset, so that I do not see transactions incorrectly grouped into the previous month.

**Why this priority**: Correct financial representation is critical; showing a June 1st transaction in May causes confusion and data inconsistency for reporting and reconciliation.

**Independent Test**: Register a transaction on June 1st, 2026. Load the calendar view on a device configured with a negative timezone offset (e.g., America/Asuncion UTC-4). Verify the transaction appears on the cell for June 1st.

**Acceptance Scenarios**:

1. **Given** a transaction stored in the system database with date `2026-06-01 04:00:00+00` (which is June 1st 00:00:00 in UTC-4), **When** a user with browser timezone UTC-4 loads the ledger calendar view, **Then** the transaction must be rendered on the slot for June 1st and the month active must be June (not May).

---

### User Story 2 - Accurate Monthly Accumulations and Summaries (Priority: P1)

As a financial administrator, I want transaction amounts to be aggregated under the correct month in the monthly summaries view, respecting my local timezone, so that monthly balances are correct and match the daily general ledger.

**Why this priority**: Financial reports (such as income statements or monthly summaries) must exactly match the sum of daily entries for that calendar month. Shifting a transaction to another month compromises ledger integrity.

**Independent Test**: Load the monthly summary view on a browser set to UTC-4. Verify that the total transaction counts and net amounts for June include the transaction dated June 1st, and that it is not counted in May's totals.

**Acceptance Scenarios**:

1. **Given** a transaction with amount `1,000` base currency stored with date `2026-06-01 04:00:00+00` (June 1st at 00:00:00 in UTC-4), **When** viewing the "Resumen por Año" / "Mensual" dashboard on a device in UTC-4, **Then** the transaction count for June must increment by 1, and the income/expense totals for June must include this transaction's values, while May's counts and totals remain unaffected by this transaction.

---

### User Story 3 - Timezone-Aware Transaction Entry and Normalization (Priority: P2)

As an accounting user, I want to input a transaction on a specific date (e.g., 2026-06-01) from my local timezone (e.g., UTC-4), and have the system normalize and persist it correctly in UTC-0, so that the raw date represents the correct local calendar day selected by the user.

**Why this priority**: Guarantees that write operations align with read operations, ensuring that the date selected by the user is the one stored at UTC in the database and displayed correctly in their timezone.

**Independent Test**: Submit a new transaction via the transaction form on a browser in UTC-4 with the date picker set to June 1st, 2026. Query the database directly to confirm the record date is saved as `2026-06-01 04:00:00+00` (which is `2026-06-01 00:00:00-04:00` local).

**Acceptance Scenarios**:

1. **Given** the transaction creation form is open in a browser with a negative timezone offset (e.g., UTC-4), **When** the user selects the date `2026-06-01` and submits the transaction, **Then** the client sends the ISO date representation containing the timezone offset (`2026-06-01T00:00:00.000-04:00`), and the backend normalizes the transaction date to `2026-06-01T04:00:00.000Z` before persisting to the database.

---

### Edge Cases

- **Transitions across Month/Year Boundaries**: Si una transacción está almacenada en un instante de tiempo que, al convertirse al huso horario local del cliente, cruza la frontera de un día, mes o año (por ejemplo, una transacción grabada como `2026-01-01T00:00:00.000Z` visualizada en un navegador en UTC-4), el frontend **debe** mostrarla en la fecha y mes local resultante (en este caso, 31 de Diciembre a las 20:00 del año anterior). Las agrupaciones y resúmenes mensuales deben calcularse sobre este valor local para mantener coherencia visual.
- **Transactions with exact timestamps vs. pure dates**: Daily ledger entries might sometimes be logged with a timestamp (e.g., a reversion entry created automatically by the backend). The system must extract the absolute UTC calendar day (`2026-06-28` for `2026-06-28 23:18:32.141+00`) and treat it consistently without shifting to another date due to local timezone representation.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: **Centralized UTC Date Schema**: The backend database MUST store all transaction dates in UTC format (using `timestamp with time zone` fields).
- **FR-002**: **Frontend Timezone Preservation on Write**: The frontend MUST send transaction dates containing the client's local timezone offset (e.g., `2026-06-01T00:00:00.000-04:00` for a browser in UTC-4 selecting June 1st). The backend MUST parse this timezone-offset timestamp, convert it to UTC-0, and persist the transaction.
- **FR-003**: **Frontend Timezone-Respecting Parsing on Read**: The frontend MUST parse and display transaction dates respecting the browser's local timezone (using methods such as `.getFullYear()`, `.getMonth()`, `.getDate()`, `.toLocaleDateString()` on the parsed `Date` object). The daily, monthly, and calendar views must all rely on local browser time representation to place and group transactions.
- **FR-004**: **Consistent Filtering Ranges**: Search filters and reports by date range (start date / end date) MUST be converted by the frontend to ISO timestamps containing local timezone offsets representing the boundary limits of those local days (e.g., from `2026-06-01T00:00:00.000-04:00` to `2026-06-30T23:59:59.999-04:00`) before sending them to the API.

### Key Entities *(include if feature involves data)*

- **Transaction**:
  * **date (Timestamp with timezone)**: The primary transaction date, representing the exact instant of the transaction converted to UTC-0.
  * **createdAt (Timestamp with timezone)**: The audit timestamp representing the exact moment the entry was inserted.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of transaction entries in the database are stored in UTC format.
- **SC-002**: Zero shifting of dates across all frontend views (Daily, Calendar, Monthly) when viewed from the same local browser timezone where they were originally recorded.
- **SC-003**: In the calendar and monthly views, a transaction registered on June 1st in UTC-4 appears under June 1st and within June's monthly sums when viewed by a user in UTC-4, with 0% leakage into May's views or sums.

## Assumptions

- **A-001**: The transaction date selected by the user is a calendar date (day-level precision), not a precise down-to-the-second event timeline. Therefore, treating it as a UTC-normalized date is the desired business logic.
- **A-002**: System-generated ledger transactions (such as automatic reversals) can contain real-time timestamps in the database, but for financial grouping and reporting, they are aggregated by their UTC calendar day.
