# Implementation Plan: Restore Transaction UI Borders and Look & Feel

**Branch**: `005-restore-transaction-ui` | **Date**: 2026-06-29 | **Spec**: [spec.md](file:///Users/ale/dev/sistema-contable/specs/005-restore-transaction-ui/spec.md)

**Input**: Feature specification from `/specs/005-restore-transaction-ui/spec.md`

## Summary

Restore consistent rounding, borders, shadows, and spacing to the transactions module (Libro Diario) to match the modern, premium design patterns utilized in the Accounts and Budgets screens.

## Technical Context

**Language/Version**: TypeScript / Next.js
**Primary Dependencies**: React, TailwindCSS, Lucide React
**Testing**: Jest / Cypress (if applicable)
**Target Platform**: Web browsers (desktop & mobile)
**Project Type**: Frontend Next.js application
**Performance Goals**: Instant client-side state switches
**Constraints**: Tailwind utility classes for consistent rounding/borders

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Principle II (Clean Architecture / SOLID)**: ✅ Met. Only frontend presentation changes are being done.
- **Principle III (Monorepo & Type Safety)**: ✅ Met. Existing shared types and APIs are unchanged.
- **Principle VI (Prevention of Magic Strings)**: ✅ Met.

## Project Structure

### Documentation (this feature)

```text
specs/005-restore-transaction-ui/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output (N/A, no data model changes)
└── quickstart.md        # Phase 1 output
```

### Source Code

```text
frontend/
└── src/
    ├── app/
    │   └── transactions/
    │       └── page.tsx
    └── components/
        ├── DailyView.tsx
        ├── MonthlyView.tsx
        ├── CalendarView.tsx
        └── TransactionFilters.tsx
```

**Structure Decision**: Standard Next.js frontend pages and components hierarchy is used.

## Proposed Changes

### Frontend Components

#### [MODIFY] [page.tsx](file:///Users/ale/dev/sistema-contable/frontend/src/app/transactions/page.tsx)
- Replace `rounded-sm` with `rounded-2xl` on views wrapper and summary card containers.
- Align background/border colors (e.g. `border-slate-150` to `border-slate-100`).
- Update view switch tab container and inner buttons to use `rounded-xl`.

#### [MODIFY] [DailyView.tsx](file:///Users/ale/dev/sistema-contable/frontend/src/components/DailyView.tsx)
- Update date group sections, transaction rows, and expandable panels to use `rounded-2xl` / `rounded-xl` / `rounded-lg` depending on hierarchy.
- Align action buttons to use standard border rounding.

#### [MODIFY] [MonthlyView.tsx](file:///Users/ale/dev/sistema-contable/frontend/src/components/MonthlyView.tsx)
- Update year selector, cards, and monthly grid cells to use consistent border-radius.

#### [MODIFY] [CalendarView.tsx](file:///Users/ale/dev/sistema-contable/frontend/src/components/CalendarView.tsx)
- Update header selector, calendar grid cells, and day block containers to have modern rounded shapes.

#### [MODIFY] [TransactionFilters.tsx](file:///Users/ale/dev/sistema-contable/frontend/src/components/TransactionFilters.tsx)
- Align filters panel container to use `rounded-2xl` or `rounded-xl`.
- Match inner input check box, select lists, and buttons with consistent rounding.

---

## Verification Plan

### Manual Verification
- Run the Next.js development server.
- Navigate to the `/transactions` page.
- Visually inspect the layout and verify that all corners are rounded, borders look premium and match the design tokens of `/accounts`.
- Test views switching (Diario, Calendario, Mensual) and verify all sub-views render correctly.
