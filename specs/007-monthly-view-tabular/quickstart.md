# Quickstart Guide: Monthly View Tabular Format

This guide outlines how to run the application, view the updated monthly view, and verify that the tabular design functions correctly.

## Prerequisites

- Frontend server dependencies must be installed.
- Development database and backend server must be running.

## Running the Application

1. Start the backend server (if running locally):
   ```bash
   cd backend
   npm run start:dev
   ```

2. Start the frontend Next.js dev server:
   ```bash
   cd frontend
   npm run dev
   ```

3. Open your browser and navigate to `http://localhost:3000/transactions` (or the configured frontend port).

---

## Manual Verification Scenarios

### Scenario 1: Tabular Layout Verification
1. Click on the **"Mensual"** button in the view switcher tabs at the top right of the transactions page.
2. Verify that instead of a grid of card boxes, you see a single clean table listing months from Enero to Diciembre.
3. Check that the columns are:
   - **Mes** (Left aligned)
   - **Transacciones** (Right/Center aligned)
   - **Ingresos** (Right aligned)
   - **Gastos** (Right aligned)
   - **Saldo Neto** (Right aligned)

### Scenario 2: Row States & Hover Micro-interactions
1. Move your mouse cursor over any row in the monthly table.
2. Verify that the row has a subtle background highlight transition (e.g. `bg-slate-50/50` or `dark:bg-slate-750/50`).
3. Find a month that has 0 transactions (e.g. if there's no data for it).
4. Verify that the row is rendered with a slightly lower opacity (e.g., `opacity-55` or `text-slate-400`), making active months stand out visually.

### Scenario 3: Responsive Behavior
1. Shrink the browser window width to mobile size (e.g., 375px) or inspect using developer tools.
2. Scroll horizontally on the table component.
3. Verify that the table allows horizontal scroll smoothly within its card container without breaking the layout of the rest of the page.
