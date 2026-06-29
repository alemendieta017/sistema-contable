# Technical Research: Improve Accounting Entry Form UI

## Findings & Layout Decision

### 1. Current State Assessment
- **Asiento Libre page** (`AsientoLibrePage`):
  - Uses `max-w-md` (448px) container width which makes it feel like a mobile-only layout even on desktop.
  - Renders each entry as a card (`rounded-2xl p-4 border border-slate-100`).
  - Uses `select` for entry type with `DÉBITO (Debe)` and `CRÉDITO (Haber)` options.
- **Transaction Modal** (`TransactionModal`):
  - Renders a list of `JournalEntryRow` components in a scrollable block.
  - `JournalEntryRow` uses a card-like small block with flex layout (`flex-col sm:flex-row`).
- **Typography**:
  - The labels and text buttons for DEBE and HABER are styled with heavy upper-case fonts, and in some screens they feel disproportionately large.

### 2. Redesign Decisions
- **Grid-Based Row Layout**:
  - Replace the card loop in `AsientoLibrePage` with a clean, grid-based row system.
  - On larger screens, the columns (Account, Type, Amount, Actions) will sit on a single line.
  - On mobile screens, they will wrap gracefully into a clean compact block.
- **Container Sizing**:
  - Change `max-w-md` in `AsientoLibrePage` to `max-w-3xl` (or `max-w-4xl`) so the table/rows have breathing room.
- **Visual Design**:
  - Clean borders, subtle hover effects, modern muted tones for inactive options.
  - Make the "Debe" (Red/Crimson tones) and "Haber" (Green/Emerald tones) smaller, cleaner, and proportionate (e.g. `text-[10px]` or `text-xs` with `tracking-wider`).
- **Interactive Toggles**:
  - Standardize on the segmented button style for Debe/Haber selection in both `AsientoLibrePage` and `TransactionModal`.
