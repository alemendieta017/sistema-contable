# Implementation Plan: Monthly View Tabular Format

**Branch**: `007-monthly-view-tabular` | **Date**: 2026-06-29 | **Spec**: [spec.md](file:///Users/ale/dev/sistema-contable/specs/007-monthly-view-tabular/spec.md)

**Input**: Feature specification from `/specs/007-monthly-view-tabular/spec.md`

## Summary

This plan outlines the replacement of the monthly transactions grid cards with a clean, professional tabular format. The new layout will utilize a semantic HTML table styled with Tailwind CSS, ensuring alignment, readability, visual hierarchy, hover transitions, and full mobile responsiveness.

## Technical Context

**Language/Version**: TypeScript / Next.js

**Primary Dependencies**: React, TailwindCSS, Lucide React

**Storage**: N/A (Client-side calculations based on fetched transaction lists)

**Testing**: E2E validation and manual inspection

**Target Platform**: Web browsers (Desktop and Mobile viewports)

**Project Type**: Frontend Component Modification

**Performance Goals**: Row hover highlight transition under 150ms. Zero layout shifting during rendering.

**Constraints**: Adhere to Tailwind CSS classes used in the project, preserving dark/light mode compatibility.

## Constitution Check

- **Principle I (Double-Entry Bookkeeping & Ledger Integrity)**: ✅ Met. No calculations are changed; only presentation format.
- **Principle II (Clean Architecture & SOLID)**: ✅ Met. Separates view layout cleanly.
- **Principle III (Monorepo & Type Safety)**: ✅ Met. Type interface matches shared schemas where applicable.
- **Principle VI (Prevention of Magic Strings)**: ✅ Met.

## Project Structure

### Documentation (this feature)

```text
specs/007-monthly-view-tabular/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
└── quickstart.md        # Phase 1 output
```

### Source Code (repository root)

```text
frontend/
└── src/
    └── components/
        └── MonthlyView.tsx  # Component to modify
```

**Structure Decision**: Standard components structure in the Next.js frontend directory.

---

## Proposed Changes

### Frontend Components

#### [MODIFY] [MonthlyView.tsx](file:///Users/ale/dev/sistema-contable/frontend/src/components/MonthlyView.tsx)
- Replace the monthly card grid (`<div className="grid grid-cols-1 md:grid-cols-2 gap-2">...`) with a responsive table container `<div className="w-full overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">`.
- Inside the container, render a semantic HTML `<table className="w-full min-w-[600px] border-collapse text-xs">`.
- Create a Table Header (`<thead>`) with columns:
  - **Mes** (align left)
  - **Transacciones** (align right)
  - **Ingresos** (align right)
  - **Gastos** (align right)
  - **Saldo Neto** (align right)
- In the Table Body (`<tbody>`), loop through the 12 aggregated months (`monthlyData.map(...)`) and render a table row (`<tr>`) for each:
  - Add transition hover styling to the row: `hover:bg-slate-50/50 dark:hover:bg-slate-750/50 transition duration-150`.
  - Add conditional opacity: if a month has 0 transactions, apply `opacity-55 text-slate-450 dark:text-slate-550` to clearly distinguish inactive months while maintaining the annual list.
  - Right-align numeric columns and ensure they format correctly using `formatCurrency(amount, baseCurrency)`.
  - Apply standard colored classes to the "Saldo Neto" column based on positive/negative balance.

---

## Verification Plan

### Manual Verification
- Start Next.js frontend and local backend.
- Go to the Libro Diario page (`/transactions`) and toggle the view to "Mensual".
- Verify that a clean, well-aligned table displays all 12 months.
- Hover over rows and confirm highlight styles.
- Shrink browser width to confirm the table scrolls horizontally within its container without breaking the container card or layout bounds.
