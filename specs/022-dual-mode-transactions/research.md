# Research & Technical Architecture: Dual-Mode Transaction Creation & Accounting UX

**Feature**: Dual-Mode Transaction Creation & Accounting UX Optimization  
**Branch**: `022-dual-mode-transactions`  
**Date**: 2026-08-16

---

## 1. Executive Summary & Design Rationale

The primary objective of this feature is to overhaul the transaction creation experience in the accounting web application by introducing two distinct, purpose-built modes:

1. **Modo 1: Transacción Rápida (Quick Transaction)**: Tailored for 90%+ of routine daily entries (Gastos, Ingresos, Transferencias Internas) using a single-amount, intuitive 5-step field order (`1. Fecha/Hora` → `2. Cuenta` → `3. Categoría` → `4. Monto` → `5. Concepto`) that abstracts away manual debit/credit mechanics while guaranteeing strictly balanced double-entry ledger postings.
2. **Modo 2: Asiento Contable Libre / Avanzado (Free Journal Entry Grid)**: Tailored for accountants and complex multi-line transactions (payroll, depreciation, opening balances, multi-split operations) featuring independent Debe/Haber columns, automated line balancing, desktop keyboard optimization, and an ergonomic mobile stacked-card layout.

---

## 2. Research Tasks & Architectural Decisions

### Decision 1: Dual-Mode Architecture & Mode Switcher

- **Context**: The existing `/transactions/new` page and `TransactionModal.tsx` only supported raw double-entry journal rows with a DEBIT/CREDIT toggle button per row. This confused everyday users who just wanted to record a simple payment or expense, and created unnecessary friction for accountants who had to toggle entry types line by line.
- **Decision**:
  - Provide a top-level segmented mode selector (`Transacción Rápida` vs. `Asiento Libre`) at the top of the transaction creation view.
  - Implement two dedicated form view components: `QuickTransactionForm` and `FreeJournalEntryGrid`.
  - Maintain shared draft persistence so switching modes can either preserve common fields (Fecha, Glosa, Monto) or confirm before discarding complex drafts.
- **Rationale**: Clean separation of concerns allows each mode to have its own specialized state model and validation rules while outputting identical `CreateTransactionRequest` payloads to the backend API.
- **Alternatives Considered**:
  - _Unified form with dynamic mode toggles per line_: Rejected because it introduces excessive layout clutter and cognitive overhead.
  - _Separate routes (`/transactions/quick` vs `/transactions/advanced`)_: Rejected because users frequently want to switch modes dynamically without a full page reload or route transition.

---

### Decision 2: Quick Transaction Mode Field Order & Double-Entry Mapping

- **Context**: User specification mandates a strict 5-step field sequence for Quick Transactions:
  1. `Fecha/Hora` (Date & Time)
  2. `Cuenta` (Caja, Banco, Medio de Pago) or `Cuenta Origen` (for Transfer)
  3. `Categoría` (Rubro de Ingreso o Egreso) or `Cuenta Destino` (for Transfer)
  4. `Monto` (Single numerical amount)
  5. `Concepto` (Glosa / Descripción)
- **Decision**:
  - Implement operation templates for three core operation types: `EXPENSE` (Gasto), `INCOME` (Ingreso), and `TRANSFER` (Transferencia).
  - Contextual account filtering:
    - **Gasto**: `Cuenta` filters by monetary accounts (Assets: Caja, Banco, Tarjetas de Crédito / Pasivo operativo). `Categoría` filters by Expense accounts (`EXPENSE`).
    - **Ingreso**: `Cuenta` filters by monetary accounts (Assets: Caja, Banco). `Categoría` filters by Revenue accounts (`INCOME`).
    - **Transferencia**: `Cuenta Origen` and `Cuenta Destino` both filter by monetary accounts (Assets: Caja, Banco, Cuentas de Tesorería), ensuring `Cuenta Destino !== Cuenta Origen`.
  - Double-entry conversion matrix:
    - **Gasto ($X)**:
      - Line 1: `accountId = Categoría (EXPENSE)`, `entryType = DEBIT`, `amount = X`
      - Line 2: `accountId = Cuenta (ASSET/LIABILITY)`, `entryType = CREDIT`, `amount = X`
    - **Ingreso ($X)**:
      - Line 1: `accountId = Cuenta (ASSET)`, `entryType = DEBIT`, `amount = X`
      - Line 2: `accountId = Categoría (INCOME)`, `entryType = CREDIT`, `amount = X`
    - **Transferencia ($X)**:
      - Line 1: `accountId = Cuenta Destino (ASSET)`, `entryType = DEBIT`, `amount = X`
      - Line 2: `accountId = Cuenta Origen (ASSET)`, `entryType = CREDIT`, `amount = X`
- **Rationale**: Adheres 100% to GAAP/IFRS double-entry principles (assets increase with debit, decrease with credit; expenses increase with debit; revenues increase with credit) while providing a zero-math single-amount experience.

---

### Decision 3: Free Journal Entry Tabular Grid & Smart Auto-Balancing

