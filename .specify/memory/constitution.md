<!--
SYNC IMPACT REPORT
- Version change: 2.0.0 -> 2.1.0
- List of modified principles: None
- Added sections:
  * VI. Prevention of Magic Strings & Strict Type Constants
- Removed sections: None
- Templates requiring updates:
  * specs/001-accounting-webapp/plan.md (✅ updated)
- Follow-up TODOs: None
-->

# Sistema Contable Constitution

## Core Principles

### I. Double-Entry Bookkeeping & Ledger Integrity
All financial recordings MUST strictly follow the double-entry bookkeeping principle (partida doble). Every transaction must consist of at least one debit and one credit, and the total value of debits must always equal the total value of credits. The ledger records must be append-only and immutable; errors or adjustments must be resolved using correction/reversal journal entries rather than modifying existing entries.

### II. Clean Architecture & SOLID Principles (MANDATORY)
The software codebase MUST adhere to Clean Architecture patterns (separation of domain entities, use cases/application business logic, interface adapters, and external infrastructure/frameworks) and SOLID design principles. NestJS modules must encapsulate services using Dependency Injection to ensure decoupling and testability. The domain layer must be completely free of framework-specific dependencies.

### III. Monorepo Organization & Unified Type Safety
The repository is structured as a Monorepo containing both the NestJS backend and Next.js frontend projects. Shared assets, types, schemas, and API contracts MUST be centralized (e.g., in a shared packages folder) to maintain strict compile-time type safety across both frontend and backend systems, eliminating code duplication.

### IV. Budgetary Control and Personal/Family Domain
The accounting engine MUST support budgeting features, permitting the definition, allocation, and enforcement of budget limits across personal and family account categories. Budget limits must be dynamically evaluated against actual ledger transactions.

### V. Strict Test-Driven Development (TDD)
Test-Driven Development is strictly mandatory. Tests must be written and approved before implementation. Financial calculations, double-entry verification, budget checks, and ledger integrity constraints must maintain 100% test coverage. No code modification is allowed to bypass failing tests.

### VI. Prevention of Magic Strings & Strict Type Constants
To prevent runtime errors, maintain codebase readability, and ensure strict type safety, inline magic strings MUST be strictly avoided. TypeScript enums, read-only constant objects (dictionaries), or union types MUST be utilized for all categorized statuses, action types, config keys, routes, or any other set of finite values.

## Technical Constraints
The backend will use Node.js with NestJS framework and the frontend will use Next.js. Both projects will be written in TypeScript to guarantee end-to-end type safety. Styling will be implemented using TailwindCSS v4.3 for utility styling, and shadcn/ui for reusable components. Database integrity must be enforced via relational foreign keys and transaction isolation levels (Serializable or Repeatable Read) to prevent race conditions in ledger balance updates.

## Development Workflow & Quality Gates
Every pull request must pass the automated test suite, maintain 100% test coverage on financial calculation engines, and pass strict ESLint/Prettier formatting and quality compliance. Architectures must be reviewed to verify adherence to SOLID principles and Clean Architecture layers.

## Governance
This constitution supersedes all other development practices. Amendments or modifications to these principles require documentation of the rationale, a major version bump, and approval from the lead developers.

**Version**: 2.1.0 | **Ratified**: 2026-06-27 | **Last Amended**: 2026-06-27
