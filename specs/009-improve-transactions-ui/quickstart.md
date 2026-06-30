# Validation Guide: Transaction Screen UI/UX Improvements

This guide outlines manual and automated steps to verify that the UI improvements behave correctly.

## Prerequisites
- Node.js and dependencies installed.
- NestJS backend server running.
- Next.js frontend development server running.

## Automated Verification
Run compile and lint checks to ensure all standard Tailwind v4 properties compile:
```bash
cd frontend
npm run build
```

## Manual Verification Scenarios

### Scenario 1: Theme Consistency Check
1. Start the application and toggle Light theme.
2. Navigate to the **Cuentas y Rubros** page.
3. Verify that the **Agregar Cuenta** button has high contrast (white text on solid indigo background) and is fully visible.
4. Toggle Dark theme.
5. Navigate to the **Libro Diario** page and click **Calendario**.
6. Verify that each grid cell in the calendar has visible borders (`slate-700` style instead of disappearing).
7. Hover over inactive tabs in the view switcher segmented control and verify the hover background is subtle but clearly visible in both dark and light modes.

### Scenario 2: Compact Mobile Counters
1. Inspect the Transactions view in mobile viewport layout (width < 640px).
2. Verify that the Ingresos, Egresos, and Saldo Neto cards are displayed in a single, non-wrapping row.
3. Check that the cards fit completely within the screen width without causing horizontal overflow, protruding elements, or requiring horizontal/lateral scrolling.

### Scenario 3: Date Navigation & Tab Independence
1. Switch to **Calendario** view.
2. Verify that the date range selection filters in `TransactionFilters` are hidden (since the view context matches the active month).
3. Navigate to a different month (e.g., Mayo 2026) using the navigation arrows.
4. Switch back to **Diario** view and verify that it still shows the previous Daily dates (e.g., Junio 2026), proving date state independence.
5. Switch to **Mensual** view (which shows year 2026). Navigate to year 2025 using the year selectors.
6. Switch back to **Diario** view and verify it is still set to June 2026.
7. Switch back to **Mensual** view and verify it is still set to year 2025.
8. Verify that each tab transition dispatches a network request to `/api/transactions` with that view's specific independent date boundaries.
