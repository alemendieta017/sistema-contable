# Data Model: Professional Transaction UI

## Client-Side State Models

### DateFilterState
Represents the temporal filter configuration for the ledger.
```typescript
interface DateFilterState {
  mode: "MONTHLY" | "CUSTOM";
  selectedMonth: Date; // Keep track of active month/year (e.g. June 2026)
  startDate: string;   // YYYY-MM-DD for API call
  endDate: string;     // YYYY-MM-DD for API call
}
```

### EntryLineState
Represents an individual entry row in the creation form.
```typescript
interface EntryLineState {
  accountId: string;
  entryType: "DEBIT" | "CREDIT";
  amount: number | "";
}
```

### TransactionFormState
Represents the overall creation form state.
```typescript
interface TransactionFormState {
  date: string;
  description: string;
  entries: EntryLineState[];
}
```

## Validation Rules

### Ledger Integrity Validation
Before submitting the transaction form:
1. **Total Count**: `entries.length >= 2`.
2. **Balance Check**:
   $$\sum \text{amounts where type is DEBIT} = \sum \text{amounts where type is CREDIT}$$
   The difference must be less than $0.001$.
3. **No Zero Amounts**: Each entry must have `amount > 0`.
4. **All Accounts Assigned**: Each entry must have a non-empty `accountId`.
