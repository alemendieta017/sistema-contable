# Tasks: Danger Zone Settings - Factory Reset & Account Deletion

**Input**: Design documents from `/specs/021-account-danger-zone/`
**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [data-model.md](data-model.md), [research.md](research.md), [contracts/danger-zone-api.contract.md](contracts/danger-zone-api.contract.md)
**Constitution**: Adheres to Clean Architecture, Strict TDD, TypeScript Type Safety, and ESLint Zero-Error Compliance (Principle VII).

---

## Phase 1: Setup (Shared Types & Contracts)

**Purpose**: Define centralized enums, validation schemas, DTOs, and default starter accounts in the shared package.

- [x] T001 Define `DangerZoneAction` enum and confirmation phrase constants (`RESTABLECER DATOS`, `ELIMINAR MI CUENTA`) in `shared/src/index.ts`
- [x] T002 [P] Define `FactoryResetRequestSchema`, `DeleteAccountRequestSchema`, and `DangerZoneResponseSchema` with Zod validation in `shared/src/index.ts`
- [x] T003 [P] Define `DEFAULT_STARTER_ACCOUNTS` template definitions and types in `shared/src/index.ts`
- [x] T004 Build shared monorepo package with `npm run shared:build`

---

## Phase 2: Foundational (Backend Module & Error Handling Infrastructure)

**Purpose**: Core backend module scaffolding and error handling required before implementing use cases.

- [x] T005 Define Danger Zone DTO classes and mapping adapters in `backend/src/infrastructure/controllers/dto/danger-zone.dto.ts`
- [x] T006 [P] Register auth error code `AUTH_INVALID_CURRENT_PASSWORD` in `backend/src/domain/exceptions/auth.exception.ts`
- [x] T007 Create `DangerZoneModule` scaffolding in `backend/src/infrastructure/danger-zone/danger-zone.module.ts` and register in `backend/src/app.module.ts`

**Checkpoint**: Foundation ready — User Story implementation can now proceed.

---

## Phase 3: User Story 1 - Settings Danger Zone Section Display (Priority: P1)

**Goal**: Render a dedicated, high-contrast "Zona de Peligro" section at the bottom of `/settings` with red styling and clear warnings.

**Independent Test**: Navigate to `/settings`, scroll down, and verify that the red-bordered Danger Zone section is displayed with two distinct action triggers for "Restablecer datos de fábrica" and "Eliminar cuenta permanentemente".

### Implementation for User Story 1

- [x] T008 [P] [US1] Create Danger Zone container component `DangerZoneSection.tsx` in `frontend/src/components/settings/DangerZoneSection.tsx`
- [x] T009 [US1] Integrate `DangerZoneSection` at the bottom of the Settings view in `frontend/src/app/settings/page.tsx`
- [x] T010 [US1] Verify responsive mobile and desktop styling for the Danger Zone cards in `frontend/src/components/settings/DangerZoneSection.tsx`

**Checkpoint**: User Story 1 complete and independently testable in the UI.

---

## Phase 4: User Story 2 - Factory Reset (Data Wipe & Reset to Defaults) (Priority: P1)

**Goal**: Allow authenticated users to purge all accounting data (transactions, journal entries, periods, balances, budgets, custom accounts) and re-seed starter accounts while keeping their user session active.

**Independent Test**: Trigger "Restablecer datos de fábrica", provide confirmation phrase + password, and verify that all transactions/budgets/periods are removed, starter accounts are re-created, and the user remains logged in.

### Tests for User Story 2 (TDD Mandatory)

- [x] T011 [P] [US2] Write unit tests for `FactoryResetUseCase` verifying transactional cascade purge and base account re-seeding in `backend/src/application/danger-zone/factory-reset.use-case.spec.ts`

### Implementation for User Story 2

- [x] T012 [US2] Implement `FactoryResetUseCase` with atomic transaction, cascade deletion, and default accounts re-seeding in `backend/src/application/danger-zone/factory-reset.use-case.ts`
- [x] T013 [US2] Implement `POST /api/v1/danger-zone/reset-data` endpoint in `backend/src/infrastructure/controllers/danger-zone.controller.ts`
- [x] T014 [P] [US2] Add `dangerZone.resetData` method in `frontend/src/services/api.ts`
- [x] T015 [US2] Create `FactoryResetModal.tsx` confirmation dialog with phrase matching and password input in `frontend/src/components/settings/FactoryResetModal.tsx`
- [x] T016 [US2] Connect `FactoryResetModal` trigger and completion handler in `frontend/src/components/settings/DangerZoneSection.tsx`

**Checkpoint**: User Story 2 complete. User can reset all financial data to defaults without losing account access.

---

## Phase 5: User Story 3 - Permanent User Account Deletion (Priority: P1)

