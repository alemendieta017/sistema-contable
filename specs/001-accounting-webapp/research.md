# Technical Research: Web Accounting App (Sistema Contable)

This document outlines the architectural research, decisions, and patterns selected to build the double-entry accounting web application using NestJS 11, Next.js, and PostgreSQL in a hot-reloaded Docker monorepo.

---

## 1. Monorepo Organization & Workspace Management

- **Decision**: Use npm workspaces for monorepo management with a shared package containing TypeScript models, validation schemas (Zod), and API contracts.
- **Rationale**: 
  - Standard npm workspaces do not require installing additional tools (like pnpm or Yarn), reducing environment setup complexity for developers.
  - Centralizes type safety: both frontend and backend depend on the same TypeScript definitions, ensuring that any API or entity contract modification updates compile-time validation on both ends.
- **Alternatives Considered**: 
  - *pnpm workspaces*: Highly efficient for disk space, but introduces a dependency on pnpm. Standard npm is preferred for developer universality.
  - *Separate repositories*: Rejected because it leads to type duplication, contract desynchronization, and complex deployment coordination, violating Principle III (Monorepo Organization) of the Constitution.

---

## 2. Docker Dev Environment with Hot Reload

- **Decision**: Configure a `docker-compose.yml` with bind mounts for source code directories, node_modules volume caching, and commands that run developers servers.
  - **Backend**: Uses NestJS CLI watch mode (`nest start --watch` via `npm run start:dev`).
  - **Frontend**: Uses Next.js dev server (`next dev` via `npm run dev`).
  - **Database**: Official PostgreSQL 16 image.
- **Rationale**:
  - Bind mounts reflect code edits inside the container instantly.
  - Node modules are cached in named volumes so host-guest OS differences (especially Windows-WSL boundaries) do not cause dependency clashes or slow build performance.
- **Alternatives Considered**:
  - *Local process execution (no Docker)*: Rejected because the user explicitly requested a unified docker-compose to spin up the entire system easily.
  - *Docker polling vs filesystem events*: Windows host with WSL workspaces sometimes fails to propagate `inotify` events. We configure NestJS and Next.js with environment variables or watch settings to fall back to polling if file changes are missed.

---

## 3. Double-Entry PostgreSQL Ledger Schema

- **Decision**: Model the ledger using two primary tables with relational transaction integrity, implementing the persistence layer using TypeORM in NestJS:
  - `transactions` (Asiento Header): Stores ID, timestamp, description, status (Vigente, Anulado), and metadata.
  - `journal_entries` (Apuntes/Líneas): Stores ID, transaction ID, account ID, movement type (DEBIT or CREDIT), and amount.
  - **Integrity Enforcement**: 
    - Database transactions run under **Repeatable Read** or **Serializable** isolation levels to prevent race conditions during concurrent balance updates.
    - Application layer use cases check that $\sum \text{Debits} = \sum \text{Credits}$ before committing.
    - A database-level check or trigger verifies that the sum of entries for a given transaction ID balances out to zero (treating Debits as positive and Credits as negative numbers).
- **Rationale**:
  - Strict compliance with Principle I (Double-Entry Bookkeeping & Ledger Integrity).
  - Splitting header and details allows multi-item entries (split transactions) cleanly, satisfying the key functional requirement requested by the user.
- **Alternatives Considered**:
  - *Single transaction line with opposite accounts (like the original mobile app)*: Rejected because it cannot support multi-item entries (e.g. split transactions), which is the primary feature addition requested.

---

## 4. Tailwind CSS v4 & shadcn/ui on Next.js SSR

- **Decision**: Integrate Tailwind CSS v4 using the new `@tailwindcss/postcss` compiler or the native v4 vite/next plugins, paired with shadcn/ui components configured for mobile-first views.
- **Rationale**:
  - Tailwind v4 simplifies configuration by moving setup from `tailwind.config.js` into CSS files using `@theme` and `@import`.
  - Next.js App Router (SSR) ensures fast initial load times, which is critical for mobile web applications.
  - shadcn/ui provides clean, accessible components that integrate naturally with Tailwind CSS, allowing us to build the premium, responsive dashboard screens required to match the RealByte mobile layout.
- **Alternatives Considered**:
  - *Tailwind v3*: Deemed legacy; the constitution explicitly mandates Tailwind v4.3.
