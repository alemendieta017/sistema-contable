# Implementation Plan: UI Improvements (Theme, Mobile Layout & Shadcn Charts)

**Branch**: `003-ui-improvements` | **Date**: 2026-06-28 | **Spec**: [spec.md](file:///Users/ale/dev/sistema-contable/specs/003-ui-improvements/spec.md)

**Input**: Feature specification from `/specs/003-ui-improvements/spec.md`

## Summary

- **Primary Requirement**: Fix the dark/light theme toggle, collapse the transactions page metric cards into a single row on mobile, and replace native SVG charts with Shadcn/Recharts charts to resolve label overflow bugs.
- **Technical Approach**: 
  - Define custom `@variant dark (&:where(.dark, .dark *))` in Tailwind CSS v4 in `globals.css` to link class-based dark toggle to Tailwind's compiled styles.
  - Implement responsive conditional layout on the Transactions page: flex-row with dividers on mobile viewports (<640px) vs. standard 3-column grid layout on larger viewports.
  - Install `recharts` and recreate chart components (`PieChart`, `NetWorthChart`, `IncomeStatementChart`) as responsive recharts configurations with correct legends, tooltips, and styles.

## Technical Context

**Language/Version**: TypeScript 5.3, React 19, Next.js 15
**Primary Dependencies**: Tailwind CSS v4, Lucide React, Radix UI, Recharts (NEW)
**Storage**: Client localStorage (theme preference)
**Testing**: Jest, React Testing Library
**Target Platform**: Modern web browsers (mobile and desktop)
**Project Type**: Full-stack web application (NestJS backend, Next.js frontend)
**Performance Goals**: Chart rendering under 300ms, theme toggle transitions under 150ms.
**Constraints**: Tailwind CSS v4 config specificity, responsive mobile width constraints (<640px).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Double-Entry Bookkeeping & Ledger Integrity**: **PASSED**. No changes to the double-entry bookkeeping engine or ledger rules.
- **Clean Architecture & SOLID Principles**: **PASSED**. Custom charts isolated in the frontend components directory.
- **Monorepo Organization & Unified Type Safety**: **PASSED**. Shared type checking preserved.
- **Budgetary Control and Personal/Family Domain**: **PASSED**. Budget visualization charts will use the same data sources.
- **Strict Test-Driven Development (TDD)**: **PASSED**. Chart rendering test files will be updated to match the new Recharts elements.
- **Prevention of Magic Strings & Strict Type Constants**: **PASSED**. Constant arrays of color palettes and config keys are defined cleanly.

## Project Structure

### Documentation (this feature)

```text
specs/003-ui-improvements/
├── plan.md              # This file
├── research.md          # Decision log
├── data-model.md        # Client state structure
├── quickstart.md        # Verification guide
└── checklists/
    └── requirements.md  # Spec checklist
```

### Source Code (repository root)

```text
frontend/
├── package.json
├── src/
│   ├── app/
│   │   ├── globals.css
│   │   └── transactions/
│   │       └── page.tsx
│   └── components/
│       ├── PieChart.tsx
│       ├── NetWorthChart.tsx
│       ├── IncomeStatementChart.tsx
│       └── ThemeToggle.tsx
```

**Structure Decision**: Monorepo layout. All changes will be in the `frontend` project.

## Verification Plan

### Automated Tests
- Run `npm run test` or specific jest tests in `frontend` to verify layout rendering and components compile.

### Manual Verification
- Test light/dark mode persistence in browser `localStorage`.
- Use Chrome dev tools device emulation to verify mobile layout formatting at various mobile breakpoints (320px to 640px).
- Verify tooltip hover states and legend alignments on all three recharts.