**Goal**: Allow authenticated users to permanently destroy their user account, credentials, and all associated financial records, immediately terminating sessions and redirecting to the login page.

**Independent Test**: Trigger "Eliminar cuenta permanentemente", pass confirmation phrase + password, and verify that user and all related records are deleted from database, local storage tokens are wiped, and browser redirects to `/login`.

### Tests for User Story 3 (TDD Mandatory)

- [x] T017 [P] [US3] Write unit tests for `DeleteAccountUseCase` verifying complete purge of user and cascaded financial records in `backend/src/application/danger-zone/delete-account.use-case.spec.ts`

### Implementation for User Story 3

- [x] T018 [US3] Implement `DeleteAccountUseCase` with atomic transaction purging all user records, tokens, and the user entity in `backend/src/application/danger-zone/delete-account.use-case.ts`
- [x] T019 [US3] Implement `POST /api/v1/danger-zone/delete-account` endpoint in `backend/src/infrastructure/controllers/danger-zone.controller.ts`
- [x] T020 [P] [US3] Add `dangerZone.deleteAccount` method and session cleanup in `frontend/src/services/api.ts`
- [x] T021 [US3] Create `DeleteAccountModal.tsx` confirmation dialog with destructive warning in `frontend/src/components/settings/DeleteAccountModal.tsx`
- [x] T022 [US3] Connect `DeleteAccountModal` trigger, auth token purge, and router redirect to `/login` in `frontend/src/components/settings/DangerZoneSection.tsx`

**Checkpoint**: User Story 3 complete. Permanent account deletion and session termination functional.

---

## Phase 6: User Story 4 - Strict Confirmation Verification & Error Protection (Priority: P2)

**Goal**: Enforce strict client-side phrase matching, password verification error handling, and safe modal cancellation to prevent accidental data destruction.

**Independent Test**: Confirm that action buttons remain disabled until phrases match exactly, wrong passwords trigger clear error messages without corrupting data, and clicking "Cancelar" closes modals safely.

### Implementation for User Story 4

- [x] T023 [P] [US4] Add client-side validation logic and disabled button states for confirmation phrase and password in `frontend/src/components/settings/FactoryResetModal.tsx`
- [x] T024 [P] [US4] Add client-side validation logic and disabled button states for confirmation phrase and password in `frontend/src/components/settings/DeleteAccountModal.tsx`
- [x] T025 [US4] Implement specific error toast and alert handling for `AUTH_INVALID_CURRENT_PASSWORD` in `frontend/src/components/settings/FactoryResetModal.tsx` and `frontend/src/components/settings/DeleteAccountModal.tsx`
- [x] T026 [US4] Ensure safe modal dismissal and form state reset on cancel in `frontend/src/components/settings/DangerZoneSection.tsx`

**Checkpoint**: User Story 4 complete. High-friction protections and error safeguards active.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Validation, automated testing, and code quality verification.

- [x] T027 Run backend automated test suite with `npm run test --workspace=backend`
- [x] T028 [P] Run full monorepo ESLint verification ensuring 0 errors and 0 warnings with `npm run lint`
- [x] T029 Execute end-to-end scenarios per `specs/021-account-danger-zone/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately.
- **Foundational (Phase 2)**: Depends on Phase 1 (shared contracts built). Blocks all use cases.
- **User Story 1 (Phase 3)**: Depends on Phase 2. Can be developed in parallel with backend use cases.
- **User Story 2 (Phase 4)**: Depends on Phase 2.
- **User Story 3 (Phase 5)**: Depends on Phase 2.
- **User Story 4 (Phase 6)**: Depends on Phase 3, Phase 4, and Phase 5 modal components.
- **Polish (Phase 7)**: Depends on all user stories being implemented.

### Parallel Opportunities

- Phase 1: `T002`, `T003` can run in parallel.
- Phase 2: `T006` can run in parallel with `T005`.
- Phase 3: `T008` can run in parallel with backend work.
- Phase 4: `T011` (tests) runs first, `T014` (frontend API) can run in parallel with `T012`/`T013`.
- Phase 5: `T017` (tests) runs first, `T020` (frontend API) can run in parallel with `T018`/`T019`.
- Phase 6: `T023` and `T024` can run in parallel.

---

## Implementation Strategy

### MVP Scope (User Story 1 + User Story 2)

1. Complete Phase 1 (Shared Types & Contracts) and Phase 2 (Foundational Scaffolding).
2. Implement User Story 1 (`DangerZoneSection` in Settings).
3. Implement User Story 2 (`FactoryResetUseCase`, endpoint, modal, and reseeding).
4. Validate MVP: User can reset data to factory defaults.
5. Proceed to User Story 3 (Account Deletion) and User Story 4 (Safeguards & Polish).
