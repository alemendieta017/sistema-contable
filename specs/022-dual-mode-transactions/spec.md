# Feature Specification: Dual-Mode Transaction Creation & Accounting UX Optimization

**Feature Branch**: `022-dual-mode-transactions`

**Created**: 2026-08-16

**Status**: Draft

**Input**: User description: "Rediseño integral de la experiencia de registro de transacciones contables dividida en dos modos de carga: Modo 1 - Transacción Rápida (para el 90% de las operaciones cotidianas: Gastos, Ingresos, Transferencias sin conceptos crudos de Debe/Haber) y Modo 2 - Asiento Contable Libre / Avanzado (grilla contable tabular con columnas Debe y Haber independientes, auto-balanceo de partidas, optimización de digitación por teclado para Desktop y modal Bottom Sheet táctil para Mobile). Ambos formularios deben ser 100% responsivos en Desktop y Mobile. El orden de campos en Transacción Rápida debe ser: 1. Fecha/Hora, 2. Cuenta, 3. Categoría (Ingreso/Egreso), 4. Monto, 5. Concepto."

## Clarifications

### Session 2026-08-16

- Q: ¿Cuál es el orden obligatorio de los campos en el formulario de Transacción Rápida? → A: 1. Fecha/Hora, 2. Cuenta (Caja/Banco/Medio de Pago), 3. Categoría (Cuenta de Ingreso o Egreso), 4. Monto, 5. Concepto / Glosa.
- Q: ¿Qué cobertura de dispositivos deben tener ambos formularios (Transacción Rápida y Asiento Contable Libre)? → A: Ambos formularios deben ser totalmente responsivos y ergonómicos tanto en dispositivos móviles (pantallas táctiles) como en desktop.
- Q: ¿Cómo deben titularse las etiquetas de selección de cuentas en una Transferencia Interna dentro de la Transacción Rápida? → A: "Cuenta Origen" (de donde sale el dinero) y "Cuenta Destino" (a donde ingresa el dinero).

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Quick Transaction Recording for Routine Operations (Priority: P1)

As a business user or administrative staff member, I want to record daily operational movements (Expenses, Incomes, and Internal Transfers) using a simple, guided single-amount form following an exact intuitive field order (Fecha/Hora, Cuenta, Categoría / Destino, Monto, Concepto) without having to manually calculate double-entry debits and credits, so that I can log financial transactions in seconds with zero accounting confusion on both desktop and mobile devices.

**Why this priority**: Over 90% of daily transactions represent straightforward operational movements. Eliminating the double-typing of amounts, enforcing a predictable field sequence, and abstracting debit/credit conventions drastically increases data entry speed and prevents human error.

**Independent Test**: Can be tested independently by selecting the "Quick Transaction" tab, navigating through the exact field sequence (Date/Time -> Account -> Category/Destination -> Amount -> Concept), submitting, and verifying that the ledger registers a balanced double-entry journal entry.

**Acceptance Scenarios**:

1. **Expense Recording Field Sequence**:
   - **Given** the user is in Quick Transaction mode with "Gasto" selected,
   - **When** the user inputs:
     1. `Fecha/Hora`: Transaction date and time
     2. `Cuenta`: Money-holding payment account (e.g., "Banco Familiar" - Asset / Liability)
     3. `Categoría`: Expense category (e.g., "Combustibles y Lubricantes" - Expense)
     4. `Monto`: Single transaction amount (e.g., $150.00)
     5. `Concepto`: Transaction memo / description
   - **Then** submitting saves an immutable journal entry debiting the Category (Expense) for $150.00 and crediting the Account (Asset/Liability) for $150.00.

2. **Income Recording Field Sequence**:
   - **Given** the user is in Quick Transaction mode with "Ingreso" selected,
   - **When** the user inputs:
     1. `Fecha/Hora`: Transaction date and time
     2. `Cuenta`: Receiving account (e.g., "Caja Principal" - Asset)
     3. `Categoría`: Income category (e.g., "Ventas de Servicios" - Revenue)
     4. `Monto`: Single transaction amount (e.g., $500.00)
     5. `Concepto`: Transaction memo / description
   - **Then** submitting saves an immutable journal entry debiting the Account (Asset) for $500.00 and crediting the Category (Revenue) for $500.00.

3. **Internal Transfer Recording Field Sequence**:
   - **Given** the user is in Quick Transaction mode with "Transferencia" selected,
   - **When** the user inputs:
     1. `Fecha/Hora`: Transaction date and time
     2. `Cuenta Origen`: Source account where money exits (e.g., "Banco Familiar" - Asset)
     3. `Cuenta Destino`: Destination account where money enters (e.g., "Caja Chica" - Asset)
     4. `Monto`: Single transaction amount (e.g., $200.00)
     5. `Concepto`: Transaction memo / description
   - **Then** submitting saves an immutable journal entry debiting the "Cuenta Destino" (Asset) and crediting the "Cuenta Origen" (Asset).

