# Tasks: Restore Transaction UI Borders and Look & Feel

**Input**: Design documents from `/specs/005-restore-transaction-ui/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, quickstart.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `frontend/src/`

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure (Already Verified)

- [x] T001 Verify project structure and configuration

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented (Already Verified)

- [x] T002 Verify Next.js configuration and tailwind imports in `frontend/src/app/globals.css`

---

## Phase 3: User Story 1 - Consistent Rounding and Card Styles (Priority: P1) 🎯 MVP

**Goal**: Restore look and feel of dashboard summary cards, view switcher tabs, and layout containers to match the cards and components on other screens.

**Independent Test**: Navigate to `/transactions` and verify that the header, summary cards, and view switches have modern rounded corners (`rounded-2xl` / `rounded-xl`).

### Implementation for User Story 1

- [x] T003 [US1] Update view switch tabs container and buttons styling in `frontend/src/app/transactions/page.tsx`
- [x] T004 [US1] Update dashboard summary cards styling in `frontend/src/app/transactions/page.tsx`
- [x] T005 [US1] Update transactions page layout styling and toast messages in `frontend/src/app/transactions/page.tsx`

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently.

---

## Phase 4: User Story 2 - Consistent List and Table Views (Priority: P2)

**Goal**: Align borders, dividers, and background colors of transaction records (Daily view, monthly lists, calendar view, filters) with standard list styling.

**Independent Test**: Switch views between Diario, Calendario, and Mensual and verify that lists, grids, and filters are rounded and have clean divider styling.

### Implementation for User Story 2

- [x] T006 [P] [US2] Update DailyView component borders and list rounding in `frontend/src/components/DailyView.tsx`
- [x] T007 [P] [US2] Update MonthlyView component container card, selector buttons, and monthly grid rounding in `frontend/src/components/MonthlyView.tsx`
- [x] T008 [P] [US2] Update CalendarView component selector buttons, container card, and calendar day slots rounding in `frontend/src/components/CalendarView.tsx`
- [x] T009 [P] [US2] Update TransactionFilters component filter card container, range checkboxes, temporal navigation, and selector inputs in `frontend/src/components/TransactionFilters.tsx`

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Final verification of the changes.

- [x] T010 Run quickstart.md validation

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately (completed)
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories (completed)
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2)
- **User Story 2 (P2)**: Can start after Foundational (Phase 2)

### Parallel Opportunities

- All Phase 4 implementation tasks (T006, T007, T008, T009) can run in parallel since they modify separate files.
