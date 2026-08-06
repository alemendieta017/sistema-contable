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

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Suite verification and quickstart validation

- [x] T015 Run complete automated test suite (`npm run test`) across backend to verify 100% test coverage and compliance
- [x] T016 [P] Run quickstart validation scenarios defined in `specs/016-system-accounts-equity/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational phase completion
- **User Story 2 (Phase 4)**: Depends on Foundational phase completion
- **User Story 3 (Phase 5)**: Depends on Foundational phase completion
- **Polish (Phase 6)**: Depends on all user stories completion

### Parallel Opportunities

- `T001` & `T002` in Setup can run in parallel
- `T006` (US1 test), `T009` (US2 test), and `T011` (US3 test) can be prepared in parallel
- `T013` (Controller) & `T014` (Frontend) in US3 can run in parallel once `T012` completes

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 (Setup) + Phase 2 (Foundational)
2. Phase 3 (User Story 1 - Real System Account Injection in Balance Sheet)
3. Validate US1 independently

### Incremental Delivery

1. Deliver US1 (Real System Accounts in Balance Sheet)
2. Add US2 (Zero-balance hiding)
3. Add US3 (Automated Fiscal Year Closing)