4. **Account Filtering by Operation Context**:
   - **Given** the user is recording an Expense,
   - **When** selecting "Cuenta", the system displays payment accounts (Cash, Bank, Credit Cards), and when selecting "Categoría", the system displays Expense categories.
   - **Given** the user is recording a Transfer,
   - **When** selecting either "Cuenta Origen" or "Cuenta Destino", the system displays monetary accounts (Assets like Cash, Bank, Treasury accounts).

---

### User Story 2 - Advanced Free Journal Entry Grid with Auto-Balancing (Priority: P1)

As an accountant or advanced financial user, I want to create multi-line journal entries (such as payroll with tax withholdings, depreciation, opening balances, or custom adjustments) using a structured accounting spreadsheet grid with distinct Debit and Credit columns and automatic line balancing across both desktop and mobile layouts, so that I have complete professional control without repetitive manual arithmetic.

**Why this priority**: Accounting systems must support complex, multi-legged entries without compromising ledger integrity or forcing unnatural abstractions for professional accountants.

**Independent Test**: Can be tested independently by navigating to the "Free Journal Entry" mode on both desktop and mobile viewports, adding accounts into rows, entering values in either Debit or Credit columns, observing automatic difference calculation for subsequent lines, and saving the balanced entry.

**Acceptance Scenarios**:

1. **Independent Debit and Credit Columns**:
   - **Given** the user is in the Free Journal Entry grid,
   - **When** the user inputs an amount into the "Debe" column for Row 1,
   - **Then** the "Haber" column for Row 1 remains empty/cleared (and vice versa), without requiring any toggle switch.

2. **Automatic Balancing (Difference Plug-in)**:
   - **Given** the user enters a Debit amount of $1,000.00 on Line 1,
   - **When** the user moves to or creates Line 2,
   - **Then** Line 2 automatically pre-populates $1,000.00 in the Credit column to balance the entry.

3. **Multi-line Residual Balancing**:
   - **Given** the user has a Debit of $1,000.00 on Line 1, and enters a Credit of $600.00 on Line 2,
   - **When** the user adds Line 3,
   - **Then** Line 3 automatically pre-fills with the remaining unbalanced difference ($400.00) in the Credit column.

4. **Balance Validation Enforcement**:
   - **Given** an entry where total Debits do not equal total Credits,
   - **When** the user attempts to submit the entry,
   - **Then** the system blocks submission and highlights the exact mathematical discrepancy.

---

### User Story 3 - Rapid Keyboard-First Desktop Navigation (Priority: P2)

As a power user working on a desktop workstation, I want to navigate the entire transaction creation flow exclusively using standard keyboard keys (Tab, Enter, Ctrl/Cmd+Enter, Arrow keys) without touching the mouse, so that I can rapidly input batches of accounting records.

**Why this priority**: In high-volume financial data entry, mouse dependency creates significant ergonomic friction and slows entry speed by up to 70%.

**Independent Test**: Can be tested independently by loading the transaction form, keeping hands strictly on the keyboard, typing the date/time, moving smoothly via Tab to account selection, category/destination, amount, and concept, and saving via keyboard shortcut.

**Acceptance Scenarios**:

1. **Linear Tab Sequence in Quick Transaction**:
   - **Given** the user is on the Quick Transaction form,
   - **When** pressing `Tab`,
   - **Then** focus moves strictly in order: `Fecha/Hora` -> `Cuenta` (or `Cuenta Origen`) -> `Categoría` (or `Cuenta Destino`) -> `Monto` -> `Concepto` -> `Guardar`, without focus traps.

2. **Account Search & Selection via Keyboard**:
   - **Given** focus is inside an account or category search input,
   - **When** the user types search keywords and presses `Enter` or `Down Arrow + Enter`,
   - **Then** the highlighted account is selected, the search dropdown closes, and focus automatically advances to the next field in sequence.

3. **Global Save Shortcut**:
   - **Given** the transaction is complete and balanced,
   - **When** the user presses `Ctrl + Enter` (or `Cmd + Enter` on macOS) from any field in the form,
   - **Then** the transaction is immediately validated and submitted without requiring manual navigation to the save button.

---

### User Story 4 - Touch-First Mobile Accounting Experience for Both Modes (Priority: P2)

As a mobile user recording transactions on a smartphone or tablet, I want both Quick Transaction and Free Journal Entry forms to adapt fluidly to small screens with dedicated bottom-sheet account pickers and native numeric virtual keyboards on amount inputs, so that UI controls are never compressed or obstructed by the on-screen keyboard.

