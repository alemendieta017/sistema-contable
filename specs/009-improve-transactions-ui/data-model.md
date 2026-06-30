# Data Model: Transaction Screen UI/UX Improvements

## Overview
This feature introduces no changes to the backend database schema, entities, or DTO contract structures. The existing schema and transaction models are fully preserved.

## Client-Side UI View State
To support reactive rendering and tab date independence, client-side state is updated to track dates per view tab:

| State Key | Source | Scope | Purpose |
|---|---|---|---|
| `dailyDates` | Parent page state | `TransactionsPage` | Object `{ start, end }` representing current date range for the Daily view. |
| `calendarDates` | Parent page state | `TransactionsPage` | Object `{ start, end }` representing current month range for the Calendar view. |
| `monthlyDates` | Parent page state | `TransactionsPage` | Object `{ start, end }` representing current year range (Jan 1 - Dec 31) for the Monthly view. |
| `view` | Parent page state | `TransactionsPage` | Current active layout view (`daily` \| `calendar` \| `monthly`). |
| `activeStartDate` | Calculated property | `TransactionsPage` | Lower boundary date for fetching transactions, mapped from active view's dates. |
| `activeEndDate` | Calculated property | `TransactionsPage` | Upper boundary date for fetching transactions, mapped from active view's dates. |

### View Transitions State Adjustments
- **Switching tabs**: Keeps dates independent. Changing the active view tab restores the saved dates (`dailyDates`, `calendarDates`, or `monthlyDates`) as the active date range parameters without resetting/overwriting them.
- **Diario View Date Changes**: Updates `dailyDates`.
- **Calendario View Date Changes**: Updates `calendarDates` for the navigated month.
- **Mensual View Date Changes**: Updates `monthlyDates` for the navigated year.