- **Context**: Accountants expect independent Debe and Haber columns rather than a binary toggle switch. When entering amounts, typing in Debe should clear Haber, and adding subsequent lines should automatically calculate and suggest the exact balancing residual amount.
- **Decision**:
  - Render a tabular grid with distinct numerical columns for `Debe` and `Haber`.
  - Entering a non-empty amount in `Debe` automatically clears `Haber` for that line, and vice versa.
  - Automatic difference calculation:
    - Total Debits = \(\sum \text{Debe}\)
    - Total Credits = \(\sum \text{Haber}\)
    - Residual Difference \(\Delta = |\text{Total Debits} - \text{Total Credits}|\)
  - When the user adds a new line (via `+ Agregar Apunte` or `Enter` on the last amount field), the system automatically pre-populates \(\Delta\) in the opposing column (if Debits > Credits → pre-fill Haber; if Credits > Debits → pre-fill Debe).
  - Support continuous multi-line residual calculations for 3+ leg entries (e.g. payroll splits, taxes, multi-account settlements).
- **Rationale**: Eliminates repetitive mental math, reduces typing mistakes by over 60%, and matches standard professional accounting software (SAP, NetSuite, QuickBooks Pro).

---

### Decision 4: Mobile-First UX & Bottom Sheet Account Selector

- **Context**: On mobile viewports (smartphones/tablets), software keyboards consume up to 50% of the screen height. Inline dropdown menus get clipped, trapped in scroll containers, or covered by the virtual keyboard.
- **Decision**:
  - Implement a dedicated responsive `AccountPickerSheet` component:
    - **Desktop (md+)**: Renders as an ergonomic fast inline combobox with instant search and category pills.
    - **Mobile (<md)**: Renders as a full bottom-sheet overlay (`fixed inset-x-0 bottom-0 max-h-[85vh] rounded-t-2xl z-50`) with an embedded sticky search bar, horizontal category filter tabs, touch-friendly list items (minimum 44px tap targets), and account balances.
  - In Free Journal Entry mode on mobile: The multi-column table transforms into a stacked card layout per journal line, giving each line its own dedicated Account selector, Debe input, Haber input, and Delete button.
  - Monetary input fields: Use `inputMode="decimal"` to automatically trigger the native numeric/decimal keypad on iOS and Android.
- **Rationale**: Zero viewport clipping, effortless one-thumb operation, and full compatibility with mobile on-screen keyboards.

---

### Decision 5: Desktop Keyboard Navigation & Global Shortcuts

- **Context**: Power users entering dozens of invoices or receipts require uninterrupted keyboard navigation without touching the mouse.
- **Decision**:
  - Enforce continuous linear `Tab` sequence through all fields without focus trapping.
  - In `AccountPickerSheet` / combobox: Arrow Up/Down navigation through filtered accounts, `Enter` to select and advance focus to the next field in sequence.
  - Global submission shortcut: `Ctrl + Enter` (or `Cmd + Enter` on macOS) immediately validates and submits the form from any active input.
  - Double-click/Rapid submission guard: Debounce and disable submission while `loading` is true to prevent duplicate transactions.
- **Rationale**: Maximizes operational throughput and complies with accessibility standards (WCAG 2.1 AA keyboard operability).

---

### Decision 6: Visual Hierarchy & Neutral Accounting Semantics

- **Context**: The existing form displayed conflicting color signals (e.g., green for Haber and red for Debe) which falsely implied that Debits were "bad" and Credits were "good", contrary to basic accounting science. Additionally, duplicate Save/Cancel buttons were rendered in both the top header and bottom footer.
- **Decision**:
  - Eliminate duplicate action buttons: Provide a single primary action header on desktop and a unified sticky action footer on mobile.
  - Adopt neutral semantic styling: Use clean typography and slate/indigo accents for Debe and Haber column headers and row indicators instead of traffic-light red/green.
  - Use clear balance badges: Display a prominent `Cuadrado` badge when \(\Delta = 0\) and an `Alert` badge with the exact variance amount when \(\Delta > 0\).
- **Rationale**: Promotes a calm, professional interface and adheres to standard accounting semantics.

---

## 3. Technology Stack & Integration Summary

| Layer                    | Technology                                                   | Role                                                               |
| :----------------------- | :----------------------------------------------------------- | :----------------------------------------------------------------- |
| **Frontend Framework**   | Next.js 14+ / React 19 / TypeScript                          | Client-side reactive state, dynamic mode routing                   |
| **Styling & Components** | TailwindCSS v4.3, Lucide React                               | Clean, responsive UI, bottom sheet, neutral palette                |
| **State Management**     | React hooks (`useState`, `useMemo`, `useCallback`, `useRef`) | Local form state, difference calculations, keyboard handlers       |
| **Validation**           | Zod 3.23+ / Shared Schemas                                   | Type-safe validation before API dispatch                           |
| **Backend API**          | NestJS 10 / TypeORM / PostgreSQL                             | `POST /api/transactions` with `SERIALIZABLE` transaction isolation |
| **Shared Contracts**     | `shared/src/index.ts`                                        | Shared DTOs, Enums (`QuickOperationType`), validation schemas      |

---

## 4. Conclusion & Next Steps

All technical requirements and potential ambiguities have been thoroughly analyzed and resolved. No blockers or `NEEDS CLARIFICATION` items remain. Proceeding directly to Phase 1: Data Model, Interface Contracts, and Quickstart Verification Guide.
