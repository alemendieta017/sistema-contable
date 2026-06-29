# Implementation Plan: Professional Transaction UI Improvements

**Branch**: `004-professional-transaction-ui` | **Date**: 2026-06-29 | **Spec**: [spec.md](file:///Users/ale/dev/sistema-contable/specs/004-professional-transaction-ui/spec.md)

**Input**: Feature specification from `/specs/004-professional-transaction-ui/spec.md`

## Summary

- **Primary Requirement**: Transform the ledger transactions UI to match professional accounting standards. This includes a higher-density table layout, square corners, month-by-month temporal navigation, a hidden custom date toggle, a professional journal entry modal with autocomplete searching for accounts, and automatic entry balancing.
- **Technical Approach**:
  - Update `page.tsx` metric cards: replace "Gastos" with "Egresos", collapse or scale down padding/fonts on mobile devices (<640px), and remove references to "Partida Doble" in subheaders.
  - Implement a month selector in `TransactionFilters.tsx` utilizing a standard React state to calculate the start and end dates of the selected month automatically, and display custom date ranges only if the custom checkbox is toggled.
  - Refactor `TransactionModal.tsx` and `JournalEntryRow.tsx` to replace the standard HTML account selector with a searchable popover combobox.
  - Add auto-fill amount logic in `TransactionModal.tsx` to automatically set the balancing amount on new entry lines based on the outstanding debit/credit difference.

## Technical Context

**Language/Version**: TypeScript 5.3, React 19, Next.js 15
**Primary Dependencies**: Tailwind CSS v4, Lucide React, Radix UI
**Storage**: Ledger database accessed via API endpoints
**Testing**: Jest, React Testing Library
**Target Platform**: Desktop and Mobile browsers
**Project Type**: Full-stack monorepo
**Performance Goals**: Account dropdown search filters in <50ms, modal form loads instantly.
**Constraints**: Ensure zero rounded corners on tables, strict validation preventing un-balanced debits/credits on saving.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Double-Entry Bookkeeping & Ledger Integrity**: **PASSED**. The backend ledger validation is preserved, and the UI aids correctness via auto-balancing entry lines.
- **Clean Architecture & SOLID Principles**: **PASSED**. UI changes are isolated in frontend component declarations.
- **Monorepo Organization & Unified Type Safety**: **PASSED**. Uses existing API contracts.
- **Budgetary Control and Personal/Family Domain**: **PASSED**. No impact on budget mechanisms.
- **Strict Test-Driven Development (TDD)**: **PASSED**. Component rendering and logic tests will cover the new form and selector.
- **Prevention of Magic Strings & Strict Type Constants**: **PASSED**. Statuses and entry types use type union constants.

## Project Structure

### Documentation (this feature)

```text
specs/004-professional-transaction-ui/
├── plan.md              # This file
├── research.md          # Design decisions and alternatives
├── data-model.md        # Client validation and state definitions
├── quickstart.md        # Manual verification script
└── checklists/
    └── requirements.md  # Specification quality check
```

### Source Code

```text
frontend/
└── src/
    ├── app/
    │   └── transactions/
    │       └── page.tsx           # Page structure, page header, metrics row
    └── components/
        ├── TransactionFilters.tsx # Month switcher, optional custom date picker
        ├── TransactionModal.tsx   # Transaction form dialog, balancing calculations
        └── JournalEntryRow.tsx    # Searchable account select, debit/credit toggle
```

**Structure Decision**: Standard web application monorepo structure. All changes are contained within the `frontend/` workspace.

## Proposed Changes

### Transactions View

#### [MODIFY] [page.tsx](file:///Users/ale/dev/sistema-contable/frontend/src/app/transactions/page.tsx)
- Remove text "Libro diario contable por partida doble" from the header text.
- Modify the counters cards to say "Ingresos", "Egresos" (instead of "Gastos"), and "Saldo Neto".
- Add mobile responsiveness to the metric row: make sure text sizes shrink or adapt to vertical block layout on mobile screen viewports (<640px).
- Simplify overall class paddings and borders to follow high-density, sharp corporate look.

#### [MODIFY] [TransactionFilters.tsx](file:///Users/ale/dev/sistema-contable/frontend/src/components/TransactionFilters.tsx)
- Integrate a monthly navigation control that allows clicking `<` and `>` to decrement/increment the current month, auto-updating date boundaries.
- Add a toggle checkbox labeled "Rango de fechas personalizado".
- Render the Custom Date Range input pickers (desde / hasta) only if the checkbox is checked.

#### [MODIFY] [TransactionModal.tsx](file:///Users/ale/dev/sistema-contable/frontend/src/components/TransactionModal.tsx)
- Clean up headings, labels, and text to omit references to "Partida Doble".
- Implement amount auto-balancing helper: when a new row is added, pre-fill its amount with the current `difference` between debit and credit totals.
- Reduce overall padding/border radius of the modal and button edges.

#### [MODIFY] [JournalEntryRow.tsx](file:///Users/ale/dev/sistema-contable/frontend/src/components/JournalEntryRow.tsx)
- Replace native account select dropdown with a searchable input element that lists and filters available accounts based on user text entry (autocomplete search).
- Apply compact class tags to spacing and fonts.

## Verification Plan

### Automated Tests
- Run `npm test` inside the frontend workspace to verify all components compile and unit tests pass.

### Manual Verification
- Execute verification scenarios detailed in the [Verification Guide](file:///Users/ale/dev/sistema-contable/specs/004-professional-transaction-ui/quickstart.md) to inspect responsiveness, month navigation, custom date range toggling, account autocomplete search, and form balancing.
