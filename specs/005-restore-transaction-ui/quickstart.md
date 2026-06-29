# Quickstart & Verification Guide

This guide outlines how to run the application and verify the restoration of the transactions user interface.

## Prerequisites

- Node.js (v18+)
- Active development server running

## Start Frontend and Backend

From the repository root:

```bash
# Install dependencies
npm install

# Run the project in development mode
npm run dev
```

## Verification Scenarios

### Scenario 1: Dashboard Cards & Header Rounding
1. Navigate to `/transactions` in the browser.
2. Verify that the three summary cards (Ingresos, Egresos, Saldo Neto) have rounded corners matching `/accounts` cards (e.g. `rounded-2xl`).
3. Verify that the view switcher buttons and the parent wrapper have modern rounded corners (`rounded-xl` or similar).

### Scenario 2: Transaction Views Rounding
1. Switch between **Diario**, **Calendario**, and **Mensual** views.
2. Confirm that list rows, grid cells, and detail modals use soft, rounded corners instead of blocky `rounded-sm` corners.
3. Verify that borders and dividers use standard `slate-100` color tokens rather than dark/harsh grays.
