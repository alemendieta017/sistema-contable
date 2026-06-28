# Technical Research: Accounting Dashboard and Core Modules

## Research Findings & Decisions

### 1. Multi-View Transaction Layout (Daily, Calendar, Monthly)
- **Decision**: Implement a single unified page `/transactions` that controls the view state via a URL query parameter or tab switcher (`view=daily|calendar|monthly`).
- **Rationale**: Keeps state clean, allows copying links directly to a specific view, and avoids duplicating data-fetching logic.
- **Implementation**: 
  - The calendar view will render a grid of 7 columns (days of the week) with variable rows depending on the current month's offset. Each day will display up to three lines: Income (+), Expense (-), and Net Balance.
  - The monthly view will list January-December for the selected calendar year, fetching all transactions in the year and group-summarizing them by month on the frontend.
  - The daily view will group the current period's transactions by date, sorting descending.

### 2. Chart Rendering (Estadísticas)
- **Decision**: Implement custom, interactive SVG-based charts (pie/doughnut chart for category distribution, area/line chart for net worth over time, and bar chart for income vs. expenses) instead of importing third-party chart libraries.
- **Rationale**: Next.js 15 and React 19 have strict dependency resolutions. Custom React SVGs are fully type-safe, lightweight, fast, have zero bundle overhead, and can be easily animated/themed with standard CSS transition classes.
- **Implementation**:
  - Pie/Doughnut Chart: Calculate cumulative angles for SVG `<circle stroke-dasharray="..." stroke-dashoffset="...">` or custom paths.
  - Line/Area Chart: Map dates and balances to an SVG `<path d="...">` with gradient fills.

### 3. Global Search & Responsive Sidebar/Navigation
- **Decision**: 
  - Sidebar: Permanent side navigation on `lg` viewports (>1024px) containing the menu options. On mobile viewports (<768px), navigation collapses into a bottom navigation bar for high-priority sections, with an "Otros" trigger opening a drawer for settings and accounts management.
  - Global Search: A search bar in the top layout header. When typing, it performs a real-time substring search on the transaction's description, notes, or entries' account names in the currently fetched list.

### 4. Double-Entry Multi-Item Ledger Form
- **Decision**: Build a dynamic modal form using a dynamic React array state (`entries`).
- **Rationale**: Allows adding/removing as many debit/credit rows as the user needs.
- **Validation**: Total debits and total credits must balance to 0 in base currency ($\sum \text{debits} - \sum \text{credits} = 0$).

---

## Alternatives Considered

| Alternative | Pros | Cons | Reason for Rejection |
|-------------|------|------|----------------------|
| **Recharts / Chart.js** | Ready-made charts | Package conflicts with React 19, styling is hard to match theme precisely. | Avoids installation risks and dependency bloat. |
| **Server-Side Search API** | Less memory on client | High network latency for typing-search. | Client-side search is instantaneous for standard personal transaction volumes (<10k items). |
