# Data Model: Pure Date Schema Design

This document details the modifications to the database schema and entity models to support timezone-neutral accounting dates and period boundaries.

## 1. Schema Modifications

### Entity: `Transaction` (table: `transactions`)

- Remove / Rename `@Column({ type: 'timestamp with time zone' }) date` to `@CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' }) createdAt` (representing the creation audit timestamp).
- Add `@Column({ name: 'accounting_date', type: 'date' }) accountingDate: string` (representing the civil accounting date).

### Entity: `FiscalYear` (table: `fiscal_years`)

- Change `@Column({ name: 'start_date', type: 'timestamp with time zone' }) startDate: Date` to `@Column({ name: 'start_date', type: 'date' }) startDate: string`.
- Change `@Column({ name: 'end_date', type: 'timestamp with time zone' }) endDate: Date` to `@Column({ name: 'end_date', type: 'date' }) endDate: string`.

### Entity: `Period` (table: `periods`)

- Change `@Column({ name: 'start_date', type: 'timestamp with time zone' }) startDate: Date` to `@Column({ name: 'start_date', type: 'date' }) startDate: string`.
- Change `@Column({ name: 'end_date', type: 'timestamp with time zone' }) endDate: Date` to `@Column({ name: 'end_date', type: 'date' }) endDate: string`.

---

## 2. API Contract & Zod Validation Schemas

Located in [shared/src/index.ts](file:///Users/ale/dev/sistema-contable/shared/src/index.ts).

### Create/Update Transaction Request:

```typescript
export const CreateTransactionRequestSchema = z.object({
  accountingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format must be YYYY-MM-DD'),
  description: z.string().min(1),
  entries: z.array(JournalEntryRequestSchema).min(2),
});
```

### Create Fiscal Year Request:

```typescript
export const CreateFiscalYearRequestSchema = z.object({
  year: z.number().int().min(1900).max(2100),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format must be YYYY-MM-DD'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format must be YYYY-MM-DD'),
});
```

---

## 3. Period Validation Rules

To verify if a transaction's `accountingDate` is within a period, use simple string comparison:

```typescript
if (period.startDate <= tx.accountingDate && period.endDate >= tx.accountingDate) {
  // Transaction is within period bounds
}
```

This comparison runs in native CPU time (<1ms) and operates correctly on UTC or any client offset.
