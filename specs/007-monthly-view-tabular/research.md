# Research Notes: Monthly View Tabular Format

This document details the research, technical decisions, and layout approach for replacing the month cards with a clean tabular UI/UX in the monthly transactions view.

## Analysis of Current Layout

The current `MonthlyView` component (`frontend/src/components/MonthlyView.tsx`) renders the 12 months as a responsive grid of card components. Each card displays:
- Month Name
- Transaction Count
- Income
- Expenses
- Net Balance

While visually distinct, this grid of cards is hard to compare vertically and doesn't scale well for scanning financial totals or ledger summaries.

## Selected Layout Approach

### Decision
Implement a single, comprehensive HTML table component (`<table>`) style layout using Tailwind CSS classes for table layout structure, row border lines, right-aligned numbers, and consistent columns.

### Rationale
- **Financial Standard**: Tabular formatting is the industry standard for bookkeeping and accounting software (e.g., balance sheets, income statements).
- **Scanability**: Vertical alignment of currency values allows immediate column comparison of income/expenses/net balances across months.
- **Clean UX/UI**: Reduces layout noise, padding overhead, and card boxes, resulting in a cleaner, professional dashboard look.

### Alternatives Considered

#### Option A: CSS Grid-based Pseudo-Table
- **Pros**: Easy to make fully responsive.
- **Cons**: Can be less semantic than an HTML table if not formatted carefully with ARIA labels.
- **Decision**: HTML `<table>` with semantic elements (`thead`, `tbody`, `tr`, `th`, `td`) styled with Tailwind is preferred for cleaner markup and accessibility.

#### Option B: Keep Cards but Minimize Padding
- **Pros**: Low code impact.
- **Cons**: Fails the primary user requirement of showing info in "formato tabular, una bonita tabla clean UX/UI, no en cards".
- **Decision**: Rejected.

---

## Technical Details & Alignments

1. **Table Structure**:
   - `col-1`: Month Name (left-aligned)
   - `col-2`: Transactions Count (center-aligned or right-aligned)
   - `col-3`: Income (right-aligned, formatted currency)
   - `col-4`: Expenses (right-aligned, formatted currency)
   - `col-5`: Net Balance (right-aligned, formatted currency with conditional text color)

2. **Styling & Aesthetics**:
   - Background: `bg-white dark:bg-slate-800`
   - Borders: Subtle lines (`border-slate-100 dark:border-slate-700`) between rows.
   - Hover states: `hover:bg-slate-50/50 dark:hover:bg-slate-750/50 transition duration-150` for rows.
   - Active/Inactive styles: Months with 0 transactions will have lower opacity (`opacity-50`) to emphasize months with activity while maintaining the full 12-month table grid.
   - Responsiveness: Wrap table in a `w-full overflow-x-auto` container to scroll horizontally on small screens without breaking layout.