**Why this priority**: Mobile screen viewports lose 40% to 55% of height when the software keyboard opens. Inline dropdown menus cause severe viewport collisions, scroll lockups, and tap fatigue.

**Independent Test**: Can be tested independently on a mobile viewport in both Quick Transaction and Free Journal Entry modes by opening account pickers, observing bottom sheet overlays, and verifying numeric virtual keyboards on amount inputs.

**Acceptance Scenarios**:

1. **Full Mobile Account Picker Sheet in Both Modes**:
   - **Given** the user is on a mobile device in either Quick Transaction or Free Journal Entry mode,
   - **When** the user taps an account or category field,
   - **Then** the system presents a bottom sheet / full modal overlay with an integrated search bar, category tabs, and touch-accessible list items positioned comfortably above the virtual keyboard.

2. **Responsive Mobile Free Journal Entry Layout**:
   - **Given** the user is on a mobile device in Free Journal Entry mode,
   - **When** viewing the line items,
   - **Then** each line item is displayed in an ergonomic stacked card layout with clear, accessible touch inputs for Account, Debit, and Credit amounts, and row removal controls.

3. **Native Numeric Keyboard Trigger**:
   - **Given** the user taps any monetary amount input field on a mobile device,
   - **When** the on-screen keyboard appears,
   - **Then** the operating system displays the dedicated numeric/decimal keypad with large digits instead of the alphanumeric keyboard.

---

### User Story 5 - Clean Visual Hierarchy & Neutral Accounting Semantics (Priority: P3)

As any system user, I want clear, uncluttered visual interfaces with single, unambiguous primary action buttons and neutral accounting terminology/styling (avoiding misleading green=Haber / red=Debe associations), so that the interface feels professional, calm, and cognitively intuitive.

**Why this priority**: Redundant buttons create visual noise, and confusing color coding creates cognitive dissonance with standard financial definitions.

**Independent Test**: Can be tested independently by reviewing the layout across desktop and mobile to confirm there is only one consolidated action bar and that debit/credit representations use neutral styling rather than emotional traffic-light colors.

**Acceptance Scenarios**:

1. **Single Action Bar**:
   - **Given** the transaction form is displayed,
   - **When** viewing the screen layout,
   - **Then** there is a single, clear set of primary action controls (Guardar / Cancelar) rather than duplicated sets in both header and footer.

2. **Neutral Financial Semantics**:
   - **Given** Debit and Credit columns or indicators are rendered,
   - **When** viewing the interface,
   - **Then** Debits and Credits are styled using standard typography and neutral contrasting palette rather than implying "Debit = Bad/Red" or "Credit = Good/Green".

---

### Edge Cases

- **Zero or Negative Amounts**: The system must reject zero or negative transaction amounts in both Quick and Free modes with an informative inline validation message.
- **Switching Modes with Unsaved Data**: If a user enters information in Quick Transaction mode and switches to Free Journal Entry mode (or vice versa), the system should prompt for confirmation before discarding entered values, or intelligently map common fields (Date, Glosa, Amount, Accounts) into the target mode.
- **Deleting Lines in Free Journal Entry**: When an intermediate line is deleted in a multi-line entry, the remaining lines retain their entered amounts; the balancing indicator updates in real time to show any newly created discrepancy.
- **Rapid Submission / Debouncing**: If a user rapidly triggers `Ctrl+Enter` or presses the save button multiple times, the system must disable the trigger to prevent duplicate journal entry creation.
- **Decimal Precision & Currency Formatting**: Amounts must support standard financial currency separators (e.g., thousands separators and appropriate decimal points according to the active locale) without corrupting the underlying numerical value.
- **Direct Account Creation from Mobile Bottom Sheet**: If a user cannot find an account while in the mobile account picker, a "Crear nueva cuenta" action within the sheet allows adding an account without losing the ongoing transaction draft.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST provide a top-level mode selector on the transaction creation interface allowing users to switch between "Transacción Rápida" (Quick Transaction) and "Asiento Libre" (Free Journal Entry).
- **FR-002**: Quick Transaction mode MUST provide specialized operation templates for "Gasto" (Expense), "Ingreso" (Income), and "Transferencia" (Internal Transfer).
- **FR-003**: In Quick Transaction mode, the field sequence MUST strictly follow the order:
  - For **Gasto** and **Ingreso**: 1. `Fecha/Hora` (Date & Time), 2. `Cuenta` (Payment/Receiving Account), 3. `Categoría` (Expense/Income Account), 4. `Monto` (Single Amount), 5. `Concepto` (Description / Glosa).
  - For **Transferencia**: 1. `Fecha/Hora` (Date & Time), 2. `Cuenta Origen` (Source Account), 3. `Cuenta Destino` (Destination Account), 4. `Monto` (Single Amount), 5. `Concepto` (Description / Glosa).
