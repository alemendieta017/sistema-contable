# Tasks: Integration of Equity System Accounts and Fiscal Year Closing

**Input**: Design documents from `/specs/016-system-accounts-equity/`

**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: TDD approach is mandatory per project Constitution (Section V). Tests are written first and verified.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Update shared contracts, types, and domain models for system roles

- [x] T001 Update shared contracts with `SystemRole`, `SystemRoleSchema`, and optional `retainedEarningsAccountId` in `shared/src/index.ts`
- [x] T002 [P] Update domain model `Account` class to accept optional `systemRole` in `backend/src/domain/ledger/ledger.model.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core entity, migration, and seeder changes that MUST be complete before user story logic

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 Add `system_role` column and unique index `[userId, systemRole]` to `AccountEntity` in `backend/src/infrastructure/database/entities/account.entity.ts`
- [x] T004 Create TypeORM database migration to add `system_role` column and auto-assign/provision `NET_INCOME` and `RETAINED_EARNINGS` system accounts for existing users in `backend/src/infrastructure/database/migrations/1722880000000-add-system-role-to-accounts.ts`
- [x] T005 Update base and scenario seeders to attach `systemRole` (`NET_INCOME`, `RETAINED_EARNINGS`) to Equity accounts in `backend/src/infrastructure/database/seeds/scenarios/ready-for-closing.scenario.ts`

**Checkpoint**: Foundation ready - database schema and seeders support system roles.

---

## Phase 3: User Story 1 - Native Equity System Accounts in Chart of Accounts & Balance Sheet (Priority: P1) 🎯 MVP

**Goal**: Dynamically map calculated period net income directly into the real `NET_INCOME` system account under Equity in Balance Sheet reports, eliminating synthetic fallbacks (`'virtual-net-income'`).

**Independent Test**: Generate Balance Sheet and verify that net income appears under the real `NET_INCOME` system account in Equity with proper account tree nesting.

### Tests for User Story 1 (TDD) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T006 [P] [US1] Update integration tests in `backend/tests/integration/fast-reports.spec.ts` to expect real account IDs with `systemRole` instead of `'virtual-net-income'`

### Implementation for User Story 1

- [x] T007 [US1] Update `BalanceSheetUseCase` to retrieve `NET_INCOME` and `RETAINED_EARNINGS` system accounts by `systemRole`, inject calculated period outcomes into real account balances, and remove virtual fallbacks in `backend/src/application/periods/balance-sheet.use-case.ts`
- [x] T008 [US1] Ensure Equity tree depth aggregation in `applyDepthCollapse` seamlessly integrates system accounts under their parent Equity nodes in `backend/src/application/periods/balance-sheet.use-case.ts`

**Checkpoint**: User Story 1 functional and independently testable without synthetic virtual account IDs.

---

## Phase 4: User Story 2 - Zero-Balance Hiding for System Accounts in Financial Reports (Priority: P2)

**Goal**: Automatically omit system accounts (`NET_INCOME`, `RETAINED_EARNINGS`) with $0.00 balance from the Equity section of Balance Sheet reports.

**Independent Test**: Generate Balance Sheet for a period with 0 net income and 0 retained earnings and verify those accounts do not appear in the Equity list.

### Tests for User Story 2 (TDD) ⚠️

- [x] T009 [P] [US2] Add integration tests for zero-balance system account omission in `backend/tests/integration/fast-reports.spec.ts`

### Implementation for User Story 2

- [x] T010 [US2] Implement zero-balance filter logic (`Math.abs(balance) < 0.0001`) for Equity system accounts during report aggregation in `backend/src/application/periods/balance-sheet.use-case.ts`

**Checkpoint**: User Story 2 functional - zero balance system accounts are cleanly hidden from reports.

---

## Phase 5: User Story 3 - Streamlined Fiscal Year Closing using System Accounts (Priority: P3)

**Goal**: Enable closing fiscal years automatically using the company's designated `RETAINED_EARNINGS` system account without requiring an explicit account ID payload.

**Independent Test**: Post a fiscal year close request without `retainedEarningsAccountId` and verify closing entries post to the designated `RETAINED_EARNINGS` account.

### Tests for User Story 3 (TDD) ⚠️

- [x] T011 [P] [US3] Update annual closing integration tests in `backend/tests/integration/annual-closing.spec.ts` to test closing without passing explicit account ID

### Implementation for User Story 3

- [x] T012 [US3] Update `CloseFiscalYearUseCase` to automatically query the company account with `systemRole = 'RETAINED_EARNINGS'` when `dto.retainedEarningsAccountId` is omitted in `backend/src/application/periods/close-fiscal-year.use-case.ts`
- [x] T013 [P] [US3] Update `PeriodController` to parse updated `CloseFiscalYearRequestSchema` in `backend/src/infrastructure/controllers/period.controller.ts`
- [x] T014 [P] [US3] Update frontend fiscal year close dialog to make target account selection optional in `frontend/src/`

**Checkpoint**: All user stories functional and verified independently.

---

## Phase 6: User Story 4 - Operability Restrictions on System Accounts in Journal Entries (Priority: P1)

**Goal**: Restrict manual posting to `NET_INCOME` (*Resultado del Ejercicio*) in both backend validation and frontend UI selectors, while ensuring `RETAINED_EARNINGS` (*Resultados Acumulados / Utilidades Retenidas*) remains operable.

**Independent Test**: Try selecting or posting a manual journal entry to `NET_INCOME` (fails in UI & API), then post to `RETAINED_EARNINGS` (succeeds).

### Tests for User Story 4 (TDD) ⚠️

- [ ] T018 [P] [US4] Add backend integration tests verifying that creating a journal entry targeting `NET_INCOME` throws a validation exception, whereas targeting `RETAINED_EARNINGS` succeeds in `backend/tests/integration/`

### Implementation for User Story 4

- [ ] T019 [US4] Add domain/use-case validation in `CreateJournalEntryUseCase` to reject manual journal entries that reference accounts with `systemRole = 'NET_INCOME'` in `backend/src/application/entries/`
- [ ] T020 [P] [US4] Update frontend journal entry account selection dropdowns to filter out accounts with `systemRole = 'NET_INCOME'`, while keeping `RETAINED_EARNINGS` visible and operable in `frontend/src/`

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Suite verification and quickstart validation

- [x] T015 Run complete automated test suite (`npm run test`) across backend to verify 100% test coverage and compliance
- [x] T016 [P] Run quickstart validation scenarios defined in `specs/016-system-accounts-equity/quickstart.md`

---

## Phase 8: Convergence

- [x] T017 Remove account selector dropdown from close fiscal year modal in `frontend/src/app/periods/page.tsx` for 100% automatic system account assignment (`RETAINED_EARNINGS`) per US3/AC1

