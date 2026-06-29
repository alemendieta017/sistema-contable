# Implementation Plan: Consistent Timezone and Date Handling

**Branch**: `008-fix-timezone-handling` | **Date**: 2026-06-29 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/008-fix-timezone-handling/spec.md`

## Summary
Implement a systematic and robust timezone and date handling strategy across the system. 
- **On Write (Write Flow)**: The Next.js frontend will capture the browser's local date selection (e.g. `2026-06-01` in UTC-4) and format it as an ISO-8601 string preserving the client's timezone offset (`2026-06-01T00:00:00.000-04:00`). The NestJS backend parses this string using native JS Date conversion, resolving the correct instant, which TypeORM automatically persists as UTC-0 in the PostgreSQL database.
- **On Read (Read Flow)**: The Next.js frontend receives UTC-0 timestamps and uses native Date local representation methods (e.g., `getFullYear()`, `getMonth()`, `getDate()`) to render the transactions in the correct calendar slots.
- **On Reporting & Filters**: The Next.js frontend sends date range limits (`startDate` and `endDate`) containing local timezone offsets as ISO-8601 strings (e.g. `2026-06-01T00:00:00.000-04:00` for start and `2026-06-30T23:59:59.999-04:00` for end). The backend natively parses these strings using native JS Date conversion to resolve correct UTC boundaries for listing transactions. The backend reports statistics endpoint will accept a `timezoneOffset` parameter to compute accurate monthly report boundaries matching the user's local timezone.

## Technical Context

**Language/Version**: TypeScript (Next.js & NestJS)

**Primary Dependencies**: React 18, Next.js 14, NestJS 10, TypeORM, PostgreSQL

**Storage**: PostgreSQL (`timestamp with time zone`)

**Testing**: Jest (Unit / Integration), Playwright (E2E)

**Target Platform**: Docker-compose (dev environment)

**Project Type**: Monorepo Web Application

**Performance Goals**: Sub-second UI state updates and API responses

**Constraints**: Double-entry bookkeeping ledger integrity must be preserved. Test coverage must remain intact.

**Scale/Scope**: Entire application (Ledger daily, calendar, and monthly views; category statistics report; transaction creation forms).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Ledger Integrity**: Pass. The ledger is append-only. Flipped entries are preserved.
- **SOLID / Clean Architecture**: Pass. The changes will be isolated within the respective UI components and application use cases/controllers, respecting layer boundaries.
- **Monorepo Type Safety**: Pass. Shared types will continue to be respected.
- **Strict TDD**: Pass. We will write unit/integration tests (specifically updating or writing tests for transaction creation and timezone formatting) before implementing changes.

## Project Structure

### Documentation (this feature)

```text
specs/008-fix-timezone-handling/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
└── quickstart.md        # Phase 1 output
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── application/
│   │   ├── ledger/             # create-transaction, reverse-transaction use cases
│   │   └── reports/            # get-category-statistics use case
│   ├── infrastructure/
│   │   ├── controllers/        # ledger.controller, reports.controller
│   │   └── database/           # TransactionEntity schema
└── tests/

frontend/
├── src/
│   ├── app/
│   │   └── transactions/       # page.tsx, asiento-libre/page.tsx
│   ├── components/             # CalendarView, DailyView, MonthlyView, TransactionModal
│   ├── lib/                    # utils.ts (date formatting tools)
│   └── services/               # api.ts (API clients)
└── tests/
```

**Structure Decision**: Option 2: Web application (frontend + backend Monorepo).
All edits will be made in the existing `backend` and `frontend` folders.

## Complexity Tracking

*No violations identified.*
