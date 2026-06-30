# Feature Specification: Transaction Screen UI/UX Improvements

**Feature Branch**: `[009-improve-transactions-ui]`

**Created**: 2026-06-30

**Status**: Draft

**Input**: User description: "Mejoras pantalla transacciones:
- Retirar counters redundantes en vista de meses mensual
- Retirar filtros de fecha en calendario y mensual, ya que debe ceñirse al contexto del filtro de mes o año
- Hacer que los counters de la vista de transacciones en mobile sea de una sola linea
- Reorganizar la seccion de counters, segmented controls de diario-calendario-mensual a algo mas bonito, organizado, clean. Actualmente es como que los items estan sueltos y no tienen concordancia entre si.
- Corregir objetos de ui que se rompieron con el theme light o dark, por ejemplo, el borde de un dia en la vista de calendario desaparece en modo dark. El boton de agregar cuenta en la seccion de cuentas desaparece en modo light. Hover de segmented control."

## Clarifications

### Session 2026-06-30

- Q: ¿Cómo deben comportarse los counters en mobile y las fechas de los segmented controls al cambiar de vista?
  → A: Los counters en mobile deben presentarse en una sola línea pero sin scroll lateral ni sobresalir de la pantalla (ajustándose al ancho disponible). Las fechas de cada pestaña de segmented controls deben ser independientes, manteniendo su propio contexto sin resetearse ni afectarse mutuamente al cambiar de vista (por ejemplo, al volver de mensual a diario).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Streamlined Monthly and Calendar Views (Priority: P1)

As a user tracking my monthly and calendar transactions, I want to see only relevant date context and counters so that my view is clean, focused, and not cluttered with redundant metadata.

**Why this priority**: Crucial for clear navigation and visual hierarchy when viewing aggregated data.

**Independent Test**: Navigate to the "Mensual" (Monthly) view and verify that no redundant counters are displayed. Verify that date filters are hidden/disabled in "Calendario" (Calendar) and "Mensual" views, since these views adhere to the main month/year filters.

**Acceptance Scenarios**:

1. **Given** the user is on the Transactions screen, **When** the user selects the "Mensual" view, **Then** only month-relevant non-redundant counters are shown.
2. **Given** the user is on either the "Calendario" or "Mensual" view, **When** viewing the controls, **Then** date range filters are not displayed, ensuring the view remains locked to the selected month/year filter context.

---

### User Story 2 - Clean Header & Cohesive Selector Layout (Priority: P1)

As a user, I want the view switcher (daily/calendar/monthly) and counter cards to be grouped in a cohesive, unified header area rather than floating as disconnected elements, so that the layout feels clean and professional on all screen sizes.

**Why this priority**: Solves the user's primary aesthetic issue where items are sueltos (disconnected) and lack visual harmony.

**Independent Test**: Open the transactions page and verify that the view switcher and metrics/counters are integrated into a single organized dashboard widget or card container with aligned hover states.

**Acceptance Scenarios**:

1. **Given** the user visits the transactions page, **When** viewing the top section, **Then** the segmented controls (Diario/Calendario/Mensual) and counters are presented in a unified panel that groups controls logically.
2. **Given** the user hovers over a segmented control, **When** light or dark mode is active, **Then** the hover background state is clearly visible and consistent with the active theme.

---

### User Story 3 - Mobile-Optimized Counters (Priority: P2)

As a mobile user, I want the summary counters/cards to fit on a single line without horizontal scrolling or overflowing the screen so that they do not take up vertical screen space and I can see more transactions easily.

**Why this priority**: Vital for a premium mobile experience.

**Independent Test**: Open the transactions view on a mobile screen size and verify that the metrics/counters section displays in a single horizontal row, fitting entirely within the screen width.

**Acceptance Scenarios**:

1. **Given** the user is on a mobile device, **When** viewing the transactions screen, **Then** the counters section is constrained to a single line (no vertical stacking/wrapping) and fits within the viewport width without lateral scroll or overflow.

---

### User Story 4 - Theme Consistency and Contrast Fixes (Priority: P2)

As a user switching between Light and Dark themes, I want all elements (day borders in Calendar, add buttons, hover states) to remain fully visible and usable in both modes.

**Why this priority**: Eliminates functional and aesthetic bugs that break usability in dark/light mode.

**Independent Test**: Toggle between dark and light themes and verify that the day borders in the calendar view are visible in dark mode, the "Add Account" button is visible in light mode, and the segmented control hover effect looks correct in both modes.

**Acceptance Scenarios**:

1. **Given** dark mode is active, **When** viewing the Calendar layout, **Then** the grid cell/day borders are clearly visible.
2. **Given** light mode is active, **When** viewing the Accounts section, **Then** the "Add Account" button is fully visible and has correct contrast.

### Edge Cases

- **Mobile Overflow**: On mobile viewports, the counters must fit in a single row without horizontal overflow, wrapping, or lateral scrolling.
- **View Switching**: The date state/context for each view switcher tab/tab-view (Diario, Calendario, Mensual) must be independent. Toggling between them must not overwrite or reset the active date/month/year of other views (e.g., if the user is in June 2026 in the daily view, goes to monthly view which shows the year 2026, and returns to daily view, the daily view must still show June 2026 and not reset to January 2026).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST hide date range/day filters when "Calendario" or "Mensual" view is selected, as these views inherit the month/year selection.
- **FR-002**: The "Mensual" view MUST omit redundant monthly counters that repeat already visible totalizer metrics.
- **FR-003**: The transaction counters header on mobile viewports MUST fit in a single horizontal row without wrapping, horizontal overflow, or lateral scrolling (remaining fully visible within the viewport).
- **FR-004**: The segmented control for view selection (Diario, Calendario, Mensual) and the counters MUST be visually grouped into a clean, cohesive top navigation/summary panel.
- **FR-006**: The active date context (selected month/year or range) for each of the three views (Diario, Calendario, Mensual) MUST be maintained independently. Switching views must restore the corresponding view's active date state.
- **FR-005**: All UI elements MUST support proper high-contrast rendering in both Light and Dark themes, specifically:
  - Calendar day borders must be visible in dark mode.
  - The "Add Account" button must be visible with correct contrast in light mode.
  - Hover states on the segmented controls must be visible and aesthetically pleasing in both modes.

### Key Entities *(include if feature involves data)*

- **Transaction View State**: Represents the currently selected view layout (Diario, Calendario, Mensual) and active filters (Month, Year).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of UI elements (including calendar borders, segmented control hovers, and account addition buttons) are visible and pass accessibility contrast checks in both light and dark modes.
- **SC-002**: On mobile viewports (widths under 640px), the summary counters section takes up exactly one row of vertical space and fits completely within the screen width without horizontal scroll, improving the vertical content viewport area for transactions.

## Assumptions

- **A-001**: The existing filtering logic by month/year is fully functional and can be shared between the calendar, monthly, and daily views.
- **A-002**: Light/Dark theme toggling is governed by tailwind/system-wide classes that are already in place.