- **FR-004**: In Quick Transaction mode, account selector fields MUST filter and categorize selectable accounts contextually based on the operation type (e.g., payment accounts vs. category accounts vs. transfer assets).
- **FR-005**: In Free Journal Entry mode, the line-item grid MUST present separate, independent numerical columns for "Debe" (Debit) and "Haber" (Credit), eliminating toggle-based debit/credit switches.
- **FR-006**: In Free Journal Entry mode, typing an amount into the Debit column MUST automatically clear the Credit column for that line, and vice versa.
- **FR-007**: In Free Journal Entry mode, the system MUST dynamically calculate and pre-fill the balancing difference into the opposite column of the next line when a line is completed.
- **FR-008**: System MUST strictly enforce the fundamental double-entry rule: total debits must equal total credits before any transaction can be committed to the ledger.
- **FR-009**: The transaction form MUST support continuous, non-breaking keyboard navigation (`Tab` for sequential field focus, `Enter` for selection, and `Ctrl+Enter` / `Cmd+Enter` for immediate transaction submission).
- **FR-010**: On mobile and touch devices, tapping an account or category selector in either mode MUST open a dedicated bottom-sheet / modal dialog containing search and category filtering to isolate search interactions from viewport and virtual keyboard collisions.
- **FR-011**: Both Quick Transaction and Free Journal Entry forms MUST be fully responsive across mobile, tablet, and desktop screen sizes, with Free Journal Entry adapting to a touch-optimized stacked card layout on mobile.
- **FR-012**: All monetary input fields MUST specify appropriate input modes to trigger native numeric/decimal virtual keypads on mobile operating systems.
- **FR-013**: The transaction creation view MUST provide a single, unified action control area, removing duplicate save and cancel buttons.
- **FR-014**: Debit and credit visual indicators MUST avoid red-green traffic-light color conventions that falsely associate debits with negative and credits with positive outcomes.
- **FR-015**: All transactions committed through either Quick Mode or Free Mode MUST produce standard, immutable journal entries adhering to the system's ledger domain model.

### Key Entities

- **Journal Entry (Asiento Contable)**: The core financial record representing an atomic ledger event. Key attributes: unique identifier, date/time, description/glosa, status, created timestamp, and associated line postings.
- **Journal Entry Line (Apunte Contable)**: An individual leg of a journal entry. Key attributes: account reference, debit amount, credit amount, memo/note, and line sequence.
- **Account (Cuenta Contable)**: The chart-of-accounts entity representing a financial bucket. Key attributes: code, name, category/type (Asset, Liability, Equity, Revenue, Expense), operational flags (allows direct entry, active status).
- **Quick Operation Template (Plantilla de Operación Rápida)**: Predefined configuration mapping operational concepts (Gasto, Ingreso, Transferencia) to source and destination account types with the standardized field sequence and precise labels ("Cuenta / Categoría" or "Cuenta Origen / Cuenta Destino").

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Users can record and submit a standard two-leg expense, income, or transfer in under 10 seconds following the standardized 5-step field order.
- **SC-002**: Keyboard navigation reduces the total number of keystrokes required to enter a standard two-line journal entry on desktop by at least 60% (from 18 keystrokes down to 7 or fewer).
- **SC-003**: 100% of transactions submitted via Quick Transaction mode generate strictly balanced double-entry records with zero manual calculation errors.
- **SC-004**: Mobile account search and selection achieves 0% viewport obstruction or dropdown clipping across standard smartphone screen sizes in both Quick and Free modes.
- **SC-005**: 100% of unbalanced entries in Free Journal Entry mode are prevented from submission with clear visual feedback showing the exact variance.
- **SC-006**: Both Quick Transaction and Free Journal Entry interfaces render without horizontal overflow, clipped controls, or layout distortion on viewports from 320px (mobile) to 4K (desktop).

## Assumptions

- The backend ledger API requires standard double-entry journal records (debits = credits) regardless of which frontend mode created the record.
- Chart of accounts is structured with standard accounting classifications (Assets, Liabilities, Equity, Revenue, Expenses) enabling contextual filtering.
- Users operate on standard modern web browsers (Chrome, Firefox, Safari, Edge) on desktop, and mobile browsers on iOS/Android.
- Default currency settings and formatting conventions of the active organization are applied to all transaction amounts.
- Direct account creation from within transaction workflows integrates with existing account creation capabilities.
