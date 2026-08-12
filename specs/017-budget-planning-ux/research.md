# Phase 0 Research & Technical Decisions: Budget Planning Matrix & Execution Control UX

**Branch**: `017-budget-planning-ux` | **Date**: 2026-08-12 | **Spec**: [spec.md](file:///C:/Users/amend/.gemini/antigravity/worktrees/sistema-contable/redesign_budget_planning_ux/specs/017-budget-planning-ux/spec.md)

---

## 1. Matrix Inline Cell Editing & Spreadsheet Clipboard Handling

### Decision

Implement a custom lightweight React Matrix Grid component supporting spreadsheet keyboard navigation (`Tab`, `Shift+Tab`, `Enter`, `Shift+Enter`, `Esc`) and clipboard paste parsing (`onPaste`).

### Rationale

- Standard HTML `<input>` tables lack seamless cross-cell keyboard focus traps and multi-cell range paste capabilities without custom event hooks.
- Using a custom component with raw key event handlers keeps dependencies zero, avoiding heavy commercial grid components (like Handsontable or AG-Grid) while guaranteeing sub-100ms response times and total layout control styled via TailwindCSS.
- Clipboard handling: `clipboardData.getData('text/plain')` splits rows by `\n` and cells by `\t`, mapping numeric inputs directly to targeted cell coordinates starting from the currently focused matrix cell.

### Alternatives Considered

- **AG-Grid / Handsontable**: Heavy bundle overhead (>500KB), complex styling overrides for dark mode, license restrictions. Rejected to maintain monorepo clean dependencies.
- **Formik / React Hook Form per cell**: Severe performance degradation when rendering 12 months x 50 accounts (600 form fields) with input change re-renders. Rejected in favor of focused cell state + batch matrix state.

---

## 2. Smart Budget Distribution Drivers (Calculation Engines)

### Decision

Provide client-side math transformation helpers with instant matrix grid recalculation + server-side validation during batch save.

### Rationale

- **Drivers Supported**:
  1. `FLAT_PRORATE`: Divide annual total equally across 12 months ($\text{Annual} / 12$).
  2. `WEIGHTED_HISTORICAL`: Distribute annual total according to prior year monthly cash flow weight ratios ($W_m = \text{Actual}_m / \text{Actual}_{\text{Total}}$).
  3. `PERCENTAGE_GROWTH`: Apply monthly compound or linear percentage growth ($V_m = V_{m-1} \times (1 + g)$).
  4. `FORWARD_FILL` (`Ctrl+D`): Replicate selected cell value to all subsequent months in row ($V_{m \dots 12} = V_{selected}$).
- Performing distribution driver calculations in the browser provides instant visual feedback (<10ms) before committing updates to the database via bulk batch update APIs.

---

## 3. Prior Year Actuals Baseline Loader

### Decision

Implement `GetPriorYearActualsUseCase` in backend NestJS application layer to aggregate posted journal entries for the prior fiscal year per account and period, applying an optional user-defined percentage adjustment ($A_{new} = A_{actual} \times (1 + \text{adjustment}\%)$).

### Rationale

- Querying posted journal entries directly from `JournalEntryEntity` joined with `PeriodEntity` ensures 100% accounting accuracy without relying on pre-aggregated tables that might omit unclosed adjustment entries.
- Missing accounts (accounts with 0 historical entries) default gracefully to 0 rather than throwing errors.

---

## 4. Executive Control Dashboard & Color-Coded Consumption Gauges

### Decision

Calculates period available balance as $\text{Available} = \text{Budgeted} - \text{Executed} - \text{Committed}$.

### Consumption Thresholds

- **Green**: Consumption percentage $< 75\%$
- **Yellow**: Consumption percentage $75\% - 99\%$ (Warning)
- **Red**: Consumption percentage $\ge 100\%$ (Overbudget alert)

### Rationale

- Displays visual gauge bars alongside exact numeric currency figures to enable budget owners to assess monthly financial health within 3 seconds.
- Uses `Committed` balance (currently 0 or reserved order entries) to prevent accidental double-spending of pending purchase commitments.

---

## 5. Inter-Category Budget Re-allocation & Audit Trail

### Decision

Implement `TransferBudgetFundsUseCase` and `BudgetReassignmentEntity` to log inter-account budget transfers within active periods.

### Rationale

- Budget reassignments modify `amount` values in `BudgetItemEntity` for both source and target accounts transactionally.
- Recording an immutable audit entry (`budget_reassignment_records`) captures timestamp, user, source account, target account, period, amount, and reason for complete governance.
