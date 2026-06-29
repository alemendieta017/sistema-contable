# Research & Design Decisions: Professional Transaction UI

## Theme, Density, & Layout

### Decision: Border-Radius and Typography Compactness
- **Chosen Design**: Change the global padding and border-radius in the transactions view. Specifically, replace `rounded-2xl` and `rounded-xl` with `rounded-sm` or `rounded-none`. Reduce font sizes from large classes (like `text-base` / `text-lg`) to `text-sm` / `text-xs` to match professional double-entry ERP/ledger software systems (e.g. SAP, QuickBooks Desktop, Odoo).
- **Rationale**: The user wants a denser look and feel. Reducing padding, text sizes, and corner rounding maximizes screen real estate and feels more executive.
- **Alternatives Considered**: Keeping current rounded corners but reducing padding was rejected because rounded corners create visual gaps when columns are aligned closely.

### Decision: Anonymization of "Partida Doble" Terminology
- **Chosen Design**: Remove descriptive text mentioning "Partida Doble" or "Partida Doble Multi-Ítem" in subheaders, placeholders, and tooltips. Standard labels will keep "Asiento Contable", "Debe", and "Haber".
- **Rationale**: Professionals know it is double-entry by the presence of Debit and Credit columns; mentioning "Partida Doble" explicitly feels redundant and amateurish.

---

## Filter Section Improvements

### Decision: Month Navigator vs Custom Date Range
- **Chosen Design**:
  - Replace the dual datepicker filters in the default view with a single Month Navigation control (e.g., `<` [Month Name] `>`).
  - Navigating with arrows changes the current filtering month automatically (updating `startDate` and `endDate` to the start and end of that month).
  - Add a "Personalizar Fechas" checkbox or toggle. When checked, it renders the Custom Date Range input fields (date-from, date-to).
- **Rationale**: Simplifies normal monthly navigation (which is 95% of ledger usage) and keeps the filter panel clean.

---

## Transaction Entry Form (Asiento Contable)

### Decision: Autocomplete Account Selector
- **Chosen Design**: Replace the native HTML `<select>` in `JournalEntryRow` with a custom searchable combobox/autocomplete input. Typing inside the box filters accounts by name or code and lets the user select with arrow keys or click.
- **Rationale**: Standard select menus are inefficient when selecting from dozens or hundreds of ledger accounts.

### Decision: Smart Amount Entry & Auto-Balancing
- **Chosen Design**:
  - When the user creates a new row, if the difference between total debits and credits is non-zero, automatically suggest or prefill the difference in the new row's amount.
  - Implement a quick "Cuadrar" (Balance) button or behavior that automatically computes the difference and inputs it into the active entry row.
- **Rationale**: Eliminates repetitive copy-pasting of values from debit to credit.
