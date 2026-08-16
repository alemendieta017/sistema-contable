# Implementation Plan: Budget Planning Matrix & Execution Control UX (Desktop & Mobile)

**Branch**: `017-budget-planning-ux` | **Date**: 2026-08-15 | **Spec**: [spec.md](file:///C:/Users/amend/.gemini/antigravity/worktrees/sistema-contable/redesign_budget_planning_ux/specs/017-budget-planning-ux/spec.md)

**Input**: Feature specification from `/specs/017-budget-planning-ux/spec.md`

## Summary

This plan defines the technical implementation for the redesigned Budgeting Module, establishing the **Dual-Axis Planning Paradigm** across Desktop and Mobile viewports alongside a dedicated Executive Monthly Control Dashboard (`/budgets/control`).

Key architectural highlights include:

1. **Dual-Axis Planning Paradigm (`/budgets/matrix`)**:
   - **🖥️ Desktop Viewport ($> 768\text{px}$)**: Interactive 12-month spreadsheet matrix occupying 100% available screen width (`w-full`), inline editing, spreadsheet keyboard navigation (`Tab`, `Shift+Tab`, `Enter`, `Shift+Enter`, `Esc`, `Ctrl+D` / `Cmd+D`), multi-cell clipboard paste parsing, and collapsible hierarchical category tree with dynamic parent rollups.
   - **📱 Mobile Viewport ($\le 768\text{px}$)**: Focused "Mes Activo" view featuring a top sticky Fiscal Year selector with horizontal swipeable Month Selector Strip (`[Ene] [Feb] [Mar] ...`), 4 collapsible financial block accordions showing monthly sums in headers, and touch-friendly account cards.
2. **Mobile "Deep-Dive por Rubro" Bottom Sheet**:
   - Vertical 12-month breakdown for a single account line accessible via card tap or 3-dots menu (`•••`).
   - Top mass-distribution action bar: `[ Distribuir parejo ]`, `[ Copiar de Ene a Dic ]` (Replicar), and `[ Traer Real del Año Anterior + % ]`.
3. **Mobile Ergonomics & Micro-Interactions**:
   - **Teclado Numérico Nativo**: `inputmode="numeric"` and `pattern="[0-9]*"` for integer currencies (Guaraníes ₲, 0 decimals) invoking the clean 10-key numeric keypad without decimal point confusion.
   - **Fluid Currency Mask**: Real-time thousands dot formatting without cursor jumping or focus loss.
   - **Thumb Zone Optimization & Sticky Bottom Action Bar**: Controls positioned in the bottom half of the screen; sticky bottom action bar (`[ 💾 Guardar Cambios (N pendientes) ]` & `[ Descartar ]`) slides into view upon dirty state.
   - **Bottom Sheets (Drawers)**: All mobile dialogs (Autorellenar, Presupuestar Cuenta, Reasignar Fondos, Menú 3 puntos, Deep-Dive) render as bottom sheets anchored to the screen bottom with `env(safe-area-inset-bottom)` safe area insets and backdrop dismissal.
4. **4 Executive Financial Blocks**: 🟢 Ingresos (P&L auto-loaded), 🔴 Gastos de Vida (P&L auto-loaded with collapsible category tree), 🔵 Ahorro e Inversiones (Balance Assets on-demand via `+ Presupuestar Activo`), and 🟣 Deudas y Financiación (Balance Liabilities on-demand via `+ Presupuestar Deuda`).
5. **Unified & Streamlined Balance Dialog ("Presupuestar Cuenta")**: A single, clean dialog (modal on desktop, Bottom Sheet on mobile) with 3 core inputs: Account selector, Flow Direction buttons (`[Salida de efectivo]` / `[Entrada de efectivo]`), and Concept. Elimination of nested "+ Agregar sub-línea" buttons inside rows and inline toggle buttons.
6. **3-Dots Options Menu (`•••`)**: Contextual menu per row/card replacing the "MOTOR" column, offering: "Rellenar" (Auto-fill), "Editar" (for balance accounts), "Eliminar" (for on-demand balance rows), and in mobile view "Ver desglose de los 12 meses".
7. **Simplified Auto-Fill ("Autorellenar Presupuesto")**: Clean dialog replacing complex driver jargon with straightforward options (Distribuir monto anual parejo, Replicar adelante, Incremento porcentual mensual, Ponderación histórica, and Traer real del año anterior con ajuste %).
8. **Separated Screen Navigation**: Distinct menu items in the main sidebar for "Planificación Presupuestaria" (`/budgets/matrix`) and "Control de Ejecución" (`/budgets/control`), removing hybrid layout toggles.
9. **Execution Control & Available Residual Engine**: $\text{Available} = \text{Budgeted} - \text{Executed} - \text{Committed}$, mapped to double-entry debits/credits per flow direction, visual color-coded consumption gauge bars (Green <75%, Yellow 75-99%, Red >=100%), and directional inter-account budget transfers (Salida $\leftrightarrow$ Salida, Entrada $\leftrightarrow$ Entrada) with audit logging.
10. **Atomic Persistence & Dirty State Protection**: Batch updates persisted atomically in a single backend transaction, with dirty state warning on navigation.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js v18+, NestJS v10, Next.js 14  
**Primary Dependencies**: TypeORM, NestJS, Zod, React 18, Lucide React, TailwindCSS v4.3, shadcn/ui  
**Storage**: PostgreSQL (TypeORM)  
**Testing**: Jest (Unit & Integration)  
**Target Platform**: Web application (Monorepo with NestJS backend + Next.js frontend + `@sistema-contable/shared` package)  
**Performance Goals**: <100ms cell/card update response time, 60fps spreadsheet grid keyboard navigation across 100% viewport width, smooth mobile touch interactions  
**Constraints**: Double-entry ledger integrity, clean architecture, zero magic strings, strict ESLint compliance (0 errors, 0 warnings), 100% Spanish UI labels, WCAG AA contrast compliance, mobile touch targets $\ge 44\times 44\text{px}$  
**Scale/Scope**: Multi-user financial management with 12 monthly periods per fiscal year across active chart of accounts

## Constitution Check

_GATE: Re-checked post-design. All gates PASSED._

- **I. Double-Entry Bookkeeping & Ledger Integrity**: PASSED. Budget planning and inter-account transfers do not modify posted journal entries directly; ledger records remain immutable. Baseline queries accurately aggregate posted entries via date ranges. Execution engine maps debits and credits strictly according to flow direction.
- **II. Clean Architecture & SOLID**: PASSED. Business logic is encapsulated in dedicated NestJS use cases (`GetBudgetMatrixUseCase`, `UpdateBudgetMatrixUseCase`, `ApplyBudgetDriverUseCase`, `GetPriorYearActualsUseCase`, `GetBudgetControlUseCase`, `TransferBudgetFundsUseCase`). Domain models, use cases, and controllers are strictly separated. Historical baseline queries use deterministic ISO date shifts and indexed date range queries (`tx.accounting_date >= startDate AND tx.accounting_date <= endDate`).
- **III. Monorepo Organization & Unified Type Safety**: PASSED. Shared DTOs, schemas, enums, mobile state interfaces, and API contracts are centralized and exported from `@sistema-contable/shared`.
- **IV. Budgetary Control and Personal/Family Domain**: PASSED. Organizes budgets into 4 executive financial blocks (Ingresos, Gastos de Vida, Ahorro e Inversiones, Deudas y Financiación) with real-time available residual calculations, directional reallocations, and dual-axis planning.
- **V. Strict Test-Driven Development (TDD)**: PASSED. Unit tests for driver math, cash flow rollup, execution control, and integration tests for matrix/control endpoints are defined in the plan and quickstart guide.
- **VI. Prevention of Magic Strings & Strict Type Constants**: PASSED. Section keys (`BudgetMatrixSectionKey`), driver types (`BudgetDriverType`), cash flow directions (`CashFlowDirection`), and gauge statuses (`BudgetGaugeStatus`) are defined as strict TypeScript enums/unions. Visual and accounting semantics are derived directly from the tuple `(account.type, cashFlowDirection)`.
- **VII. Mandatory ESLint Compliance**: PASSED. All code changes adhere to strict ESLint standards with zero errors and zero warnings.

## Project Structure

### Documentation (this feature)

```text
specs/017-budget-planning-ux/
├── spec.md              # Feature specification
├── plan.md              # Implementation plan (this file)
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 API contracts
│   └── budget-planning-api.md
└── tasks.md             # Phase 2 output (/speckit-tasks command)
```

### Source Code (repository root)

```text
shared/
└── src/
    └── index.ts                                 # Shared budget matrix & control schemas, DTO types, enums, mobile planning interfaces

backend/
├── src/
│   ├── domain/
│   │   └── budgets/
│   │       └── budget.model.ts                  # Budget Matrix, Driver, Reassignment domain interfaces
│   ├── application/
│   │   ├── budgets/
│   │   │   ├── get-budget-matrix.use-case.ts    # 12-month matrix fetch, 4-block & category tree aggregations
│   │   │   ├── update-budget-matrix.use-case.ts # Atomic multi-period cell updates across blocks
│   │   │   ├── apply-budget-driver.use-case.ts  # Driver transformation calculations
│   │   │   ├── get-prior-year-actuals.use-case.ts # Baseline historical transactions load via ISO date shift
│   │   │   ├── get-budget-control.use-case.ts   # Executive control dashboard & residual calculations
│   │   │   └── transfer-budget-funds.use-case.ts# Directional budget re-allocation with audit logging
│   │   └── reports/
│   │       └── cash-flow-statement.use-case.ts  # Net cash flow calculations based on cashFlowDirection
│   └── infrastructure/
│       ├── database/
│       │   └── entities/
│       │       ├── budget-item.entity.ts        # Extended with subRowId, subRowLabel, cashFlowDirection
│       │       └── budget-reassignment.entity.ts# Audit entity for budget transfers
│       └── controllers/
│           └── budget.controller.ts             # Matrix & Control HTTP endpoints
└── tests/
    ├── unit/
    │   ├── budget-drivers.spec.ts               # Unit tests for drivers & distribution math
    │   └── budget-control.spec.ts               # Unit tests for execution metrics & directional transfer validation
    └── integration/
        └── budget-matrix.spec.ts                # Integration tests for matrix API & transfers

frontend/
└── src/
    ├── app/
    │   ├── budgets/
    │   │   ├── matrix/
    │   │   │   └── page.tsx                     # Responsive Budget Planning Page (Desktop Grid vs Mobile Active Month View)
    │   │   └── control/
    │   │       └── page.tsx                     # Executive Monthly Control Dashboard & Gauges
    │   └── ...
    ├── components/
    │   ├── Sidebar.tsx                          # Main navigation with separate entries for Matrix & Control
    │   └── budgets/
    │       ├── BudgetMatrixGrid.tsx             # 100% full-width desktop grid, 3-dots row menu, no sticky footer
    │       ├── BudgetMobileView.tsx             # Mobile Active Month container with swipeable strip & block accordions
    │       ├── BudgetMonthStrip.tsx             # Horizontal swipeable month selector strip
    │       ├── BudgetAccountCard.tsx            # Touch-friendly card with numeric input (inputmode="numeric") & 3-dots menu
    │       ├── BudgetDeepDiveDrawer.tsx         # Bottom Sheet for vertical 12-month single-account breakdown + mass actions
    │       ├── BudgetStickyActionBar.tsx        # Mobile Thumb-Zone floating bar for dirty state ([Guardar Cambios] / [Descartar])
    │       ├── BudgetAccountModal.tsx           # Unified dialog (Modal desktop / Drawer mobile) for Balance accounts
    │       ├── AutofillModal.tsx                # Simplified auto-fill dialog (Modal desktop / Drawer mobile)
    │       └── BudgetTransferModal.tsx          # Directional re-allocation transfer dialog (Modal desktop / Drawer mobile)
    ├── hooks/
    │   ├── useMediaQuery.ts                     # Breakpoint hook for mobile/desktop detection (768px)
    │   └── useCurrencyInput.ts                  # Smooth numeric input masking hook for Guaraníes
    └── services/
        └── api.ts                               # API client methods for budget matrix & control
```

**Structure Decision**: Monorepo with shared type safety (`shared`), NestJS backend (`backend`), and Next.js frontend (`frontend`).

## Complexity Tracking

_No violations. Clean Architecture, Monorepo guidelines, and constitutional principles strictly maintained._
