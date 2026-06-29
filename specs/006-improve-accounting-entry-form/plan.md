# Implementation Plan: Improve Accounting Entry Form UI

**Branch**: `006-improve-accounting-entry-form` | **Date**: 2026-06-29 | **Spec**: [spec.md](file:///Users/ale/dev/sistema-contable/specs/006-improve-accounting-entry-form/spec.md)

**Input**: Feature specification from `/specs/006-improve-accounting-entry-form/spec.md`

## Summary

Improve the visual presentation of journal entry forms (the "Asiento Libre" page and the "TransactionModal" modal component). It switches from a card-based input structure to a clean, line-by-line table-like row layout, scales down the oversized "Debe" / "Haber" indicators, and dynamically integrates the default currency's symbol and decimals into all input placeholders and totals.

## Technical Context

**Language/Version**: TypeScript / Next.js
**Primary Dependencies**: React, TailwindCSS, Lucide React
**Testing**: Vitest / Playwright (if applicable)
**Target Platform**: Web browsers (desktop & mobile)
**Project Type**: Web application
**Performance Goals**: Instant client-side additions and balance recalculations
**Constraints**: Tailwind utility classes for consistent rounding, alignments, and fonts.

## Constitution Check

- **Principle I (Double-Entry Bookkeeping & Ledger Integrity)**: ✅ Met. Calculations are preserved.
- **Principle II (Clean Architecture & SOLID)**: ✅ Met. Visual presentation changes only.
- **Principle III (Monorepo & Type Safety)**: ✅ Met. No types are modified.
- **Principle VI (Prevention of Magic Strings)**: ✅ Met.

## Project Structure

### Documentation (this feature)

```text
specs/006-improve-accounting-entry-form/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output (N/A)
└── quickstart.md        # Phase 1 output
```

### Source Code (repository root)

```text
frontend/
└── src/
    ├── app/
    │   └── transactions/
    │       └── asiento-libre/
    │           └── page.tsx
    └── components/
        ├── TransactionModal.tsx
        └── JournalEntryRow.tsx
```

**Structure Decision**: Standard Next.js pages and components structure.

## Proposed Changes

### Frontend Components

#### [MODIFY] [page.tsx](file:///Users/ale/dev/sistema-contable/frontend/src/app/transactions/asiento-libre/page.tsx)
- Increase container limit from `max-w-md` to `max-w-3xl` (or `max-w-4xl`) for a spacious layout.
- Fetch currencies on mount via `api.currencies.list()` and find the base currency.
- Replace card loops with a clean row-based layout.
- Introduce table-like header labels: "Cuenta / Categoría", "Tipo", "Monto", and "Acción".
- Standardize the "Debe/Haber" toggle selector using a small segment control instead of the native `select`.
- Dynamically format placeholders for amount inputs (e.g. `(0).toFixed(baseCurrency.decimalPlaces)`).
- Prefix amount inputs with the base currency's symbol.
- Format all totals and differences using `formatCurrency(amount, baseCurrency)`.
- Align typography and borders to be premium and clean.

#### [MODIFY] [JournalEntryRow.tsx](file:///Users/ale/dev/sistema-contable/frontend/src/components/JournalEntryRow.tsx)
- Accept `baseCurrency` prop to format placeholders and symbol indicators.
- Clean up borders, inputs, and toggle sizes.
- Decrease text sizes for "DEBE" / "HABER" labels and active state styling to feel balanced.
- Ensure proper alignment in the flex/grid columns.

#### [MODIFY] [TransactionModal.tsx](file:///Users/ale/dev/sistema-contable/frontend/src/components/TransactionModal.tsx)
- Fetch currencies if not already loaded, find base currency, and pass it down to `JournalEntryRow`.
- Check spacing and verify layout aligns perfectly with the updated `JournalEntryRow`.
- Format modal totals and difference labels with the correct currency symbol and decimals.

---

## Verification Plan

### Manual Verification
- Start Next.js server and open `/transactions/asiento-libre`.
- Verify the line-based design and the proportion of "Debe" / "Haber" indicators.
- Verify placeholders display correct decimals based on base currency configuration (e.g. 0 decimals for PYG, 2 for USD).
- Open Transaction modal from `/transactions` page and inspect row layouts.
