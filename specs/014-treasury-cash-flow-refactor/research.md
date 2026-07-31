# Phase 0 Research: Treasury Cash Accounts & Cash Flow Refactor

## Decisions & Rationale

### 1. Default Money Account Initialization Strategy
- **Decision**: Update `handleCreateDefaultAccounts` in `frontend/src/app/accounts/page.tsx` to include `isCashOrBank: true` for default `ASSET` accounts (`Efectivo` and `Cuenta Bancaria`).
- **Rationale**: Currently, `handleCreateDefaultAccounts` creates accounts without specifying `isCashOrBank`, defaulting them to `false` in the database. Consequently, the Cash Flow report treats cash transactions as non-liquid activity. Explicitly passing `isCashOrBank: true` during default account generation fixes initial state seamlessly.
- **Alternatives Considered**:
  - *Backend auto-tagging on account creation*: Automatically flag any account named "Efectivo" or "Banco" as liquid in NestJS `CreateAccountUseCase`. Rejected because hardcoding name heuristics in domain creation use cases reduces flexibility when users intentionally create custom non-liquid asset accounts.

### 2. Form Toggle vs. Table Grid Checkbox in UI
- **Decision**: Remove the inline `"Líquido"` checkbox from rows in `AccountsList.tsx`. Add an explicit `"¿Es cuenta de dinero / efectivo?"` toggle inside `AccountModal.tsx` when account type is `ASSET`, with auto-activation when keywords (`Efectivo`, `Caja`, `Banco`, `MP`) are detected in the account name.
- **Rationale**: Inline checkboxes in tables encourage accidental status mutations without context. Moving the toggle to the account modal provides clear input controls, error feedback, and immutability lock indicators.
- **Alternatives Considered**:
  - *Keep inline checkbox with modal prompt confirmation*: Rejected because inline editing is error-prone and visually cluttered compared to a clean status badge (`Caja/Banco`).

### 3. Liquidity Flag Immutability Enforcement
- **Decision**: Enforce `isCashOrBank` immutability in `UpdateAccountUseCase` when `JournalEntryEntity` count for the account is `> 0`. Return HTTP 400 (`BadRequestException`) with a clear error message. Render a locked toggle in edit modals for accounts with transaction history.
- **Rationale**: Mutating liquidity status on accounts with posted transactions corrupts past cash flow period balances and auditability.
- **Alternatives Considered**:
  - *Allowing status change with retroactive period balance recalculation*: Rejected because reclassifying historical cash balances violates accounting audit trail immutability.

### 4. High-Performance Direct Cash Flow Engine
- **Decision**: Maintain the cash flow report query over `AccountPeriodBalanceEntity`. Cuentas with `isCashOrBank: true` are aggregated into opening/closing cash balances and `cashNetFlow`, while non-liquid accounts (`isCashOrBank: false`) breakdown net movement across revenue, expense, liability, and non-liquid asset categories.
- **Rationale**: `AccountPeriodBalanceEntity` guarantees deterministic, $O(N_{\text{accounts}})$ performance rather than $O(N_{\text{journal\_entries}})$, allowing sub-500ms page load times across years of data.
- **Alternatives Considered**:
  - *Scanning raw journal entries on demand*: Rejected due to high database load and non-scalable performance as entry history grows.
