# Tasks: Improve Accounting Entry Form UI

**Input**: Design documents from `/specs/006-improve-accounting-entry-form/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, quickstart.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initial project checks and setup verification.

- [x] T001 Verify active Next.js development server is running and page routes load correctly

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Ensure APIs and utility functions are imported.

- [x] T002 Import `api` from service layer and `formatCurrency` helper in `frontend/src/app/transactions/asiento-libre/page.tsx`

---

## Phase 3: User Story 1 - Clean Line-Based Entry Creation (Priority: P1) 🎯 MVP

**Goal**: Convert entry forms to line-based table layouts and make DEBE/HABER styling proportionate.

**Independent Test**: Navigate to `/transactions/asiento-libre` and open TransactionModal. Ensure entries render as clean table rows instead of cards.

### Implementation for User Story 1

- [x] T003 [US1] Change outer page wrapper to `max-w-3xl` (or `max-w-4xl`) for a wider grid layout in `frontend/src/app/transactions/asiento-libre/page.tsx`
- [x] T004 [US1] Replace the entry cards with a compact, line-by-line grid table layout featuring header labels in `frontend/src/app/transactions/asiento-libre/page.tsx`
- [x] T005 [US1] Implement a small segmented button toggle for DEBE/HABER type selection in `frontend/src/app/transactions/asiento-libre/page.tsx`
- [x] T006 [P] [US1] Update buttons and text labels for "DEBE" / "HABER" to use proportionate, clean, smaller fonts in `frontend/src/components/JournalEntryRow.tsx`
- [x] T007 [US1] Standardize row alignments, borders, and margins to matches the premium design tokens in `frontend/src/components/JournalEntryRow.tsx`

**Checkpoint**: User Story 1 complete. Compact table-like entries and clean type selectors are functional.

---

## Phase 4: User Story 2 - Respect Default Currency, Decimals, and Symbols (Priority: P1)

**Goal**: Respect base currency decimals and symbols in placeholders, input labels, and footers.

**Independent Test**: Configure PYG (0 decimals, ₲ symbol) as base currency. Form placeholders must read `0` and total label must display `₲`.

### Implementation for User Story 2

- [x] T008 [US2] Fetch currencies list via `api.currencies.list()` and find the base currency on component mount in `frontend/src/app/transactions/asiento-libre/page.tsx`
- [x] T009 [US2] Render dynamic placeholders for the amount inputs based on default currency's decimal places (e.g. `(0).toFixed(baseCurrency.decimalPlaces)`) in `frontend/src/app/transactions/asiento-libre/page.tsx`
- [x] T010 [US2] Display default currency symbol prefix next to the amount input fields in `frontend/src/app/transactions/asiento-libre/page.tsx`
- [x] T011 [US2] Format total debits, total credits, and difference fields using `formatCurrency(val, baseCurrency)` in `frontend/src/app/transactions/asiento-libre/page.tsx`
- [x] T012 [P] [US2] Add support for receiving `baseCurrency` property to align inputs and format placeholders in `frontend/src/components/JournalEntryRow.tsx`
- [x] T013 [US2] Fetch base currency and pass it down to `JournalEntryRow` rows in `frontend/src/components/TransactionModal.tsx`
- [x] T014 [US2] Update totals, difference labels, and placeholders inside the modal using the default currency config in `frontend/src/components/TransactionModal.tsx`

**Checkpoint**: User Story 2 complete. The app now dynamically respects and formats base currency settings.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Final validations and responsive visual tweaks.

- [x] T015 Verify layout responsiveness on narrow desktop and simulated mobile screens for both forms
- [x] T016 Run quickstart.md verification script or manual validations to ensure zero defects

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup & Foundational**: Must complete before starting User Story 1 or 2
- **User Story 1**: Core visual layout task, blocks User Story 2 context additions
- **User Story 2**: Depends on User Story 1 grid structures
- **Polish**: Final quality step after all stories are completed

### Parallel Opportunities

- T006 can run in parallel with T004 / T005 as it edits a separate file (`JournalEntryRow.tsx`).
- T012 can run in parallel with the Asiento Libre currency setup tasks.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Setup and foundational checks (T001-T002).
2. Complete visual transformation to rows (T003-T007).
3. Verify line-based table layout.

### Incremental Delivery

1. Deliver row-based layout (US1).
2. Apply base currency placeholder and totals logic (US2).
3. Polish and verify responsiveness (T015-T016).
