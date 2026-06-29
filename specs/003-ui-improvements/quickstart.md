# Quickstart Validation Guide

This guide outlines how to verify the theme toggling, compact mobile layout, and Shadcn charts once implemented.

## Prerequisites
- Node.js dependency installation:
  ```bash
  cd frontend
  npm install recharts
  ```

## Local Development Server
Run the Next.js development server:
```bash
cd frontend
npm run dev
```

## Validation Scenarios

### Scenario 1: Theme Toggling
1. Open the application in your browser (usually `http://localhost:3000`).
2. Go to settings or use the theme toggle button.
3. Toggle between light and dark modes.
4. Verify that:
   - The UI immediately changes background and text colors.
   - Refreshing the page retains the active theme preference.

### Scenario 2: Compact Mobile Counters
1. Navigate to the Transactions page (`/transactions`).
2. Open Browser Developer Tools and switch to a mobile viewport (e.g., iPhone SE/12 width 375px–390px).
3. Verify that the three summary widgets (Ingresos, Egresos, Balance) display horizontally in a single compact row instead of stacking.
4. Scale up the viewport to desktop size (>640px) and verify that the layout switches back to a 3-column grid layout with normal spacing.

### Scenario 3: Shadcn Charts
1. Navigate to the Stats/Dashboard view (`/stats`).
2. Look at the Pie/Doughnut Chart, Monthly Comparative Bar Chart, and Net Worth Line Chart.
3. Verify that:
   - Tooltips appear when hovering over data elements (lines, bars, slices).
   - Labels and legends fit fully without text boundary overflows.
   - The color scheme matches the active light or dark theme palette.
