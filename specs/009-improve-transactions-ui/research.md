# Research Notes: Transaction Screen UI/UX Improvements

## Overview
This document contains research regarding broken styles, redundant components, and date sync strategies in the transactions screen.

## Decisions & Rationale

### 1. Unified Dashboard Header Layout
- **Decision**: Wrap the page title, view switcher, and counters inside a single top card.
- **Rationale**: Currently, these elements float independently in the viewport and feel disconnected. Placing them in a cohesive card brings visual structure similar to premium dashboards.

### 2. Single-line Mobile Counters (No Horizontal Scroll)
- **Decision**: Use a CSS grid `grid grid-cols-3 gap-2 w-full` with card padding reduction (`p-2 sm:p-3`) and text truncation to fit all 3 counters in a single row without horizontal overflow or lateral scrolling.
- **Rationale**: The user wants the counters on a single line but without protruding or requiring horizontal scroll. Splitting into 3 equal columns that automatically fit within the screen width prevents horizontal overflow and scrolling completely.

### 3. Date State Independence across Tabs
- **Decision**: Implement independent date range state for each view switcher tab (`daily`, `calendar`, `monthly`) in the parent component. When switching views, restore that view's active date context.
- **Rationale**: Toggling between tabs must not reset or overwrite the active date of other views (e.g. going from daily in June 2026 to monthly by year, and returning to daily must preserve June 2026 instead of resetting to January 2026). The parent component stores dates for all views (`dailyDates`, `calendarDates`, `monthlyDates`) and updates the active fetch range based on the current view tab.

### 4. Custom Tailwind Colors
- **Decision**: Map out and replace all non-standard colors:
  - `bg-indigo-650` -> `bg-indigo-600` (fixes the Add Account button disappearing in light theme).
  - `slate-750` -> `slate-700` (fixes missing grid borders in dark theme).
  - `red-550`, `red-555` -> `red-500` (standardized red accent).
- **Rationale**: Tailwind v4 standard color scale does not contain `550`, `650`, or `750` levels. These invalid classes result in transparent/unresolved styles.
