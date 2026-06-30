# Implementation Plan: Transaction Screen UI/UX Improvements

**Branch**: `009-improve-transactions-ui` | **Date**: 2026-06-30 | **Spec**: [spec.md](file:///Users/ale/dev/sistema-contable/specs/009-improve-transactions-ui/spec.md)

**Input**: Feature specification from `/specs/009-improve-transactions-ui/spec.md`

## Summary

This feature addresses UI/UX clutter, inconsistency, and bugs on the Transactions page:
1. **Header Reorganization**: Groups page title, view selection (Diario/Calendario/Mensual), and summary counters into a unified, card-style header component.
2. **Mobile Optimizations**: Constrains summary counters to a single row using a CSS grid (`grid-cols-3`) with reduced padding and text truncation to ensure cards fit perfectly without horizontal scroll or overflow.
3. **Date Filters Refactoring & Independence**: Hides standard date range picker filters in `TransactionFilters` for Calendar and Monthly views. Implements independent date state objects (`dailyDates`, `calendarDates`, `monthlyDates`) in `TransactionsPage` so that switching between views preserves each view's date context without overwriting them. Reacts to changes by calculating `activeStartDate`/`activeEndDate` and refetching.
4. **Redundancy Elimination**: Removes secondary yearly counters inside `MonthlyView` since page-level counters now reflect yearly context.
5. **Theme & Contrast Fixes**: Standardizes custom Tailwind v4 colors (removing non-existent custom shades like `slate-750`, `indigo-650`, `red-555`) to fix broken hover states, invisible day borders in dark mode, and invisible buttons in light mode.

## Technical Context

**Language/Version**: TypeScript / React (Next.js)
**Primary Dependencies**: React 19, TailwindCSS v4, Lucide React
**Testing**: Jest / React Testing Library
**Target Platform**: Web (Desktop & Mobile viewports)
**Project Type**: Web Application Frontend
**Performance Goals**: Instant transitions between views and themes without rendering delays.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Rule compliance**: ESLint and Prettier rules must be followed. Standard Tailwind colors must be used to ensure full compliance with the theme system.
- **Ledger Integrity**: No changes are made to ledger logic; purely UI enhancements.

## Project Structure

### Documentation (this feature)

```text
specs/009-improve-transactions-ui/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── checklists/
    └── requirements.md  # Specification quality checklist
```

### Source Code

```text
frontend/
├── src/
│   ├── app/
│   │   ├── accounts/
│   │   │   └── page.tsx        # Modify: fix "Agregar Cuenta" button contrast
│   │   │   └── manage/
│   │   │       └── page.tsx    # Modify: fix custom Tailwind classes
│   │   └── transactions/
│   │       └── page.tsx        # Modify: integrate header and sync date/fetch states
│   └── components/
│       ├── CalendarView.tsx    # Modify: sync date navigation to parent, fix dark mode borders
│       ├── MonthlyView.tsx     # Modify: sync year navigation, remove redundant counters
│       └── TransactionFilters.tsx # Modify: hide date pickers when viewing calendar/monthly
```**Structure Decision**: Monorepo Frontend Next.js app. Modifying existing components under `frontend/src/app` and `frontend/src/components`.

## Proposed Changes

### Frontend Component Layer

#### [MODIFY] [page.tsx](file:///Users/ale/dev/sistema-contable/frontend/src/app/transactions/page.tsx)
- Reorganize the top section to group page title, segmented controls, and counters into a unified card header.
- Implement independent dates state: `dailyDates`, `calendarDates`, and `monthlyDates`.
- Add a combined reactive `useEffect` that fetches transactions using computed active date boundaries `activeStartDate` and `activeEndDate`.
- Render the summary counters container using a CSS grid (`grid grid-cols-3 gap-2 sm:gap-4`) and modify each counter card to use compact margins, smaller padding (`p-2 sm:p-3`), text truncation, and `min-w-0` to avoid horizontal scroll or screen overflow on mobile.

#### [MODIFY] [TransactionFilters.tsx](file:///Users/ale/dev/sistema-contable/frontend/src/components/TransactionFilters.tsx)
- Modify `TransactionFiltersProps` to replace `onStartDateChange` and `onEndDateChange` with a single unified `onDateRangeChange(start, end)` handler.
- When rendering in `daily` view, change selectors or input date pickers to call `onDateRangeChange`.
- Ensure standard date pickers are completely hidden when in `calendar` or `monthly` views, relying on sub-view internal navigation instead.

#### [MODIFY] [CalendarView.tsx](file:///Users/ale/dev/sistema-contable/frontend/src/components/CalendarView.tsx)
- Connect navigation buttons (previous/next month) to invoke `onMonthChange` with the first day of the target month.
- Standardize dark mode calendar cell borders by replacing non-existent/invalid custom colors with standard Tailwind CSS v4 borders (e.g. `border-slate-700` or `border-slate-100`).

#### [MODIFY] [MonthlyView.tsx](file:///Users/ale/dev/sistema-contable/frontend/src/components/MonthlyView.tsx)
- Remove the redundant yearly summary counters at the bottom of the monthly view grid.
- Ensure year navigation (previous/next year buttons) calls `onYearChange` to reload data for the selected year.

#### [MODIFY] [page.tsx](file:///Users/ale/dev/sistema-contable/frontend/src/app/accounts/page.tsx) and [page.tsx](file:///Users/ale/dev/sistema-contable/frontend/src/app/accounts/manage/page.tsx)
- Correct broken custom Tailwind CSS classes (e.g. replacing `bg-indigo-650` with standard `bg-indigo-600` or `indigo-500` to fix the "Agregar Cuenta" button contrast in light mode).

## Verification Plan

### Automated Tests
- Run `npm run build` inside `frontend/` to verify that all Tailwind properties compile successfully and TypeScript types resolve without compilation errors.

### Manual Verification
- Test all validation scenarios detailed in [quickstart.md](file:///Users/ale/dev/sistema-contable/specs/009-improve-transactions-ui/quickstart.md) for theme consistency, compact mobile counters (ensuring no scroll lateral), and independent date navigation across Daily, Calendar, and Monthly tabs.

## Complexity Tracking

*No violations.*
