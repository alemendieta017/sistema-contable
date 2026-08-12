# Tasks: Create Account from Dropdown in Transaction Entry

**Input**: Design documents from `specs/018-create-account-in-dropdown/`
**Prerequisites**: [plan.md](file:///C:/Users/amend/.gemini/antigravity/worktrees/sistema-contable/add_account_journal_entry/specs/018-create-account-in-dropdown/plan.md), [spec.md](file:///C:/Users/amend/.gemini/antigravity/worktrees/sistema-contable/add_account_journal_entry/specs/018-create-account-in-dropdown/spec.md), [data-model.md](file:///C:/Users/amend/.gemini/antigravity/worktrees/sistema-contable/add_account_journal_entry/specs/018-create-account-in-dropdown/data-model.md), [research.md](file:///C:/Users/amend/.gemini/antigravity/worktrees/sistema-contable/add_account_journal_entry/specs/018-create-account-in-dropdown/research.md), [contracts/account-quick-create.md](file:///C:/Users/amend/.gemini/antigravity/worktrees/sistema-contable/add_account_journal_entry/specs/018-create-account-in-dropdown/contracts/account-quick-create.md)

## Organization

Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Verify project testing environment and existing component suites

- [x] T001 Inspect test environment and setup test mocks in [JournalEntryRow.test.tsx](file:///C:/Users/amend/.gemini/antigravity/worktrees/sistema-contable/add_account_journal_entry/frontend/src/tests/JournalEntryRow.test.tsx) and [TransactionModal.test.tsx](file:///C:/Users/amend/.gemini/antigravity/worktrees/sistema-contable/add_account_journal_entry/frontend/src/tests/TransactionModal.test.tsx)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Define common prop contracts and callbacks required for inline account creation across transaction forms

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T002 [P] Extend `JournalEntryRowProps` interface to support `onQuickCreateAccount?: (initialName: string) => void` callback prop in [JournalEntryRow.tsx](file:///C:/Users/amend/.gemini/antigravity/worktrees/sistema-contable/add_account_journal_entry/frontend/src/components/JournalEntryRow.tsx)
- [x] T003 [P] Update `AccountModalProps` interface to support `initialName?: string` prefilling and `onSuccess?: (account?: Account) => void` callback in [AccountModal.tsx](file:///C:/Users/amend/.gemini/antigravity/worktrees/sistema-contable/add_account_journal_entry/frontend/src/components/AccountModal.tsx)

**Checkpoint**: Core component prop definitions ready - user story implementation can begin

---

## Phase 3: User Story 1 - Quick Account Creation from Account Dropdown (Priority: P1) 🎯 MVP

**Goal**: Provide an inline "+ Add New Account" / "+ Crear Cuenta" action and dynamic non-matching search shortcut in account combobox dropdown without navigating away from the transaction page.

**Independent Test**: Render `JournalEntryRow` with mock accounts, click "+ Add New Account" or search non-existent term (e.g. "Servicios Tigo") and click "+ Create account 'Servicios Tigo'", verify `onQuickCreateAccount` callback fires with expected initial search text.

### Tests for User Story 1

- [x] T004 [P] [US1] Add unit test cases for quick account creation triggers and search shortcuts in [JournalEntryRow.test.tsx](file:///C:/Users/amend/.gemini/antigravity/worktrees/sistema-contable/add_account_journal_entry/frontend/src/tests/JournalEntryRow.test.tsx)

### Implementation for User Story 1

- [x] T005 [US1] Add explicit "+ Crear Cuenta" button and dynamic search shortcut "+ Crear cuenta '{search}'" to `JournalEntryRow` dropdown options in [JournalEntryRow.tsx](file:///C:/Users/amend/.gemini/antigravity/worktrees/sistema-contable/add_account_journal_entry/frontend/src/components/JournalEntryRow.tsx)
- [x] T006 [US1] Update keyboard navigation (`ArrowDown`, `ArrowUp`, `Enter`) in `JournalEntryRow` to support selecting quick creation options in [JournalEntryRow.tsx](file:///C:/Users/amend/.gemini/antigravity/worktrees/sistema-contable/add_account_journal_entry/frontend/src/components/JournalEntryRow.tsx)

**Checkpoint**: User Story 1 fully functional and independently testable in `JournalEntryRow`.

---

## Phase 4: User Story 2 - Account Creation Modal with Auto-Selection (Priority: P2)

**Goal**: Display `AccountModal` prefilled with search query, persist created account via API, update session accounts cache, and auto-select on the active line item.

**Independent Test**: Trigger quick creation modal from `TransactionModal` or `NewTransactionPage`, fill account form, submit, verify `AccountModal` closes, new account is appended to accounts state and selected on active line item.

### Tests for User Story 2

- [x] T007 [P] [US2] Add unit test cases for inline account creation, state updating, and line item auto-selection in [TransactionModal.test.tsx](file:///C:/Users/amend/.gemini/antigravity/worktrees/sistema-contable/add_account_journal_entry/frontend/src/tests/TransactionModal.test.tsx)

### Implementation for User Story 2

- [x] T008 [US2] Update `AccountModal.tsx` to prefill account name from `initialName` prop and pass created account object to `onSuccess` callback in [AccountModal.tsx](file:///C:/Users/amend/.gemini/antigravity/worktrees/sistema-contable/add_account_journal_entry/frontend/src/components/AccountModal.tsx)
- [x] T009 [P] [US2] Integrate quick create state, `AccountModal` rendering, accounts cache update, and line auto-selection in [TransactionModal.tsx](file:///C:/Users/amend/.gemini/antigravity/worktrees/sistema-contable/add_account_journal_entry/frontend/src/components/TransactionModal.tsx)
- [x] T010 [P] [US2] Integrate quick create state, `AccountModal` rendering, accounts cache update, and line auto-selection in [page.tsx](file:///C:/Users/amend/.gemini/antigravity/worktrees/sistema-contable/add_account_journal_entry/frontend/src/app/transactions/new/page.tsx)

**Checkpoint**: User Story 2 functional; created accounts auto-select and populate accounts list across transaction forms.

---

## Phase 5: User Story 3 - Draft Preservation & Cancel Safety (Priority: P3)

**Goal**: Guarantee 100% draft preservation during quick account creation, modal cancellation, or server validation failure.

**Independent Test**: Partially fill transaction header and multi-line debits/credits, open quick account modal, cancel or cause validation error, verify header and line items remain 100% intact.

### Tests for User Story 3

- [x] T011 [P] [US3] Add unit test cases verifying draft data preservation on modal cancel and inline validation error in [TransactionModal.test.tsx](file:///C:/Users/amend/.gemini/antigravity/worktrees/sistema-contable/add_account_journal_entry/frontend/src/tests/TransactionModal.test.tsx)

### Implementation for User Story 3

- [x] T012 [US3] Ensure modal dismiss (`Escape` key, backdrop click, Cancel button) safely resets quick create trigger state without clearing parent transaction form state in [AccountModal.tsx](file:///C:/Users/amend/.gemini/antigravity/worktrees/sistema-contable/add_account_journal_entry/frontend/src/components/AccountModal.tsx)

**Checkpoint**: All user stories fully implemented and verified independently.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Code quality, ESLint compliance, and complete manual & automated verification

- [x] T013 [P] Run ESLint and TypeScript checks (`npm run lint` / `npx tsc --noEmit`) to ensure zero errors and zero warnings across [JournalEntryRow.tsx](file:///C:/Users/amend/.gemini/antigravity/worktrees/sistema-contable/add_account_journal_entry/frontend/src/components/JournalEntryRow.tsx), [AccountModal.tsx](file:///C:/Users/amend/.gemini/antigravity/worktrees/sistema-contable/add_account_journal_entry/frontend/src/components/AccountModal.tsx), [TransactionModal.tsx](file:///C:/Users/amend/.gemini/antigravity/worktrees/sistema-contable/add_account_journal_entry/frontend/src/components/TransactionModal.tsx), and [page.tsx](file:///C:/Users/amend/.gemini/antigravity/worktrees/sistema-contable/add_account_journal_entry/frontend/src/app/transactions/new/page.tsx)
- [x] T014 Perform end-to-end manual and automated verification scenarios according to [quickstart.md](file:///C:/Users/amend/.gemini/antigravity/worktrees/sistema-contable/add_account_journal_entry/specs/018-create-account-in-dropdown/quickstart.md)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
- **Polish (Final Phase)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Starts after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Starts after Foundational (Phase 2) and US1 callback hooks
- **User Story 3 (P3)**: Starts after Foundational (Phase 2) - Verifies cancel safety on US2 modal integration

### Parallel Opportunities

- `T002` and `T003` can run in parallel (different component files)
- `T004` (US1 tests) can run in parallel with foundational interface updates
- `T009` and `T010` (US2 integration in `TransactionModal` vs `page.tsx`) can run in parallel
- `T011` and `T013` can run in parallel

---

## Implementation Strategy

### MVP First (User Story 1 & 2 Core)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1
4. Complete Phase 4: User Story 2
5. **STOP and VALIDATE**: Verify account quick creation and auto-selection in `TransactionModal` and `NewTransactionPage`

---

## Phase 7: Convergence

- [x] T015 [CRITICAL] Fix ESLint unused variable warnings in catch blocks in [page.tsx](file:///C:/Users/amend/.gemini/antigravity/worktrees/sistema-contable/add_account_journal_entry/frontend/src/app/transactions/new/page.tsx), [AccountModal.tsx](file:///C:/Users/amend/.gemini/antigravity/worktrees/sistema-contable/add_account_journal_entry/frontend/src/components/AccountModal.tsx), and [TransactionModal.tsx](file:///C:/Users/amend/.gemini/antigravity/worktrees/sistema-contable/add_account_journal_entry/frontend/src/components/TransactionModal.tsx) per [Constitution VII](file:///C:/Users/amend/.gemini/antigravity/worktrees/sistema-contable/add_account_journal_entry/.specify/memory/constitution.md) (contradicts)
