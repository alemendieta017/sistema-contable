# Research: Theme, Mobile Layout, and Shadcn Charts

## Decision: Tailwind CSS v4 Class-Based Dark Mode
- **What was chosen**: Explicit custom variant declaration `@variant dark (&:where(.dark, .dark *));` in `frontend/src/app/globals.css`.
- **Rationale**: Tailwind CSS v4 defaults to media query-based dark mode (`@media (prefers-color-scheme: dark)`). Adding this custom variant tells Tailwind's compiler to apply class-based selector logic whenever the `.dark` class is toggled on `document.documentElement`, enabling the manual theme switch button to function.
- **Alternatives considered**: Using Next.js `next-themes` library. Rejected to avoid extra dependency overhead, since the custom React `ThemeContext` is already implemented and just requires the CSS variant definition.

## Decision: Responsive Transaction Summary Bar
- **What was chosen**: A combined grid/flex container on the transactions page `page.tsx` that collapses the 3 cards into a single row on viewport width `< 640px` (mobile).
- **Rationale**: By using a flex-row container with divider lines (`divide-x`) and smaller typography, we keep the values visible in a compact 80px high horizontal strip. This maximizes the vertical space available for the transaction ledger table on mobile devices.
- **Alternatives considered**: Hiding the counters entirely on mobile. Rejected because showing quick summaries is highly valuable to users checking their balance.

## Decision: Shadcn Chart Integration with Recharts
- **What was chosen**: Install `recharts` in `@sistema-contable/frontend` and implement standard Shadcn/Recharts configurations for the line chart, bar chart, and doughnut chart.
- **Rationale**: Standardizing on recharts allows responsive layout wrapping, beautiful tooltips, and interactive legend handling. It solves text overflow/clipping bugs in native SVGs (especially the doughnut chart labels) and ensures the UI looks premium.
- **Alternatives considered**: Keeping custom SVGs and trying to dynamically compute text string widths. Rejected because it is complex, fragile, and does not provide interactive hover tools like tooltips or highlighting.
